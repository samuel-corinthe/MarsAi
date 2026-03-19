import { useDeferredValue, useEffect, useState } from "react";
import {
  createAdminChatbotFaq,
  getAdminChatbotFaqs,
  updateAdminChatbotFaq,
} from "../../api";

const REQUIRED_LANGUAGES = ["fr", "en", "ar"];

function createEmptyTranslations() {
  return {
    fr: { question: "", answer: "", keywords: "" },
    en: { question: "", answer: "", keywords: "" },
    ar: { question: "", answer: "", keywords: "" },
  };
}

function createInitialFormState() {
  return {
    faqKey: "",
    isActive: true,
    translations: createEmptyTranslations(),
  };
}

function buildFormStateFromItem(item) {
  const nextState = createInitialFormState();
  nextState.faqKey = String(item?.faqKey || "");
  nextState.isActive = Boolean(item?.isActive);

  REQUIRED_LANGUAGES.forEach((language) => {
    nextState.translations[language] = {
      question: String(item?.translations?.[language]?.question || ""),
      answer: String(item?.translations?.[language]?.answer || ""),
      keywords: String(item?.translations?.[language]?.keywords || ""),
    };
  });

  return nextState;
}

function formatDateLabel(value) {
  if (!value) return "Jamais";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Jamais";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function countCompletedTranslations(item) {
  return REQUIRED_LANGUAGES.reduce((count, language) => {
    const question = String(item?.translations?.[language]?.question || "").trim();
    const answer = String(item?.translations?.[language]?.answer || "").trim();
    return count + (question && answer ? 1 : 0);
  }, 0);
}

function buildSearchableText(item) {
  return [
    item?.faqKey,
    item?.translations?.fr?.question,
    item?.translations?.en?.question,
    item?.translations?.ar?.question,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
}

function validateFormState(formState) {
  for (const language of REQUIRED_LANGUAGES) {
    const question = String(formState?.translations?.[language]?.question || "").trim();
    const answer = String(formState?.translations?.[language]?.answer || "").trim();
    if (!question || !answer) {
      return "Les trois langues doivent contenir une question et une reponse.";
    }
  }

  return "";
}

function buildPayloadFromFormState(formState) {
  const translations = {};

  REQUIRED_LANGUAGES.forEach((language) => {
    translations[language] = {
      question: String(formState?.translations?.[language]?.question || "").trim(),
      answer: String(formState?.translations?.[language]?.answer || "").trim(),
      keywords: String(formState?.translations?.[language]?.keywords || "").trim(),
    };
  });

  return {
    isActive: Boolean(formState?.isActive),
    translations,
  };
}

export default function ChatbotFaqCard() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalUsage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyFaqKey, setBusyFaqKey] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState(createInitialFormState());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const deferredSearchQuery = useDeferredValue(String(searchQuery || "").trim().toLowerCase());

  useEffect(() => {
    let cancelled = false;

    const loadFaqs = async (isSilentRefresh = false) => {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      try {
        const payload = await getAdminChatbotFaqs();
        if (cancelled) return;
        setItems(Array.isArray(payload?.items) ? payload.items : []);
        setSummary(
          payload?.summary || {
            total: 0,
            active: 0,
            inactive: 0,
            totalUsage: 0,
          },
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || "Impossible de charger les FAQ.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadFaqs(false);
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = items.filter((item) => {
    if (!deferredSearchQuery) return true;
    return buildSearchableText(item).includes(deferredSearchQuery);
  });

  const openCreateModal = () => {
    setIsEditing(false);
    setFormState(createInitialFormState());
    setFormError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setFormState(buildFormStateFromItem(item));
    setFormError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setFormError("");
  };

  const refreshFaqs = async () => {
    setRefreshing(true);
    setError("");
    try {
      const payload = await getAdminChatbotFaqs();
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setSummary(
        payload?.summary || {
          total: 0,
          active: 0,
          inactive: 0,
          totalUsage: 0,
        },
      );
    } catch (loadError) {
      setError(loadError?.message || "Impossible de recharger les FAQ.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleTranslationChange = (language, field, value) => {
    setFormState((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [language]: {
          ...current.translations[language],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    const validationError = validateFormState(formState);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    setError("");
    setSuccess("");

    try {
      const payload = buildPayloadFromFormState(formState);
      if (isEditing && formState.faqKey) {
        await updateAdminChatbotFaq(formState.faqKey, payload);
        setSuccess("FAQ mise a jour.");
      } else {
        await createAdminChatbotFaq(payload);
        setSuccess("FAQ ajoutee.");
      }

      await refreshFaqs();
      setIsModalOpen(false);
    } catch (submitError) {
      setFormError(submitError?.message || "Impossible d'enregistrer la FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const faqKey = String(item?.faqKey || "");
    if (!faqKey) return;

    setBusyFaqKey(faqKey);
    setError("");
    setSuccess("");

    try {
      await updateAdminChatbotFaq(faqKey, {
        isActive: !item?.isActive,
      });
      await refreshFaqs();
      setSuccess(item?.isActive ? "FAQ desactivee." : "FAQ activee.");
    } catch (toggleError) {
      setError(toggleError?.message || "Impossible de changer le statut de la FAQ.");
    } finally {
      setBusyFaqKey("");
    }
  };

  return (
    <>
      <div className="glass faq-admin-card p-5 space-y-5">
        <div className="faq-admin-head">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black uppercase tracking-tight text-white">Gestion FAQ chatbot</h3>
              <span className="faq-admin-chip">3 langues obligatoires</span>
            </div>
            <p className="text-sm text-slate-200/85">
              Apercu propre des FAQ, edition groupee fr/en/ar et activation en un seul point.
            </p>
          </div>
          <div className="faq-admin-stats">
            <div className="faq-admin-stat">
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="faq-admin-stat">
              <span>Actives</span>
              <strong>{summary.active}</strong>
            </div>
            <div className="faq-admin-stat">
              <span>Usages</span>
              <strong>{summary.totalUsage}</strong>
            </div>
          </div>
        </div>

        <div className="faq-admin-toolbar">
          <label className="faq-admin-search">
            <span className="sr-only">Chercher une FAQ</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Chercher une question ou une cle..."
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost rounded-lg border border-white/10 px-4 py-2 disabled:opacity-60"
              onClick={refreshFaqs}
              disabled={refreshing || loading}
            >
              {refreshing ? "Actualisation..." : "Rafraichir"}
            </button>
            <button
              type="button"
              className="btn-primary rounded-lg px-4 py-2"
              onClick={openCreateModal}
            >
              Ajouter une FAQ
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-100">
            {success}
          </p>
        )}

        <div className="faq-admin-list">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`faq-skeleton-${index}`} className="faq-admin-row faq-admin-row-skeleton" />
            ))
          ) : filteredItems.length === 0 ? (
            <div className="faq-admin-empty">
              {items.length === 0
                ? "Aucune FAQ pour le moment."
                : "Aucune FAQ ne correspond a votre recherche."}
            </div>
          ) : (
            filteredItems.map((item) => {
              const completedTranslations = countCompletedTranslations(item);
              const isBusy = busyFaqKey === item.faqKey;

              return (
                <article key={item.faqKey} className="faq-admin-row">
                  <div className="faq-admin-row-main">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`faq-admin-status ${item.isActive ? "is-active" : "is-inactive"}`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="faq-admin-key">{item.faqKey}</span>
                    </div>
                    <h4 className="faq-admin-question">
                      {item?.translations?.fr?.question || item?.translations?.en?.question || "Question vide"}
                    </h4>
                    <div className="faq-admin-meta">
                      <span>{completedTranslations}/3 langues remplies</span>
                      <span>{item.usageCount} usages</span>
                      <span>Mise a jour: {formatDateLabel(item.updatedAt || item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="faq-admin-actions">
                    <button
                      type="button"
                      className="btn-ghost rounded-lg border border-white/10 px-3 py-2"
                      onClick={() => openEditModal(item)}
                    >
                      Editer
                    </button>
                    <button
                      type="button"
                      className="faq-admin-toggle"
                      onClick={() => handleToggleStatus(item)}
                      disabled={isBusy}
                    >
                      {isBusy
                        ? "..."
                        : item.isActive
                          ? "Desactiver"
                          : "Activer"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="faq-admin-modal-shell">
          <div className="faq-admin-modal-backdrop" onClick={closeModal} />
          <div className="faq-admin-modal">
            <div className="faq-admin-modal-head">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  {isEditing ? "Editer la FAQ" : "Ajouter une FAQ"}
                </h3>
                <p className="text-sm text-slate-300/85">
                  Une seule sauvegarde met a jour les trois langues.
                </p>
              </div>
              <button
                type="button"
                className="faq-admin-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Fermer la fenetre FAQ"
              >
                x
              </button>
            </div>

            <div className="faq-admin-modal-topbar">
              <div className="faq-admin-chip">
                Cle: {formState.faqKey || "generee automatiquement"}
              </div>
              <label className="faq-admin-switch">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <span>{formState.isActive ? "FAQ active" : "FAQ inactive"}</span>
              </label>
            </div>

            {formError && (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
                {formError}
              </p>
            )}

            <div className="faq-admin-form-grid">
              {REQUIRED_LANGUAGES.map((language) => (
                <section
                  key={language}
                  className="faq-admin-pane"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <div className="faq-admin-pane-head">
                    <h4>{language.toUpperCase()}</h4>
                    <span>{language === "ar" ? "Arabe" : language === "en" ? "English" : "Francais"}</span>
                  </div>

                  <label className="faq-admin-field">
                    <span>Question</span>
                    <input
                      type="text"
                      value={formState.translations[language].question}
                      onChange={(event) =>
                        handleTranslationChange(language, "question", event.target.value)
                      }
                      placeholder="Entrez la question"
                    />
                  </label>

                  <label className="faq-admin-field">
                    <span>Reponse</span>
                    <textarea
                      rows="6"
                      value={formState.translations[language].answer}
                      onChange={(event) =>
                        handleTranslationChange(language, "answer", event.target.value)
                      }
                      placeholder="Entrez la reponse"
                    />
                  </label>

                  <label className="faq-admin-field">
                    <span>Mots-cles (optionnel)</span>
                    <textarea
                      rows="3"
                      value={formState.translations[language].keywords}
                      onChange={(event) =>
                        handleTranslationChange(language, "keywords", event.target.value)
                      }
                      placeholder="faq mot-cle recherche"
                    />
                  </label>
                </section>
              ))}
            </div>

            <div className="faq-admin-modal-actions">
              <button
                type="button"
                className="btn-ghost rounded-lg border border-white/10 px-4 py-2"
                onClick={closeModal}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary rounded-lg px-4 py-2 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : isEditing ? "Mettre a jour" : "Creer la FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
