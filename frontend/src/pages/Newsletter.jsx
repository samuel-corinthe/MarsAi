import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { BreadcrumbSchema } from "../components/Schema";
import { useTranslation } from "react-i18next";
import { subscribeNewsletterForm } from "../api";
import { useTheme } from "../context/ThemeContext";
import {
  getLocalizedPath,
  normalizeLanguage,
} from "../utils/localizedRoutes";

export default function Newsletter() {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const isArabic = normalizeLanguage(i18n.language) === "ar";
  const cguPath = getLocalizedPath("cgu", i18n.language);

  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    preferences: [],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  const flashMessageRef = useRef(null);

  useEffect(() => {
    if (!flashMessage || typeof window === "undefined") return undefined;

    const frameId = window.requestAnimationFrame(() => {
      flashMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [flashMessage, isSubmitted]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (preference) => {
    setFormData((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter((item) => item !== preference)
        : [...prev.preferences, preference],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setFlashMessage(null);

    try {
      await subscribeNewsletterForm({
        ...formData,
        lang: i18n.language,
      });
      setIsSubmitted(true);
      setFlashMessage({
        type: "success",
        title: t("newsletter.form.success_title"),
        message: t("newsletter.form.success_msg"),
        hint: t("newsletter.form.success_hint"),
      });
      setTimeout(() => {
        setIsSubmitted(false);
        setFlashMessage(null);
        setFormData({ firstName: "", email: "", preferences: [] });
      }, 5000);
    } catch (error) {
      setFlashMessage({
        type: "error",
        title: t("common.error", "Erreur"),
        message: error?.message || t("newsletter.errors.server"),
        hint: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    { number: "15K+", label: t("newsletter.stats.subscribers") },
    {
      number: t("newsletter.stats.freq_value"),
      label: t("newsletter.stats.frequency"),
    },
    { number: "95%", label: t("newsletter.stats.open_rate") },
  ];

  const benefitCards = [
    {
      id: "preview",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      id: "offers",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      ),
    },
    {
      id: "content",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
  ];

  const breadcrumbItems = [
    {
      name: t("nav.home", "Accueil"),
      url: getLocalizedPath("home", i18n.language),
    },
    {
      name: t("newsletter.hero.badge", "Newsletter"),
      url: getLocalizedPath("newsletter", i18n.language),
    },
  ];
  const theme = isLight
    ? {
      page: "site-page newsletter-page text-slate-900",
      heroOverlay: "from-sky-300/20 via-transparent to-transparent",
      badge: "border-sky-300/70 bg-sky-100 text-sky-700",
      title: "text-slate-900",
      titleAccent: "from-sky-600 via-cyan-500 to-indigo-500",
      subtitle: "text-slate-600",
      statsBorder: "border-sky-200/80",
      statValue: "from-sky-600 to-cyan-500",
      statLabel: "text-slate-500",
      panel: "border-slate-200 bg-white",
      panelTitle: "text-slate-900",
      panelSubtitle: "text-slate-600",
      label: "text-slate-700",
      input: "border-slate-300 bg-white text-slate-900 focus:border-sky-400",
      checkboxText: "text-slate-600 group-hover:text-slate-800",
      helper: "text-slate-500",
      helperLink: "text-sky-700 hover:underline",
      success: "border-emerald-300/70 bg-emerald-50",
      successTitle: "text-emerald-700",
      successText: "text-emerald-800",
      successHint: "text-emerald-700/90",
      error: "border-rose-300/70 bg-rose-50",
      errorTitle: "text-rose-700",
      errorText: "text-rose-800",
      sectionBorder: "border-sky-200/80",
      sectionTitle: "text-slate-900",
      sectionSubtitle: "text-slate-600",
      benefitCard: "border-slate-200 bg-white hover:border-sky-300/70",
      benefitTitle: "text-slate-900",
      benefitText: "text-slate-600",
      faqCard: "border-slate-200 bg-white",
      faqTitle: "text-slate-900",
      faqText: "text-slate-600",
    }
    : {
      page: "min-h-screen bg-[#020617] text-slate-100",
      heroOverlay: "from-cyan-400/10 via-transparent to-transparent",
      badge: "border-cyan-300/35 bg-cyan-400/10 text-cyan-200",
      title: "text-white",
      titleAccent: "from-cyan-300 via-sky-300 to-indigo-300",
      subtitle: "text-slate-300",
      statsBorder: "border-slate-800/80",
      statValue: "from-cyan-300 to-sky-300",
      statLabel: "text-slate-400",
      panel: "border-slate-700 bg-gradient-to-br from-[#0f172a] to-[#020617]",
      panelTitle: "text-white",
      panelSubtitle: "text-slate-400",
      label: "text-slate-300",
      input: "border-slate-700 bg-slate-900 text-white focus:border-cyan-300",
      checkboxText: "text-slate-400 group-hover:text-slate-300",
      helper: "text-slate-500",
      helperLink: "text-cyan-300 hover:underline",
      success: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10",
      successTitle: "text-white",
      successText: "text-slate-300",
      successHint: "text-slate-400",
      error: "border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-red-500/10",
      errorTitle: "text-white",
      errorText: "text-slate-300",
      sectionBorder: "border-slate-800/80",
      sectionTitle: "text-white",
      sectionSubtitle: "text-slate-400",
      benefitCard: "border-slate-700 bg-gradient-to-br from-[#0f172a] to-[#020617] hover:border-cyan-300/55",
      benefitTitle: "text-white",
      benefitText: "text-slate-400",
      faqCard: "border-slate-700 bg-[#0f172a]/90",
      faqTitle: "text-white",
      faqText: "text-slate-400",
    };

  return (
    <>
      <Seo
        title={t("newsletter.hero.badge")}
        description={t("newsletter.hero.description")}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className={theme.page} dir={isArabic ? "rtl" : "ltr"}>
        <section className="relative overflow-hidden px-4 pb-20 pt-32">
          <div className={`absolute inset-0 bg-gradient-to-b ${theme.heroOverlay}`}></div>
          <div className="relative z-10 mx-auto max-w-4xl space-y-6 text-center">
            <div className={`inline-flex items-center space-x-2 rounded-full border px-4 py-2 text-sm font-semibold ${theme.badge}`}>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>{t("newsletter.hero.badge")}</span>
            </div>

            <h1 className={`text-4xl font-black uppercase leading-tight md:text-6xl lg:text-7xl ${theme.title}`}>
              {t("newsletter.hero.title_main")}
              <br />
              <span className={`bg-gradient-to-r bg-clip-text text-transparent ${theme.titleAccent}`}>
                {t("newsletter.hero.title_accent")}
              </span>
            </h1>

            <p className={`mx-auto max-w-2xl text-lg leading-relaxed md:text-xl ${theme.subtitle}`}>
              {t("newsletter.hero.description")}
            </p>
          </div>
        </section>

        <section className={`border-y py-12 px-4 ${theme.statsBorder}`}>
          <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2 text-center">
                <div className={`text-3xl font-black text-transparent bg-gradient-to-r bg-clip-text md:text-5xl ${theme.statValue}`}>
                  {stat.number}
                </div>
                <div className={`text-xs md:text-base ${theme.statLabel}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto max-w-2xl">
            {flashMessage && !isSubmitted ? (
              <div
                ref={flashMessageRef}
                className={`mb-6 scroll-mt-32 rounded-3xl border p-6 text-center md:p-8 ${theme.error}`}
                role="alert"
                aria-live="assertive"
              >
                <h3 className={`mb-3 text-2xl font-black uppercase md:text-3xl ${theme.errorTitle}`}>
                  {flashMessage.title}
                </h3>
                <p className={`text-base md:text-lg ${theme.errorText}`}>
                  {flashMessage.message}
                </p>
              </div>
            ) : null}

            {!isSubmitted ? (
              <div className={`rounded-3xl border p-6 shadow-2xl md:p-12 ${theme.panel}`}>
                <div className="mb-8 text-center">
                  <h2 className={`mb-3 text-3xl font-black uppercase md:text-4xl ${theme.panelTitle}`}>
                    {t("newsletter.form.title")}
                  </h2>
                  <p className={theme.panelSubtitle}>{t("newsletter.form.subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="newsletter-firstname" className={`mb-2 block text-sm font-medium ${theme.label}`}>
                      {t("newsletter.form.label_name")}
                    </label>
                    <input
                      id="newsletter-firstname"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className={`w-full rounded-lg border px-4 py-3 outline-none transition-all ${theme.input}`}
                      placeholder={t("newsletter.form.placeholder_name")}
                    />
                  </div>

                  <div>
                    <label htmlFor="newsletter-email" className={`mb-2 block text-sm font-medium ${theme.label}`}>
                      {t("newsletter.form.label_email")}
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className={`w-full rounded-lg border px-4 py-3 outline-none transition-all ${theme.input}`}
                      placeholder={t("newsletter.form.placeholder_email")}
                    />
                  </div>

                  <fieldset className="space-y-3">
                    <legend className={`mb-3 block text-sm font-medium ${theme.label}`}>
                      {t("newsletter.form.label_preferences")}
                    </legend>
                    {["news", "films", "events", "partners"].map((id) => (
                      <label
                        key={id}
                        className="group flex cursor-pointer items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferences.includes(id)}
                          onChange={() => handleCheckboxChange(id)}
                          className="h-5 w-5 cursor-pointer rounded border-slate-700 bg-slate-900 text-cyan-300"
                        />
                        <span className={`transition-colors ${theme.checkboxText}`}>
                          {t(`newsletter.preferences.${id}`)}
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <p className={`text-xs leading-relaxed ${theme.helper}`}>
                    {t("newsletter.form.rgpd")}
                    <Link
                      to={cguPath}
                      className={`ml-1 ${theme.helperLink}`}
                    >
                      {t("nav.terms_gu")}
                    </Link>
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 px-8 py-4 text-lg font-black uppercase text-slate-950 transition-all duration-300 hover:scale-[1.01] disabled:opacity-50"
                  >
                    {isLoading ? t("newsletter.form.loading") : t("newsletter.form.submit")}
                  </button>
                </form>
              </div>
            ) : (
              <div
                ref={flashMessageRef}
                className={`animate-fadeIn scroll-mt-32 rounded-3xl border p-6 text-center md:p-12 ${theme.success}`}
                role="status"
                aria-live="polite"
              >
                <h3 className={`mb-4 text-3xl font-black uppercase md:text-4xl ${theme.successTitle}`}>
                  {flashMessage?.title || t("newsletter.form.success_title")}
                </h3>
                <p className={`mb-6 text-lg ${theme.successText}`}>
                  {flashMessage?.message || t("newsletter.form.success_msg")}
                </p>
                <p className={`text-sm ${theme.successHint}`}>
                  {flashMessage?.hint || t("newsletter.form.success_hint")}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={`border-t px-4 py-20 ${theme.sectionBorder}`}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className={`mb-4 text-3xl font-black uppercase md:text-5xl ${theme.sectionTitle}`}>
                {t("newsletter.benefits.title")}
              </h2>
              <p className={`text-xl ${theme.sectionSubtitle}`}>
                {t("newsletter.benefits.subtitle")}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
              {benefitCards.map((benefit) => (
                <div
                  key={benefit.id}
                  className={`group rounded-2xl border p-6 transition-all md:p-8 ${theme.benefitCard}`}
                >
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-sky-400 text-slate-950 transition-transform group-hover:scale-110">
                    {benefit.icon}
                  </div>
                  <h3 className={`mb-3 text-xl font-bold md:text-2xl ${theme.benefitTitle}`}>
                    {t(`newsletter.benefits.${benefit.id}.title`)}
                  </h3>
                  <p className={`leading-relaxed ${theme.benefitText}`}>
                    {t(`newsletter.benefits.${benefit.id}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className={`mb-12 text-center text-3xl font-black uppercase md:text-4xl ${theme.sectionTitle}`}>
              {t("newsletter.faq.title")}
            </h2>
            <div className="space-y-4">
              {["q1", "q2", "q3"].map((key) => (
                <div
                  key={key}
                  className={`rounded-xl border p-6 ${theme.faqCard}`}
                >
                  <h3 className={`mb-2 text-lg font-bold ${theme.faqTitle}`}>
                    {t(`newsletter.faq.${key}`)}
                  </h3>
                  <p className={`leading-relaxed ${theme.faqText}`}>
                    {t(`newsletter.faq.${key.replace("q", "a")}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
        `}</style>
      </div>
    </>
  );
}
