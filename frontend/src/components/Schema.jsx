import { useHead } from "@unhead/react";

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

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
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

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
};

// Schema pour le site web
export const WebSiteSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "marsAI Festival",
    "url": "https://marsai-festival.com",
    "description": "Le premier festival international dédié aux films créés avec l'intelligence artificielle.",
    "inLanguage": ["fr", "en"],
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://marsai-festival.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
};

// Schema pour le fil d'ariane (breadcrumb)
export const BreadcrumbSchema = ({ items = [] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
};

// Schema pour un article / page de contenu
export const ArticleSchema = ({
  headline = "",
  description = "",
  datePublished = "",
  dateModified = "",
  image = "https://marsai-festival.com/festival-image.jpg",
  authorName = "marsAI Festival"
}) => {
  const stripHtml = (html) =>
    (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": stripHtml(headline).slice(0, 110),
    "description": stripHtml(description).slice(0, 160),
    "image": image,
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "author": {
      "@type": "Organization",
      "name": authorName,
      "url": "https://marsai-festival.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "marsAI Festival",
      "logo": {
        "@type": "ImageObject",
        "url": "https://marsai-festival.com/logo.png"
      }
    }
  };

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
};

// Schema pour un film
export const MovieSchema = ({
  title = "",
  description = "",
  director = "",
  datePublished = "",
  image = "",
  duration,
  genre = []
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": title,
    "description": description,
    "image": image,
    "datePublished": datePublished,
    "director": {
      "@type": "Person",
      "name": director
    },
    ...(duration && {
      "duration": `PT${duration}M`
    }),
    ...(genre.length > 0 && {
      "genre": genre
    }),
    "productionCompany": {
      "@type": "Organization",
      "name": "marsAI Festival",
      "url": "https://marsai-festival.com"
    }
  };

  useHead({
    script: [{ type: "application/ld+json", children: JSON.stringify(schema) }],
  });
  return null;
};

export default {
  OrganizationSchema,
  EventSchema,
  WebSiteSchema,
  BreadcrumbSchema,
  ArticleSchema,
  MovieSchema
};