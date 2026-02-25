import React from "react";
import CountdownTimer from "../components/CountdownTimer";
import Seo from "../components/Seo";
import { useTheme } from "../context/ThemeContext";

const TestCountdown = () => {
  const { isLight } = useTheme();
  const now = new Date();

  const testPhases = [
    {
      id: 1,
      label: "TEST PHASE 1 (DEPOTS) - FINIT DANS 10S",
      target: new Date(now.getTime() + 10000).toISOString(),
      timezone: "Europe/Paris",
      color: "from-blue-600 to-indigo-500",
    },
    {
      id: 2,
      label: "TEST PHASE 2 (SELECTION) - FINIT DANS 30S",
      target: new Date(now.getTime() + 30000).toISOString(),
      timezone: "Europe/Paris",
      color: "from-amber-500 to-orange-600",
    },
  ];

  const handlePhaseComplete = (phase) => {
    console.log("Phase terminee :", phase.label);
  };

  return (
    <>
      <Seo title="Test Countdown" description="Page de test du compte a rebours." noIndex />
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isLight ? "bg-[#f4f8ff]" : "bg-slate-900"}`}>
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center">
            <h1 className={`text-3xl font-bold mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>
              Page de Test Countdown
            </h1>
            <p className={isLight ? "text-slate-600" : "text-slate-400"}>
              Ce test utilise des phases de 10s et 30s pour verifier le basculement
              automatique.
            </p>
          </div>

          <CountdownTimer phases={testPhases} onPhaseComplete={handlePhaseComplete} />

          <div className={`p-6 rounded-2xl border text-sm ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-300"}`}>
            <h2 className={`font-semibold mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Instructions de test :</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Attendez 10 secondes : le bandeau bleu doit devenir orange automatiquement.</li>
              <li>Le texte doit passer de "TEST PHASE 1" a "TEST PHASE 2".</li>
              <li>Apres 30 secondes au total, l'ecran affichera le message de fin.</li>
              <li>Verifiez la console du navigateur (F12) pour voir les logs de completion.</li>
            </ul>
          </div>

          <button
            onClick={() => window.location.reload()}
            className={`mx-auto block px-6 py-2 rounded-full transition-colors border ${isLight ? "bg-sky-600 hover:bg-sky-500 text-white border-sky-700/40" : "bg-white/10 hover:bg-white/20 text-white border-white/10"}`}
          >
            Relancer le test
          </button>
        </div>
      </div>
    </>
  );
};

export default TestCountdown;
