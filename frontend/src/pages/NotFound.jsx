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
      </div>
    </div>
  );
};

export default NotFound;

