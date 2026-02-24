function normalizeSocialKey(rawValue) {
  const value = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (value === "twitter") return "x";
  if (value === "site" || value === "web" || value === "url") return "website";
  return value;
}

export default function SocialIcon({ network, className = "h-4 w-4" }) {
  const key = normalizeSocialKey(network);

  if (key === "instagram") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.9" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (key === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14.1 8.1h2V5h-2.4c-2.8 0-4.5 1.6-4.5 4.5v2.1H7v3.1h2.2V21h3.2v-6.3h2.7l.5-3.1h-3.2V9.8c0-1 .4-1.7 1.7-1.7z" />
      </svg>
    );
  }

  if (key === "x") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4 4h3.9l4.4 6.3L17.7 4H20l-6.6 7.7L20.5 20h-3.9l-4.9-7-6 7H3.4l7-8.2L4 4z" />
      </svg>
    );
  }

  if (key === "youtube") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 8.2a2.8 2.8 0 0 0-2-2C17.2 5.7 12 5.7 12 5.7s-5.2 0-7 .5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.5 12 29 29 0 0 0 3 15.8a2.8 2.8 0 0 0 2 2c1.8.5 7 .5 7 .5s5.2 0 7-.5a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .5-3.8 29 29 0 0 0-.5-3.8z" />
        <path d="m10 15.2 5.2-3.2L10 8.8v6.4z" fill="#0f172a" />
      </svg>
    );
  }

  if (key === "linkedin") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M6.3 8.6a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zM4.7 10h3.2v9.3H4.7V10zm5.3 0h3v1.3h.1c.4-.8 1.5-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.9v4.8h-3.2v-4.3c0-1-.1-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.4H10V10z" />
      </svg>
    );
  }

  if (key === "website") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
        <path d="M3.8 12h16.4M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M9.5 14.5 20 4m0 0h-6m6 0v6M14.5 9.5 4 20m0 0h6m-6 0v-6" strokeWidth="1.8" />
    </svg>
  );
}
