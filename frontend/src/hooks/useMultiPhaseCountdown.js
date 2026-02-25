import { useEffect, useMemo, useState } from "react";
import * as tz from "date-fns-tz";

/*
but du hook
- prendre des phases avec target
- trouver la phase active (celle dont la target est dans le futur)
- calculer days hours minutes seconds
- mettre a jour chaque seconde

important pour les tests
- timeLeft doit jamais etre {}
- target peut etre une string iso OU un Date (dans ton test c est un Date)
*/

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

const normalizeTarget = (target, tzName) => {
  // si c est deja un Date on le garde
  if (target instanceof Date) return target;

  // si c est une string iso on converti en date timezone
  // utcToZonedTime renvoi une date utilisable pour la diff
  try {
    return typeof tz.utcToZonedTime === "function"
      ? tz.utcToZonedTime(target, tzName)
      : new Date(target);
  } catch {
    return new Date(target);
  }
};

const useMultiPhaseCountdown = (phases, timezone = "UTC") => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const validatedPhases = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) {
      return [];
    }
    return phases;
  }, [phases]);

  const normalizedPhases = useMemo(() => {
    return validatedPhases.map((phase) => {
      const tzName = phase.timezone || timezone;
      return {
        ...phase,
        utcTarget: normalizeTarget(phase.target, tzName),
      };
    });
  }, [validatedPhases, timezone]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const countdownState = useMemo(() => {
    if (normalizedPhases.length === 0) {
      return {
        timeLeft: ZERO,
        currentPhase: undefined,
        isFinished: true,
      };
    }

    const nowUtc = new Date(nowMs);
    const currentPhase = normalizedPhases.find((phase) => phase.utcTarget > nowUtc);

    if (!currentPhase) {
      return {
        timeLeft: ZERO,
        currentPhase: undefined,
        isFinished: true,
      };
    }

    const diff = currentPhase.utcTarget - nowUtc;
    const safeDiff = diff > 0 ? diff : 0;

    return {
      timeLeft: {
        days: Math.floor(safeDiff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((safeDiff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((safeDiff / 1000 / 60) % 60),
        seconds: Math.floor((safeDiff / 1000) % 60),
      },
      currentPhase,
      isFinished: false,
    };
  }, [normalizedPhases, nowMs]);

  return countdownState;
};

export default useMultiPhaseCountdown;
