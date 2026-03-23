import { useHead } from "@unhead/react";
import { resolvePublicAssetPath } from "../utils/assetUrl";

const DEFAULT_SITE_ORIGIN = "https://samuel-corinthe.students-laplateforme.io";

function normalizeBasePath(value = "/") {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") return "/";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.replace(/\/+$/, "");
}

function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_ORIGIN;
}

function getSiteBaseUrl() {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL || "/");
  return basePath === "/" ? getSiteOrigin() : `${getSiteOrigin()}${basePath}`;
}

function toAbsoluteUrl(value = "/") {
  const resolved = resolvePublicAssetPath(value);
  if (!resolved) return getSiteBaseUrl();
  if (/^(https?:|data:|blob:)/i.test(resolved)) return resolved;
  const prefixed = resolved.startsWith("/") ? resolved : `/${resolved}`;
  return `${getSiteOrigin()}${prefixed}`;
}

const SITE_BASE_URL = getSiteBaseUrl();
const SITE_HOME_URL = `${SITE_BASE_URL}/accueil`;
const SITE_AGENDA_URL = `${SITE_BASE_URL}/agenda`;
const SITE_LOGO_URL = toAbsoluteUrl("/favicon.svg");
const SITE_IMAGE_URL = toAbsoluteUrl("/images/marsai-illustration.png");

// Schema pour l'organisation du festival
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "marsAI Festival",
    "alternateName": "Festival marsAI",
    "url": SITE_HOME_URL,
    "logo": SITE_LOGO_URL,
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
      "url": SITE_HOME_URL
    },
    "offers": {
      "@type": "Offer",
      "url": SITE_AGENDA_URL,
      "availability": "https://schema.org/InStock",
      "priceCurrency": "EUR"
    },
    "image": SITE_IMAGE_URL
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
    "url": SITE_HOME_URL,
    "description": "Le premier festival international dédié aux films créés avec l'intelligence artificielle.",
    "inLanguage": ["fr", "en"]
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
      "item": toAbsoluteUrl(item.url)
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
  image = SITE_IMAGE_URL,
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
      "url": SITE_HOME_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "marsAI Festival",
      "logo": {
        "@type": "ImageObject",
        "url": SITE_LOGO_URL
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
      "url": SITE_HOME_URL
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
