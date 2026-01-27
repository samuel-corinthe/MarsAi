import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="w-full page">
      {/* HERO */}
      <section className="hero relative overflow-hidden bg-blue-600 text-white py-16">
        <div className="w-full px-6">
          <div className="max-w-6xl mx-auto">
            <div className="hero-inner flex items-start gap-6">
              <div className="hero-badge w-40 h-40 bg-white text-blue-600 rounded-tr-3xl rounded-br-3xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-bold">Mars</div>
                  <div className="text-sm font-bold">Ai</div>
                  <div className="text-xs">Festival</div>
                </div>
              </div>

              <div className="hero-content">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Une expérience moderne, pilotée par WordPress headless.</h1>
                <p className="mt-4 text-sky-100 max-w-2xl">Contenu modifiable côté WordPress, interface rapide côté React. Maquette circulaire et sections colorées.</p>
                <div className="mt-6 flex gap-3">
                  <Link className="btn-primary bg-white text-blue-600 px-4 py-2 rounded" to="/page-d-exemple">Découvrir</Link>
                  <Link className="btn-ghost border border-white px-4 py-2 rounded text-white" to="/contact">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CIRCLE ABOUT */}
      <section className="about-section relative py-16">
        <div className="circle-panel">
          <div className="circle-inner p-12">
            <div className="max-w-6xl mx-auto">
              <div className="about-top flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-600">About us</h2>
                  <p className="mt-4 text-gray-600 max-w-2xl">Nous développons des expériences numériques qui combinent la puissance de l'IA et la flexibilité de WordPress headless.</p>
                  <div className="mt-4">
                    <button className="btn-primary bg-blue-600 text-white px-4 py-2 rounded">Voir plus</button>
                  </div>
                </div>

                <div className="brand-large text-3xl font-extrabold text-blue-600">CinemAi</div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div className="img-card rounded-lg overflow-hidden shadow">
                  <div className="img-placeholder h-40 bg-gray-100" />
                </div>
                <div className="img-card rounded-lg overflow-hidden shadow">
                  <div className="img-placeholder h-40 bg-gray-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEWS */}
      <section className="news-section py-12 bg-blue-600 text-white">
        <div className="w-full px-6">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-xl font-bold">Our news</h3>
            <div className="mt-6 news-card bg-white text-black rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="news-image w-full md:w-1/3 rounded overflow-hidden">
                <div className="img-placeholder h-36 bg-gray-100" />
              </div>
              <div className="news-body w-full md:w-2/3">
                <h4 className="font-semibold">Titre de l'actualité</h4>
                <p className="mt-2 text-sm text-gray-600">Brève description de la news — emplacement réservé pour l'article WordPress.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
