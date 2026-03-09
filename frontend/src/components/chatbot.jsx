import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

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

export default function FaqChatbot() {
  const { i18n } = useTranslation();
  const { isLight } = useTheme();
  const language = normalizeUiLanguage(i18n.language);
  const ui = UI_COPY[language];
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
        toggleOpen: "bg-slate-900 text-cyan-300 border border-slate-700",
        toggleClosed: "bg-cyan-500 text-slate-950 hover:scale-110 active:scale-95",
      }),
    [isLight],
  );

  const [messages, setMessages] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const askedQuestionSet = useMemo(
    () => new Set(askedQuestions.map((item) => normalizeQuestionKey(item))),
    [askedQuestions],
  );

  const flows = useMemo(() => FORCED_FLOWS[language] || FORCED_FLOWS.fr, [language]);
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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, activeCategoryId]);

  useEffect(() => {
    const fallback = getDefaultCategoryId(flows);
    if (!activeCategoryId || !flows.some((item) => item.id === activeCategoryId)) {
      setActiveCategoryId(fallback);
    }
  }, [flows, activeCategoryId]);

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
      const response = await fetch("/api/chatbot/ask", {
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

  const rootPositionClass = isOpen
    ? (isRtl
      ? "inset-0 sm:inset-auto sm:left-6 sm:bottom-6"
      : "inset-0 sm:inset-auto sm:right-6 sm:bottom-6")
    : (isRtl
      ? "left-4 bottom-4 sm:left-6 sm:bottom-6"
      : "right-4 bottom-4 sm:right-6 sm:bottom-6");

  const panelOpenClass = isOpen
    ? "w-full h-[100dvh] rounded-none border-0 opacity-100 scale-100 sm:w-[26rem] sm:h-[min(82vh,680px)] sm:rounded-2xl sm:border"
    : "w-0 h-0 opacity-0 scale-95 invisible";

  const toggleVisibilityClass = isOpen ? "hidden sm:flex" : "flex";

  const renderPicker = () => (
    <div className="space-y-2">
      <p className={`text-[10px] uppercase tracking-[0.2em] ${theme.metaLabel}`}>{ui.categoriesTitle}</p>
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
              className={`sticky top-0 z-10 border-b flex justify-between items-center px-4 py-3 sm:p-4 ${theme.header}`}
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
            >
              <div>
                <h3 className="font-bold text-lg tracking-tight">{ui.title}</h3>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${theme.subtitle}`}>{ui.subtitle}</p>
              </div>
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
                    <div
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
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

            <div className={`p-3 border-t space-y-2 ${theme.footer}`}>
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
