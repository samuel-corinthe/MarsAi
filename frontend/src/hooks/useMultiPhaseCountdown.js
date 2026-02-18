import { useState, useEffect, useCallback, useMemo } from "react";
import * as tz from "date-fns-tz";



const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };

const normalizeTarget = (target, tzName) => {
 
  if (target instanceof Date) return target;

 
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
    
    if (normalizedPhases.length === 0) {
      setIsFinished(true);
      setTimeLeft(ZERO);
      return undefined;
    }

   
    setTimeLeft(calculateTimeLeft());

    
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
