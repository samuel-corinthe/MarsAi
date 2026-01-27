
const WP_V2 = "/wp-json/wp/v2";

export async function getPageBySlug(slug) {
  const res = await fetch(`${WP_V2}/pages?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`WP error ${res.status}`);
  const data = await res.json();
  return data[0] || null;
}
