import { Link, NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "A propos", to: "/a-propos" },
  { label: "Agenda", to: "/agenda" },
  { label: "Appel a projet", to: "/appel-a-projet" },
  { label: "CGV & CGU", to: "/cgv-cgu" },
  { label: "Contact", to: "/contact" },
  { label: "Jury", to: "/jury" },
  { label: "Mentions legales", to: "/mentions-legales" },
  { label: "Page d'exemple", to: "/page-d-exemple" },
  { label: "Confidentialite", to: "/politique-de-confidentialite" },
  { label: "Deposer un film", to: "/upload" },
];

export default function Header() {
  return (
    <header className="topbar sticky top-0 z-50">
      <div className="app-container py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="brand">
            MarsAi
          </Link>

          <nav className="hidden lg:flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "navlink text-slate-900" : "navlink"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn-ghost" to="/contact">
            Contact
          </Link>
          <Link className="btn-primary" to="/upload">
            Deposer un film
          </Link>
        </div>
      </div>

      {/* Menu mobile simple */}
      <div className="lg:hidden border-t border-slate-200 bg-white/70 backdrop-blur">
        <div className="app-container py-3 flex gap-3 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                (isActive ? "navlink text-slate-900" : "navlink") +
                " whitespace-nowrap"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
