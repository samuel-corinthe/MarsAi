import { getDbPool } from "../db.js";
import {
  deleteAdminChatbotFaqRowsByKey,
  ensureChatbotFaqAdminSchema,
  fetchAdminChatbotFaqRows,
  findAdminChatbotFaqRowsByKey,
  insertAdminChatbotFaqTranslation,
  updateAdminChatbotFaqTranslationById,
} from "../models/chatbotFaqAdminModel.js";

const REQUIRED_LANGUAGES = ["fr", "en", "ar"];
const ALLOWED_THEME_KEYS = new Set(["practical", "access", "inclusion", "projects"]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toFaqKey(value, fallback = "faq") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const compact = normalized.slice(0, 64).replace(/^_+|_+$/g, "");
  return compact || fallback;
}

function toNullableTrimmedString(value, maxLength = null) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (Number.isFinite(maxLength) && maxLength > 0) {
    return normalized.slice(0, maxLength);
  }
  return normalized;
}

function sanitizeTranslationInput(input = {}) {
  return {
    question: toNullableTrimmedString(input.question, 500),
    answer: toNullableTrimmedString(input.answer),
    keywords: toNullableTrimmedString(input.keywords),
  };
}

function buildEmptyTranslation(language) {
  return {
    id: null,
    language,
    question: "",
    answer: "",
    keywords: "",
  };
}

function normalizeThemeKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ALLOWED_THEME_KEYS.has(normalized) ? normalized : "practical";
}

function buildGroupedFaqItems(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const faqKey = String(row.faq_key || "").trim();
    if (!faqKey) return;

    if (!grouped.has(faqKey)) {
      grouped.set(faqKey, {
        faqKey,
        themeKey: normalizeThemeKey(row.theme_key),
        isActive: false,
        usageCount: 0,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || row.created_at || null,
        translations: {
          fr: buildEmptyTranslation("fr"),
          en: buildEmptyTranslation("en"),
          ar: buildEmptyTranslation("ar"),
        },
      });
    }

    const entry = grouped.get(faqKey);
    const language = String(row.language || "").trim().toLowerCase();

    entry.isActive = entry.isActive || Boolean(row.is_active);
    entry.usageCount += Number(row.usage_count || 0);

    const createdAtMs = new Date(row.created_at || 0).getTime();
    const entryCreatedAtMs = new Date(entry.createdAt || 0).getTime();
    if (createdAtMs && (!entryCreatedAtMs || createdAtMs < entryCreatedAtMs)) {
      entry.createdAt = row.created_at;
    }

    const updatedAtValue = row.updated_at || row.created_at || null;
    const updatedAtMs = new Date(updatedAtValue || 0).getTime();
    const entryUpdatedAtMs = new Date(entry.updatedAt || 0).getTime();
    if (updatedAtMs && (!entryUpdatedAtMs || updatedAtMs > entryUpdatedAtMs)) {
      entry.updatedAt = updatedAtValue;
    }

    if (REQUIRED_LANGUAGES.includes(language)) {
      entry.translations[language] = {
        id: Number(row.id) || null,
        language,
        question: String(row.question || ""),
        answer: String(row.answer || ""),
        keywords: String(row.keywords || ""),
      };
    }
  });

  return [...grouped.values()].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    if (left.usageCount !== right.usageCount) {
      return right.usageCount - left.usageCount;
    }

    const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();
    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return left.faqKey.localeCompare(right.faqKey, "fr");
  });
}

function extractFaqSummary(items) {
  const total = items.length;
  const active = items.filter((item) => item.isActive).length;
  const inactive = Math.max(0, total - active);
  const totalUsage = items.reduce((sum, item) => sum + Number(item.usageCount || 0), 0);

  return {
    total,
    active,
    inactive,
    totalUsage,
  };
}

function ensureCreateTranslations(rawTranslations) {
  const translations = {};

  REQUIRED_LANGUAGES.forEach((language) => {
    const translation = sanitizeTranslationInput(rawTranslations?.[language] || {});
    if (!translation.question || !translation.answer) {
      throw createHttpError(
        400,
        "Les trois langues fr, en et ar doivent contenir une question et une reponse.",
      );
    }
    translations[language] = translation;
  });

  return translations;
}

export async function listAdminChatbotFaqs() {
  const pool = getDbPool();
  await ensureChatbotFaqAdminSchema(pool);

  const rows = await fetchAdminChatbotFaqRows(pool);
  const items = buildGroupedFaqItems(rows);

  return {
    items,
    summary: extractFaqSummary(items),
  };
}

export async function createAdminChatbotFaq({ payload }) {
  const pool = getDbPool();
  await ensureChatbotFaqAdminSchema(pool);

  const translations = ensureCreateTranslations(payload?.translations);
  const requestedFaqKey = toNullableTrimmedString(payload?.faqKey, 64);
  const faqKey = toFaqKey(
    requestedFaqKey || translations.fr.question || translations.en.question || translations.ar.question,
    "faq",
  );
  const themeKey = normalizeThemeKey(payload?.themeKey);
  const isActive = payload?.isActive !== false;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const existingRows = await findAdminChatbotFaqRowsByKey(connection, faqKey);
    if (existingRows.length > 0) {
      throw createHttpError(409, "Une FAQ avec cette cle existe deja.");
    }

    for (const language of REQUIRED_LANGUAGES) {
      await insertAdminChatbotFaqTranslation(connection, {
        faqKey,
        themeKey,
        language,
        question: translations[language].question,
        answer: translations[language].answer,
        keywords: translations[language].keywords,
        isActive,
      });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const freshRows = await findAdminChatbotFaqRowsByKey(pool, faqKey);
  return {
    item: buildGroupedFaqItems(freshRows)[0] || null,
  };
}

export async function updateAdminChatbotFaq({ faqKey, payload }) {
  const safeFaqKey = toFaqKey(faqKey, "");
  if (!safeFaqKey) {
    throw createHttpError(400, "Cle FAQ invalide.");
  }

  const pool = getDbPool();
  await ensureChatbotFaqAdminSchema(pool);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const existingRows = await findAdminChatbotFaqRowsByKey(connection, safeFaqKey);
    if (existingRows.length === 0) {
      throw createHttpError(404, "FAQ introuvable.");
    }

    const rowsByLanguage = new Map(
      existingRows.map((row) => [String(row.language || "").trim().toLowerCase(), row]),
    );
    const currentIsActive = existingRows.some((row) => Boolean(row.is_active));
    const currentThemeKey = normalizeThemeKey(existingRows[0]?.theme_key);
    const nextIsActive = payload?.isActive == null ? currentIsActive : Boolean(payload.isActive);
    const nextThemeKey = payload?.themeKey == null ? currentThemeKey : normalizeThemeKey(payload.themeKey);

    for (const language of REQUIRED_LANGUAGES) {
      const incoming = Object.prototype.hasOwnProperty.call(payload?.translations || {}, language)
        ? sanitizeTranslationInput(payload.translations[language])
        : null;
      const existingRow = rowsByLanguage.get(language) || null;

      if (existingRow) {
        await updateAdminChatbotFaqTranslationById(connection, existingRow.id, {
          themeKey: nextThemeKey,
          question: incoming?.question || String(existingRow.question || ""),
          answer: incoming?.answer || String(existingRow.answer || ""),
          keywords: incoming?.keywords ?? String(existingRow.keywords || ""),
          isActive: nextIsActive,
        });
        continue;
      }

      if (!incoming?.question || !incoming?.answer) {
        continue;
      }

      await insertAdminChatbotFaqTranslation(connection, {
        faqKey: safeFaqKey,
        themeKey: nextThemeKey,
        language,
        question: incoming.question,
        answer: incoming.answer,
        keywords: incoming.keywords,
        isActive: nextIsActive,
      });
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const freshRows = await findAdminChatbotFaqRowsByKey(pool, safeFaqKey);
  return {
    item: buildGroupedFaqItems(freshRows)[0] || null,
  };
}

export async function deleteAdminChatbotFaq({ faqKey }) {
  const safeFaqKey = toFaqKey(faqKey, "");
  if (!safeFaqKey) {
    throw createHttpError(400, "Cle FAQ invalide.");
  }

  const pool = getDbPool();
  await ensureChatbotFaqAdminSchema(pool);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const existingRows = await findAdminChatbotFaqRowsByKey(connection, safeFaqKey);
    if (existingRows.length === 0) {
      throw createHttpError(404, "FAQ introuvable.");
    }

    const deletedTranslations = await deleteAdminChatbotFaqRowsByKey(connection, safeFaqKey);
    await connection.commit();

    return {
      ok: true,
      faqKey: safeFaqKey,
      deletedTranslations,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
