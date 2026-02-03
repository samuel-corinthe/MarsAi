import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const CGV = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="space-y-6">
            <div className="inline-block">
              <div className="flex items-center space-x-3 px-5 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-cyan-400 tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
                  DOCUMENTS LÉGAUX
                </span>
              </div>
            </div>
            
            <h1 
              className="text-6xl md:text-8xl font-black text-transparent bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Conditions Générales<br />de Vente
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Dernière mise à jour : Février 2026
            </p>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          {/* Section 1 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>1</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Objet
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre le vendeur et tout acheteur professionnel ou consommateur souhaitant effectuer un achat via notre plateforme de streaming vidéo.
              </p>
              <p>
                Toute commande implique l'acceptation sans réserve des présentes CGV. Le vendeur se réserve le droit de modifier à tout moment ces conditions, les modifications étant applicables à toute commande postérieure.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>2</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Produits et Services
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Nous proposons l'accès à un catalogue de films et séries en streaming, disponible via différentes formules d'abonnement :
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>Formule Découverte : accès limité au catalogue</span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>Formule Premium : accès complet avec contenu HD/4K</span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>Formule Famille : multi-écrans et profils utilisateurs</span>
                </li>
              </ul>
              <p>
                Les caractéristiques essentielles des services sont présentées sur notre site. Il appartient au client de les consulter avant toute commande.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>3</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Prix et Paiement
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Les prix sont indiqués en euros toutes taxes comprises (TTC). Le vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix figurant au catalogue le jour de la commande sera le seul applicable à l'acheteur.
              </p>
              <p>
                Le paiement s'effectue par carte bancaire, PayPal ou virement bancaire. Les données de paiement sont sécurisées et ne sont jamais stockées sur nos serveurs.
              </p>
              <p>
                L'abonnement est tacitement reconduit chaque mois sauf résiliation par le client au moins 48 heures avant la date de renouvellement.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>4</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Droit de Rétractation
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de contenu numérique non fourni sur un support matériel dont l'exécution a commencé avec l'accord préalable exprès du consommateur.
              </p>
              <p>
                En souscrivant à un abonnement, vous acceptez expressément que la fourniture du service commence immédiatement et renoncez à votre droit de rétractation.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>5</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Responsabilité
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Le vendeur ne saurait être tenu responsable de l'inexécution du contrat en cas de rupture de stock, indisponibilité du produit, force majeure, perturbation ou grève totale ou partielle notamment des services postaux et moyens de transport et/ou communications.
              </p>
              <p>
                La qualité du streaming dépend de la connexion internet de l'utilisateur. Nous recommandons une connexion minimum de 5 Mbps pour le HD et 25 Mbps pour le 4K.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>6</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Règlement des Litiges
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Tous les litiges auxquels les opérations d'achat et de vente conclues en application des présentes conditions générales de vente pourraient donner lieu, concernant tant leur validité, leur interprétation, leur exécution, leur résiliation, leurs conséquences et leurs suites seront soumis au droit français.
              </p>
              <p>
                En cas de litige, vous pouvez recourir à une procédure de médiation conventionnelle ou à tout autre mode alternatif de règlement des différends.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-cyan-400 transition-colors duration-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Retour à l'accueil</span>
            </Link>

            <Link
              to="/cgu"
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Voir les CGU
            </Link>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  );
};

export default CGV;
