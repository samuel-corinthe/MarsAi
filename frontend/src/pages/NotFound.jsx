import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-20">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <h1 
            className="text-[10rem] sm:text-[12rem] md:text-[16rem] font-black text-transparent bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600 bg-clip-text leading-none select-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            404
          </h1>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-pink-500/20 to-purple-600/20 blur-3xl -z-10 animate-pulse"></div>
        </div>

        {/* Error Icon - Camera with slash */}
        <div className="flex justify-center -mt-8">
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 flex items-center justify-center group hover:border-cyan-400/50 transition-all duration-300">
            {/* Camera icon */}
            <svg className="w-16 h-16 text-gray-600 group-hover:text-cyan-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {/* Slash */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-0.5 bg-red-500 rotate-45 group-hover:bg-red-400 transition-colors duration-300"></div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h2 
            className="text-4xl sm:text-5xl md:text-6xl font-black text-white"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Film introuvable
          </h2>
          <p 
            className="text-lg sm:text-xl md:text-2xl text-gray-400 leading-relaxed max-w-2xl mx-auto"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Désolé, cette page n'existe pas ou a été déplacée. Elle n'a peut-être jamais été tournée...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            to="/"
            className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105 w-full sm:w-auto"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Retour à l'accueil</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </Link>

          <Link
            to="/films"
            className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all duration-300 w-full sm:w-auto"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Voir les films
          </Link>
        </div>

        {/* Suggestions */}
        <div className="pt-12 border-t border-gray-900 mt-12">
          <p 
            className="text-sm text-gray-500 mb-6"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Pages populaires :
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'À propos', path: '/a-propos', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )},
              { name: 'Films', path: '/films', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              )},
              { name: 'Agenda', path: '/agenda', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )},
              { name: 'Appel à projet', path: '/appel-a-projet', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              )},
              { name: 'Contact', path: '/contact', icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )},
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="group px-4 py-2.5 bg-gray-900 border border-gray-800 text-gray-400 text-sm rounded-lg hover:text-cyan-400 hover:border-cyan-400/50 hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <span className="group-hover:scale-110 transition-transform duration-200">
                  {link.icon}
                </span>
                <span>{link.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Fun Message */}
        <div className="pt-8">
          <p 
            className="text-xs text-gray-600 italic"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
   
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-1/4 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default NotFound;
