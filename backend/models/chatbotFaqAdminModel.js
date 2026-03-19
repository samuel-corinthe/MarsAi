import {
  invalidateChatbotFaqSchemaCache,
  resolveFaqThemeKey,
} from "./chatbotFaqModel.js";

const CHATBOT_FAQ_TABLE = "chatbot_faq_entries";
const REQUIRED_LANGUAGES = ["fr", "en", "ar"];
const LEGACY_DEFAULT_FAQ_KEYS = [
  "sessions_hours",
  "venue_location",
  "invitation_access",
  "target_audience",
  "children_policy",
  "id_requirement",
  "accessibility_pmr",
  "dress_code",
  "ai_film_submission",
  "partner_sponsor",
  "technical_workshops",
  "guest_policy",
];

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeFaqKey(value) {
  return String(value || "").trim().toLowerCase();
}

function slugifyFaqKey(value, fallback = "faq") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const compact = normalized.slice(0, 64).replace(/^_+|_+$/g, "");
  if (compact) return compact;
  return String(fallback || "faq").slice(0, 64);
}

function buildUniqueFaqKey(seedValue, usedKeys, fallbackPrefix = "faq") {
  const baseKey = slugifyFaqKey(seedValue, fallbackPrefix);
  let candidate = baseKey;
  let suffix = 2;

  while (usedKeys.has(candidate)) {
    const suffixText = `_${suffix}`;
    const trimmedBase = baseKey.slice(0, Math.max(1, 64 - suffixText.length));
    candidate = `${trimmedBase}${suffixText}`;
    suffix += 1;
  }

  usedKeys.add(candidate);
  return candidate;
}

async function showColumns(executor) {
  const [rows] = await executor.query(`SHOW COLUMNS FROM \`${CHATBOT_FAQ_TABLE}\``);
  return new Set(rows.map((row) => String(row.Field || "").trim().toLowerCase()));
}

async function showIndexRows(executor) {
  const [rows] = await executor.query(`SHOW INDEX FROM \`${CHATBOT_FAQ_TABLE}\``);
  return Array.isArray(rows) ? rows : [];
}

async function ensureIndexByName(executor, indexName, definitionSql) {
  const rows = await showIndexRows(executor);
  const hasIndex = rows.some((row) => String(row.Key_name || "") === indexName);
  if (hasIndex) return;
  await executor.query(`ALTER TABLE \`${CHATBOT_FAQ_TABLE}\` ADD ${definitionSql}`);
}

async function createTableIfMissing(executor) {
  await executor.query(
    `
      CREATE TABLE IF NOT EXISTS \`${CHATBOT_FAQ_TABLE}\` (
        \`id\` INT(11) NOT NULL AUTO_INCREMENT,
        \`faq_key\` VARCHAR(64) NOT NULL,
        \`theme_key\` VARCHAR(32) NOT NULL DEFAULT 'practical',
        \`language\` VARCHAR(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fr',
        \`question\` VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`answer\` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
        \`keywords\` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`usage_count\` INT(11) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_chatbot_faq_key_lang\` (\`faq_key\`, \`language\`),
        KEY \`idx_chatbot_faq_lang_active\` (\`language\`, \`is_active\`),
        KEY \`idx_chatbot_faq_key_active\` (\`faq_key\`, \`is_active\`),
        KEY \`idx_chatbot_faq_usage\` (\`usage_count\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  );
}

async function backfillMissingFaqKeys(executor) {
  const [rows] = await executor.query(
    `
      SELECT id, language, question, faq_key
      FROM \`${CHATBOT_FAQ_TABLE}\`
      ORDER BY id ASC
    `,
  );

  if (!Array.isArray(rows) || rows.length === 0) return;

  const rowsByLanguage = new Map(REQUIRED_LANGUAGES.map((language) => [language, []]));
  const otherRows = [];
  const usedKeys = new Set();

  rows.forEach((row) => {
    const faqKey = sanitizeFaqKey(row.faq_key);
    if (faqKey) usedKeys.add(faqKey);

    const language = normalizeLanguage(row.language);
    if (rowsByLanguage.has(language)) {
      rowsByLanguage.get(language).push(row);
      return;
    }

    otherRows.push(row);
  });

  const rowAssignments = [];
  const maxTripletCount = Math.max(
    ...REQUIRED_LANGUAGES.map((language) => rowsByLanguage.get(language).length),
    0,
  );

  for (let index = 0; index < maxTripletCount; index += 1) {
    const groupRows = REQUIRED_LANGUAGES.map((language) => rowsByLanguage.get(language)[index]).filter(Boolean);
    if (groupRows.length === 0) continue;

    const existingGroupKey = groupRows
      .map((row) => sanitizeFaqKey(row.faq_key))
      .find(Boolean);

    let groupKey = existingGroupKey;
    if (!groupKey) {
      const defaultKey = LEGACY_DEFAULT_FAQ_KEYS[index] || "";
      const sourceLabel = groupRows.find((row) => String(row.question || "").trim())?.question || defaultKey;
      groupKey = buildUniqueFaqKey(sourceLabel, usedKeys, defaultKey || `faq_${index + 1}`);
    }

    groupRows.forEach((row) => {
      if (!sanitizeFaqKey(row.faq_key)) {
        rowAssignments.push([groupKey, row.id]);
      }
    });
  }

  otherRows.forEach((row) => {
    if (sanitizeFaqKey(row.faq_key)) return;
    const uniqueKey = buildUniqueFaqKey(row.question, usedKeys, `faq_${row.id}`);
    rowAssignments.push([uniqueKey, row.id]);
  });

  for (const [faqKey, rowId] of rowAssignments) {
    await executor.query(
      `
        UPDATE \`${CHATBOT_FAQ_TABLE}\`
        SET faq_key = ?
        WHERE id = ?
        LIMIT 1
      `,
      [faqKey, rowId],
    );
  }

  await executor.query(
    `
      UPDATE \`${CHATBOT_FAQ_TABLE}\`
      SET faq_key = CONCAT('faq_', id)
      WHERE faq_key IS NULL OR TRIM(faq_key) = ''
    `,
  );
}

async function backfillMissingThemeKeys(executor) {
  const [rows] = await executor.query(
    `
      SELECT id, faq_key, question, theme_key
      FROM \`${CHATBOT_FAQ_TABLE}\`
      ORDER BY id ASC
    `,
  );

  if (!Array.isArray(rows) || rows.length === 0) return;

  for (const row of rows) {
    const themeKey = String(row.theme_key || "").trim();
    if (themeKey) continue;

    await executor.query(
      `
        UPDATE \`${CHATBOT_FAQ_TABLE}\`
        SET theme_key = ?
        WHERE id = ?
        LIMIT 1
      `,
      [resolveFaqThemeKey({ faqKey: row.faq_key, question: row.question }), row.id],
    );
  }
}

export async function ensureChatbotFaqAdminSchema(pool) {
  await createTableIfMissing(pool);

  const existingColumns = await showColumns(pool);
  if (!existingColumns.has("faq_key")) {
    await pool.query(
      `ALTER TABLE \`${CHATBOT_FAQ_TABLE}\` ADD COLUMN \`faq_key\` VARCHAR(64) NULL AFTER \`language\``,
    );
  }
  if (!existingColumns.has("theme_key")) {
    await pool.query(
      `ALTER TABLE \`${CHATBOT_FAQ_TABLE}\` ADD COLUMN \`theme_key\` VARCHAR(32) NULL AFTER \`faq_key\``,
    );
  }

  await backfillMissingFaqKeys(pool);
  await backfillMissingThemeKeys(pool);
  await pool.query(
    `ALTER TABLE \`${CHATBOT_FAQ_TABLE}\` MODIFY COLUMN \`faq_key\` VARCHAR(64) NOT NULL AFTER \`language\``,
  );
  await pool.query(
    `ALTER TABLE \`${CHATBOT_FAQ_TABLE}\` MODIFY COLUMN \`theme_key\` VARCHAR(32) NOT NULL DEFAULT 'practical' AFTER \`faq_key\``,
  );

  await ensureIndexByName(
    pool,
    "uq_chatbot_faq_key_lang",
    "UNIQUE KEY `uq_chatbot_faq_key_lang` (`faq_key`, `language`)",
  );
  await ensureIndexByName(
    pool,
    "idx_chatbot_faq_key_active",
    "KEY `idx_chatbot_faq_key_active` (`faq_key`, `is_active`)",
  );
  await ensureIndexByName(
    pool,
    "idx_chatbot_faq_lang_active",
    "KEY `idx_chatbot_faq_lang_active` (`language`, `is_active`)",
  );
  await ensureIndexByName(
    pool,
    "idx_chatbot_faq_usage",
    "KEY `idx_chatbot_faq_usage` (`usage_count`)",
  );

  invalidateChatbotFaqSchemaCache();
}

export async function fetchAdminChatbotFaqRows(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        faq_key,
        theme_key,
        language,
        question,
        answer,
        keywords,
        is_active,
        usage_count,
        created_at,
        updated_at
      FROM \`${CHATBOT_FAQ_TABLE}\`
      ORDER BY faq_key ASC, FIELD(language, 'fr', 'en', 'ar'), id ASC
    `,
  );

  return Array.isArray(rows) ? rows : [];
}

export async function findAdminChatbotFaqRowsByKey(executor, faqKey) {
  const [rows] = await executor.query(
    `
      SELECT
        id,
        faq_key,
        theme_key,
        language,
        question,
        answer,
        keywords,
        is_active,
        usage_count,
        created_at,
        updated_at
      FROM \`${CHATBOT_FAQ_TABLE}\`
      WHERE faq_key = ?
      ORDER BY FIELD(language, 'fr', 'en', 'ar'), id ASC
    `,
    [faqKey],
  );

  return Array.isArray(rows) ? rows : [];
}

export async function insertAdminChatbotFaqTranslation(
  executor,
  { faqKey, themeKey, language, question, answer, keywords, isActive },
) {
  await executor.query(
    `
      INSERT INTO \`${CHATBOT_FAQ_TABLE}\` (
        faq_key,
        theme_key,
        language,
        question,
        answer,
        keywords,
        is_active,
        usage_count,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
    `,
    [faqKey, themeKey, language, question, answer, keywords || null, isActive ? 1 : 0],
  );
}

export async function updateAdminChatbotFaqTranslationById(
  executor,
  rowId,
  { themeKey, question, answer, keywords, isActive },
) {
  await executor.query(
    `
      UPDATE \`${CHATBOT_FAQ_TABLE}\`
      SET
        theme_key = ?,
        question = ?,
        answer = ?,
        keywords = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [themeKey, question, answer, keywords || null, isActive ? 1 : 0, rowId],
  );
}

export async function deleteAdminChatbotFaqRowsByKey(executor, faqKey) {
  const [result] = await executor.query(
    `
      DELETE FROM \`${CHATBOT_FAQ_TABLE}\`
      WHERE faq_key = ?
    `,
    [faqKey],
  );

  return Number(result?.affectedRows || 0);
}
