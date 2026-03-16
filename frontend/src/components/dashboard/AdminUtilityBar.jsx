import { useTheme } from "../../context/ThemeContext";

const WORDPRESS_BASE_URL =
  import.meta.env.VITE_WORDPRESS_URL ||
  "https://samuel-corinthe.students-laplateforme.io/MarsAi";

const WORDPRESS_ADMIN_URL = `${WORDPRESS_BASE_URL.replace(/\/+$/, "")}/wp-admin/`;

function WordPressIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="14" fill="#028CB0" />
      <path
        d="M6.45538 16C6.45538 19.7823 8.65538 23.04 11.8369 24.5885L7.28462 12.1162C6.73798 13.338 6.45541 14.6615 6.45538 16ZM16 25.5446C17.1085 25.5446 18.1746 25.35 19.1731 25.0031L19.1054 24.8762L16.1692 16.8377L13.3092 25.1554C14.1554 25.4092 15.0608 25.5446 16 25.5446ZM17.3115 11.5238L20.7638 21.7877L21.72 18.6062C22.1262 17.2862 22.4392 16.3385 22.4392 15.5177C22.4392 14.3331 22.0162 13.5208 21.6608 12.8946C21.17 12.0992 20.7215 11.4308 20.7215 10.6523C20.7215 9.77231 21.3815 8.96 22.3292 8.96H22.4477C20.689 7.34546 18.3874 6.45141 16 6.45538C14.4192 6.45509 12.8632 6.84777 11.4718 7.59809C10.0805 8.34842 8.89746 9.43285 8.02923 10.7538L8.63846 10.7708C9.63692 10.7708 11.1769 10.6438 11.1769 10.6438C11.7015 10.6185 11.7608 11.3715 11.2446 11.4308C11.2446 11.4308 10.7285 11.4985 10.1446 11.5238L13.6308 21.8638L15.7208 15.6023L14.2315 11.5238C13.898 11.5054 13.565 11.4772 13.2331 11.4392C12.7169 11.4054 12.7762 10.6185 13.2923 10.6438C13.2923 10.6438 14.8662 10.7708 15.8054 10.7708C16.8038 10.7708 18.3438 10.6438 18.3438 10.6438C18.86 10.6185 18.9277 11.3715 18.4115 11.4308C18.4115 11.4308 17.8954 11.49 17.3115 11.5238ZM20.7977 24.25C22.2416 23.4104 23.4399 22.2066 24.2729 20.7589C25.1059 19.3112 25.5444 17.6703 25.5446 16C25.5446 14.3415 25.1215 12.7846 24.3769 11.4223C24.5281 12.9211 24.3012 14.4339 23.7169 15.8223L20.7977 24.25ZM16 27C13.0826 27 10.2847 25.8411 8.22183 23.7782C6.15893 21.7153 5 18.9174 5 16C5 13.0826 6.15893 10.2847 8.22183 8.22183C10.2847 6.15893 13.0826 5 16 5C18.9174 5 21.7153 6.15893 23.7782 8.22183C25.8411 10.2847 27 13.0826 27 16C27 18.9174 25.8411 21.7153 23.7782 23.7782C21.7153 25.8411 18.9174 27 16 27Z"
        fill="white"
      />
    </svg>
  );
}

function MoonIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SunIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="m4.9 4.9 1.6 1.6" />
      <path d="m17.5 17.5 1.6 1.6" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="m4.9 19.1 1.6-1.6" />
      <path d="m17.5 6.5 1.6-1.6" />
    </svg>
  );
}

export default function AdminUtilityBar({ className = "" }) {
  const { isLight, toggleTheme } = useTheme();
  const themeLabel = isLight ? "Mode nuit" : "Mode jour";
  const wordpressLabel = "Ouvrir WordPress";
  const actionClass =
    "inline-flex h-8 w-8 items-center justify-center transition-transform duration-150 hover:scale-110 focus:outline-none";
  const themeActionClass = `${actionClass} ${
    isLight
      ? "text-amber-500 hover:text-amber-600"
      : "text-cyan-200 hover:text-white"
  }`;

  return (
    <div className={`dash-utility-group ${className}`.trim()}>
      <a
        href={WORDPRESS_ADMIN_URL}
        target="_blank"
        rel="noreferrer"
        className={actionClass}
        aria-label={wordpressLabel}
        title={wordpressLabel}
      >
        <span className="sr-only">{wordpressLabel}</span>
        <WordPressIcon className="h-6 w-6" />
      </a>

      <button
        type="button"
        onClick={toggleTheme}
        className={themeActionClass}
        aria-label={themeLabel}
        title={themeLabel}
        aria-pressed={!isLight}
      >
        <span className="sr-only">{themeLabel}</span>
        {isLight ? (
          <MoonIcon className="h-5 w-5" />
        ) : (
          <SunIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
