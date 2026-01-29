import React from 'react';

const About = () => {
  return (
    <div className="flex flex-col bg-blue-950 text-white min-h-screen relative selection:bg-cyan-500/30">

      <section className="relative overflow-hidden w-full">
        {/* Curved section - Modernisé façon "Dark Glass" */}
        <div className="relative pt-20 pb-10">
          <div className="absolute top-20 left-0 w-3/4 md:w-1/2 h-28 bg-white rounded-r-full shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center pl-10 md:pl-20 z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold text-blue-600 tracking-tight">
              About us
            </h1>
          </div>
        </div>

        {/* Content section */}
        <div className="pt-32 px-6 md:px-20 pb-12 relative z-0">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 relative group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>

              <img
                src="../public/images/marsai-illustration.png"
                alt="Illustration MarsAi"
                className="relative rounded-2xl shadow-2xl border border-white/10 w-full "
              />
            </div>

            <div className="md:w-1/2 space-y-8">
              <p className="text-gray-300 text-lg leading-relaxed border-l-4 border-cyan-500 pl-6">
                <span className="text-cyan-400 font-semibold">MarsAi</span> est une plateforme dédiée aux créateurs de vidéo réalisée par intelligence artificielle. Nous soutenons les esprits passionnés par les vidéos IA et l'innovation.
              </p>

              {/* Tags décoratifs */}
              <div className="flex flex-wrap gap-3">
                 {['Innovation', 'Deep Learning', 'Creative Tools'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      #{tag}
                    </span>
                 ))}
              </div>

              <p className="text-gray-300 text-lg leading-relaxed">
                Rejoignez une communauté créative, audacieuse et tournée vers l'exploration d'un avenir où l'intelligence artificielle transforme la création vidéo.
              </p>

              <h2 className="text-3xl md:text-5xl font-bold text-white pt-4">
                Show Your cr<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">AI</span>tivity
              </h2>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <a
                  href="/join"
                  className="text-center inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3 rounded-full hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 font-semibold transform hover:-translate-y-1"
                >
                  Rejoindre MarsAi
                </a>
                <button className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/5 transition font-semibold text-gray-300 hover:text-white">
                   En savoir plus
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Circle Section - Glassmorphism Style */}
      <section className="py-24 px-6 relative flex items-center justify-center bg-blue-950/50 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/20 to-cyan-400/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-lg aspect-square rounded-full border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center p-12 shadow-[0_0_100px_rgba(59,130,246,0.1)] text-center ring-1 ring-white/20 group hover:ring-cyan-500/30 transition-all duration-700">
          <h2 className="text-5xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-500">MarsAi</h2>

          <div className="space-y-3 text-base text-gray-300 font-medium tracking-wide">
            <p className="hover:text-cyan-400 transition-colors cursor-default">Intelligence Artificielle</p>
            <p className="hover:text-cyan-400 transition-colors cursor-default">Innovation Vidéo</p>
            <p className="hover:text-cyan-400 transition-colors cursor-default">Créativité Sans Limites</p>
            <p className="hover:text-cyan-400 transition-colors cursor-default">Futur du Numérique</p>
            <p className="hover:text-cyan-400 transition-colors cursor-default">Technologie Avancée</p>
          </div>

          <button className="mt-10 bg-white text-blue-950 px-8 py-3 rounded-full hover:bg-cyan-400 hover:text-white transition-all duration-300 font-bold shadow-lg hover:shadow-cyan-500/50">
            Contactez-nous
          </button>
        </div>
      </section>
    </div>
  );
};

export default About;