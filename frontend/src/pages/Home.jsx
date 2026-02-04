import React, { useMemo } from "react";

export default function Home({ page }) {
  const parsed = useMemo(() => {
    const html = page?.content?.rendered || "";

    if (typeof window === "undefined") {
      return {
        title: page?.title?.rendered || "",
        heroLead: "",
        heroLinks: [],
        aboutTitle: "",
        aboutText: "",
        articles: [],
      };
    }

    const doc = new DOMParser().parseFromString(html, "text/html");

    // --- 1. HERO ---
    const heroLead = doc.querySelector("p")?.textContent?.trim() || "";
    const normalizeText = (value) =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const linkOverrides = {
      "participer au festival": "/upload",
      "voir le programme": "/agenda",
    };
    const rawHeroLinks = Array.from(doc.querySelectorAll("p:first-of-type a")).map(
      (a) => ({ href: a.href || "", text: a.textContent?.trim() || "" })
    );
    const heroLinks = rawHeroLinks.map((link) => {
      const key = normalizeText(link.text);
      const override = linkOverrides[key];
      return override ? { ...link, href: override } : link;
    });

    // --- 2. ABOUT ---
    const firstH2 = doc.querySelector("h2");
    const aboutTitle = firstH2?.textContent?.trim() || "";
    let aboutText = "";
    if (firstH2) {
      let next = firstH2.nextElementSibling;
      while (next && next.tagName.toLowerCase() !== "p") next = next.nextElementSibling;
      aboutText = next?.textContent?.trim() || "";
    }

    // --- 3. NEWS - Extraire les articles depuis WordPress ---
    const articles = [];
    const h3Elements = doc.querySelectorAll("h3");
    
    h3Elements.forEach((h3) => {
      const title = h3.textContent?.trim() || "";
      
      // Prendre le paragraphe suivant comme excerpt
      let excerpt = "";
      let next = h3.nextElementSibling;
      while (next && next.tagName.toLowerCase() !== "p") {
        next = next.nextElementSibling;
      }
      if (next) {
        excerpt = next.textContent?.trim() || "";
      }
      
      if (title || excerpt) {
        articles.push({
          title,
          excerpt,
          link: "",
          linkText: ""
        });
      }
    });

    return { title: page?.title?.rendered || "", heroLead, heroLinks, aboutTitle, aboutText, articles };
  }, [page]);

  return (
    <main className="w-full overflow-hidden bg-[#0f172a] text-white font-['Montserrat']">
      
      {/* Texture Grain - Opacité réduite pour ne pas gêner la lecture */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay pointer-events-none z-[60]"></div>

      {/* --- HERO (Accessibilité : Contraste élevé) --- */}
      <section className="relative min-h-[85vh] flex items-center justify-center text-center px-6 pt-16 md:pt-20 pb-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#0f172a] z-0" />
        
        <div className="relative z-20 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-none text-white mb-10 drop-shadow-md"
              dangerouslySetInnerHTML={{ __html: parsed.title }} />
          
          {parsed.heroLead && (
            <p className="text-[#cbd5e1] text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              {parsed.heroLead}
            </p>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
            {parsed.heroLinks.map((l, i) => (
              <a key={i} href={l.href} 
                 aria-label={`Accéder à ${l.text}`}
                 className="px-12 py-5 rounded-full bg-[#38bdf8] text-[#0f172a] font-black uppercase tracking-widest text-[12px] hover:bg-white transition-colors shadow-lg">
                {l.text}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- ABOUT (Plus clair pour la lecture prolongée) --- */}
      {(parsed.aboutTitle || parsed.aboutText) && (
        <section className="relative py-24 md:py-40 bg-[#0f172a]">
          <div className="max-w-5xl mx-auto px-10">
            <div className="bg-[#1e293b] border border-[#334155] rounded-[3rem] p-5 md:p-20 shadow-xl">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-8">
                    {parsed.aboutTitle}
                  </h2>
                  <p className="text-[#e2e8f0] text-lg leading-relaxed font-medium">
                    {parsed.aboutText}
                  </p>
                </div>
                <div className="aspect-square rounded-3xl bg-[#0f172a] border border-[#334155] overflow-hidden shadow-inner">
                   <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059" 
                        className="w-full h-full object-cover filter contrast-[1.1]" 
                        alt="Illustration de la section à propos" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- NEWS (Cartes plus contrastées et aérées) --- */}
      {parsed.articles.length > 0 && (
        <section className="relative py-20 md:py-32 bg-[#0f172a]">
          <div className="max-w-4xl mx-auto px-10 md:px-4">
            <h3 className="text-2xl md:text-4xl font-black uppercase tracking-[0.4em] text-[#38bdf8] mb-24 text-center">
              Actualités
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-12 justify-items-center">
              {parsed.articles.slice(0, 6).map((a, i) => (
                <article key={i} className="group w-full max-w-[280px] flex flex-col">
                  <div className="aspect-[3/4] rounded-[2.5rem] bg-[#1e293b] mb-8 overflow-hidden border border-[#334155] shadow-lg">
                    <div className="w-full h-full bg-gradient-to-t from-[#0f172a] to-transparent" />
                  </div>
                  <h4 className="text-xl font-extrabold uppercase tracking-tight text-white group-hover:text-[#38bdf8] transition-colors">
                    {a.title}
                  </h4>
                  <p className="mt-4 text-[#94a3b8] text-sm font-medium leading-relaxed line-clamp-3">
                    {a.excerpt}
                  </p>
                  {a.link && (
                    <a href={a.link} 
                       className="inline-block mt-6 text-[11px] font-black uppercase tracking-widest text-[#38bdf8] hover:text-white transition-colors border-b-2 border-[#38bdf8] pb-1 w-fit">
                      Lire l'article
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');
        body { background-color: #0f172a; color: #ffffff; }
        /* Focus visible pour l'accessibilité clavier */
        a:focus { outline: 3px solid #38bdf8; outline-offset: 4px; border-radius: 4px; }
      `}</style>
    </main>
  );
}
