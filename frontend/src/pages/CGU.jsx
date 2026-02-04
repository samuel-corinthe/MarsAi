import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const CGU = () => {
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
              <div className="flex items-center space-x-3 px-5 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-purple-400 tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
                  DOCUMENTS LÉGAUX
                </span>
              </div>
            </div>
            
            <h1 
              className="text-6xl md:text-8xl font-black text-transparent bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Conditions Générales<br />d'Utilisation
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              Dernière mise à jour : Février 2026
            </p>
          </div>
        </div>

        {/* Decorative gradient orb */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full blur-3xl"></div>
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
                Acceptation des Conditions
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                En accédant et en utilisant cette plateforme de streaming, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
              </p>
              <p>
                Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications entreront en vigueur dès leur publication sur le site. Votre utilisation continue du service après de telles modifications constitue votre acceptation des nouvelles conditions.
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
                Création de Compte
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Pour accéder à nos services, vous devez créer un compte en fournissant des informations exactes et à jour. Vous êtes responsable de :
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>La confidentialité de vos identifiants de connexion</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>Toutes les activités effectuées sous votre compte</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>Nous informer immédiatement de toute utilisation non autorisée</span>
                </li>
              </ul>
              <p>
                Vous devez avoir au moins 18 ans pour créer un compte. Les comptes créés par des mineurs doivent être sous la supervision d'un parent ou tuteur légal.
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
                Utilisation du Service
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Nos services sont fournis uniquement pour un usage personnel et non commercial. Vous vous engagez à :
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-pink-400 mr-3">•</span>
                  <span>Ne pas partager votre compte avec des tiers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-3">•</span>
                  <span>Ne pas télécharger, copier ou redistribuer le contenu</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-3">•</span>
                  <span>Ne pas utiliser de robots, scrapers ou autres moyens automatisés</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-3">•</span>
                  <span>Ne pas contourner les mesures de protection technique</span>
                </li>
                <li className="flex items-start">
                  <span className="text-pink-400 mr-3">•</span>
                  <span>Respecter tous les droits de propriété intellectuelle</span>
                </li>
              </ul>
              <p>
                Toute violation de ces règles peut entraîner la suspension ou la résiliation immédiate de votre compte sans remboursement.
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
                Propriété Intellectuelle
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Tout le contenu disponible sur notre plateforme (films, séries, images, textes, logos, design) est protégé par les lois sur la propriété intellectuelle et appartient à la plateforme ou à ses concédants de licence.
              </p>
              <p>
                Vous recevez une licence limitée, non exclusive et non transférable pour accéder au contenu dans le cadre d'un usage personnel. Cette licence ne vous confère aucun droit de propriété sur le contenu.
              </p>
              <p>
                Toute reproduction, distribution, modification ou exploitation commerciale du contenu sans autorisation préalable écrite est strictement interdite.
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
                Données Personnelles
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Nous collectons et traitons vos données personnelles conformément à notre Politique de Confidentialité et au Règlement Général sur la Protection des Données (RGPD).
              </p>
              <p>
                Les données collectées incluent : informations de compte, historique de visionnage, préférences, données de paiement et informations techniques (adresse IP, type d'appareil, navigateur).
              </p>
              <p>
                Vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez notre service de protection des données.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>6</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Disponibilité du Service
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Nous nous efforçons de maintenir le service disponible 24h/24 et 7j/7, mais nous ne pouvons garantir un accès ininterrompu. Le service peut être temporairement indisponible pour :
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>Maintenance programmée ou d'urgence</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>Pannes techniques ou défaillances du réseau</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>Cas de force majeure</span>
                </li>
              </ul>
              <p>
                Le catalogue de contenu peut varier et certains titres peuvent être retirés sans préavis en raison de l'expiration des licences.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-6 pb-12 border-b border-gray-800">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>7</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Résiliation
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Vous pouvez résilier votre abonnement à tout moment depuis votre compte. La résiliation prendra effet à la fin de la période de facturation en cours.
              </p>
              <p>
                Nous nous réservons le droit de suspendre ou résilier votre compte immédiatement en cas de :
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-violet-400 mr-3">•</span>
                  <span>Violation des présentes CGU</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-400 mr-3">•</span>
                  <span>Activité frauduleuse ou illégale</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-400 mr-3">•</span>
                  <span>Non-paiement des frais d'abonnement</span>
                </li>
                <li className="flex items-start">
                  <span className="text-violet-400 mr-3">•</span>
                  <span>Comportement abusif envers notre personnel ou d'autres utilisateurs</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>8</span>
              </div>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                Limitation de Responsabilité
              </h2>
            </div>
            <div className="pl-16 space-y-4 text-gray-300 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              <p>
                Dans les limites autorisées par la loi, nous ne serons pas responsables des dommages indirects, accessoires, spéciaux ou consécutifs résultant de votre utilisation ou de votre incapacité à utiliser le service.
              </p>
              <p>
                Le service est fourni "en l'état" sans garantie d'aucune sorte. Nous ne garantissons pas que le service sera ininterrompu, sécurisé ou exempt d'erreurs.
              </p>
              <p>
                Vous utilisez le service à vos propres risques. Nous ne sommes pas responsables du contenu généré par les utilisateurs ou des liens vers des sites tiers.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-purple-400 transition-colors duration-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Retour à l'accueil</span>
            </Link>

            <Link
              to="/cgv"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Voir les CGV
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

export default CGU;
