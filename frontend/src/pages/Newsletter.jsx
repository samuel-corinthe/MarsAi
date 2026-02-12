import { useState } from "react";

const Newsletter = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    preferences: [],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      const response = await fetch(
        "http://localhost:3000/subscribe-newsletter",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        // Reset after 5 sec
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({ firstName: "", email: "", preferences: [] });
        }, 5000);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("The server is not responding.");
    } finally {
      setIsLoading(false);
    }
  };

  // Newsletter stats
  const stats = [
    { number: "15K+", label: "Subscribers" },
    { number: "2x/month", label: "Frequency" },
    { number: "95%", label: "Open Rate" },
  ];

  // Benefits of signing up
  const benefits = [
    {
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
      title: "Early Access",
      description:
        "Be the first to know about official announcements and selections",
    },
    {
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
      title: "Exclusive Offers",
      description: "Access discounts on tickets and VIP passes",
    },
    {
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
      title: "Exclusive Content",
      description:
        "Interviews, making-of footage, and festival behind-the-scenes",
    },
  ];

  // Content preferences
  const contentPreferences = [
    { id: "news", label: "Festival news" },
    { id: "films", label: "New film selections" },
    { id: "events", label: "Events and screenings" },
    { id: "partners", label: "Partner offers" },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/30 rounded-full text-cyan-400 text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>marsAI Newsletter</span>
            </div>

            {/* Title */}
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Stay in
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                the loop
              </span>
            </h1>

            {/* Description */}
            <p
              className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Get the latest news, selected films, and exclusive festival offers
              delivered directly to your inbox.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 border-y border-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <div
                  className="text-3xl md:text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {stat.number}
                </div>
                <div
                  className="text-gray-400 text-xs md:text-base"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
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
                  Sign Up
                </h2>
                <p
                  className="text-gray-400"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Free • No spam • Easy unsubscribe
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-300 mb-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all duration-200"
                    placeholder="Your first name"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all duration-200"
                    placeholder="your@email.com"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>

                {/* Preferences */}
                <div>
                  <label
                    className="block text-sm font-medium text-gray-300 mb-3"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    I want to receive:
                  </label>
                  <div className="space-y-3">
                    {contentPreferences.map((pref) => (
                      <label
                        key={pref.id}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={formData.preferences.includes(pref.id)}
                          onChange={() => handleCheckboxChange(pref.id)}
                          className="w-5 h-5 rounded border-gray-700 text-cyan-400 focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-0 bg-gray-900 cursor-pointer"
                        />
                        <span
                          className="text-gray-400 group-hover:text-gray-300 transition-colors"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {pref.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* GDPR */}
                <p
                  className="text-xs text-gray-500 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  By signing up, you agree to receive emails from marsAI
                  Festival. You can unsubscribe at any time.
                  <a
                    href="/privacy-policy"
                    className="text-cyan-400 hover:underline ml-1"
                  >
                    Privacy Policy
                  </a>
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span className="relative z-10 flex items-center justify-center space-x-2">
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          strokeViewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Subscribe to newsletter</span>
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </form>
            </div>
          ) : (
            // Success Message
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-3xl p-6 md:p-12 text-center animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3
                className="text-3xl md:text-4xl font-black text-white mb-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                Subscription Confirmed!
              </h3>
              <p
                className="text-lg text-gray-300 mb-6"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Welcome to the marsAI community! You will receive your first
                newsletter soon.
              </p>
              <p
                className="text-sm text-gray-400"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Check your inbox (and spam folder) to confirm your subscription.
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
              className="text-3xl md:text-5xl font-black text-white mb-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Why subscribe?
            </h2>
            <p
              className="text-xl text-gray-400"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Exclusive benefits for our subscribers
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group p-6 md:p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl hover:border-cyan-400/50 transition-all duration-300"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center text-black mb-6 group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3
                  className="text-xl md:text-2xl font-bold text-white mb-3"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {benefit.title}
                </h3>
                <p
                  className="text-gray-400 leading-relaxed text-sm md:text-base"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {benefit.description}
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
            className="text-3xl md:text-4xl font-black text-white text-center mb-12"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "How often will I receive the newsletter?",
                a: "We send 2 newsletters per month: one at the beginning of the month with news, and one mid-month with exclusive content.",
              },
              {
                q: "Can I unsubscribe at any time?",
                a: "Yes, absolutely. Every email contains an unsubscribe link at the bottom. You can also manage your preferences at any time.",
              },
              {
                q: "Is my data secure?",
                a: "We take privacy very seriously. Your data is never sold or shared with third parties. Check our privacy policy for more details.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="p-6 bg-gray-900 border border-gray-800 rounded-xl"
              >
                <h3
                  className="text-lg font-bold text-white mb-2"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {faq.q}
                </h3>
                <p
                  className="text-gray-400 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Newsletter;
