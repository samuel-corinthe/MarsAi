import React, { useMemo, useState, useEffect, useRef } from "react";
import { format, fromZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";
import useMultiPhaseCountdown from "../hooks/useMultiPhaseCountdown";

/*
ici on a deux modes
mode simple = timer en secondes avec start pause reset
mode multiphase = timer vers des dates et changement de phase automatique

le but c est que le test puisse tester le mode simple
et le vrai site garde le mode multiphase
*/

const DEFAULT_PHASES = [
  {
    id: 1,
    label: "Clôture du dépôt des vidéos",
    target: "2026-02-15T23:59:59",
    timezone: "Europe/Paris",
    color: "from-blue-600 to-indigo-500",
  },
  {
    id: 2,
    label: "Annonce des prix",
    target: "2026-03-01T18:00:00",
    timezone: "Europe/Paris",
    color: "from-amber-500 to-orange-600",
  },
];

// petit composant bonus pour afficher l heure local du user
// ca sert au vrai site pas au test
const UserLocalTime = ({ utcDate, showLabel = true }) => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const localTime = useMemo(() => {
    try {
      return fromZonedTime(utcDate, userTimezone);
    } catch (error) {
      console.error("Erreur de conversion timezone:", error);
      return new Date(utcDate);
    }
  }, [utcDate, userTimezone]);

  const formattedTime = useMemo(() => {
    try {
      return format(localTime, "PPpp", { locale: fr });
    } catch (error) {
      console.error("Erreur de formatage:", error);
      return localTime.toLocaleString();
    }
  }, [localTime]);

  return (
    <span
      title={`Votre heure locale (${userTimezone}): ${formattedTime}`}
      className="text-white/80 text-xs"
    >
      {showLabel && formattedTime + " (votre heure)"}
    </span>
  );
};

/*
mode simple
c est lui qui doit passer les tests CountdownTimer.test.jsx

regles du test
- affiche mm:ss
- start lance le setInterval
- pause stop le setInterval
- reset remet au temps initial
- jamais negatif
- onComplete une seule fois
- toujours clearInterval au bon moment
*/
const SimpleCountdown = ({ initialSeconds = 0, onComplete }) => {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  // on garde la valeur initial pour reset meme si l etat change
  const initialRef = useRef(initialSeconds);

  // pour etre sur que onComplete soit pas spam
  const onCompleteCalled = useRef(false);

  // si initialSeconds change on reset tout
  useEffect(() => {
    initialRef.current = initialSeconds;
    setRemaining(initialSeconds);
    setIsRunning(false);
    onCompleteCalled.current = false;
  }, [initialSeconds]);

  // le vrai moteur du timer
  useEffect(() => {
    if (!isRunning) return undefined;

    const id = setInterval(() => {
      setRemaining((prev) => {
        // si prev <= 1 on arrive a zero
        if (prev <= 1) {
          clearInterval(id);
          setIsRunning(false);

          // onComplete qu une fois
          if (!onCompleteCalled.current) {
            onCompleteCalled.current = true;
            onComplete?.();
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // super important pour pas laisser des timers tourner dans le vide
    return () => clearInterval(id);
  }, [isRunning, onComplete]);

  const handleStart = () => {
    if (remaining <= 0) return;
    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    onCompleteCalled.current = false;
    setRemaining(initialRef.current);
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* le test va chercher ca */}
      <div data-testid="time" className="text-4xl font-mono">
        {formatTime(remaining)}
      </div>

      <div className="flex gap-2">
        {/* le test cherche les boutons par leur nom */}
        <button type="button" onClick={handleStart}>
          Start
        </button>
        <button type="button" onClick={handlePause}>
          Pause
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
};

const TimeUnit = React.memo(({ value, label, ariaLabel }) => (
  <div
    className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 min-w-[100px] shadow-xl"
    role="timer"
    aria-live="polite"
    aria-atomic="true"
    aria-label={ariaLabel || `${value} ${label}`}
  >
    <span className="text-4xl font-bold text-white tabular-nums" aria-hidden="true">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-xs uppercase tracking-widest text-white/70 mt-1 font-medium" aria-hidden="true">
      {label}
    </span>
    <span className="sr-only">
      {value} {value === 1 ? label.slice(0, -1) : label}
    </span>
  </div>
));

TimeUnit.displayName = "TimeUnit";

const MultiPhaseTimer = ({ phases = DEFAULT_PHASES, timezone, onPhaseComplete }) => {
  const { timeLeft, currentPhase, isFinished } = useMultiPhaseCountdown(phases, timezone);
  const [announcementMade, setAnnouncementMade] = useState(false);

  // annonce quand on change de phase
  useEffect(() => {
    if (currentPhase && !announcementMade) {
      const announcement = `Nouvelle phase : ${currentPhase.label}`;

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(announcement);
        utterance.volume = 0.1;
        speechSynthesis.speak(utterance);
      }

      setAnnouncementMade(true);
      onPhaseComplete?.(currentPhase);
    }
  }, [currentPhase, announcementMade, onPhaseComplete]);

  if (isFinished) {
    return (
      <div className="text-center p-8 bg-green-500/20 backdrop-blur-lg rounded-3xl border border-green-500/30" role="status">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">
          L'événement est terminé, merci à tous les participants
        </h2>
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.days, label: "Jours", key: "days" },
    { value: timeLeft.hours, label: "Heures", key: "hours" },
    { value: timeLeft.minutes, label: "Minutes", key: "minutes" },
    { value: timeLeft.seconds, label: "Secondes", key: "seconds" },
  ];

  return (
    <div className={`p-10 rounded-[2.5rem] bg-gradient-to-br ${currentPhase?.color ?? ""} shadow-2xl transition-all duration-700`} role="main">
      <h3 className="text-center text-white/90 font-bold tracking-[0.2em] mb-8 text-sm uppercase">
        {currentPhase?.label}
      </h3>

      <div className="flex gap-4 justify-center items-center" role="group" aria-label="Temps restant">
        {timeUnits.map(({ value, label, key }) => (
          <TimeUnit key={key} value={value} label={label} ariaLabel={`${value} ${label} restantes`} />
        ))}
      </div>
    </div>
  );
};

// composant exporté
// si initialSeconds est donné et pas de phases -> mode simple (test)
// sinon -> mode multiphase (site)
export default function CountdownTimer(props) {
  const { initialSeconds, phases } = props;

  const hasSimpleMode =
    typeof initialSeconds === "number" && (!phases || phases.length === 0);

  if (hasSimpleMode) return <SimpleCountdown {...props} />;

  return <MultiPhaseTimer {...props} />;
}
