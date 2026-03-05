function withMissingTableHint(error) {
  const code = String(error?.code || "");
  if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_TABLE_ERROR") {
    const wrapped = new Error(
      "Table chatbot_faq_entries absente. Execute d'abord backend/sql/chatbot_faq_entries.sql dans MySQL.",
    );
    wrapped.cause = error;
    return wrapped;
  }
  return error;
}

let cachedSchema = null;

export async function assertChatbotFaqTableReady(pool) {
  try {
    await pool.query("SELECT id FROM chatbot_faq_entries LIMIT 1");
  } catch (error) {
    throw withMissingTableHint(error);
  }
}

async function readChatbotFaqSchema(pool) {
  if (cachedSchema) {
    return cachedSchema;
  }

  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM chatbot_faq_entries");
    const hasFaqKey = Array.isArray(rows)
      && rows.some((row) => String(row.Field || "").toLowerCase() === "faq_key");
    cachedSchema = { hasFaqKey };
    return cachedSchema;
  } catch (error) {
    throw withMissingTableHint(error);
  }
}

export async function fetchActiveFaqEntries(pool) {
  try {
    const schema = await readChatbotFaqSchema(pool);
    const { hasFaqKey } = schema;

    const baseColumns = hasFaqKey
      ? "id, language, faq_key, question, answer, keywords, usage_count"
      : "id, language, question, answer, keywords, usage_count";

    const [rows] = await pool.query(
      `
        SELECT ${baseColumns}
        FROM chatbot_faq_entries
        WHERE is_active = 1
        ORDER BY usage_count DESC, id ASC
      `,
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      ...row,
      faq_key: hasFaqKey ? String(row.faq_key || "").trim() : "",
    }));
  } catch (error) {
    throw withMissingTableHint(error);
  }
}

export async function incrementFaqUsage(pool, faqId) {
  if (!Number.isFinite(Number(faqId)) || Number(faqId) <= 0) return;

  try {
    await pool.query(
      `
        UPDATE chatbot_faq_entries
        SET usage_count = usage_count + 1
        WHERE id = ?
        LIMIT 1
      `,
      [faqId],
    );
  } catch (error) {
    throw withMissingTableHint(error);
  }
}
