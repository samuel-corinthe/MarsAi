import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createChatbotAdminFaq,
  deleteChatbotAdminFaq,
  getChatbotAdminFaqs,
  getChatbotFaqCatalog,
  getCurrentSessionUser,
  updateChatbotAdminFaq,
} from "../api";
import FaqAdminPanel from "./chatbot/FaqAdminPanel";
import { useTheme } from "../context/ThemeContext";
import { resolveApiRequestUrl } from "../utils/apiUrl";

const UI_COPY = {
  fr: {
    title: "FAQ MarsAI",
    subtitle: "Assistance rapide",
    thinking: "Je reflechis...",
    genericError: "Probleme technique temporaire. Reessaie dans un instant.",
    close: "Fermer la faq",
    open: "Ouvrir la faq",
    welcomeTitle: "Questions frequentes",
    welcomeText: "Choisis un theme puis une question.",
    suggestionsTitle: "Questions proches",
    categoriesTitle: "Themes",
    questionsTitle: "Questions proposees",
    noQuestionLeft: "Toutes les questions de ce theme ont ete consultees.",
    reset: "Reinitialiser",
    inputPlaceholder: "Pose ta question...",
    send: "Envoyer",
    faqView: "FAQ",
    adminView: "Gestion",
    sessionLabel: "Session active",
    adminPanelKicker: "Session admin",
    adminPanelTitle: "Gestion des FAQ",
    adminPanelNew: "Nouvelle FAQ",
    adminPanelTotal: "FAQ",
    adminPanelActive: "Actives",
    adminPanelUsage: "Utilisations",
    adminPanelUsageShort: "usages",
    adminPanelLoading: "Chargement des FAQ...",
    adminPanelEmpty: "Aucune FAQ pour le moment.",
    adminPanelUntitled: "Question sans titre",
    adminPanelActiveState: "Active",
    adminPanelInactiveState: "Inactive",
    adminPanelEditKicker: "Edition",
    adminPanelCreateKicker: "Creation",
    adminPanelEditTitle: "Modifier la FAQ",
    adminPanelCreateTitle: "Ajouter une FAQ",
    adminPanelActiveToggle: "Visible",
    adminPanelQuestion: "Question",
    adminPanelQuestionPlaceholder: "Question visible dans le chatbot",
    adminPanelAnswer: "Reponse",
    adminPanelAnswerPlaceholder: "Reponse envoyee par le chatbot",
    adminPanelKeywords: "Mots-cles",
    adminPanelKeywordsPlaceholder: "termes utiles, synonymes, variantes",
    adminPanelSaveCreate: "Ajouter la FAQ",
    adminPanelSaveEdit: "Enregistrer",
    adminPanelSaving: "Enregistrement...",
    adminPanelReset: "Reinitialiser",
    adminPanelLoadError: "Impossible de charger les FAQ admin.",
    adminPanelSaveError: "Impossible d'enregistrer la FAQ.",
    adminPanelSaveSuccessCreate: "FAQ ajoutee.",
    adminPanelSaveSuccessEdit: "FAQ mise a jour.",
    adminPanelDeleteAction: "Supprimer",
    adminPanelDeleteConfirm: "Supprimer definitivement",
    adminPanelDeleteCancel: "Annuler",
    adminPanelDeleteHint: "Suppression definitive",
    adminPanelDeletePrompt: "Cette FAQ sera retiree du chatbot dans les 3 langues.",
    adminPanelDeleteTargetLabel: "FAQ cible",
    adminPanelDeleteError: "Impossible de supprimer la FAQ.",
    adminPanelDeleteSuccess: "FAQ supprimee.",
    adminPanelDeleting: "Suppression...",
  },
  en: {
    title: "MarsAI FAQ",
    subtitle: "Quick help",
    thinking: "Thinking...",
    genericError: "Temporary technical issue. Please try again in a moment.",
    close: "Close faq",
    open: "Open faq",
    welcomeTitle: "Frequently asked questions",
    welcomeText: "Choose a topic, then a question.",
    suggestionsTitle: "Related questions",
    categoriesTitle: "Topics",
    questionsTitle: "Suggested questions",
    noQuestionLeft: "All questions in this topic have already been viewed.",
    reset: "Reset",
    inputPlaceholder: "Ask your question...",
    send: "Send",
    faqView: "FAQ",
    adminView: "Manage",
    sessionLabel: "Active session",
    adminPanelKicker: "Admin session",
    adminPanelTitle: "FAQ management",
    adminPanelNew: "New FAQ",
    adminPanelTotal: "FAQs",
    adminPanelActive: "Active",
    adminPanelUsage: "Usage",
    adminPanelUsageShort: "uses",
    adminPanelLoading: "Loading FAQ entries...",
    adminPanelEmpty: "No FAQ entries yet.",
    adminPanelUntitled: "Untitled question",
    adminPanelActiveState: "Active",
    adminPanelInactiveState: "Inactive",
    adminPanelEditKicker: "Edit",
    adminPanelCreateKicker: "Create",
    adminPanelEditTitle: "Edit FAQ",
    adminPanelCreateTitle: "Add FAQ",
    adminPanelActiveToggle: "Visible",
    adminPanelQuestion: "Question",
    adminPanelQuestionPlaceholder: "Question shown in the chatbot",
    adminPanelAnswer: "Answer",
    adminPanelAnswerPlaceholder: "Answer returned by the chatbot",
    adminPanelKeywords: "Keywords",
    adminPanelKeywordsPlaceholder: "helpful terms, synonyms, variants",
    adminPanelSaveCreate: "Add FAQ",
    adminPanelSaveEdit: "Save",
    adminPanelSaving: "Saving...",
    adminPanelReset: "Reset",
    adminPanelLoadError: "Unable to load admin FAQs.",
    adminPanelSaveError: "Unable to save the FAQ.",
    adminPanelSaveSuccessCreate: "FAQ created.",
    adminPanelSaveSuccessEdit: "FAQ updated.",
    adminPanelDeleteAction: "Delete",
    adminPanelDeleteConfirm: "Delete permanently",
    adminPanelDeleteCancel: "Cancel",
    adminPanelDeleteHint: "Permanent deletion",
    adminPanelDeletePrompt: "This FAQ will be removed from the chatbot in all 3 languages.",
    adminPanelDeleteTargetLabel: "Selected FAQ",
    adminPanelDeleteError: "Unable to delete the FAQ.",
    adminPanelDeleteSuccess: "FAQ deleted.",
    adminPanelDeleting: "Deleting...",
  },
  ar: {
    title: "الأسئلة الشائعة MarsAI",
    subtitle: "مساعدة سريعة",
    thinking: "جارٍ التفكير...",
    genericError: "مشكلة تقنية مؤقتة. حاول مرة أخرى بعد لحظات.",
    close: "إغلاق الأسئلة الشائعة",
    open: "فتح الأسئلة الشائعة",
    welcomeTitle: "الأسئلة المتكررة",
    welcomeText: "اختر موضوعا ثم سؤالا.",
    suggestionsTitle: "أسئلة مرتبطة",
    categoriesTitle: "المواضيع",
    questionsTitle: "الأسئلة المقترحة",
    noQuestionLeft: "تمت مراجعة كل أسئلة هذا الموضوع.",
    reset: "إعادة التهيئة",
  },
};

const FORCED_FLOWS = {
  fr: [
    {
      id: "practical",
      label: "Infos pratiques",
      questions: [
        "Quels sont les horaires des sessions ?",
        "Ou se deroule l'evenement ?",
        "Quel est le dress code ?",
      ],
    },
    {
      id: "access",
      label: "Acces",
      questions: [
        "Comment obtenir une invitation ?",
        "Faut-il presenter une piece d'identite ?",
        "Puis-je venir accompagne ?",
      ],
    },
    {
      id: "inclusion",
      label: "Public",
      questions: [
        "Quel est le public vise ?",
        "Les enfants sont-ils admis ?",
        "L'accessibilite PMR est-elle assuree ?",
      ],
    },
    {
      id: "projects",
      label: "Films",
      questions: [
        "Puis-je soumettre un film genere par IA ?",
        "Comment devenir partenaire ou sponsor ?",
        "Y a-t-il des ateliers techniques ?",
      ],
    },
  ],
  en: [
    {
      id: "practical",
      label: "Practical",
      questions: [
        "What are the session hours?",
        "Where does the event take place?",
        "What is the dress code?",
      ],
    },
    {
      id: "access",
      label: "Access",
      questions: [
        "How can I get an invitation?",
        "Do I need to present an ID?",
        "Can I come with a guest?",
      ],
    },
    {
      id: "inclusion",
      label: "Audience",
      questions: [
        "Who is the target audience?",
        "Are children allowed?",
        "Is accessibility for people with reduced mobility provided?",
      ],
    },
    {
      id: "projects",
      label: "Films",
      questions: [
        "Can I submit an AI-generated film?",
        "How can I become a partner or sponsor?",
        "Are there technical workshops?",
      ],
    },
  ],
  ar: [
    {
      id: "practical",
      label: "معلومات عملية",
      questions: [
        "ما هي مواعيد الجلسات؟",
        "أين يقام الحدث؟",
        "ما هو اللباس المطلوب؟",
      ],
    },
    {
      id: "access",
      label: "الدخول",
      questions: [
        "كيف يمكنني الحصول على دعوة؟",
        "هل يجب تقديم بطاقة هوية؟",
        "هل يمكنني الحضور مع مرافق؟",
      ],
    },
    {
      id: "inclusion",
      label: "الجمهور",
      questions: [
        "من هو الجمهور المستهدف؟",
        "هل يسمح للأطفال بالدخول؟",
        "هل تتوفر إمكانية الوصول لذوي الحركة المحدودة؟",
      ],
    },
    {
      id: "projects",
      label: "الأفلام",
      questions: [
        "هل يمكنني إرسال فيلم مولد بالذكاء الاصطناعي؟",
        "كيف أصبح شريكا أو راعيا؟",
        "هل توجد ورش تقنية؟",
      ],
    },
  ],
};

function normalizeUiLanguage(rawLanguage = "fr") {
  const language = String(rawLanguage || "fr").toLowerCase().split("-")[0];
  if (language === "en" || language === "ar") return language;
  return "fr";
}

function getDefaultCategoryId(flows) {
  return Array.isArray(flows) && flows.length > 0 ? flows[0].id : "";
}

function normalizeQuestionKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmptyFaqDraft() {
  return {
    mode: "create",
    faqKey: "",
    themeKey: "practical",
    isActive: true,
    translations: {
      fr: { question: "", answer: "", keywords: "" },
      en: { question: "", answer: "", keywords: "" },
      ar: { question: "", answer: "", keywords: "" },
    },
  };
}

function createFaqDraftFromItem(item) {
  const nextDraft = createEmptyFaqDraft();
  return {
    mode: "edit",
    faqKey: String(item?.faqKey || ""),
    themeKey: String(item?.themeKey || "practical"),
    isActive: Boolean(item?.isActive),
    translations: {
      fr: {
        question: String(item?.translations?.fr?.question || nextDraft.translations.fr.question),
        answer: String(item?.translations?.fr?.answer || nextDraft.translations.fr.answer),
        keywords: String(item?.translations?.fr?.keywords || nextDraft.translations.fr.keywords),
      },
      en: {
        question: String(item?.translations?.en?.question || nextDraft.translations.en.question),
        answer: String(item?.translations?.en?.answer || nextDraft.translations.en.answer),
        keywords: String(item?.translations?.en?.keywords || nextDraft.translations.en.keywords),
      },
      ar: {
        question: String(item?.translations?.ar?.question || nextDraft.translations.ar.question),
        answer: String(item?.translations?.ar?.answer || nextDraft.translations.ar.answer),
        keywords: String(item?.translations?.ar?.keywords || nextDraft.translations.ar.keywords),
      },
    },
  };
}

function trimOptionalText(value = "", maxLength = null) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (Number.isFinite(maxLength) && maxLength > 0) {
    return normalized.slice(0, maxLength);
  }
  return normalized;
}

function buildFaqPayloadFromDraft(draft) {
  return {
    themeKey: String(draft?.themeKey || "practical"),
    isActive: Boolean(draft?.isActive),
    translations: {
      fr: {
        question: trimOptionalText(draft?.translations?.fr?.question, 500),
        answer: trimOptionalText(draft?.translations?.fr?.answer),
        keywords: trimOptionalText(draft?.translations?.fr?.keywords),
      },
      en: {
        question: trimOptionalText(draft?.translations?.en?.question, 500),
        answer: trimOptionalText(draft?.translations?.en?.answer),
        keywords: trimOptionalText(draft?.translations?.en?.keywords),
      },
      ar: {
        question: trimOptionalText(draft?.translations?.ar?.question, 500),
        answer: trimOptionalText(draft?.translations?.ar?.answer),
        keywords: trimOptionalText(draft?.translations?.ar?.keywords),
      },
    },
  };
}

function normalizeFaqAdminResponse(payload) {
  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    summary: payload?.summary || {
      total: 0,
      active: 0,
      inactive: 0,
      totalUsage: 0,
    },
  };
}

function resolveFaqDraft(items, preferredFaqKey = "", currentDraft = null, preserveCreateDraft = false) {
  if (preferredFaqKey) {
    const matchedItem = items.find((item) => item?.faqKey === preferredFaqKey);
    if (matchedItem) {
      return createFaqDraftFromItem(matchedItem);
    }
  }

  if (preserveCreateDraft && currentDraft?.mode === "create" && !preferredFaqKey) {
    return currentDraft;
  }

  if (items.length > 0) {
    return createFaqDraftFromItem(items[0]);
  }

  return createEmptyFaqDraft();
}

function resolveFaqStateAfterDeletion(items, fallbackThemeKey = "practical") {
  const safeThemeKey = String(fallbackThemeKey || "practical");
  const nextItem = items.find((item) => item?.themeKey === safeThemeKey) || items[0] || null;

  return {
    draft: nextItem
      ? createFaqDraftFromItem(nextItem)
      : {
        ...createEmptyFaqDraft(),
        themeKey: safeThemeKey,
      },
    filterThemeKey: nextItem?.themeKey || safeThemeKey,
  };
}

function buildCatalogFlows(payload, themeLabels) {
  const themes = Array.isArray(payload?.themes) ? payload.themes : [];

  return themes
    .map((theme) => ({
      id: String(theme?.id || "").trim() || "practical",
      label: themeLabels[String(theme?.id || "").trim()] || String(theme?.id || "").trim() || "Theme",
      questions: Array.isArray(theme?.questions)
        ? theme.questions
            .map((item) => String(item?.question || "").trim())
            .filter(Boolean)
        : [],
    }))
    .filter((theme) => theme.questions.length > 0);
}

export default function FaqChatbot() {
  const { i18n } = useTranslation();
  const { isLight } = useTheme();
  const language = normalizeUiLanguage(i18n.language);
  const previousLanguageRef = useRef(language);
  const ui = UI_COPY[language] || UI_COPY.fr;
  const fallbackUi = UI_COPY.en;
  const isRtl = language === "ar";
  const theme = useMemo(
    () => (isLight
      ? {
        panel: "border-slate-200/90 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.18)]",
        header: "border-slate-200/90 bg-gradient-to-r from-white to-slate-50 text-slate-900",
        subtitle: "text-cyan-700/90",
        closeButton: "text-slate-600 hover:bg-slate-100",
        body: "bg-gradient-to-b from-slate-50 to-white text-slate-900",
        metaLabel: "text-cyan-700/90",
        categoryActive: "border-cyan-400 bg-cyan-100 text-cyan-900",
        categoryIdle: "border-slate-300 bg-white text-slate-700 hover:border-cyan-400/70 hover:text-cyan-800",
        chip: "border-cyan-400/70 text-cyan-900 bg-cyan-100/85 hover:bg-cyan-100",
        noQuestion: "text-slate-500",
        userBubble: "bg-cyan-600 text-white rounded-tr-none",
        botBubble: "bg-white text-slate-800 border border-slate-200 rounded-tl-none",
        suggestionLabel: "text-slate-500",
        footer: "border-slate-200/90 bg-white",
        reset: "text-slate-500 hover:text-cyan-700",
        composerShell: "border-slate-200 bg-slate-50",
        composerInput: "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
        composerButton: "bg-cyan-600 text-white hover:bg-cyan-700",
        viewSwitchShell: "border-slate-200 bg-slate-100/90",
        viewSwitchActive: "bg-white text-slate-900 shadow-sm",
        viewSwitchIdle: "text-slate-500 hover:text-slate-900",
        sessionBadge: "border-slate-200 bg-white text-slate-700",
        toggleOpen: "bg-white text-cyan-700 border border-slate-200 shadow-[0_12px_24px_rgba(15,23,42,0.18)]",
        toggleClosed: "bg-cyan-500 text-slate-950 hover:scale-110 active:scale-95 shadow-[0_14px_30px_rgba(6,182,212,0.35)]",
      }
      : {
        panel: "border-slate-700 bg-[#0b1220]/95 shadow-2xl",
        header: "border-slate-700/80 bg-gradient-to-r from-slate-900/90 to-slate-800/90 text-slate-100",
        subtitle: "text-cyan-300/90",
        closeButton: "text-slate-200 hover:bg-slate-700",
        body: "bg-[#0f172a] text-slate-100",
        metaLabel: "text-cyan-300/90",
        categoryActive: "border-cyan-400 bg-cyan-400/20 text-cyan-200",
        categoryIdle: "border-slate-600 bg-slate-800/70 text-slate-200 hover:border-cyan-400/70 hover:text-cyan-200",
        chip: "border-cyan-500/40 text-cyan-100 bg-cyan-500/10 hover:bg-cyan-500/20",
        noQuestion: "text-slate-400",
        userBubble: "bg-cyan-500 text-slate-950 rounded-tr-none",
        botBubble: "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none",
        suggestionLabel: "text-slate-400",
        footer: "border-slate-700/80 bg-[#0b1220]",
        reset: "text-slate-400 hover:text-cyan-300",
        composerShell: "border-slate-700 bg-slate-900/80",
        composerInput: "border-slate-600 bg-slate-950 text-slate-100 placeholder:text-slate-500",
        composerButton: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
        viewSwitchShell: "border-slate-700 bg-slate-900/90",
        viewSwitchActive: "bg-slate-800 text-slate-100",
        viewSwitchIdle: "text-slate-400 hover:text-slate-100",
        sessionBadge: "border-slate-700 bg-slate-900 text-slate-200",
        toggleOpen: "bg-slate-900 text-cyan-300 border border-slate-700",
        toggleClosed: "bg-cyan-500 text-slate-950 hover:scale-110 active:scale-95",
      }),
    [isLight],
  );

  const adminCopy = useMemo(() => ({
    kicker: ui.adminPanelKicker || fallbackUi.adminPanelKicker,
    title: ui.adminPanelTitle || fallbackUi.adminPanelTitle,
    newFaq: ui.adminPanelNew || fallbackUi.adminPanelNew,
    totalLabel: ui.adminPanelTotal || fallbackUi.adminPanelTotal,
    activeLabel: ui.adminPanelActive || fallbackUi.adminPanelActive,
    usageLabel: ui.adminPanelUsage || fallbackUi.adminPanelUsage,
    usageShort: ui.adminPanelUsageShort || fallbackUi.adminPanelUsageShort,
    loading: ui.adminPanelLoading || fallbackUi.adminPanelLoading,
    emptyState: ui.adminPanelEmpty || fallbackUi.adminPanelEmpty,
    untitled: ui.adminPanelUntitled || fallbackUi.adminPanelUntitled,
    activeState: ui.adminPanelActiveState || fallbackUi.adminPanelActiveState,
    inactiveState: ui.adminPanelInactiveState || fallbackUi.adminPanelInactiveState,
    editKicker: ui.adminPanelEditKicker || fallbackUi.adminPanelEditKicker,
    createKicker: ui.adminPanelCreateKicker || fallbackUi.adminPanelCreateKicker,
    editTitle: ui.adminPanelEditTitle || fallbackUi.adminPanelEditTitle,
    createTitle: ui.adminPanelCreateTitle || fallbackUi.adminPanelCreateTitle,
    activeToggle: ui.adminPanelActiveToggle || fallbackUi.adminPanelActiveToggle,
    questionLabel: ui.adminPanelQuestion || fallbackUi.adminPanelQuestion,
    questionPlaceholder: ui.adminPanelQuestionPlaceholder || fallbackUi.adminPanelQuestionPlaceholder,
    answerLabel: ui.adminPanelAnswer || fallbackUi.adminPanelAnswer,
    answerPlaceholder: ui.adminPanelAnswerPlaceholder || fallbackUi.adminPanelAnswerPlaceholder,
    keywordsLabel: ui.adminPanelKeywords || fallbackUi.adminPanelKeywords,
    keywordsPlaceholder: ui.adminPanelKeywordsPlaceholder || fallbackUi.adminPanelKeywordsPlaceholder,
    saveCreate: ui.adminPanelSaveCreate || fallbackUi.adminPanelSaveCreate,
    saveEdit: ui.adminPanelSaveEdit || fallbackUi.adminPanelSaveEdit,
    saving: ui.adminPanelSaving || fallbackUi.adminPanelSaving,
    reset: ui.adminPanelReset || fallbackUi.adminPanelReset,
    loadError: ui.adminPanelLoadError || fallbackUi.adminPanelLoadError,
    saveError: ui.adminPanelSaveError || fallbackUi.adminPanelSaveError,
    saveSuccessCreate: ui.adminPanelSaveSuccessCreate || fallbackUi.adminPanelSaveSuccessCreate,
    saveSuccessEdit: ui.adminPanelSaveSuccessEdit || fallbackUi.adminPanelSaveSuccessEdit,
    deleteAction: ui.adminPanelDeleteAction || fallbackUi.adminPanelDeleteAction,
    deleteConfirm: ui.adminPanelDeleteConfirm || fallbackUi.adminPanelDeleteConfirm,
    deleteCancel: ui.adminPanelDeleteCancel || fallbackUi.adminPanelDeleteCancel,
    deleteHint: ui.adminPanelDeleteHint || fallbackUi.adminPanelDeleteHint,
    deletePrompt: ui.adminPanelDeletePrompt || fallbackUi.adminPanelDeletePrompt,
    deleteTargetLabel: ui.adminPanelDeleteTargetLabel || fallbackUi.adminPanelDeleteTargetLabel,
    deleteError: ui.adminPanelDeleteError || fallbackUi.adminPanelDeleteError,
    deleteSuccess: ui.adminPanelDeleteSuccess || fallbackUi.adminPanelDeleteSuccess,
    deleting: ui.adminPanelDeleting || fallbackUi.adminPanelDeleting,
    themeFieldLabel: language === "fr" ? "Theme" : "Theme",
    filterThemeLabel: language === "fr" ? "Theme courant" : "Current theme",
    filterQuestionLabel: language === "fr" ? "Question en base" : "Stored question",
    filterQuestionPlaceholder: language === "fr" ? "Selectionne une question" : "Select a question",
    selectedUsageLabel: language === "fr" ? "Utilisations" : "Usage",
    selectedUpdatedLabel: language === "fr" ? "Mise a jour" : "Updated",
    selectedThemeLabel: language === "fr" ? "Theme lie" : "Linked theme",
    validationError: language === "fr"
      ? "Complete FR, EN et AR avant d'enregistrer."
      : "Fill FR, EN and AR before saving.",
    languages: {
      fr: "FR",
      en: "EN",
      ar: "AR",
    },
  }), [fallbackUi, language, ui]);

  const [messages, setMessages] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("faq");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [catalogThemes, setCatalogThemes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [adminItems, setAdminItems] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminDraft, setAdminDraft] = useState(createEmptyFaqDraft());
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [adminFilterThemeKey, setAdminFilterThemeKey] = useState("practical");
  const [adminError, setAdminError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const scrollRef = useRef(null);
  const locale = language === "fr" ? "fr-FR" : language === "ar" ? "ar-EG" : "en-US";
  const isAdminSession = Boolean(
    sessionUser && ["admin", "superadmin"].includes(String(sessionUser.role || "").trim()),
  );
  const themeLabels = useMemo(() => ({
    practical: language === "fr" ? "Infos pratiques" : language === "en" ? "Practical" : "Practical",
    access: language === "fr" ? "Acces" : language === "en" ? "Access" : "Access",
    inclusion: language === "fr" ? "Public" : language === "en" ? "Audience" : "Audience",
    projects: language === "fr" ? "Films" : language === "en" ? "Films" : "Films",
  }), [language]);

  const askedQuestionSet = useMemo(
    () => new Set(askedQuestions.map((item) => normalizeQuestionKey(item))),
    [askedQuestions],
  );

  const flows = useMemo(
    () => (catalogThemes.length > 0 ? catalogThemes : FORCED_FLOWS[language] || FORCED_FLOWS.fr),
    [catalogThemes, language],
  );
  const [activeCategoryId, setActiveCategoryId] = useState(getDefaultCategoryId(flows));

  const activeCategory = useMemo(() => {
    if (!Array.isArray(flows) || flows.length === 0) return null;
    return flows.find((item) => item.id === activeCategoryId) || flows[0];
  }, [flows, activeCategoryId]);

  const availableCategoryQuestions = useMemo(() => {
    const questions = activeCategory?.questions || [];
    return questions.filter(
      (question) => !askedQuestionSet.has(normalizeQuestionKey(question)),
    );
  }, [activeCategory, askedQuestionSet]);
  const adminThemeOptions = useMemo(() => (
    ["practical", "access", "inclusion", "projects"].map((themeKey) => ({
      id: themeKey,
      label: themeLabels[themeKey] || themeKey,
      count: adminItems.filter((item) => item?.themeKey === themeKey).length,
    }))
  ), [adminItems, themeLabels]);
  const adminQuestionOptions = useMemo(
    () => adminItems.filter((item) => item?.themeKey === adminFilterThemeKey),
    [adminFilterThemeKey, adminItems],
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, activeCategoryId, viewMode]);

  useEffect(() => {
    const fallback = getDefaultCategoryId(flows);
    if (!activeCategoryId || !flows.some((item) => item.id === activeCategoryId)) {
      setActiveCategoryId(fallback);
    }
  }, [flows, activeCategoryId]);

  useEffect(() => {
    if (previousLanguageRef.current === language) {
      return;
    }

    previousLanguageRef.current = language;
    setMessages([]);
    setAskedQuestions([]);
    setIsLoading(false);
    setViewMode("faq");
    setCatalogThemes([]);
    setCatalogLoaded(false);
    setActiveCategoryId(getDefaultCategoryId(flows));
  }, [language, flows]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isMobileViewport = window.matchMedia("(max-width: 639px)").matches;
    if (!isOpen || !isMobileViewport) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || catalogLoading) {
      return undefined;
    }

    const controller = new AbortController();
    let isCancelled = false;
    setCatalogLoading(true);
    setCatalogLoaded(false);

    getChatbotFaqCatalog({ language, signal: controller.signal })
      .then((payload) => {
        if (isCancelled) return;
        const nextFlows = buildCatalogFlows(payload, themeLabels);
        setCatalogThemes(nextFlows);
        setCatalogLoaded(true);
      })
      .catch((error) => {
        if (isCancelled || error?.name === "AbortError") return;
        console.warn("[FAQ] catalog loading failed:", error?.message || error);
        setCatalogThemes([]);
        setCatalogLoaded(true);
      })
      .finally(() => {
        if (!isCancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isOpen, language, themeLabels]);

  useEffect(() => {
    if (!isOpen || sessionLoading) {
      return undefined;
    }

    const controller = new AbortController();
    let isCancelled = false;
    setSessionLoading(true);

    getCurrentSessionUser({ signal: controller.signal })
      .then((payload) => {
        if (isCancelled) return;
        setSessionUser(payload?.authenticated ? payload.user || null : null);
      })
      .catch((error) => {
        if (isCancelled || error?.name === "AbortError") return;
        const message = String(error?.message || "");
        if (!/\b401\b/.test(message)) {
          console.warn("[FAQ] session check failed:", message || error);
        }
        setSessionUser(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setSessionLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isAdminSession) return;
    setViewMode("faq");
    setAdminLoaded(false);
  }, [isAdminSession]);

  useEffect(() => {
    if (!isOpen || !isAdminSession || viewMode !== "admin" || adminLoading) {
      return undefined;
    }

    const controller = new AbortController();
    let isCancelled = false;
    setAdminLoading(true);
    setAdminLoaded(false);
    setAdminError("");

    getChatbotAdminFaqs({ signal: controller.signal })
      .then((payload) => {
        if (isCancelled) return;
        const normalized = normalizeFaqAdminResponse(payload);
        setAdminItems(normalized.items);
        setAdminSummary(normalized.summary);
        setAdminDraft(resolveFaqDraft(normalized.items));
        setAdminFilterThemeKey(normalized.items[0]?.themeKey || "practical");
        setAdminLoaded(true);
      })
      .catch((error) => {
        if (isCancelled || error?.name === "AbortError") return;
        setAdminItems([]);
        setAdminSummary(null);
        setAdminError(String(error?.message || adminCopy.loadError));
        setAdminLoaded(true);
      })
      .finally(() => {
        if (!isCancelled) {
          setAdminLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [adminCopy.loadError, isAdminSession, isOpen, viewMode]);

  const markQuestionAsAsked = (question) => {
    const normalized = normalizeQuestionKey(question);
    if (!normalized) return;
    setAskedQuestions((prev) => {
      if (prev.some((item) => normalizeQuestionKey(item) === normalized)) {
        return prev;
      }
      return [...prev, question];
    });
  };

  const askQuestion = async (question) => {
    const candidate = String(question || "").trim();
    if (!candidate || isLoading) return;

    const currentAsked = new Set(askedQuestionSet);
    currentAsked.add(normalizeQuestionKey(candidate));
    markQuestionAsAsked(candidate);

    const typingId = `typing_${Date.now()}`;
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: `user_${Date.now()}`, role: "user", text: candidate },
      { id: typingId, role: "bot", text: ui.thinking, suggestions: [], loading: true },
    ]);

    try {
      const response = await fetch(resolveApiRequestUrl("/api/chatbot/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: candidate, language }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = String(data?.reply || "").trim() || ui.genericError;
      const suggestions = Array.isArray(data?.suggestions)
        ? data.suggestions
            .filter((item) => typeof item === "string" && item.trim())
            .filter(
              (item) => !currentAsked.has(normalizeQuestionKey(item)),
            )
        : [];

      setMessages((prev) =>
        prev.map((message) =>
          message.id === typingId
            ? { ...message, text: reply, loading: false, suggestions }
            : message,
        ),
      );
    } catch (error) {
      console.error("[FAQ] UI error:", error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === typingId
            ? { ...message, text: ui.genericError, loading: false, suggestions: [] }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setAskedQuestions([]);
    setActiveCategoryId(getDefaultCategoryId(flows));
  };

  const handleSelectAdminFaq = (item) => {
    setAdminError("");
    setAdminNotice("");
    setAdminFilterThemeKey(String(item?.themeKey || "practical"));
    setAdminDraft(createFaqDraftFromItem(item));
  };

  const handleCreateAdminFaq = () => {
    setAdminError("");
    setAdminNotice("");
    setAdminDraft({
      ...createEmptyFaqDraft(),
      themeKey: adminFilterThemeKey || "practical",
    });
  };

  const handleAdminFilterThemeChange = (nextThemeKey) => {
    const safeThemeKey = String(nextThemeKey || "practical");
    setAdminFilterThemeKey(safeThemeKey);
    setAdminError("");
    setAdminNotice("");
    setAdminDraft((current) => (
      current.mode === "edit" && current.themeKey === safeThemeKey
        ? current
        : {
          ...createEmptyFaqDraft(),
          themeKey: safeThemeKey,
        }
    ));
  };

  const handleAdminMetaChange = (field, value) => {
    if (field === "themeKey") {
      setAdminFilterThemeKey(String(value || "practical"));
    }
    setAdminDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAdminTranslationChange = (languageCode, field, value) => {
    setAdminDraft((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [languageCode]: {
          ...current.translations[languageCode],
          [field]: value,
        },
      },
    }));
  };

  const handleAdminReset = () => {
    setAdminError("");
    setAdminNotice("");
    setAdminDraft((current) => {
      if (current.mode === "edit") {
        const matched = adminItems.find((item) => item?.faqKey === current.faqKey);
        if (matched) {
          return createFaqDraftFromItem(matched);
        }
      }

      return createEmptyFaqDraft();
    });
  };

  const syncCatalogWithAdminFaqs = async (context = "save") => {
    try {
      const refreshedCatalog = await getChatbotFaqCatalog({ language });
      setCatalogThemes(buildCatalogFlows(refreshedCatalog, themeLabels));
      setCatalogLoaded(true);
    } catch (catalogError) {
      console.warn(`[FAQ] catalog refresh failed after ${context}:`, catalogError?.message || catalogError);
    }
  };

  const handleAdminSubmit = async () => {
    const payload = buildFaqPayloadFromDraft(adminDraft);
    const missingLanguage = ["fr", "en", "ar"].find(
      (languageCode) => !payload.translations[languageCode].question || !payload.translations[languageCode].answer,
    );

    if (missingLanguage) {
      setAdminNotice("");
      setAdminError(`${adminCopy.validationError} ${missingLanguage.toUpperCase()}.`);
      return;
    }

    const draftMode = adminDraft.mode;
    const currentFaqKey = adminDraft.faqKey;

    setAdminSaving(true);
    setAdminError("");
    setAdminNotice("");

    try {
      const response = draftMode === "edit"
        ? await updateChatbotAdminFaq(currentFaqKey, payload)
        : await createChatbotAdminFaq(payload);
      const refreshed = await getChatbotAdminFaqs();
      const normalized = normalizeFaqAdminResponse(refreshed);
      const preferredFaqKey = String(response?.item?.faqKey || currentFaqKey || "");

      setAdminItems(normalized.items);
      setAdminSummary(normalized.summary);
      setAdminDraft(resolveFaqDraft(normalized.items, preferredFaqKey));
      setAdminFilterThemeKey(String(response?.item?.themeKey || adminDraft.themeKey || "practical"));
      await syncCatalogWithAdminFaqs("save");
      setAdminLoaded(true);
      setAdminNotice(
        draftMode === "edit"
          ? adminCopy.saveSuccessEdit
          : adminCopy.saveSuccessCreate,
      );
    } catch (error) {
      setAdminError(String(error?.message || adminCopy.saveError));
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAdminDelete = async (item) => {
    const faqKey = String(item?.faqKey || adminDraft.faqKey || "").trim();
    if (!faqKey) return;

    const fallbackThemeKey = String(item?.themeKey || adminDraft.themeKey || adminFilterThemeKey || "practical");

    setAdminDeleting(true);
    setAdminError("");
    setAdminNotice("");

    try {
      await deleteChatbotAdminFaq(faqKey);
      const refreshed = await getChatbotAdminFaqs();
      const normalized = normalizeFaqAdminResponse(refreshed);
      const nextState = resolveFaqStateAfterDeletion(normalized.items, fallbackThemeKey);

      setAdminItems(normalized.items);
      setAdminSummary(normalized.summary);
      setAdminDraft(nextState.draft);
      setAdminFilterThemeKey(nextState.filterThemeKey);
      await syncCatalogWithAdminFaqs("delete");
      setAdminLoaded(true);
      setAdminNotice(adminCopy.deleteSuccess);
    } catch (error) {
      setAdminError(String(error?.message || adminCopy.deleteError));
    } finally {
      setAdminDeleting(false);
    }
  };

  const rootPositionClass = isOpen
    ? (isRtl
      ? "inset-0 sm:inset-auto sm:left-6 sm:bottom-6"
      : "inset-0 sm:inset-auto sm:right-6 sm:bottom-6")
    : (isRtl
      ? "left-4 bottom-4 sm:left-6 sm:bottom-6"
      : "right-4 bottom-4 sm:right-6 sm:bottom-6");

  const desktopPanelClass = isAdminSession && viewMode === "admin"
    ? "sm:w-[48rem] sm:h-[min(84vh,760px)]"
    : "sm:w-[26rem] sm:h-[min(82vh,680px)]";
  const panelOpenClass = isOpen
    ? `w-full h-[100dvh] rounded-none border-0 opacity-100 scale-100 sm:rounded-[2rem] sm:border ${desktopPanelClass}`
    : "w-0 h-0 opacity-0 scale-95 invisible";

  const toggleVisibilityClass = isOpen ? "hidden sm:flex" : "flex";

  const renderPicker = () => (
    <div className="space-y-2">
      <p className={`text-[10px] uppercase tracking-[0.2em] ${theme.metaLabel}`}>{ui.categoriesTitle}</p>
      {catalogLoading && (
        <p className={`text-xs ${theme.noQuestion}`}>{ui.thinking}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {flows.map((flow) => (
          <button
            key={flow.id}
            type="button"
            disabled={isLoading}
            onClick={() => setActiveCategoryId(flow.id)}
            className={`text-xs rounded-full px-3 py-1 border transition disabled:opacity-50 ${
              flow.id === activeCategory?.id
                ? theme.categoryActive
                : theme.categoryIdle
            }`}
          >
            {flow.label}
          </button>
        ))}
      </div>
      <p className={`text-[10px] uppercase tracking-[0.2em] ${theme.metaLabel}`}>{ui.questionsTitle}</p>
      {availableCategoryQuestions.length === 0 ? (
        <p className={`text-xs ${theme.noQuestion}`}>{ui.noQuestionLeft}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableCategoryQuestions.map((question) => (
            <button
              key={`${activeCategory?.id || "default"}_${question}`}
              type="button"
              disabled={isLoading}
              onClick={() => askQuestion(question)}
              className={`text-xs border rounded-full px-3 py-1 transition disabled:opacity-50 ${theme.chip}`}
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderFaqBody = () => (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 space-y-4 ${theme.body}`}>
      {messages.length === 0 ? (
        <div className="text-center py-4 space-y-3">
          <div className={`text-3xl ${theme.metaLabel}`}>?</div>
          <p className="font-semibold">{ui.welcomeTitle}</p>
          <p className={`text-xs ${theme.noQuestion}`}>{ui.welcomeText}</p>
          <div className={`mt-2 ${isRtl ? "text-right" : "text-left"}`}>{renderPicker()}</div>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="flex flex-col space-y-1">
            <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`px-4 py-2 rounded-2xl text-sm max-w-[90%] shadow-sm whitespace-pre-line ${
                  message.role === "user"
                    ? theme.userBubble
                    : theme.botBubble
                }`}
              >
                {message.text}
              </div>
            </div>

            {message.role === "bot"
              && Array.isArray(message.suggestions)
              && message.suggestions.length > 0 && (
                <div className="pl-1 pr-1">
                  <p className={`text-[11px] mb-1 ${theme.suggestionLabel}`}>{ui.suggestionsTitle}</p>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion) => (
                      <button
                        key={`${message.id}_${suggestion}`}
                        type="button"
                        disabled={isLoading}
                        onClick={() => askQuestion(suggestion)}
                        className={`text-xs border rounded-full px-3 py-1 transition disabled:opacity-50 ${theme.chip}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={`fixed z-[70] font-sans ${rootPositionClass}`}>
      <div
        className={`backdrop-blur-lg transition-all duration-300 ${
          isRtl ? "origin-bottom-left" : "origin-bottom-right"
        } ${theme.panel} ${panelOpenClass}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {isOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div
              className={`sticky top-0 z-10 border-b px-4 py-3 sm:p-4 ${theme.header}`}
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg tracking-tight">{ui.title}</h3>
                  <p className={`text-[10px] uppercase tracking-[0.2em] ${theme.subtitle}`}>{ui.subtitle}</p>
                </div>

                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {isAdminSession ? (
                    <div className={`inline-flex items-center rounded-full border p-1 ${theme.viewSwitchShell}`}>
                      <button
                        type="button"
                        onClick={() => setViewMode("faq")}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          viewMode === "faq" ? theme.viewSwitchActive : theme.viewSwitchIdle
                        }`}
                      >
                        {ui.faqView || fallbackUi.faqView || "FAQ"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminLoaded(false);
                          setViewMode("admin");
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          viewMode === "admin" ? theme.viewSwitchActive : theme.viewSwitchIdle
                        }`}
                      >
                        {ui.adminView || fallbackUi.adminView || "Manage"}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label={ui.close}
                    className={`h-10 w-10 sm:h-8 sm:w-8 rounded-full shrink-0 grid place-items-center transition ${theme.closeButton}`}
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "admin" && isAdminSession ? (
              <div className={`flex-1 overflow-y-auto p-4 ${theme.body}`}>
                <FaqAdminPanel
                  copy={adminCopy}
                  locale={locale}
                  isLight={isLight}
                  items={adminItems}
                  summary={adminSummary}
                  draft={adminDraft}
                  themeOptions={adminThemeOptions}
                  questionOptions={adminQuestionOptions}
                  filterThemeKey={adminFilterThemeKey}
                  loading={adminLoading}
                  saving={adminSaving}
                  deleting={adminDeleting}
                  error={adminError}
                  notice={adminNotice}
                  onSelect={handleSelectAdminFaq}
                  onCreate={handleCreateAdminFaq}
                  onFilterThemeChange={handleAdminFilterThemeChange}
                  onMetaChange={handleAdminMetaChange}
                  onTranslationChange={handleAdminTranslationChange}
                  onSubmit={handleAdminSubmit}
                  onReset={handleAdminReset}
                  onDelete={handleAdminDelete}
                />
              </div>
            ) : (
              <>
                {renderFaqBody()}

                <div className={`p-3 border-t space-y-3 ${theme.footer}`}>
                  {messages.length > 0 && renderPicker()}

                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={resetConversation}
                      className={`w-full text-[10px] uppercase tracking-[0.2em] transition ${theme.reset}`}
                    >
                      {ui.reset}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={`sm:hidden w-full rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      isLight
                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        : "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    }`}
                  >
                    {ui.close}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? ui.close : ui.open}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full items-center justify-center transition-all duration-300 ${toggleVisibilityClass} ${
          isOpen
            ? theme.toggleOpen
            : theme.toggleClosed
        }`}
      >
        {isOpen ? (
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <div className="relative">
            <span className="text-3xl" aria-hidden="true">
              ?
            </span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-70" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500" />
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
