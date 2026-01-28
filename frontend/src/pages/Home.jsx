import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="w-full page overflow-hidden">

      {/* HERO FESTIVAL */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-sky-400 text-white py-24">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]"></div>

        <div className="relative px-6 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">

          {/* LOGO / BADGE */}
          <div className="w-40 h-40 bg-white text-blue-600 rounded-3xl shadow-xl flex items-center justify-center rotate-3">
            <div className="text-center leading-tight">
              <div className="text-lg font-extrabold">Mars</div>
              <div className="text-lg font-extrabold">AI</div>
              <div className="text-xs tracking-wide uppercase">Festival</div>
            </div>
          </div>

          {/* HERO CONTENT */}
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Une expérience moderne, pilotée par WordPress headless.
            </h1>

            <p className="mt-5 text-sky-100 max-w-2xl text-lg">
              Contenu modifiable côté WordPress, interface rapide côté React. 
              Maquette circulaire et sections colorées.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/page-d-exemple"
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-full shadow hover:scale-105 transition"
              >
                Découvrir le festival
              </Link>

              <Link
                to="/contact"
                className="border-2 border-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition"
              >
                Contact
              </Link>
            </div>
          </div>

        </div>
      </section>

<section className="relative py-40 bg-sky-50 overflow-hidden">

  {/* CERCLE PRINCIPAL FESTIVAL */}
  <div className="absolute -top-52 -left-52 w-[1000px] h-[1000px] rounded-full 
    bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 opacity-90">
  </div>

  {/* HALO LUMINEUX */}
  <div className="absolute -top-52 -left-52 w-[1000px] h-[1000px] rounded-full 
    bg-blue-400 opacity-40 blur-3xl">
  </div>

  {/* SECOND CERCLE DECORATIF */}
  <div className="absolute top-40 right-[-300px] w-[800px] h-[800px] rounded-full 
    bg-gradient-to-br from-blue-500 to-sky-400 opacity-30 blur-2xl">
  </div>

  {/* CONTENU */}
  <div className="relative max-w-6xl mx-auto px-6">

    <div className="bg-white/90 backdrop-blur rounded-[7rem] shadow-2xl p-16">

      <div className="flex flex-col md:flex-row justify-between items-start gap-12">

        <div>
          <h2 className="text-3xl font-extrabold text-blue-600">
            About us
          </h2>

          <p className="mt-5 text-gray-700 max-w-2xl text-lg">
            Nous développons des expériences numériques qui combinent 
            la puissance de l'IA et la flexibilité de WordPress headless.
          </p>

          <button className="mt-6 bg-blue-600 text-white px-7 py-3 rounded-full hover:bg-blue-700 transition shadow-lg">
            Voir plus
          </button>
        </div>

        <div className="text-4xl font-black text-blue-600 tracking-wide">
          CinemAi
        </div>

      </div>

      {/* IMAGES */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-10">

        <div className="rounded-[2.5rem] overflow-hidden shadow-xl hover:scale-105 transition duration-300">
          <div className="h-52 bg-gradient-to-br from-gray-100 to-gray-200" />
        </div>

        <div className="rounded-[2.5rem] overflow-hidden shadow-xl hover:scale-105 transition duration-300">
          <div className="h-52 bg-gradient-to-br from-gray-100 to-gray-200" />
        </div>

      </div>

    </div>

  </div>
</section>



      {/* NEWS FESTIVAL */}
      <section className="py-20 bg-blue-600">

        <div className="px-6 max-w-3xl mx-auto">

          <h3 className="text-2xl font-extrabold text-white">
            Our news
          </h3>

          <div className="mt-10 bg-white rounded-3xl shadow-xl p-8 flex flex-col md:flex-row gap-8 items-center">

            <div className="w-full md:w-1/3 rounded-2xl overflow-hidden">
              <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200" />
            </div>

            <div className="w-full md:w-2/3">
              <h4 className="text-xl font-bold text-gray-900">
                Titre de l'actualité
              </h4>

              <p className="mt-3 text-gray-600 leading-relaxed">
                Brève description de la news — emplacement réservé 
                pour l'article WordPress.
              </p>

              <button className="mt-4 text-blue-600 font-semibold hover:underline">
                Lire l’article →
              </button>
            </div>

          </div>

        </div>
      </section>

    </main>
  );
}
