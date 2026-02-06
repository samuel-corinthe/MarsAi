import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";

export default function CallForProject({ page, article: initialArticle }) {
  const [openModal, setOpenModal] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const cacheRef = useRef(null);

  const fetchArticle = useCallback(async () => {
    if (cacheRef.current) {
      setModalArticle(cacheRef.current);
      return;
    }

    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/wp-json/wp/v2/posts?slug=appel&_fields=title,content`, { signal: abortRef.current.signal });
      const data = await res.json();
      if (data?.[0]) {
        cacheRef.current = data[0];
        setModalArticle(data[0]);
      }
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openModal && !modalArticle) fetchArticle();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [openModal, fetchArticle]);

  const mainPage = useMemo(() => {
    const doc = new DOMParser().parseFromString(page?.content?.rendered || "", "text/html");
    const lastA = doc.querySelector("a:last-of-type");
    const btnText = lastA?.textContent?.trim() || "Login";
    if (lastA) lastA.remove();
    return { title: page?.title?.rendered || "Festival", listHtml: doc.body.innerHTML, btnText };
  }, [page]);

  return (
    <main className="min-h-screen bg-[#010409] text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* BACKGROUND LAYER : Profondeur spatiale */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
        {/* Grain de film pour le côté organique */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] contrast-150" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-24">
        
        {/* HEADER : Brutalisme & Lumière */}
        <header className="relative mb-32 flex flex-col items-start md:items-center">
          <div className="mb-4 flex items-center gap-2">
            <span className="w-12 h-[1px] bg-blue-500"></span>
          </div>
          
          <h1 className="text-7xl md:text-[10rem] font-[1000] leading-[0.8] tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20">
            {mainPage.title}
          </h1>
        
        </header>

        {/* CONTENT CARD : Le "Monolithe" */}
        <div className="relative group max-w-3xl mx-auto">
          {/* Lueur de contour */}
          <div className="absolute -inset-px bg-gradient-to-b from-blue-500/50 to-transparent rounded-[2rem] opacity-50 group-hover:opacity-100 transition duration-500" />
          
          <section className="relative bg-[#0d1117]/80 backdrop-blur-xl rounded-[2rem] p-12 md:p-20 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Décor interne */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            
            <div className="relative prose prose-invert max-w-none 
                            prose-li:list-none prose-li:p-0 prose-li:mb-8
                            prose-li:flex prose-li:items-start prose-li:gap-6
                            prose-li:before:content-['→'] prose-li:before:text-blue-500 prose-li:before:font-bold prose-li:before:text-xl
                            prose-li:text-2xl prose-li:font-medium prose-li:tracking-tight prose-li:text-slate-200"
               dangerouslySetInnerHTML={{ __html: mainPage.listHtml }} />

            {/* ACTION : Le bouton "Void" */}
            <button 
              onClick={() => setOpenModal(true)}
              className="mt-16 group relative w-full h-20 flex items-center justify-center bg-white text-black font-black uppercase tracking-[0.4em] text-xs transition-all hover:bg-blue-600 hover:text-white"
            >
              <span className="relative z-10">{mainPage.btnText}</span>
              <div className="absolute inset-0 bg-blue-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
            </button>
          </section>
        </div>
      </div>

      {/* MODAL : Full-Screen Experience */}
      {openModal && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#010409]/95 backdrop-blur-3xl animate-in fade-in duration-500">
          <button 
            onClick={() => setOpenModal(false)}
            className="absolute top-10 right-10 text-white/50 hover:text-white transition-all group"
          >
            <span className="text-[10px] tracking-[0.5em] uppercase mr-4 opacity-0 group-hover:opacity-100 transition-all">Close</span>
            <span className="text-4xl font-light">/</span>
          </button>

          <div className="w-full max-w-5xl px-10 overflow-y-auto custom-scrollbar h-full py-32">
            {loading ? (
              <div className="h-full flex items-center justify-center font-mono text-xs tracking-[1em] uppercase animate-pulse">Synchronisation...</div>
            ) : modalArticle ? (
              <article className="flex flex-col md:flex-row gap-20">
                <div className="flex-1">
                  <h2 className="text-5xl md:text-8xl font-black uppercase leading-none tracking-tighter mb-10">
                    {modalArticle?.title?.rendered}
                  </h2>
                  <div className="h-2 w-32 bg-blue-600" />
                </div>
                
                <div className="flex-[1.5] prose prose-invert prose-xl 
                                prose-p:text-slate-400 prose-p:leading-relaxed 
                                prose-strong:text-blue-500"
                     dangerouslySetInnerHTML={{ __html: modalArticle?.content?.rendered }} />
              </article>
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-xs tracking-[1em] uppercase text-slate-500">Article introuvable</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}