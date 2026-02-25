import { useEffect, useState } from "react";
import { getCurrentSessionUser, getSitePhaseState } from "../api";

export default function usePhaseAccessController({ refreshKey } = {}) {
  const [loading, setLoading] = useState(true);
  const [phaseKey, setPhaseKey] = useState("phase_1");
  const [hasSession, setHasSession] = useState(false);
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [hideCallForProjects, setHideCallForProjects] = useState(false);
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);
  const [isUploadAllowed, setIsUploadAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const [sitePhase, sessionPayload] = await Promise.all([
          getSitePhaseState(),
          getCurrentSessionUser().catch(() => null),
        ]);
        if (cancelled) return;

        const nextPhaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
        const role = String(sessionPayload?.user?.role || "").toLowerCase();
        const isAdmin = role === "admin" || role === "superadmin";
        const hasUserSession =
          Boolean(sessionPayload?.authenticated) || Boolean(sessionPayload?.user);

        setPhaseKey(nextPhaseKey);
        setHasSession(hasUserSession);
        setHasAdminSession(isAdmin);
        setHideCallForProjects(nextPhaseKey === "phase_2" || nextPhaseKey === "phase_3");
        setHideGalleryForVisitors(nextPhaseKey === "phase_1" && !isAdmin);
        setHideSubmitForVisitors(
          (nextPhaseKey === "phase_2" || nextPhaseKey === "phase_3") && !isAdmin,
        );
        setIsUploadAllowed(
          !(nextPhaseKey === "phase_2" || nextPhaseKey === "phase_3") || isAdmin,
        );
      } catch {
        if (cancelled) return;
        setPhaseKey("phase_1");
        setHasSession(false);
        setHasAdminSession(false);
        setHideCallForProjects(false);
        setHideGalleryForVisitors(false);
        setHideSubmitForVisitors(false);
        setIsUploadAllowed(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    loading,
    phaseKey,
    hasSession,
    hasAdminSession,
    hideCallForProjects,
    hideGalleryForVisitors,
    hideSubmitForVisitors,
    isUploadAllowed,
  };
}

