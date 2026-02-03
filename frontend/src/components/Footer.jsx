import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Navigation par colonnes
  const footerLinks = {
    festival: {
      title: 'Festival',
      links: [
        { name: 'À propos', path: '/a-propos' },
        { name: 'Films en compétition', path: '/films' },
        { name: 'Agenda', path: '/agenda' },
        { name: 'Jury', path: '/jury' },
      ]
    },
    participer: {
      title: 'Participer',
      links: [
        { name: 'Déposer un film', path: '/deposer-un-film' },
        { name: 'Appel à projet', path: '/appel-a-projet' },
        { name: 'Billetterie', path: '/agenda' },
      ]
    },
    legal: {
      title: 'Légal',
      links: [
        { name: 'CGV', path: '/cgv' },
        { name: 'CGU', path: '/cgu' },
        { name: 'Politique de confidentialité', path: '/politique-de-confidentialite' },
        { name: 'Mentions légales', path: '/mentions-legales' },
        { name: 'Contact', path: '/contact' },
      ]
    }
  };

  // Réseaux sociaux
  const socialLinks = [
    {
      name: 'Instagram',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      url: '#'
    },
    {
      name: 'Twitter/X',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: '#'
    },
    {
      name: 'Facebook',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      url: '#'
    },
    {
      name: 'YouTube',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      url: '#'
    },
    {
      name: 'LinkedIn',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      url: '#'
    },
  ];

  return (
    <footer className="relative bg-black border-t border-gray-900">
      {/* Ligne lumineuse en haut */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section principale */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Colonne Logo & Description */}
            <div className="lg:col-span-2">
              <Link to="/" className="inline-flex items-center space-x-3 group mb-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <span
                    className="text-3xl font-black text-white tracking-tight"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    marsAI
                  </span>
                  <div className="text-xs text-cyan-400 font-mono tracking-wider -mt-1">
                    FESTIVAL 2026
                  </div>
                </div>
              </Link>

              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                Le premier festival international dédié aux films créés avec l'intelligence artificielle. 
                Une célébration de la créativité augmentée et de l'innovation cinématographique.
              </p>

              {/* Réseaux sociaux */}
              <div className="flex items-center space-x-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all duration-200 group"
                    aria-label={social.name}
                  >
                    <span className="transform group-hover:scale-110 transition-transform duration-200">
                      {social.icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Colonnes de navigation */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h3
                  className="text-white font-bold text-sm uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="text-gray-400 hover:text-cyan-400 text-sm transition-colors duration-200 inline-flex items-center group"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <span className="transform group-hover:translate-x-1 transition-transform duration-200">
                          {link.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section Newsletter */}
        <div className="border-t border-gray-900 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3
                className="text-white font-bold text-lg mb-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Restez informé·e
              </h3>
              <p className="text-gray-400 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                Recevez les dernières actualités du festival
              </p>
            </div>

            <form className="flex w-full md:w-auto max-w-md gap-2">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400 transition-all duration-200"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                S'inscrire
              </button>
            </form>
          </div>
        </div>

        {/* Section Copyright */}
        <div className="border-t border-gray-900 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p style={{ fontFamily: "'Inter', sans-serif" }}>
              © {currentYear} marsAI Festival. Tous droits réservés.
            </p>

            <div className="flex items-center space-x-6">
              <Link
                to="/cgv"
                className="hover:text-cyan-400 transition-colors duration-200"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                CGV
              </Link>
              <Link
                to="/cgu"
                className="hover:text-cyan-400 transition-colors duration-200"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                CGU
              </Link>
              <Link
                to="/politique-de-confidentialite"
                className="hover:text-cyan-400 transition-colors duration-200"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Confidentialité
              </Link>
              <Link
                to="/mentions-legales"
                className="hover:text-cyan-400 transition-colors duration-200"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Mentions légales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient d'accentuation en bas */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"></div>
    </footer>
  );
};

export default Footer;
