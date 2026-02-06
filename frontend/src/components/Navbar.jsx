import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Détecter le scroll pour changer le style de la navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  // Navigation principale
  const mainNav = [
    { name: 'Accueil', path: '/', id: 'home' },
    { name: 'À propos', path: '/a-propos', id: 'about' },
    { name: 'Films', path: '/films', id: 'films' },
    { name: 'Agenda', path: '/agenda', id: 'agenda' },
    { name: 'Appel à projet', path: '/appel-a-projet', id: 'call' },
    { name: 'Jury', path: '/jury', id: 'jury' },
  ];

  // Menu "Plus" (dropdown)
  const moreNav = [
    { name: 'CGV', path: '/cgv', id: 'terms' },
    { name: 'CGU', path: '/cgu', id: 'terms' },
    { name: 'Mentions légales', path: '/mentions-legales', id: 'legal' },
    { name: 'Contact', path: '/contact', id: 'contact' },
  ];

  return (
    <>
      <nav
        className={`relative z-50 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-black/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10'
            : 'bg-black/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3 group"
            >
              <div className="relative">
                {/* Icône de caméra stylisée */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                {/* Point REC animé */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span
                  className="text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  marsAI
                </span>
                <div className="text-[10px] text-cyan-400 font-mono tracking-wider -mt-1">
                  FESTIVAL 2026
                </div>
              </div>
            </Link>

            {/* Navigation Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-cyan-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.name}
                  {isActive(item.path) && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"></span>
                  )}
                </Link>
              ))}

              {/* Dropdown "Plus" */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('more')}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-all duration-200 flex items-center space-x-1"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span>Plus</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      activeDropdown === 'more' ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {activeDropdown === 'more' && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-lg rounded-lg shadow-xl border border-gray-800 overflow-hidden animate-fadeIn">
                    {moreNav.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-cyan-400/10 hover:text-cyan-400 transition-colors duration-200"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions à droite */}
            <div className="hidden lg:flex items-center space-x-4">
             

              {/* CTA Principal */}
              <Link
                to="/deposer-un-film"
                className="group relative px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 hover:scale-105"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Déposer un film</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900/50 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Ligne de séparation lumineuse */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
      </nav>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Menu Content */}
          <div className="fixed top-20 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-lg overflow-y-auto animate-slideDown">
            <div className="px-4 py-6 space-y-1">
              {/* Navigation principale */}
              {mainNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block px-4 py-3 text-base font-medium rounded-lg transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-cyan-400/10 text-cyan-400'
                      : 'text-gray-300 hover:bg-gray-900/50 hover:text-white'
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.name}
                </Link>
              ))}

              {/* Séparateur */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent my-4"></div>

              {/* Menu "Plus" */}
              <div className="space-y-1">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plus
                </div>
                {moreNav.map((item) => (
                  <Link
                    key={item.id}
                    to={item.path}
                    className="block px-4 py-3 text-base text-gray-400 hover:bg-gray-900/50 hover:text-white rounded-lg transition-colors duration-200"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Séparateur */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent my-4"></div>

              {/* Actions */}
              <div className="px-4 space-y-3">

                <Link
                  to="/deposer-un-film"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 text-base font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all duration-300"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Déposer un film</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles personnalisés */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Navbar;
