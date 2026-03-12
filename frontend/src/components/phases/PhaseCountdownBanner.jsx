import { useEffect, useMemo, useState } from "react";

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0 };
const PHASE_COUNTDOWN_COPY = {
  fr: {
    endPhase1: "Fin de phase 1",
    endPhase2: "Fin de phase 2",
    nextPhase: "Prochaine phase:",
    phase2: "Phase 2",
    phase3: "Phase 3",
    phase3Active: "La phase 3 est active : le decompte est desactive.",
    days: "J",
    hours: "H",
    minutes: "M",
    seconds: "S",
  },
  en: {
    endPhase1: "End of phase 1",
    endPhase2: "End of phase 2",
    nextPhase: "Next phase:",
    phase2: "Phase 2",
    phase3: "Phase 3",
    phase3Active: "Phase 3 is active: countdown is disabled.",
    days: "D",
    hours: "H",
    minutes: "M",
    seconds: "S",
  },
  ar: {
    endPhase1: "نهاية المرحلة 1",
    endPhase2: "نهاية المرحلة 2",
    nextPhase: "المرحلة التالية:",
    phase2: "المرحلة 2",
    phase3: "المرحلة 3",
    phase3Active: "المرحلة 3 نشطة: تم ايقاف العد التنازلي.",
    days: "يوم",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية",
  },
};

function normalizeLanguage(language = "fr") {
  const normalized = String(language || "").toLowerCase();
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("en")) return "en";
  return "fr";
}

function getPhaseCountdownCopy(language = "fr") {
  return PHASE_COUNTDOWN_COPY[normalizeLanguage(language)] || PHASE_COUNTDOWN_COPY.fr;
}

function toCountdownParts(remainingMs) {
  const safeMs = Math.max(0, Number(remainingMs) || 0);
  return {
    days: Math.floor(safeMs / 86400000),
    hours: Math.floor((safeMs % 86400000) / 3600000),
    minutes: Math.floor((safeMs % 3600000) / 60000),
    seconds: Math.floor((safeMs % 60000) / 1000),
  };
}

function resolvePhaseCountdown(sitePhase, nowTs, language) {
  const copy = getPhaseCountdownCopy(language);
  const currentPhaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
  if (currentPhaseKey === "phase_3") return null;

  const phase1EndTs = sitePhase?.phase1EndsAt
    ? new Date(sitePhase.phase1EndsAt).getTime()
    : NaN;
  const phase2EndTs = sitePhase?.phase2EndsAt
    ? new Date(sitePhase.phase2EndsAt).getTime()
    : NaN;

  if (Number.isFinite(phase1EndTs) && nowTs < phase1EndTs) {
    return {
      title: copy.endPhase1,
      next: copy.phase2,
      targetTs: phase1EndTs,
    };
  }

  if (Number.isFinite(phase2EndTs) && nowTs < phase2EndTs) {
    return {
      title: copy.endPhase2,
      next: copy.phase3,
      targetTs: phase2EndTs,
    };
  }

  return null;
}

const VARIANTS = {
  callForProject: {
    phase3ClassName:
      "mb-10 rounded-2xl border border-blue-300/30 bg-blue-900/40 p-4 text-sm text-blue-100",
    wrapperClassName:
      "mb-10 rounded-2xl border border-blue-300/30 bg-blue-900/40 p-5",
    counterLabelClassName: "text-[11px] uppercase tracking-[0.2em] text-blue-200",
    nextTextClassName: "mt-4 text-xs text-blue-100/85",
  },
};

export default function PhaseCountdownBanner({
  sitePhase,
  language = "fr",
  variant = "home",
  isLight = false,
}) {
  const [nowTs, setNowTs] = useState(0);
  const styles = VARIANTS[variant] || VARIANTS.callForProject;
  const copy = useMemo(() => getPhaseCountdownCopy(language), [language]);

  useEffect(() => {
    const immediateId = setTimeout(() => setNowTs(Date.now()), 0);
    const intervalId = setInterval(() => setNowTs(Date.now()), 1000);
    return () => {
      clearTimeout(immediateId);
      clearInterval(intervalId);
    };
  }, []);

  const phaseCountdown = useMemo(
    () => resolvePhaseCountdown(sitePhase, nowTs, language),
    [sitePhase, nowTs, language],
  );
  const countdown = useMemo(
    () => (phaseCountdown ? toCountdownParts(phaseCountdown.targetTs - nowTs) : ZERO),
    [phaseCountdown, nowTs],
  );
  const isArabic = normalizeLanguage(language) === "ar";
  const units = useMemo(
    () => [
      { key: "days", label: copy.days, value: countdown.days },
      { key: "hours", label: copy.hours, value: countdown.hours },
      { key: "minutes", label: copy.minutes, value: countdown.minutes },
      { key: "seconds", label: copy.seconds, value: countdown.seconds },
    ],
    [copy, countdown.days, countdown.hours, countdown.minutes, countdown.seconds],
  );
  const titleClassName = isArabic
    ? "text-center text-sm font-black text-cyan-200"
    : "text-center text-[11px] font-black uppercase tracking-[0.25em] sm:text-[11px]";
  const inlineLabelClassName = isArabic
    ? "mt-1 text-xs font-bold text-cyan-200"
    : "mt-1 text-[11px] font-black uppercase tracking-[0.24em]";
  const inlineNextClassName = isArabic
    ? "mt-3 text-center text-sm text-slate-100/90"
    : "mt-3 text-center text-[11px] uppercase tracking-[0.18em] sm:text-xs";
  const cardLabelClassName = isArabic
    ? "text-xs font-semibold text-blue-100"
    : styles.counterLabelClassName;

  if (!sitePhase || nowTs <= 0) return null;

  const useLargeInlineCountdown =
    variant === "home" || variant === "callForProject";

  if (!phaseCountdown) {
    if (useLargeInlineCountdown) return null;
    return (
      <div className={styles.phase3ClassName}>
        {copy.phase3Active}
      </div>
    );
  }

  if (useLargeInlineCountdown) {
    const containerClassName =
      variant === "callForProject" ? "mt-0" : "mt-8";
    const homeTitleClassName = isLight
      ? "text-cyan-800"
      : "text-cyan-200";
    const homeValueClassName = isLight
      ? "text-slate-950"
      : "text-white [text-shadow:0_8px_30px_rgba(56,189,248,0.35)]";
    const homeLabelClassName = isLight
      ? "text-cyan-700"
      : "text-cyan-300/90";
    const homeSeparatorClassName = isLight
      ? "text-cyan-700/70"
      : "text-cyan-300/70";
    const homeNextClassName = isLight
      ? "text-slate-700"
      : "text-slate-100/90";

    return (
      <div className={containerClassName}>
        <p className={`${titleClassName} ${homeTitleClassName}`}>
          {phaseCountdown.title}
        </p>

        <div dir="ltr" className="mt-3 flex flex-wrap items-end justify-center gap-y-3 sm:gap-y-4">
          {units.map((item, index) => (
            <div key={item.key} className="flex items-end">
              <div className="min-w-[68px] text-center sm:min-w-[88px]">
                <div className={`tabular-nums text-5xl font-black leading-none tracking-tight sm:text-6xl md:text-7xl ${homeValueClassName}`}>
                  {String(item.value).padStart(2, "0")}
                </div>
                <div className={`${inlineLabelClassName} ${homeLabelClassName}`}>
                  {item.label}
                </div>
              </div>
              {index < units.length - 1 ? (
                <span className={`mb-2 px-1 text-2xl font-black sm:text-3xl ${homeSeparatorClassName}`}>:</span>
              ) : null}
            </div>
          ))}
        </div>

        <p className={`${inlineNextClassName} ${homeNextClassName}`}>
          {copy.nextPhase}{" "}
          <span className={isLight ? "font-black text-slate-900" : "font-black text-cyan-100"}>
            {phaseCountdown.next}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapperClassName}>
      <p className={`${isArabic ? "text-sm font-black text-cyan-200 mb-4" : "text-xs font-black uppercase tracking-[0.2em] text-cyan-200 mb-4"}`}>
        {phaseCountdown.title}
      </p>
      <div dir="ltr" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {units.map((item) => (
          <div
            key={item.key}
            className="rounded-xl bg-white/10 border border-white/10 px-3 py-4 text-center"
          >
            <div className="text-2xl font-black text-white tabular-nums">
              {String(item.value).padStart(2, "0")}
            </div>
            <div className={cardLabelClassName}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.nextTextClassName}>
        {copy.nextPhase}{" "}
        <span className="font-semibold">{phaseCountdown.next}</span>
      </p>
    </div>
  );
}
