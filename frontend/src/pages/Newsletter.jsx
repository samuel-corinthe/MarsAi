import { useState } from "react";
import Seo from "../components/Seo";
import { useTranslation } from "react-i18next";
import { subscribeNewsletterForm } from "../api";

const Newsletter = () => {
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    preferences: [],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (preference) => {
    setFormData((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter((p) => p !== preference)
        : [...prev.preferences, preference],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await subscribeNewsletterForm({ ...formData, lang: i18n.language });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ firstName: "", email: "", preferences: [] });
      }, 5000);
    } catch (error) {
      alert(error?.message || t("newsletter.errors.server"));
    } finally {
      setIsLoading(false);
    }
  };

  // Mappage des stats selon ton JSON
  const stats = [
    { number: "15K+", label: t("newsletter.stats.subscribers") },
    {
      number: t("newsletter.stats.freq_value"),
      label: t("newsletter.stats.frequency"),
    },
    { number: "95%", label: t("newsletter.stats.open_rate") },
  ];

  // Mappage des avantages (Benefits)
  const benefitCards = [
    {
      id: "preview",
      icon: (
        <svg
          className="w-8 h-8"
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
          className="w-8 h-8"
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
          className="w-8 h-8"
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

  return (
    <>
      <Seo
        title={t("newsletter.hero.badge")}
        description={t("newsletter.hero.description")}
      />
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/30 rounded-full text-cyan-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>{t("newsletter.hero.badge")}</span>
            </div>

            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {t("newsletter.hero.title_main")}
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                {t("newsletter.hero.title_accent")}
              </span>
            </h1>

            <p
              className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {t("newsletter.hero.description")}
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 px-4 border-y border-gray-900">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div
                  className="text-3xl md:text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {stat.number}
                </div>
                <div className="text-gray-400 text-xs md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form Section */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            {!isSubmitted ? (
              <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-3xl p-6 md:p-12 shadow-2xl">
                <div className="text-center mb-8">
                  <h2
                    className="text-3xl md:text-4xl font-black text-white mb-3"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {t("newsletter.form.title")}
                  </h2>
                  <p className="text-gray-400">
                    {t("newsletter.form.subtitle")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t("newsletter.form.label_name")}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white outline-none focus:border-cyan-400 transition-all"
                      placeholder={t("newsletter.form.placeholder_name")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t("newsletter.form.label_email")}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white outline-none focus:border-cyan-400 transition-all"
                      placeholder={t("newsletter.form.placeholder_email")}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      {t("newsletter.form.label_preferences")}
                    </label>
                    {["news", "films", "events", "partners"].map((id) => (
                      <label
                        key={id}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferences.includes(id)}
                          onChange={() => handleCheckboxChange(id)}
                          className="w-5 h-5 rounded border-gray-700 text-cyan-400 bg-gray-900 cursor-pointer"
                        />
                        <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                          {t(`newsletter.preferences.${id}`)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t("newsletter.form.rgpd")}
                    <a
                      href="/privacy"
                      className="text-cyan-400 hover:underline ml-1"
                    >
                      {t("newsletter.form.privacy_link")}
                    </a>
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-full overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50"
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      {isLoading ? (
                        <span>{t("newsletter.form.loading")}</span>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{t("newsletter.form.submit")}</span>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-3xl p-6 md:p-12 text-center animate-fadeIn">
                <h3
                  className="text-3xl md:text-4xl font-black text-white mb-4 uppercase"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {t("newsletter.form.success_title")}
                </h3>
                <p className="text-lg text-gray-300 mb-6">
                  {t("newsletter.form.success_msg")}
                </p>
                <p className="text-sm text-gray-400">
                  {t("newsletter.form.success_hint")}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 border-t border-gray-900">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2
                className="text-3xl md:text-5xl font-black text-white mb-4 uppercase"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {t("newsletter.benefits.title")}
              </h2>
              <p className="text-xl text-gray-400">
                {t("newsletter.benefits.subtitle")}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {benefitCards.map((benefit) => (
                <div
                  key={benefit.id}
                  className="group p-6 md:p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl hover:border-cyan-400/50 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center text-black mb-6 group-hover:scale-110 transition-transform">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                    {t(`newsletter.benefits.${benefit.id}.title`)}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t(`newsletter.benefits.${benefit.id}.desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-3xl md:text-4xl font-black text-white text-center mb-12 uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {t("newsletter.faq.title")}
            </h2>
            <div className="space-y-4">
              {["q1", "q2", "q3"].map((key) => (
                <div
                  key={key}
                  className="p-6 bg-gray-900 border border-gray-800 rounded-xl"
                >
                  <h3 className="text-lg font-bold text-white mb-2">
                    {t(`newsletter.faq.${key}`)}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t(`newsletter.faq.${key.replace("q", "a")}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
      </div>
    </>
  );
};

export default Newsletter;
