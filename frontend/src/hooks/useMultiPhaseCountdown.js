import { useState, useEffect, useCallback, useMemo } from "react";
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
  // utcToZonedTime (v2) / toZonedTime (v3) renvoi une date utilisable pour la diff
  try {
    const toZonedTime = tz.utcToZonedTime ?? tz.toZonedTime;
    return toZonedTime ? toZonedTime(target, tzName) : new Date(target);
  } catch (e) {
    return new Date(target);
  }
};

const useMultiPhaseCountdown = (phases, timezone = "UTC") => {
  const [timeLeft, setTimeLeft] = useState(ZERO);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const validatedPhases = useMemo(() => {
    if (!Array.isArray(phases) || phases.length === 0) {
      return [];
    }
    return phases;
  }, [phases]);

  const normalizedPhases = useMemo(() => {
    return validatedPhases.map((phase) => {
      const tz = phase.timezone || timezone;
      return {
        ...phase,
        utcTarget: normalizeTarget(phase.target, tz),
      };
    });
  }, [validatedPhases, timezone]);

  const calculateTimeLeft = useCallback(() => {
    const nowUtc = new Date();

    // phase active = premiere phase dont la target est dans le futur
    const activeIndex = normalizedPhases.findIndex((p) => p.utcTarget > nowUtc);

    if (activeIndex === -1) {
      setIsFinished(true);
      return ZERO;
    }

    setIsFinished(false);
    setCurrentPhaseIndex(activeIndex);

    const diff = normalizedPhases[activeIndex].utcTarget - nowUtc;

    if (diff <= 0) return ZERO;

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [normalizedPhases]);

  useEffect(() => {
    // si pas de phases on fini direct
    if (normalizedPhases.length === 0) {
      setIsFinished(true);
      setTimeLeft(ZERO);
      return undefined;
    }

    // set direct au montage
    setTimeLeft(calculateTimeLeft());

    // tick toute les secondes
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, normalizedPhases.length]);

  return {
    timeLeft,
    currentPhase: normalizedPhases[currentPhaseIndex],
    isFinished,
  };
};

export default useMultiPhaseCountdown;
