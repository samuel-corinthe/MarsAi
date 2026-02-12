import { useHead } from "@unhead/react";
import { useTranslation } from "react-i18next";

const SITE_NAME = "marsAI Festival";
const DEFAULT_TITLE = "marsAI Festival";
const DEFAULT_DESCRIPTION =
  "Festival international de films crees avec l'intelligence artificielle.";

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function Seo({
  title,
  description,
  image,
  url,
  noIndex = false,
  lang,
}) {
  const { i18n } = useTranslation();
  const effectiveLang = lang ?? i18n?.language;
  const cleanTitle = stripHtml(title);
  const cleanDescription = stripHtml(description);
  const finalTitle = cleanTitle ? `${cleanTitle} | ${SITE_NAME}` : DEFAULT_TITLE;
  const finalDescription = cleanDescription || DEFAULT_DESCRIPTION;
  const cardType = image ? "summary_large_image" : "summary";

  const meta = [
    { name: "description", content: finalDescription },
    { property: "og:title", content: finalTitle },
    { property: "og:description", content: finalDescription },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: cardType },
  ];

  if (url) {
    meta.push({ property: "og:url", content: url });
  }

  if (image) {
    meta.push({ property: "og:image", content: image });
  }

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  useHead({
    title: finalTitle,
    meta,
    htmlAttrs: effectiveLang ? { lang: effectiveLang } : undefined,
  });

  return null;
}
