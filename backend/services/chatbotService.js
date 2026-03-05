import { getDbPool } from "../db.js";
import {
  assertChatbotFaqTableReady,
  fetchActiveFaqEntries,
  incrementFaqUsage,
} from "../models/chatbotFaqModel.js";

const SUPPORTED_LANGUAGES = new Set(["fr", "en", "ar"]);

const STOP_WORDS = new Set([
  "a",
  "alors",
  "au",
  "aux",
  "avec",
  "ce",
  "ces",
  "dans",
  "de",
  "des",
  "du",
  "elle",
  "en",
  "et",
  "est",
  "il",
  "je",
  "la",
  "le",
  "les",
  "mais",
  "me",
  "mes",
  "moi",
  "mon",
  "ne",
  "nous",
  "on",
  "ou",
  "par",
  "pas",
  "pour",
  "qu",
  "que",
  "qui",
  "se",
  "sur",
  "tu",
  "un",
  "une",
  "votre",
  "vos",
  "what",
  "where",
  "when",
  "how",
  "the",
  "is",
  "are",
  "to",
  "for",
  "of",
  "and",
  "in",
  "on",
  "at",
  "can",
  "i",
  "we",
  "you",
  "do",
  "does",
  "ما",
  "من",
  "الى",
  "إلى",
  "في",
  "على",
  "عن",
  "هل",
  "هو",
  "هي",
  "هذا",
  "هذه",
  "ذلك",
  "تلك",
  "انا",
  "أنا",
]);

const RESPONSE_COPY = {
  fr: {
    lowConfidence:
      "Je ne suis pas assez confiant sur la reponse. Reformule ta question avec plus de contexte (ex: horaires, invitation, dress code, PMR).",
    emptyFaq: "Le module FAQ est vide pour le moment. Merci de reessayer plus tard.",
    emptyInput:
      "Ecris une question complete (ex: horaires, invitation, accessibilite, ateliers).",
  },
  en: {
    lowConfidence:
      "I am not confident enough about this answer. Please rephrase with more context (schedule, invitation, dress code, accessibility).",
    emptyFaq: "The FAQ module is currently empty. Please try again later.",
    emptyInput:
      "Please type a complete question (for example: schedule, invitation, accessibility, workshops).",
  },
  ar: {
    lowConfidence:
      "لست واثقا بما يكفي من الاجابة. اعد صياغة سؤالك مع سياق اوضح (المواعيد، الدعوات، اللباس، سهولة الوصول).",
    emptyFaq: "قسم الاسئلة غير متوفر حاليا. حاول مرة اخرى لاحقا.",
    emptyInput:
      "اكتب سؤالا كاملا (مثل: المواعيد، الدعوة، سهولة الوصول، الورش).",
  },
};

function normalizeLanguage(language = "fr") {
  const base = String(language || "fr").trim().toLowerCase().split("-")[0];
  if (SUPPORTED_LANGUAGES.has(base)) {
    return base;
  }
  return "fr";
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function getCopy(language) {
  return RESPONSE_COPY[normalizeLanguage(language)] || RESPONSE_COPY.fr;
}

function buildFallback(language, suggestions = []) {
  const copy = getCopy(language);
  return {
    reply: copy.lowConfidence,
    confidence: "low",
    matchedQuestion: null,
    suggestions,
  };
}

function getTopicKey(entry) {
  const key = String(entry?.faq_key || "").trim();
  if (key) return key;
  return `legacy_${entry?.id || "unknown"}`;
}

function scoreEntry(entry, messageNormalized, messageTokens) {
  const questionNormalized = normalizeText(entry.question);
  const searchableNormalized = normalizeText(
    `${entry.question || ""} ${entry.keywords || ""}`,
  );
  const searchableTokens = new Set(tokenize(searchableNormalized));
  const questionTokens = new Set(tokenize(questionNormalized));

  let score = 0;
  let tokenHits = 0;

  if (!searchableNormalized) {
    return { score: 0, tokenHits: 0 };
  }

  if (questionNormalized === messageNormalized) {
    score += 20;
  }

  if (questionNormalized.includes(messageNormalized) && messageNormalized.length >= 5) {
    score += 10;
  }

  if (messageNormalized.includes(questionNormalized) && questionNormalized.length >= 5) {
    score += 8;
  }

  for (const token of messageTokens) {
    if (!searchableTokens.has(token)) continue;
    tokenHits += 1;
    score += 2;
    if (questionTokens.has(token)) score += 1;
    if (token.length >= 7) score += 1;
  }

  if (messageTokens.length > 0) {
    const overlapRatio = tokenHits / messageTokens.length;
    score += overlapRatio * 6;
  }

  return { score, tokenHits };
}

function scoreTopics(entries, messageNormalized, messageTokens) {
  const grouped = new Map();

  for (const entry of entries) {
    const topicKey = getTopicKey(entry);
    if (!grouped.has(topicKey)) {
      grouped.set(topicKey, []);
    }
    grouped.get(topicKey).push(entry);
  }

  const scoredTopics = [];

  for (const [topicKey, variants] of grouped) {
    let bestVariant = null;
    let bestScore = -1;
    let bestTokenHits = 0;

    for (const variant of variants) {
      const { score, tokenHits } = scoreEntry(
        variant,
        messageNormalized,
        messageTokens,
      );
      if (score > bestScore) {
        bestScore = score;
        bestTokenHits = tokenHits;
        bestVariant = variant;
      }
    }

    scoredTopics.push({
      topicKey,
      variants,
      bestVariant,
      score: bestScore,
      tokenHits: bestTokenHits,
    });
  }

  return scoredTopics.sort((a, b) => b.score - a.score);
}

function pickVariantForLanguage(topic, language) {
  const normalizedLanguage = normalizeLanguage(language);
  const exact = topic.variants.find(
    (entry) => normalizeLanguage(entry.language) === normalizedLanguage,
  );
  if (exact) return exact;

  const frenchFallback = topic.variants.find(
    (entry) => normalizeLanguage(entry.language) === "fr",
  );
  if (frenchFallback) return frenchFallback;

  return topic.bestVariant || topic.variants[0] || null;
}

function buildSuggestions(scoredTopics, language, currentTopicKey = "") {
  const suggestions = [];
  const seen = new Set();

  for (const topic of scoredTopics) {
    if (!topic || topic.topicKey === currentTopicKey) continue;

    const variant = pickVariantForLanguage(topic, language);
    const question = String(variant?.question || "").trim();
    if (!question || seen.has(question)) continue;

    seen.add(question);
    suggestions.push(question);
    if (suggestions.length >= 3) break;
  }

  return suggestions;
}

export async function getChatbotReply({ message, language = "fr" }) {
  const outputLanguage = normalizeLanguage(language);
  const copy = getCopy(outputLanguage);
  const pool = getDbPool();

  await assertChatbotFaqTableReady(pool);

  const messageNormalized = normalizeText(message);
  const messageTokens = tokenize(messageNormalized);

  if (!messageNormalized || messageTokens.length === 0) {
    return {
      reply: copy.emptyInput,
      confidence: "low",
      matchedQuestion: null,
      suggestions: [],
    };
  }

  const faqEntries = await fetchActiveFaqEntries(pool);
  if (!Array.isArray(faqEntries) || faqEntries.length === 0) {
    return {
      reply: copy.emptyFaq,
      confidence: "low",
      matchedQuestion: null,
      suggestions: [],
    };
  }

  const scoredTopics = scoreTopics(faqEntries, messageNormalized, messageTokens);
  const bestTopic = scoredTopics[0];
  const fallbackSuggestions = buildSuggestions(scoredTopics, outputLanguage);

  if (!bestTopic || bestTopic.score < 3 || bestTopic.tokenHits === 0) {
    return buildFallback(outputLanguage, fallbackSuggestions);
  }

  const confidence = bestTopic.score >= 12 ? "high" : bestTopic.score >= 7 ? "medium" : "low";

  if (confidence === "low") {
    return buildFallback(outputLanguage, fallbackSuggestions);
  }

  const responseEntry = pickVariantForLanguage(bestTopic, outputLanguage);
  if (!responseEntry) {
    return buildFallback(outputLanguage, fallbackSuggestions);
  }

  try {
    await incrementFaqUsage(pool, responseEntry.id);
  } catch (error) {
    console.warn("[CHATBOT] unable to increment usage_count:", error.message);
  }

  return {
    reply: responseEntry.answer,
    confidence,
    matchedQuestion: responseEntry.question,
    suggestions:
      confidence === "medium"
        ? buildSuggestions(scoredTopics, outputLanguage, bestTopic.topicKey)
        : [],
  };
}
