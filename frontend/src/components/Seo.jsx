import { Helmet } from "react-helmet-async";

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
  const cleanTitle = stripHtml(title);
  const cleanDescription = stripHtml(description);
  const finalTitle = cleanTitle ? `${cleanTitle} | ${SITE_NAME}` : DEFAULT_TITLE;
  const finalDescription = cleanDescription || DEFAULT_DESCRIPTION;
  const cardType = image ? "summary_large_image" : "summary";

  return (
    <Helmet htmlAttributes={lang ? { lang } : undefined}>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content="website" />
      {url ? <meta property="og:url" content={url} /> : null}
      {image ? <meta property="og:image" content={image} /> : null}
      <meta name="twitter:card" content={cardType} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Helmet>
  );
}
