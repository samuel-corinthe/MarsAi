const WP_V2 = "/wp-json/wp/v2";

export const getPageBySlug = async (slug, lang = "fr") => {
  const response = await fetch(
    `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/pages?slug=${slug}&lang=${lang}`,
  );
  const data = await response.json();
  return data[0];
};

export async function getAgendaPosts() {
  const res = await fetch("/wp-json/wp/v2/posts?per_page=100");
  if (!res.ok) throw new Error(`WP error ${res.status}`);
  return await res.json();
}

export async function getAdminDashboardData({ signal } = {}) {
  const res = await fetch("/mock/admin-dashboard.json", {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Admin mock error ${res.status}`);
  return res.json();
}
