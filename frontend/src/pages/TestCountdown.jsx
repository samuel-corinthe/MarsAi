import React from "react";
import CountdownTimer from "../components/CountdownTimer";

const TestCountdown = () => {
  const now = new Date();

  const testPhases = [
    {
      id: 1,
      label: "TEST PHASE 1 (DÉPÔTS) - FINIT DANS 10S",
      target: new Date(now.getTime() + 10000).toISOString(),
      timezone: "Europe/Paris",
      color: "from-blue-600 to-indigo-500",
    },
    {
      id: 2,
      label: "TEST PHASE 2 (SÉLECTION) - FINIT DANS 30S",
      target: new Date(now.getTime() + 30000).toISOString(),
      timezone: "Europe/Paris",
      color: "from-amber-500 to-orange-600",
    },
  ];

  const handlePhaseComplete = (phase) => {
    console.log("Phase terminée :", phase.label);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Page de Test Countdown
          </h1>
          <p className="text-slate-400">
            Ce test utilise des phases de 10s et 30s pour vérifier le basculement
            automatique.
          </p>
        </div>

        <CountdownTimer phases={testPhases} onPhaseComplete={handlePhaseComplete} />

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-slate-300 text-sm">
          <h2 className="font-semibold text-white mb-4">Instructions de test :</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Attendez 10 secondes : le bandeau bleu doit devenir orange automatiquement.</li>
            <li>Le texte doit passer de "TEST PHASE 1" à "TEST PHASE 2".</li>
            <li>Après 30 secondes au total, l'écran affichera le message de fin.</li>
            <li>Vérifiez la console du navigateur (F12) pour voir les logs de complétion.</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mx-auto block px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
        >
          Relancer le test
        </button>
      </div>
    </div>
  );
};

export default TestCountdown;
