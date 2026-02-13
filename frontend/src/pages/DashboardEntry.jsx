import { useEffect, useState } from "react";
import Seo from "../components/Seo";
import Dashboard from "./Dashboard";
import { getCurrentSessionUser, loginWithWordPress } from "../api";

const WP_LOGIN_URL =
  import.meta.env.VITE_WP_LOGIN_URL ||
  "https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-login.php";

export default function DashboardEntry() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getCurrentSessionUser();
        if (cancelled) return;
        setSessionUser(payload?.user ?? null);
        setAuthenticated(Boolean(payload?.authenticated));
      } catch {
        if (cancelled) return;
        setAuthenticated(false);
        setSessionUser(null);
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    try {
      const payload = await loginWithWordPress({
        email: form.email.trim(),
        password: form.password,
      });
      setSessionUser(payload?.user ?? null);
      setAuthenticated(true);
    } catch (error) {
      setSubmitError(error?.message || "Connexion WordPress impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return <div className="app-container page">Verification de la session admin...</div>;
  }

  if (authenticated) {
    return <Dashboard />;
  }

  return (
    <>
      <Seo title="Connexion Dashboard" description="Acces dashboard via compte WordPress." noIndex />
      <div className="app-container page">
        <div className="card card-pad max-w-xl mx-auto space-y-5">
          <h1 className="text-2xl font-semibold">Connexion dashboard</h1>
          <p className="text-sm text-slate-600">
            Cette page est reservee aux comptes WordPress avec role <code>administrator</code> ou{" "}
            <code>editor</code>. Les autres pages du site restent publiques.
          </p>

          {sessionUser && (
            <p className="text-sm text-slate-700">
              Session detectee: <strong>{sessionUser.name || sessionUser.email}</strong>
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm">
              Email WordPress
              <input
                className="border rounded-lg px-3 py-2"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Mot de passe WordPress
              <input
                type="password"
                className="border rounded-lg px-3 py-2"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                required
              />
            </label>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <button className="btn-primary rounded-lg px-4 py-2" disabled={submitting}>
              {submitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-xs text-slate-500">
            Si besoin, connecte-toi d'abord dans WordPress:{" "}
            <a className="underline" href={WP_LOGIN_URL} target="_blank" rel="noreferrer">
              ouvrir wp-login
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
