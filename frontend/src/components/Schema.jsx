import { Helmet } from 'react-helmet-async';

// Schema pour l'organisation du festival
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "marsAI Festival",
    "alternateName": "Festival marsAI",
    "url": "https://marsai-festival.com",
    "logo": "https://marsai-festival.com/logo.png",
    "description": "Le premier festival international dédié aux films créés avec l'intelligence artificielle. Une célébration de la créativité augmentée et de l'innovation cinématographique.",
    "foundingDate": "2026",
    "sameAs": [
      "https://www.facebook.com/marsai",
      "https://www.instagram.com/marsai",
      "https://twitter.com/marsai",
      "https://www.youtube.com/marsai",
      "https://www.linkedin.com/company/marsai"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "contact@marsai-festival.com"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Schema pour l'événement du festival
export const EventSchema = ({ 
  name = "marsAI Festival 2026",
  startDate = "2026-06-15",
  endDate = "2026-06-20",
  location = "Marseille, France"
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Festival",
    "name": name,
    "description": "Festival international de films créés avec l'intelligence artificielle",
    "startDate": startDate,
    "endDate": endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": location,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Marseille",
        "addressRegion": "Provence-Alpes-Côte d'Azur",
        "addressCountry": "FR"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": "marsAI Festival",
      "url": "https://marsai-festival.com"
    },
    "offers": {
      "@type": "Offer",
      "url": "https://marsai-festival.com/agenda",
      "availability": "https://schema.org/InStock",
      "priceCurrency": "EUR"
    },
    "image": "https://marsai-festival.com/festival-image.jpg"
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default {
  OrganizationSchema,
  EventSchema
};