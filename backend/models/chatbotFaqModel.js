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

const DEFAULT_THEME_KEY = "practical";
const FAQ_THEME_BY_KEY = {
  sessions_hours: "practical",
  venue_location: "practical",
  dress_code: "practical",
  invitation_access: "access",
  id_requirement: "access",
  guest_policy: "access",
  target_audience: "inclusion",
  children_policy: "inclusion",
  accessibility_pmr: "inclusion",
  ai_film_submission: "projects",
  partner_sponsor: "projects",
  technical_workshops: "projects",
};
const FAQ_THEME_BY_QUESTION = new Map([
  ["quels sont les horaires des sessions ?", "practical"],
  ["ou se deroule l'evenement ?", "practical"],
  ["où se déroule l'événement ?", "practical"],
  ["quel est le dress code (code vestimentaire) ?", "practical"],
  ["quel est le dress code ?", "practical"],
  ["what are the session hours?", "practical"],
  ["where does the event take place?", "practical"],
  ["what is the dress code?", "practical"],
  ["ما هي مواعيد الجلسات؟", "practical"],
  ["أين يُقام الحدث؟", "practical"],
  ["ما هو الزي المطلوب؟", "practical"],
  ["comment obtenir une invitation ?", "access"],
  ["faut-il presenter une piece d'identite ?", "access"],
  ["faut-il présenter une pièce d'identité ?", "access"],
  ["puis-je venir accompagne ?", "access"],
  ["puis-je venir accompagné ?", "access"],
  ["how can i get an invitation?", "access"],
  ["do i need to present an id?", "access"],
  ["can i come with a guest?", "access"],
  ["كيف أحصل على دعوة؟", "access"],
  ["هل يجب إبراز بطاقة هوية؟", "access"],
  ["هل يمكنني الحضور مع مرافق؟", "access"],
  ["quel est le public vise ?", "inclusion"],
  ["quel est le public visé ?", "inclusion"],
  ["les enfants sont-ils admis ?", "inclusion"],
  ["l'accessibilite pmr est-elle assuree ?", "inclusion"],
  ["l'accessibilité pmr est-elle assurée ?", "inclusion"],
  ["who is the target audience?", "inclusion"],
  ["are children allowed?", "inclusion"],
  ["is accessibility for people with reduced mobility provided?", "inclusion"],
  ["من هو الجمهور المستهدف؟", "inclusion"],
  ["هل يُسمح للأطفال بالحضور؟", "inclusion"],
  ["هل تتوفر إمكانية الوصول لذوي الإعاقة الحركية؟", "inclusion"],
  ["puis-je soumettre un film genere par ia ?", "projects"],
  ["puis-je soumettre un film généré par ia ?", "projects"],
  ["comment devenir partenaire ou sponsor ?", "projects"],
  ["y a-t-il des ateliers techniques (workshops) ?", "projects"],
  ["y a-t-il des ateliers techniques ?", "projects"],
  ["can i submit an ai-generated film?", "projects"],
  ["how can i become a partner or sponsor?", "projects"],
  ["are there technical workshops?", "projects"],
  ["هل يمكنني إرسال فيلم مولد بالذكاء الاصطناعي؟", "projects"],
  ["كيف أصبح شريكًا أو راعيًا؟", "projects"],
  ["هل توجد ورشات تقنية؟", "projects"],
]);

export function invalidateChatbotFaqSchemaCache() {
  cachedSchema = null;
}

function normalizeQuestionLabel(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function resolveFaqThemeKey({ faqKey = "", question = "" } = {}) {
  const normalizedFaqKey = String(faqKey || "").trim().toLowerCase();
  if (normalizedFaqKey && FAQ_THEME_BY_KEY[normalizedFaqKey]) {
    return FAQ_THEME_BY_KEY[normalizedFaqKey];
  }

  const normalizedQuestion = normalizeQuestionLabel(question);
  if (normalizedQuestion && FAQ_THEME_BY_QUESTION.has(normalizedQuestion)) {
    return FAQ_THEME_BY_QUESTION.get(normalizedQuestion);
  }

  return DEFAULT_THEME_KEY;
}

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
    const hasThemeKey = Array.isArray(rows)
      && rows.some((row) => String(row.Field || "").toLowerCase() === "theme_key");
    cachedSchema = { hasFaqKey, hasThemeKey };
    return cachedSchema;
  } catch (error) {
    throw withMissingTableHint(error);
  }
}

export async function fetchActiveFaqEntries(pool) {
  try {
    const schema = await readChatbotFaqSchema(pool);
    const { hasFaqKey, hasThemeKey } = schema;

    const baseColumns = hasFaqKey
      ? `id, language, faq_key, ${hasThemeKey ? "theme_key," : ""} question, answer, keywords, usage_count`
      : `id, language, ${hasThemeKey ? "theme_key," : ""} question, answer, keywords, usage_count`;

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
      theme_key: hasThemeKey
        ? String(row.theme_key || "").trim() || resolveFaqThemeKey({
          faqKey: hasFaqKey ? row.faq_key : "",
          question: row.question,
        })
        : resolveFaqThemeKey({
          faqKey: hasFaqKey ? row.faq_key : "",
          question: row.question,
        }),
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
