import React, { useMemo } from "react";

export default function CallForProject({ page }) {
  const parsed = useMemo(() => {
    const html = page?.content?.rendered || "";
    const title = page?.title?.rendered || "Appel à projet";

    if (typeof window === "undefined") {
      return { title, contentHtml: "", lead: "", wpLink: null };
    }

    const doc = new DOMParser().parseFromString(html, "text/html");

    // 1. Extraire le Lead (premier paragraphe)
    const firstP = doc.querySelector("p");
    const lead = firstP?.textContent || "";
    if (firstP) firstP.remove();

    // 2. Extraire le bouton/lien WordPress
    const lastA = doc.querySelector("a:last-of-type");
    let wpLink = null;
    if (lastA) {
      wpLink = {
        href: lastA.href,
        text: lastA.textContent.trim()
      };
      lastA.remove(); 
    }

    const contentHtml = doc.body.innerHTML;

    return { title, lead, contentHtml, wpLink };
  }, [page]);

  return (
    <main className="w-full min-h-screen bg-[#050714] text-[#e2e8f0] relative overflow-hidden font-sans">
      
      {/* --- FOND & DECO (Inspiré par le bleu plateforme) --- */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-50"></div>
      
      <section className="relative h-[45vh] flex flex-col pt-8 md:pt-12 px-6 bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#050714]">
        {/* Orbes de lumière bleues/fushia pour l'ambiance plateforme */}
        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-80 h-80 bg-sky-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-t from-sky-400/40 via-transparent to-transparent" />
      </section>

      {/* --- CARD SECTION --- */}
      <section className="relative z-20 -mt-48 pb-10 px-0 md:px-4">
        <div className="w-full max-w-lg md:max-w-3xl mx-auto bg-white/[0.03] border-t border-l border-r border-white/10 backdrop-blur-3xl shadow-[0_-10px_60px_rgba(0,0,0,0.8)] rounded-t-[3rem] min-h-[70vh] px-6 pt-10 pb-20 md:px-12 md:pt-14">
          
          {/* TITRE PRINCIPAL (Blanc/Argenté vers Cyan) */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-serif italic mb-2 bg-gradient-to-b from-white via-sky-100 to-sky-300 bg-clip-text text-transparent">
              {parsed.title}
            </h1>
            <p className="text-sky-400/80 font-medium text-xs tracking-[0.3em] uppercase">
              Festival MarsAi
            </p>
            <div className="w-16 h-[1px] bg-sky-500/30 mx-auto mt-6"></div>
          </div>

          {/* MEDIA PLACEHOLDER (Teinte Bleue) */}
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden mb-8 shadow-2xl border border-white/10">
            <div className="absolute inset-0 bg-[#0f172a]">
                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059')] bg-cover bg-center mix-blend-luminosity"></div>
                <div className="absolute inset-0 bg-sky-900/20"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border border-sky-400/50 rounded-full flex items-center justify-center backdrop-blur-sm shadow-2xl">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-sky-400 border-b-[8px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>

          {/* CONTENU TEXTE (Gris-Argenté pour la lecture) */}
          <div className="space-y-6">
            {parsed.lead && (
              <div className="bg-sky-500/5 border border-sky-500/10 rounded-2xl p-6 mb-6 text-center">
                 <p className="text-lg md:text-xl font-serif italic text-sky-100/90">
                   {parsed.lead}
                 </p>
              </div>
            )}

            <div 
              className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-strong:text-sky-400 prose-ul:text-slate-300 mx-auto"
              dangerouslySetInnerHTML={{ __html: parsed.contentHtml }}
            />
          </div>

          {/* --- bouton --- */}
          {parsed.wpLink && (
            <div className="mt-12 sticky bottom-6 z-30">
              <a 
                href={parsed.wpLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-5 rounded-2xl font-bold text-sm uppercase tracking-[0.2em] text-white bg-gradient-to-r from-sky-600 via-blue-500 to-sky-600 shadow-[0_10px_40px_rgba(14,165,233,0.3)] hover:shadow-[0_15px_50px_rgba(14,165,233,0.5)] hover:scale-[1.02] transition-all duration-300 active:scale-95 border border-white/10"
              >
                {parsed.wpLink.text}
              </a>
              <p className="text-center text-[10px] text-sky-500/40 mt-4 tracking-widest uppercase font-bold">
                Candidature officielle
              </p>
            </div>
          )}

        </div>
      </section>

      <style jsx global>{`
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap');
      `}</style>
    </main>
  );
}