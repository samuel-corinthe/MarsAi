import { useEffect, useState } from "react";
import Seo from "../components/Seo";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FilmRow from "../components/dashboard/FilmRow";
import ProgressBar from "../components/dashboard/ProgressBar";
import PageLoader from "../components/ui/PageLoader";
import {
  autoAssignMovieReviews,
  claimMovieAssignment,
  deleteMyMovieRating,
  getAdminDashboardData,
  getMyAssignments,
  getPhase2SelectionStatus,
  getPhase3SelectionStatus,
  getSitePhaseState,
  patchPhase2Selection,
  patchPhase3Selection,
  rebalanceMovieReviews,
  releaseMovieAssignment,
  logoutSession,
  updateSitePhaseState,
  validatePhase2Selection,
  validatePhase3Selection,
  upsertMyMovieRating,
  updateCurrentSessionProfile,
} from "../api";

const DEFAULT_ASSIGNMENT_META = {
  policy: null,
  assignmentByMovie: {},
  reviewerCountByMovie: {},
  myPendingMinutes: 0,
};

const DASHBOARD_SECTION_IDS = ["admin-top", "profile", "films"];
const SITE_PHASE_KEYS = ["phase_1", "phase_2", "phase_3"];
const SITE_PHASE_LABELS = {
  phase_1: "Phase 1 - Depot",
  phase_2: "Phase 2 - Selection",
  phase_3: "Phase 3 - Annonce",
};

function isDashboardSection(href) {
  return DASHBOARD_SECTION_IDS.includes(String(href || ""));
}

function filterDashboardNavItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => isDashboardSection(item?.href));
}

function resolveDashboardDefaultNav(items) {
  return filterDashboardNavItems(items)[0]?.href || "admin-top";
}

function resolveMovieId(film) {
  const movieId = Number(film?.id ?? film?.movieId ?? film?.movie_id);
  if (!Number.isFinite(movieId) || movieId <= 0) return null;
  return movieId;
}

function extractMovieYear(movie) {
  const fromReleaseDate = String(
    movie?.releaseDate || movie?.release_date || movie?.releaseYear || movie?.release_year || "",
  );
  const match = fromReleaseDate.match(/\d{4}/);
  return Number(match?.[0] || 0);
}

export default function Dashboard() {
  const { i18n } = useTranslation();
  const homePath = i18n.language === "en" ? "/home" : "/accueil";
  const filmsBasePath = i18n.language === "en" ? "/movies" : "/films";
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [isFilmFilterModalOpen, setIsFilmFilterModalOpen] = useState(false);
  const [showFilmFiltersCard, setShowFilmFiltersCard] = useState(true);
  const [isFilmsListCompact, setIsFilmsListCompact] = useState(true);
  const [activeNav, setActiveNav] = useState("admin-top");
  const [currentUser, setCurrentUser] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [wpPasswordForSync, setWpPasswordForSync] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [assignmentMeta, setAssignmentMeta] = useState(DEFAULT_ASSIGNMENT_META);
  const [assignmentBusyMovieId, setAssignmentBusyMovieId] = useState(null);
  const [assignmentInfoError, setAssignmentInfoError] = useState("");
  const [assignmentInfoSuccess, setAssignmentInfoSuccess] = useState("");
  const [distributionBusy, setDistributionBusy] = useState(false);
  const [ratingModalFilm, setRatingModalFilm] = useState(null);
  const [ratingModalScore, setRatingModalScore] = useState(0);
  const [ratingModalComment, setRatingModalComment] = useState("");
  const [ratingModalLoading, setRatingModalLoading] = useState(false);
  const [ratingModalError, setRatingModalError] = useState("");
  const [sitePhase, setSitePhase] = useState(null);
  const [sitePhaseBusy, setSitePhaseBusy] = useState(false);
  const [phase2SelectionState, setPhase2SelectionState] = useState({
    selectedCount: 0,
    minRequired: 50,
    selectedMovies: [],
    isReadyBySuperadmin: false,
    readyByName: null,
    readyAt: null,
  });
  const [phase3EligibleMovieIds, setPhase3EligibleMovieIds] = useState(() => new Set());
  const [phase3EligibilityLoaded, setPhase3EligibilityLoaded] = useState(false);
  const [phase2SelectionBusyMovieId, setPhase2SelectionBusyMovieId] = useState(null);
  const [phase2SelectionValidateBusy, setPhase2SelectionValidateBusy] = useState(false);
  const [isPhase2SelectionCardOpen, setIsPhase2SelectionCardOpen] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const sortOptions = [
    { label: "Défaut", value: "default" },
    { label: "Titre A-Z", value: "title_asc" },
    { label: "Titre Z-A", value: "title_desc" },
    { label: "Année - +", value: "year_asc" },
    { label: "Année + -", value: "year_desc" },
  ];

  const applyPhase2SelectionSnapshot = (payload, fallbackMinRequired = 50) => {
    setPhase2SelectionState({
      selectedCount: Number(payload?.selectedCount || 0),
      minRequired: Number(payload?.minRequired ?? fallbackMinRequired),
      selectedMovies: Array.isArray(payload?.selectedMovies) ? payload.selectedMovies : [],
      isReadyBySuperadmin: Boolean(payload?.isReadyBySuperadmin),
      readyByName: payload?.readyByName || null,
      readyAt: payload?.readyAt || null,
    });
  };

  const applyPhase3EligibilitySnapshot = (payload) => {
    const ids = (Array.isArray(payload?.selectedMovies) ? payload.selectedMovies : [])
      .map((movie) => Number(movie?.id))
      .filter((movieId) => Number.isFinite(movieId) && movieId > 0);
    setPhase3EligibleMovieIds(new Set(ids));
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [
          dashboardResult,
          assignmentsResult,
          sitePhaseResult,
          phase2SelectionResult,
          phase3SelectionResult,
        ] =
          await Promise.allSettled([
          getAdminDashboardData({ signal: controller.signal }),
          getMyAssignments(),
          getSitePhaseState({ signal: controller.signal }),
          getPhase2SelectionStatus({ signal: controller.signal }),
          getPhase3SelectionStatus({ signal: controller.signal }),
          ]);
        if (dashboardResult.status !== "fulfilled") {
          throw dashboardResult.reason;
        }
        const data = dashboardResult.value;
        const myAssignments =
          assignmentsResult.status === "fulfilled" ? assignmentsResult.value : null;
        if (cancelled) return;
        setAdminData(data);
        setAssignmentMeta({
          policy: myAssignments?.policy || DEFAULT_ASSIGNMENT_META.policy,
          assignmentByMovie:
            myAssignments?.assignmentByMovie || DEFAULT_ASSIGNMENT_META.assignmentByMovie,
          reviewerCountByMovie:
            myAssignments?.reviewerCountByMovie
            || DEFAULT_ASSIGNMENT_META.reviewerCountByMovie,
          myPendingMinutes: Number(
            myAssignments?.myPendingMinutes || DEFAULT_ASSIGNMENT_META.myPendingMinutes,
          ),
        });
        if (assignmentsResult.status === "rejected") {
          setAssignmentInfoError(
            "Module d'assignations indisponible (endpoint /api/assignments absent ou backend non redémarré).",
          );
        }
        setActiveNav(resolveDashboardDefaultNav(data?.navItems));
        setCurrentUser(data?.currentUser ?? null);
        setProfileForm(data?.currentUser ?? null);
        const resolvedSitePhase =
          sitePhaseResult.status === "fulfilled" ? sitePhaseResult.value : null;
        if (resolvedSitePhase) {
          setSitePhase(resolvedSitePhase);
        }

        const resolvedPhaseKey = String(
          resolvedSitePhase?.currentPhase || "phase_1",
        ).toLowerCase();
        const activeSelectionResult =
          resolvedPhaseKey === "phase_2" ? phase3SelectionResult : phase2SelectionResult;

        if (resolvedPhaseKey === "phase_2" && phase2SelectionResult.status === "fulfilled") {
          applyPhase3EligibilitySnapshot(phase2SelectionResult.value);
          setPhase3EligibilityLoaded(true);
        } else {
          setPhase3EligibleMovieIds(new Set());
          setPhase3EligibilityLoaded(false);
        }

        if (activeSelectionResult.status === "fulfilled") {
          applyPhase2SelectionSnapshot(
            activeSelectionResult.value,
            resolvedPhaseKey === "phase_2" ? 5 : 50,
          );
        } else {
          setPhase2SelectionState({
            selectedCount: 0,
            minRequired: resolvedPhaseKey === "phase_2" ? 5 : 50,
            selectedMovies: [],
            isReadyBySuperadmin: false,
            readyByName: null,
            readyAt: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message ?? "Erreur de chargement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isFilmFilterModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isFilmFilterModalOpen]);

  if (loading) {
    return <PageLoader message="Chargement du dashboard admin..." />;
  }

  if (loadError) {
    return (
      <div className="app-container page">
        Erreur de chargement: {loadError}
      </div>
    );
  }

  if (!adminData) {
    return <PageLoader message="Aucune donnee admin disponible." fullscreen={false} compact />;
  }

  const {
    selectionTarget = 0,
    adminKpis = { noted: 0, remaining: 0, selected: 0, quota: 0 },
    films = [],
    navItems = [],
    phaseTimeline = [],
  } = adminData;

  const quotaTarget = selectionTarget || adminKpis.quota || 0;
  const filteredNavItems = filterDashboardNavItems(navItems);

  if (!phaseTimeline?.length) {
    return <PageLoader message="Aucune phase configuree." fullscreen={false} compact />;
  }

  const effectiveUser = currentUser ?? adminData.currentUser;
  const effectiveProfile = profileForm ?? adminData.currentUser;
  const profilePreview = profileForm ?? effectiveUser;

  if (!effectiveUser || !effectiveProfile) {
    return <PageLoader message="Chargement du profil admin..." />;
  }

  const now = new Date(nowTs);
  const requestedPhaseKey = String(sitePhase?.currentPhase || "").toLowerCase();
  const requestedPhaseIndex = SITE_PHASE_KEYS.indexOf(requestedPhaseKey);
  const phaseIndexFromSite = requestedPhaseIndex === -1 ? 0 : requestedPhaseIndex;
  const safePhaseIndex = Math.min(
    Math.max(phaseIndexFromSite, 0),
    phaseTimeline.length - 1
  );
  const currentPhase = phaseTimeline[safePhaseIndex];
  const activeSitePhaseKey = SITE_PHASE_KEYS[safePhaseIndex] || "phase_1";
  const activeSitePhaseLabel = SITE_PHASE_LABELS[activeSitePhaseKey] || SITE_PHASE_LABELS.phase_1;
  const phaseDuration = new Date(currentPhase.end) - new Date(currentPhase.start);
  const elapsed = Math.max(0, now - new Date(currentPhase.start));
  const phaseProgress = Math.min(100, (elapsed / (phaseDuration || 1)) * 100);
  const phase1EndTs = sitePhase?.phase1EndsAt ? new Date(sitePhase.phase1EndsAt).getTime() : NaN;
  const phase2EndTs = sitePhase?.phase2EndsAt ? new Date(sitePhase.phase2EndsAt).getTime() : NaN;
  const phaseCountdownMeta = (() => {
    if (activeSitePhaseKey === "phase_3") return null;
    if (Number.isFinite(phase1EndTs) && nowTs < phase1EndTs) {
      return { label: "Fin phase 1", targetTs: phase1EndTs };
    }
    if (Number.isFinite(phase2EndTs) && nowTs < phase2EndTs) {
      return { label: "Fin phase 2", targetTs: phase2EndTs };
    }
    return null;
  })();
  const phaseCountdownMs = phaseCountdownMeta
    ? Math.max(0, phaseCountdownMeta.targetTs - nowTs)
    : 0;
  const remainingDays = Math.floor(phaseCountdownMs / 86400000);
  const remainingHours = Math.floor((phaseCountdownMs % 86400000) / 3600000);
  const remainingMinutes = Math.floor((phaseCountdownMs % 3600000) / 60000);
  const remainingSeconds = Math.floor((phaseCountdownMs % 60000) / 1000);
  const showPhaseCountdown = Boolean(phaseCountdownMeta);
  const isSuperAdmin = effectiveUser.role === "superadmin";
  const canManagePhase = ["admin", "superadmin"].includes(String(effectiveUser.role || ""));
  const phase2SelectedMovieIds = new Set(
    (phase2SelectionState.selectedMovies || [])
      .map((movie) => Number(movie?.id))
      .filter((movieId) => Number.isFinite(movieId) && movieId > 0),
  );
  const phase2SelectionCount = Number(phase2SelectionState.selectedCount || 0);
  const isSelectionForPhase2 = activeSitePhaseKey === "phase_1";
  const isSelectionForPhase3 = activeSitePhaseKey === "phase_2";
  const phase2SelectionMinRequired = isSelectionForPhase3
    ? 5
    : Number(phase2SelectionState.minRequired || 50);
  const hasEnoughPhase2Selection = phase2SelectionCount >= phase2SelectionMinRequired;
  const canManageSelectionForCurrentPhase =
    canManagePhase && (isSelectionForPhase2 || isSelectionForPhase3);
  const phase3EligibilityEnforced = phase3EligibilityLoaded && phase3EligibleMovieIds.size >= 50;
  const selectionCardTitle = isSelectionForPhase2
    ? "Preselection phase 2"
    : "Selection jury phase 3";
  const selectionAddLabel = isSelectionForPhase2
    ? "Selectionner pour phase 2"
    : "Selectionner pour phase 3";
  const selectionRemoveLabel = isSelectionForPhase2
    ? "Retirer de la phase 2"
    : "Retirer de la phase 3";
  const selectionDisabledLabel = isSelectionForPhase3 ? "Non retenu phase 2" : "Indisponible";
  const selectionValidationLabel = isSelectionForPhase2
    ? "Valider les 50 films"
    : "Valider les 5 films";
  const selectionValidatedLabel = isSelectionForPhase2
    ? "Selection phase 2 validee"
    : "Selection phase 3 validee";
  const selectionConditionsLabel = isSelectionForPhase2 ? "Conditions phase 2" : "Conditions phase 3";
  const selectionDeadlineLabel = isSelectionForPhase2 ? "Date de fin phase 1" : "Date de fin phase 2";
  const selectionDeadlineIso = isSelectionForPhase2 ? sitePhase?.phase1EndsAt : sitePhase?.phase2EndsAt;
  const selectionDeadlineTs = selectionDeadlineIso ? new Date(selectionDeadlineIso).getTime() : NaN;
  const isSelectionDeadlineReached = Number.isFinite(selectionDeadlineTs)
    ? Date.now() >= selectionDeadlineTs
    : false;
  const showSelectionCard = isSuperAdmin && (isSelectionForPhase2 || isSelectionForPhase3);
  const isSelectionDisabledForMovie = (movieId) => {
    const safeMovieId = Number(movieId);
    if (!isSelectionForPhase3) return false;
    if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) return true;
    if (!phase3EligibilityEnforced) return false;
    return (
      !phase2SelectedMovieIds.has(safeMovieId)
      && !phase3EligibleMovieIds.has(safeMovieId)
    );
  };
  const isSelectionQuotaReachedForMovie = (movieId) => {
    const safeMovieId = Number(movieId);
    if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) return false;
    if (phase2SelectionCount < phase2SelectionMinRequired) return false;
    return !phase2SelectedMovieIds.has(safeMovieId);
  };

  const handleNav = (href) => {
    if (!isDashboardSection(href)) return;
    setActiveNav(href);
    const el = document.getElementById(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const assignmentPolicy = assignmentMeta.policy || adminData.assignmentPolicy || {
    minReviewers: 3,
    maxReviewers: 5,
  };

  const filmsWithAssignments = films.map((film) => {
    const movieIdKey = String(film.id);
    const myAssignment = assignmentMeta.assignmentByMovie?.[movieIdKey] || null;
    const reviewerCount =
      Number(assignmentMeta.reviewerCountByMovie?.[movieIdKey]) ||
      Number(film.reviewersCount || 0);
    const myStatus = myAssignment?.status || film.myAssignmentStatus || null;

    return {
      ...film,
      reviewersCount: reviewerCount,
      myAssignmentStatus: myStatus,
      myAssignmentSource: myAssignment?.source || film.myAssignmentSource || null,
      isAssignedToMe: Boolean(myAssignment || film.isAssignedToMe),
      canClaim:
        !myAssignment &&
        Number(reviewerCount) < Number(assignmentPolicy.maxReviewers || 5),
      canRelease:
        Boolean(myAssignment) &&
        myStatus === "assigned" &&
        Number(reviewerCount) > Number(assignmentPolicy.minReviewers || 3),
    };
  });

  const assignedFilms = filmsWithAssignments.filter((film) => film.isAssignedToMe);

  const isFilmViewedByMe = (film) => {
    const hasValidRating =
      Number.isFinite(film.myRating) &&
      Number(film.myRating) >= 1 &&
      Number(film.myRating) <= 5;
    const hasComment = String(film.myComment || "").trim().length > 0;
    const isManualReviewOnly = String(film.myAssignmentSource || "") === "rating";
    if (isManualReviewOnly) return hasValidRating;
    return hasValidRating && hasComment;
  };

  const viewedAssignedCount = assignedFilms.filter(isFilmViewedByMe).length;
  const remainingAssignedCount = Math.max(0, assignedFilms.length - viewedAssignedCount);
  const ratedAssignedCount = assignedFilms.filter((film) => {
    const rating = Number(film.myRating);
    return Number.isFinite(rating) && rating >= 1 && rating <= 5;
  }).length;
  const commentedAssignedCount = assignedFilms.filter(
    (film) => String(film.myComment || "").trim().length > 0,
  ).length;
  const assignedTotal = Math.max(0, assignedFilms.length);
  const notesProgressValue = assignedTotal > 0 ? (ratedAssignedCount / assignedTotal) * 100 : 0;
  const commentsProgressValue =
    assignedTotal > 0 ? (commentedAssignedCount / assignedTotal) * 100 : 0;
  const viewingProgressValue = assignedTotal > 0 ? (viewedAssignedCount / assignedTotal) * 100 : 0;

  const normalizedSearchQuery = String(searchQuery || "").toLowerCase().trim();
  const filteredFilms = assignedFilms
    .filter((film) => {
      const matchesSearch = String(film.title || "")
        .toLowerCase()
        .includes(normalizedSearchQuery);
      const movieRating = Number(film?.rating || 0);
      const matchesRating = movieRating >= minRating && movieRating <= maxRating;
      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === "title_asc") {
        return String(a?.title || "").localeCompare(String(b?.title || ""), "fr");
      }
      if (sortBy === "title_desc") {
        return String(b?.title || "").localeCompare(String(a?.title || ""), "fr");
      }
      if (sortBy === "year_desc") {
        return extractMovieYear(b) - extractMovieYear(a);
      }
      if (sortBy === "year_asc") {
        return extractMovieYear(a) - extractMovieYear(b);
      }
      return 0;
    });

  const activeSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label || "Défaut";
  const hasAdvancedFilters = sortBy !== "default" || minRating > 0 || maxRating < 5;
  const compactFilm = filteredFilms[0] || null;
  const visibleFilms = isFilmsListCompact ? (compactFilm ? [compactFilm] : []) : filteredFilms;
  const hiddenFilmsCount = Math.max(0, filteredFilms.length - visibleFilms.length);

  const selectionRatio = adminKpis.quota ? (adminKpis.selected / adminKpis.quota) * 100 : 0;
  const selectionProgress = quotaTarget ? Math.min(100, (currentPhase.selected / quotaTarget) * 100) : 0;

  const resetFilmFilters = () => {
    setSortBy("default");
    setMinRating(0);
    setMaxRating(5);
    setSearchQuery("");
  };

  const handleProfileSave = async () => {
    if (!profileForm) return;
    setProfileSaveError("");
    setProfileSaveSuccess("");
    setProfileSaving(true);

    try {
      const payload = await updateCurrentSessionProfile({
        name: profileForm.name,
        email: profileForm.email,
        wpPassword: wpPasswordForSync,
      });

      const updatedUser = payload?.user ?? {};
      const mergedUser = {
        ...profileForm,
        ...updatedUser,
      };

      setCurrentUser((prev) => (prev ? { ...prev, ...mergedUser } : mergedUser));
      setProfileForm((prev) => (prev ? { ...prev, ...mergedUser } : mergedUser));
      setAdminData((prev) =>
        prev ? { ...prev, currentUser: { ...(prev.currentUser || {}), ...mergedUser } } : prev,
      );
      setWpPasswordForSync("");
      setProfileSaveSuccess("Profil synchronisé avec WordPress et la base locale.");
    } catch (error) {
      setProfileSaveError(
        error?.message || "Impossible de synchroniser le profil avec WordPress.",
      );
    } finally {
      setProfileSaving(false);
    }
  };
  const handleAddSelection = () => {
    setAdminData((prev) => {
      if (!prev) return prev;
      const quota = prev.adminKpis?.quota ?? 0;
      const nextSelected = Math.min((prev.adminKpis?.selected ?? 0) + 1, quota);
      const nextAdminKpis = {
        ...prev.adminKpis,
        selected: nextSelected,
        remaining: Math.max(0, (prev.adminKpis?.remaining ?? 0) - 1),
        noted: (prev.adminKpis?.noted ?? 0) + 1,
      };
      const nextPhaseTimeline = (prev.phaseTimeline ?? []).map((phase, idx) => {
        if (idx !== safePhaseIndex) return phase;
        const phaseQuota = phase.quota ?? quota;
        const nextPhaseSelected = Math.min((phase.selected ?? 0) + 1, phaseQuota);
        return { ...phase, selected: nextPhaseSelected };
      });
      return {
        ...prev,
        adminKpis: nextAdminKpis,
        phaseTimeline: nextPhaseTimeline,
      };
    });
  };

  const handleLogout = async () => {
    setLogoutError("");
    setLogoutPending(true);
    try {
      await logoutSession();
      window.location.assign("/dashboard");
    } catch (error) {
      setLogoutError(error?.message || "Déconnexion impossible.");
      setLogoutPending(false);
    }
  };

  const refreshDashboardAndAssignments = async () => {
    const [
      dashboardResult,
      assignmentsResult,
      sitePhaseResult,
      phase2SelectionResult,
      phase3SelectionResult,
    ] =
      await Promise.allSettled([
      getAdminDashboardData(),
      getMyAssignments(),
      getSitePhaseState(),
      getPhase2SelectionStatus(),
      getPhase3SelectionStatus(),
      ]);
    if (dashboardResult.status !== "fulfilled") {
      throw dashboardResult.reason;
    }
    const data = dashboardResult.value;
    const myAssignments =
      assignmentsResult.status === "fulfilled" ? assignmentsResult.value : null;

    setAdminData(data);
    setActiveNav((prev) =>
      isDashboardSection(prev) ? prev : resolveDashboardDefaultNav(data?.navItems),
    );
    setCurrentUser(data?.currentUser ?? null);
    setProfileForm((prev) => prev ?? data?.currentUser ?? null);
    setAssignmentMeta({
      policy: myAssignments?.policy || DEFAULT_ASSIGNMENT_META.policy,
      assignmentByMovie:
        myAssignments?.assignmentByMovie || DEFAULT_ASSIGNMENT_META.assignmentByMovie,
      reviewerCountByMovie:
        myAssignments?.reviewerCountByMovie
        || DEFAULT_ASSIGNMENT_META.reviewerCountByMovie,
      myPendingMinutes: Number(
        myAssignments?.myPendingMinutes || DEFAULT_ASSIGNMENT_META.myPendingMinutes,
      ),
    });
    if (assignmentsResult.status === "rejected") {
      setAssignmentInfoError(
        "Module d'assignations indisponible (endpoint /api/assignments absent ou backend non redémarré).",
      );
    } else {
      setAssignmentInfoError("");
    }
    const resolvedSitePhase =
      sitePhaseResult.status === "fulfilled" ? sitePhaseResult.value : null;
    if (resolvedSitePhase) {
      setSitePhase(resolvedSitePhase);
    }

    const resolvedPhaseKey = String(
      resolvedSitePhase?.currentPhase || "phase_1",
    ).toLowerCase();
    const activeSelectionResult =
      resolvedPhaseKey === "phase_2" ? phase3SelectionResult : phase2SelectionResult;

    if (resolvedPhaseKey === "phase_2" && phase2SelectionResult.status === "fulfilled") {
      applyPhase3EligibilitySnapshot(phase2SelectionResult.value);
      setPhase3EligibilityLoaded(true);
    } else {
      setPhase3EligibleMovieIds(new Set());
      setPhase3EligibilityLoaded(false);
    }

    if (activeSelectionResult.status === "fulfilled") {
      applyPhase2SelectionSnapshot(
        activeSelectionResult.value,
        resolvedPhaseKey === "phase_2" ? 5 : 50,
      );
    } else {
      setPhase2SelectionState({
        selectedCount: 0,
        minRequired: resolvedPhaseKey === "phase_2" ? 5 : 50,
        selectedMovies: [],
        isReadyBySuperadmin: false,
        readyByName: null,
        readyAt: null,
      });
    }
  };

  const handleSetSitePhase = async (phaseKey) => {
    if (!canManagePhase) return;
    if (!SITE_PHASE_KEYS.includes(phaseKey)) return;
    if (sitePhaseBusy) return;

    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setSitePhaseBusy(true);

    try {
      const payload = await updateSitePhaseState({
        currentPhase: phaseKey,
        mode: "manual",
      });
      await refreshDashboardAndAssignments();

      const deletedMovies = Number(payload?.phase2PruneSummary?.deletedMovies || 0);
      const pruneSuffix = deletedMovies > 0
        ? ` ${deletedMovies} film(s) hors selection phase 2 supprime(s).`
        : "";
      setAssignmentInfoSuccess(`Phase active: ${SITE_PHASE_LABELS[phaseKey]}.${pruneSuffix}`);
    } catch (error) {
      setAssignmentInfoError(error?.message || "Impossible de mettre a jour la phase.");
    } finally {
      setSitePhaseBusy(false);
    }
  };

  const handleTogglePhase2Movie = async (movieId, currentSelected) => {
    if (!canManageSelectionForCurrentPhase) return;
    const safeMovieId = Number(movieId);
    if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) return;
    if (phase2SelectionBusyMovieId != null) return;
    if (!currentSelected && phase2SelectionCount >= phase2SelectionMinRequired) {
      setAssignmentInfoError(
        `Quota atteint: ${phase2SelectionCount}/${phase2SelectionMinRequired}. Retire un film avant d'en ajouter un autre.`,
      );
      return;
    }
    if (
      isSelectionForPhase3
      && phase3EligibilityEnforced
      && !currentSelected
      && !phase3EligibleMovieIds.has(safeMovieId)
    ) {
      setAssignmentInfoError(
        "Ce film n'est pas dans la selection phase 2 et ne peut pas etre promu en phase 3.",
      );
      return;
    }

    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setPhase2SelectionBusyMovieId(safeMovieId);

    try {
      const payload = isSelectionForPhase3
        ? await patchPhase3Selection(safeMovieId, !currentSelected)
        : await patchPhase2Selection(safeMovieId, !currentSelected);
      applyPhase2SelectionSnapshot(payload, isSelectionForPhase3 ? 5 : 50);
      setAssignmentInfoSuccess(
        !currentSelected
          ? `Film ajoute a la selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"}.`
          : `Film retire de la selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"}.`,
      );
    } catch (error) {
      setAssignmentInfoError(
        error?.message
          || `Impossible de modifier la selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"}.`,
      );
    } finally {
      setPhase2SelectionBusyMovieId(null);
    }
  };

  const handleValidatePhase2BySuperadmin = async () => {
    if (!isSuperAdmin) return;
    if (!showSelectionCard) return;
    if (phase2SelectionValidateBusy) return;

    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setPhase2SelectionValidateBusy(true);

    try {
      const payload = isSelectionForPhase3
        ? await validatePhase3Selection()
        : await validatePhase2Selection();
      applyPhase2SelectionSnapshot(payload, isSelectionForPhase3 ? 5 : 50);

      const targetPhase = isSelectionForPhase2 ? "phase_2" : (isSelectionForPhase3 ? "phase_3" : null);
      let transitionErrorMessage = "";
      let transitionPayload = null;

      if (targetPhase) {
        try {
          transitionPayload = await updateSitePhaseState({
            currentPhase: targetPhase,
            mode: "manual",
          });
        } catch (transitionError) {
          transitionErrorMessage = String(
            transitionError?.message
            || `Passage en ${SITE_PHASE_LABELS[targetPhase]} impossible pour le moment.`,
          );
        }
      }

      await refreshDashboardAndAssignments();

      if (transitionPayload) {
        const deletedMovies = Number(transitionPayload?.phase2PruneSummary?.deletedMovies || 0);
        const pruneSuffix = deletedMovies > 0
          ? ` ${deletedMovies} film(s) hors selection phase 2 supprime(s).`
          : "";
        setAssignmentInfoSuccess(
          `Selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"} validee et passage en ${SITE_PHASE_LABELS[targetPhase]}.${pruneSuffix}`,
        );
      } else if (transitionErrorMessage) {
        setAssignmentInfoSuccess(
          `Selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"} validee. ${transitionErrorMessage}`,
        );
      } else {
        setAssignmentInfoSuccess(
          `Selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"} validee par superadmin.`,
        );
      }
    } catch (error) {
      setAssignmentInfoError(
        error?.message
          || `Impossible de valider la selection ${isSelectionForPhase2 ? "phase 2" : "phase 3"}.`,
      );
    } finally {
      setPhase2SelectionValidateBusy(false);
    }
  };

  const handleClaimFilm = async (film) => {
    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setAssignmentBusyMovieId(Number(film.id));
    try {
      await claimMovieAssignment(film.id);
      await refreshDashboardAndAssignments();
      setAssignmentInfoSuccess(`Film "${film.title}" attribué à votre file.`);
    } catch (error) {
      setAssignmentInfoError(error?.message || "Impossible de prendre ce film.");
    } finally {
      setAssignmentBusyMovieId(null);
    }
  };

  const handleReleaseFilm = async (film) => {
    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setAssignmentBusyMovieId(Number(film.id));
    try {
      await releaseMovieAssignment(film.id);
      await refreshDashboardAndAssignments();
      setAssignmentInfoSuccess(`Film "${film.title}" retiré de votre file.`);
    } catch (error) {
      setAssignmentInfoError(error?.message || "Impossible de retirer ce film.");
    } finally {
      setAssignmentBusyMovieId(null);
    }
  };

  const handleOpenRatingModal = (film) => {
    const movieId = resolveMovieId(film);
    if (!movieId) return;
    const initialScore = Number.isFinite(Number(film?.myRating))
      ? Math.round(Math.max(0, Math.min(5, Number(film.myRating))))
      : 0;
    setRatingModalFilm({ ...film, id: movieId });
    setRatingModalScore(initialScore);
    setRatingModalComment(String(film?.myComment || ""));
    setRatingModalError("");
  };

  const handleCloseRatingModal = () => {
    if (ratingModalLoading) return;
    setRatingModalFilm(null);
    setRatingModalError("");
  };

  const handleSaveRating = async () => {
    if (!ratingModalFilm) return;
    if (!Number.isInteger(ratingModalScore) || ratingModalScore < 1 || ratingModalScore > 5) {
      return;
    }

    setRatingModalError("");
    setRatingModalLoading(true);
    try {
      await upsertMyMovieRating(
        ratingModalFilm.id,
        ratingModalScore,
        String(ratingModalComment || "").trim(),
      );
      await refreshDashboardAndAssignments();
      setRatingModalFilm(null);
      setAssignmentInfoSuccess(`Note enregistrée pour "${ratingModalFilm.title}".`);
    } catch (error) {
      setRatingModalError(error?.message || "Impossible d'enregistrer la note.");
    } finally {
      setRatingModalLoading(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!ratingModalFilm) return;

    setRatingModalError("");
    setRatingModalLoading(true);
    try {
      await deleteMyMovieRating(ratingModalFilm.id);
      await refreshDashboardAndAssignments();
      setRatingModalFilm(null);
      setAssignmentInfoSuccess(`Note supprimée pour "${ratingModalFilm.title}".`);
    } catch (error) {
      setRatingModalError(error?.message || "Impossible de supprimer la note.");
    } finally {
      setRatingModalLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!isSuperAdmin) return;
    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setDistributionBusy(true);
    try {
      const result = await autoAssignMovieReviews();
      await refreshDashboardAndAssignments();
      setAssignmentInfoSuccess(
        `Auto-répartition terminée : ${result?.createdAssignments || 0} assignations créées.`,
      );
    } catch (error) {
      setAssignmentInfoError(error?.message || "Impossible de lancer l’auto-répartition.");
    } finally {
      setDistributionBusy(false);
    }
  };

  const handleRebalance = async () => {
    if (!isSuperAdmin) return;
    setAssignmentInfoError("");
    setAssignmentInfoSuccess("");
    setDistributionBusy(true);
    try {
      const result = await rebalanceMovieReviews();
      await refreshDashboardAndAssignments();
      setAssignmentInfoSuccess(
        `Rééquilibrage terminé : ${result?.movedAssignments || 0} déplacées, ${result?.createdAssignments || 0} créées.`,
      );
    } catch (error) {
      setAssignmentInfoError(error?.message || "Impossible de rééquilibrer les assignations.");
    } finally {
      setDistributionBusy(false);
    }
  };

  return (
    <>
      <Seo title="Dashboard" description="Espace administration marsAI." noIndex />
      <div className="dash-page">
      <div className="dash-shell dash-layout">
        <div className="flex gap-5 items-start">
          {/* Sidebar desktop */}
          <aside className="dash-sidenav">
            <Link to={homePath} className="flex items-center gap-2 px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-300" />
              Home
            </Link>
            {filteredNavItems.map((item) => (
              <button
                key={item.href}
                className={activeNav === item.href ? "active" : ""}
                onClick={() => handleNav(item.href)}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 space-y-8">
        <header id="admin-top" className="glass p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="dash-title text-white">Bienvenue, {profilePreview.name}</h1>
            <button
              className="btn-ghost rounded-full px-4 py-2 border border-white/10 disabled:opacity-60"
              onClick={handleLogout}
              disabled={logoutPending}
            >
              {logoutPending ? "Déconnexion..." : "Se déconnecter"}
            </button>
            <p className="dash-subtitle text-slate-100/90">
              Vue unifiée : juger les films et gérer vos assignations.
            </p>
          </div>
          {logoutError && <p className="text-sm text-rose-200">{logoutError}</p>}
        </header>

        {/* Profil admin + phase en cours */}
        <section id="profile" className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="glass-strong p-6 space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">{profilePreview.name}</h2>
                <p className="text-sm text-slate-100/80">
                  Rôle actuel : {profilePreview.role === "superadmin" ? "Super admin" : "Admin"} - statut {profilePreview.status}.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-100/90">
                Nom complet
                <input
                  className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300"
                  value={effectiveProfile.name}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...(f ?? effectiveProfile),
                      name: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-100/90">
                Email
                <input
                  className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300"
                  value={effectiveProfile.email}
                  onChange={(e) =>
                    setProfileForm((f) => ({
                      ...(f ?? effectiveProfile),
                      email: e.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex flex-col gap-1 text-sm text-slate-100/90">
                Rôle
                <div className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-slate-200">
                  {effectiveProfile.role === "superadmin" ? "Super admin" : "Admin"}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-sm text-slate-100/90 md:col-span-2">
                Mot de passe WordPress (requis pour synchroniser)
                <input
                  type="password"
                  className="w-full rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-300"
                  value={wpPasswordForSync}
                  onChange={(e) => setWpPasswordForSync(e.target.value)}
                  placeholder="Entre ton mot de passe WordPress"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary px-4 py-2 rounded-lg disabled:opacity-60"
                onClick={handleProfileSave}
                disabled={profileSaving}
              >
                {profileSaving ? "Synchronisation..." : "Enregistrer et synchroniser"}
              </button>
              <button
                className="btn-ghost px-4 py-2 rounded-lg border border-white/10"
                onClick={() => {
                  setProfileForm(effectiveUser);
                  setWpPasswordForSync("");
                  setProfileSaveError("");
                  setProfileSaveSuccess("");
                }}
              >
                Réinitialiser
              </button>
            </div>
            {profileSaveError && <p className="text-sm text-rose-200">{profileSaveError}</p>}
            {profileSaveSuccess && <p className="text-sm text-emerald-200">{profileSaveSuccess}</p>}
          </div>

          <div className="glass p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">{currentPhase.label}</h3>
                <p className="text-sm text-slate-100/80">{currentPhase.description}</p>
              </div>
              <div className="text-right">
                {showPhaseCountdown ? (
                  <>
                    <div className="text-2xl font-semibold text-white">
                      {remainingDays}j {String(remainingHours).padStart(2, "0")}h{" "}
                      {String(remainingMinutes).padStart(2, "0")}m{" "}
                      {String(remainingSeconds).padStart(2, "0")}s
                    </div>
                    <div className="text-xs text-slate-200/80">
                      {phaseCountdownMeta?.label || "Decompte en cours"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-semibold text-white">-</div>
                    <div className="text-xs text-slate-200/80">Pas de decompte</div>
                  </>
                )}
              </div>
            </div>

            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${phaseProgress}%` }} />
            </div>
            <div className="text-xs text-slate-100/85">
              Sélection : {currentPhase.selected}/{quotaTarget} visés · Films déposés : {currentPhase.submitted}
            </div>
            <div className="bar-track h-2">
              <div
                className="bar-fill"
                style={{
                  width: `${selectionProgress}%`,
                  background: "linear-gradient(90deg,#25d0ff,#f2438b)",
                }}
              />
            </div>
            <div className="text-xs text-slate-100/75">
              Progression sélection : {Math.round(selectionProgress)}%
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs font-semibold text-cyan-100">
                Phase site active: {activeSitePhaseLabel}
              </div>
              <div className="text-[11px] text-slate-200/80">
                Mode: {sitePhase?.mode === "timer" ? "Timer" : "Manuel"}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {SITE_PHASE_KEYS.map((phaseKey) => {
                const isActivePhase = activeSitePhaseKey === phaseKey;
                return (
                  <button
                    key={phaseKey}
                    className={
                      isActivePhase
                        ? "btn-primary px-4 py-2 rounded-lg"
                        : "btn-ghost px-4 py-2 rounded-lg border border-white/10"
                    }
                    disabled={!canManagePhase || sitePhaseBusy || isActivePhase}
                    onClick={() => handleSetSitePhase(phaseKey)}
                  >
                    {SITE_PHASE_LABELS[phaseKey]}
                  </button>
                );
              })}
            </div>
            {!canManagePhase && (
              <p className="text-xs text-amber-200/90">Connexion admin requise pour changer de phase.</p>
            )}
          </div>
        </section>
        {/* Admin area */}
        <section id="films" className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 glass p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Vision rapide</h2>
                <p className="text-xs text-slate-200/85">
                  Charge perso : {assignmentMeta.myPendingMinutes} min en attente - {assignedFilms.length} films assignés - Règle {assignmentPolicy.minReviewers}-{assignmentPolicy.maxReviewers} évaluateurs / film
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isSuperAdmin && (
                  <>
                    <button
                      className="btn-ghost rounded-full px-4 py-2 border border-white/10 disabled:opacity-60"
                      onClick={handleAutoAssign}
                      disabled={distributionBusy}
                    >
                      {distributionBusy ? "Traitement..." : "Auto-répartir"}
                    </button>
                    <button
                      className="btn-ghost rounded-full px-4 py-2 border border-white/10 disabled:opacity-60"
                      onClick={handleRebalance}
                      disabled={distributionBusy}
                    >
                      {distributionBusy ? "Traitement..." : "Rééquilibrer"}
                    </button>
                  </>
                )}
                <button
                  className="btn-primary rounded-full px-4 py-2"
                  disabled={adminKpis.selected >= adminKpis.quota}
                  onClick={handleAddSelection}
                  style={{
                    opacity: adminKpis.selected >= adminKpis.quota ? 0.6 : 1,
                    cursor: adminKpis.selected >= adminKpis.quota ? "not-allowed" : "pointer",
                  }}
                >
                  Ajouter à la sélection ({adminKpis.selected}/{adminKpis.quota})
                </button>
              </div>
            </div>
            {assignmentInfoError && <p className="text-sm text-rose-200">{assignmentInfoError}</p>}
            {assignmentInfoSuccess && (
              <p className="text-sm text-emerald-200">{assignmentInfoSuccess}</p>
            )}


          
            <div className="stat-card glass-strong p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Vision synthèse</h3>
                <span className="text-xs text-slate-100/80">
                  {viewedAssignedCount}/{assignedFilms.length} traités
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="kpi-label text-slate-100">Films vus par vous</div>
                  <div className="kpi-value">{viewedAssignedCount}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="kpi-label text-slate-100">Restants</div>
                  <div className="kpi-value">{remainingAssignedCount}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="kpi-label text-slate-100">Sélection officielle</div>
                  <div className="kpi-value">
                    {adminKpis.selected}/{adminKpis.quota}
                  </div>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${selectionRatio}%` }} />
              </div>
              <div className="kpi-trend text-cyan-200">Quota cible {quotaTarget}</div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              {showFilmFiltersCard ? (
                <div className="list-card space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300/90">
                      Recherche et tri
                    </p>
                    <button
                      type="button"
                      className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:bg-white/20"
                      onClick={() => setShowFilmFiltersCard(false)}
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-grow">
                      <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                        <svg
                          className="h-5 w-5 text-slate-300/70"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Rechercher un film..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-full rounded-3xl border-2 border-white/10 bg-white/5 py-4 pl-14 pr-4 text-sm font-bold text-white placeholder-slate-300/60 outline-none transition-all focus:border-cyan-300 focus:bg-white/10"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilmFilterModalOpen(true)}
                      className="h-[56px] min-w-[56px] rounded-2xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-900/35 transition-colors hover:bg-cyan-400"
                      aria-label="Ouvrir les filtres avancés"
                      title="Filtres avancés"
                    >
                      <svg
                        className="mx-auto h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M4 6h16M7 12h10M10 18h4"
                        />
                      </svg>
                    </button>
                  </div>
                  {hasAdvancedFilters && (
                    <div className="flex flex-wrap gap-2">
                      {sortBy !== "default" && (
                        <button
                          type="button"
                          onClick={() => setSortBy("default")}
                          className="rounded-full bg-cyan-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/30"
                        >
                          Tri: {activeSortLabel} x
                        </button>
                      )}
                      {(minRating > 0 || maxRating < 5) && (
                        <button
                          type="button"
                          onClick={() => {
                            setMinRating(0);
                            setMaxRating(5);
                          }}
                          className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100"
                        >
                          Note {minRating}-{maxRating} x
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={resetFilmFilters}
                        className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700 hover:bg-rose-100"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-100 hover:bg-white/20"
                  onClick={() => setShowFilmFiltersCard(true)}
                >
                  Afficher la barre de tri
                </button>
              )}
            </div>

            {/* Film list */}
            <div className="list-card space-y-3" data-testid="films-list">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80">
                <span>
                  Films assignés affichés : {visibleFilms.length}/{filteredFilms.length} (total assigné : {assignedFilms.length})
                </span>
                <div className="flex items-center gap-2">
                  <span>Tri : {activeSortLabel}</span>
                  {filteredFilms.length > 1 && (
                    <button
                      type="button"
                      className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-100 hover:bg-white/20"
                      onClick={() => setIsFilmsListCompact((prev) => !prev)}
                    >
                      {isFilmsListCompact ? `Voir tout (${filteredFilms.length})` : "Rétrécir (1 film)"}
                    </button>
                  )}
                </div>
              </div>
              {hiddenFilmsCount > 0 && (
                <div className="text-xs text-slate-300/70">
                  Mode compact actif : {hiddenFilmsCount} film(s) masques.
                </div>
              )}
              {isFilmsListCompact ? (
                compactFilm ? (
                  <FilmRow
                    key={`${compactFilm.id}-${compactFilm.title}`}
                    film={compactFilm}
                    filmsBasePath={filmsBasePath}
                    onClaim={handleClaimFilm}
                    onRelease={handleReleaseFilm}
                    onRate={handleOpenRatingModal}
                    canManagePhase2Selection={canManageSelectionForCurrentPhase}
                    isPhase2Selected={phase2SelectedMovieIds.has(Number(compactFilm.id))}
                    isSelectionQuotaReached={isSelectionQuotaReachedForMovie(compactFilm.id)}
                    isSelectionDisabled={isSelectionDisabledForMovie(compactFilm.id)}
                    selectionDisabledLabel={selectionDisabledLabel}
                    onTogglePhase2Select={handleTogglePhase2Movie}
                    phase2SelectionBusyMovieId={phase2SelectionBusyMovieId}
                    busyMovieId={assignmentBusyMovieId}
                    selectionAddLabel={selectionAddLabel}
                    selectionRemoveLabel={selectionRemoveLabel}
                  />
                ) : null
              ) : (
                filteredFilms.map((film) => (
                  <FilmRow
                    key={`${film.id}-${film.title}`}
                    film={film}
                    filmsBasePath={filmsBasePath}
                    onClaim={handleClaimFilm}
                    onRelease={handleReleaseFilm}
                    onRate={handleOpenRatingModal}
                    canManagePhase2Selection={canManageSelectionForCurrentPhase}
                    isPhase2Selected={phase2SelectedMovieIds.has(Number(film.id))}
                    isSelectionQuotaReached={isSelectionQuotaReachedForMovie(film.id)}
                    isSelectionDisabled={isSelectionDisabledForMovie(film.id)}
                    selectionDisabledLabel={selectionDisabledLabel}
                    onTogglePhase2Select={handleTogglePhase2Movie}
                    phase2SelectionBusyMovieId={phase2SelectionBusyMovieId}
                    busyMovieId={assignmentBusyMovieId}
                    selectionAddLabel={selectionAddLabel}
                    selectionRemoveLabel={selectionRemoveLabel}
                  />
                ))
              )}
              {visibleFilms.length === 0 && (
                <div className="py-6 text-sm text-slate-300">
                  {assignedFilms.length === 0
                    ? "Aucun film ne vous est assigné pour le moment."
                    : "Aucun film assigné ne correspond aux filtres."}
                </div>
              )}
            </div>
          </div>

          {/* Admin side widgets */}
          <div className="xl:col-span-4 space-y-4">
            {showSelectionCard && (
            <div className="glass p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black uppercase tracking-tight text-white">{selectionCardTitle}</h3>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 rounded-lg border border-white/10"
                  onClick={() => setIsPhase2SelectionCardOpen((prev) => !prev)}
                >
                  {isPhase2SelectionCardOpen ? "Fermer" : "Ouvrir"}
                </button>
              </div>

              <div className="text-xs text-slate-100/85">
                {phase2SelectionCount}/{phase2SelectionMinRequired} films selectionnes
              </div>
              <div className="bar-track h-2">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min(100, (phase2SelectionCount / Math.max(1, phase2SelectionMinRequired)) * 100)}%`,
                    background: "linear-gradient(90deg,#22d3ee,#34d399)",
                  }}
                />
              </div>
              <div className="text-xs text-slate-100/80">
                {selectionDeadlineLabel}:{" "}
                {selectionDeadlineIso
                  ? new Date(selectionDeadlineIso).toLocaleString("fr-FR")
                  : "non configuree"}
              </div>
              <div className="text-xs text-slate-100/80">
                {selectionConditionsLabel}: {hasEnoughPhase2Selection ? `${phase2SelectionMinRequired} films OK` : `${phase2SelectionMinRequired} films manquants`} ·{" "}
                {isSelectionDeadlineReached ? "deadline atteinte" : "deadline non atteinte"}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 rounded-lg disabled:opacity-60"
                  onClick={handleValidatePhase2BySuperadmin}
                  disabled={!isSuperAdmin || phase2SelectionValidateBusy || !hasEnoughPhase2Selection}
                >
                  {phase2SelectionValidateBusy
                    ? "Validation..."
                    : phase2SelectionState.isReadyBySuperadmin
                      ? selectionValidatedLabel
                      : selectionValidationLabel}
                </button>
                {phase2SelectionState.isReadyBySuperadmin && (
                  <span className="text-xs text-emerald-200/90">
                    Valide par {phase2SelectionState.readyByName || "superadmin"}
                  </span>
                )}
              </div>

              {isPhase2SelectionCardOpen && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(phase2SelectionState.selectedMovies || []).length === 0 ? (
                    <p className="text-xs text-slate-300/80">
                      {isSelectionForPhase2
                        ? "Aucun film selectionne pour la phase 2."
                        : "Aucun film selectionne pour la phase 3."}
                    </p>
                  ) : (
                    (phase2SelectionState.selectedMovies || []).map((movie) => {
                      const movieId = Number(movie?.id);
                      const isBusy = Number(phase2SelectionBusyMovieId) === movieId;
                      return (
                        <div
                          key={`phase2-selected-${movieId}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {movie?.title || "Sans titre"}
                            </div>
                            <div className="text-[11px] text-slate-300/80 truncate">
                              {movie?.director || "Anonyme"}
                            </div>
                          </div>
                          {canManageSelectionForCurrentPhase && (
                            <button
                              type="button"
                              className="btn-ghost px-2 py-1 rounded-lg border border-white/10 text-[10px] disabled:opacity-60"
                              disabled={isBusy}
                              onClick={() => handleTogglePhase2Movie(movieId, true)}
                            >
                              {isBusy ? "..." : "Retirer"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            )}

            <div className="glass p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tight">Vos indicateurs</h3>
                <span className="text-xs text-slate-100/80">Basé sur vos actions réelles</span>
              </div>
              <ProgressBar
                label={`Notes déposées (${ratedAssignedCount}/${assignedTotal})`}
                value={notesProgressValue}
                color="linear-gradient(90deg,#25d0ff,#f6c452)"
              />
              <ProgressBar
                label={`Commentaires (${commentedAssignedCount}/${assignedTotal})`}
                value={commentsProgressValue}
                color="linear-gradient(90deg,#f2438b,#25d0ff)"
              />
              <ProgressBar
                label={`Visionnage valide (${viewedAssignedCount}/${assignedTotal})`}
                value={viewingProgressValue}
                color="linear-gradient(90deg,#f6c452,#f2438b)"
              />
            </div>
          </div>
        </section>
        {/* Bottom nav mobile */}
        <div className="bottom-nav">
          <button
            className={activeNav === "profile" ? "active" : ""}
            onClick={() => handleNav("profile")}
          >
            Profil
          </button>
          <button
            className={activeNav === "admin-top" ? "active" : ""}
            onClick={() => handleNav("admin-top")}
          >
            Admin
          </button>
          <button
            className={activeNav === "films" ? "active" : ""}
            onClick={() => handleNav("films")}
          >
            Films
          </button>
          <button onClick={() => (window.location.href = homePath)}>Home</button>
        </div>

        {isFilmFilterModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setIsFilmFilterModalOpen(false)}
            ></div>

            <div className="relative w-full max-w-md rounded-[36px] bg-white p-8 shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tight text-cyan-700">
                  Filtres avancés
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFilmFilterModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Trier par
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortBy(option.value)}
                        className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                          sortBy === option.value
                            ? "bg-blue-950 text-cyan-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Note (min - max)
                    </p>
                    <span className="text-sm font-black text-cyan-700">
                      {minRating} - {maxRating}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Min
                      </p>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={minRating}
                        onChange={(event) => {
                          const nextMin = Number(event.target.value);
                          setMinRating(nextMin);
                          if (nextMin > maxRating) {
                            setMaxRating(nextMin);
                          }
                        }}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Max
                      </p>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="1"
                        value={maxRating}
                        onChange={(event) => {
                          const nextMax = Number(event.target.value);
                          setMaxRating(nextMax);
                          if (nextMax < minRating) {
                            setMinRating(nextMax);
                          }
                        }}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilmFilters}
                  className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}

        {ratingModalFilm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              onClick={handleCloseRatingModal}
            ></div>
            <div className="relative w-full max-w-sm rounded-[50px] border border-slate-500/35 bg-slate-900 p-12 text-center shadow-2xl">
              <h3 className="mb-8 text-3xl font-black uppercase tracking-tighter text-white">
                Noter ce film
              </h3>
              <p className="mb-4 text-sm font-bold text-slate-500 uppercase tracking-wider truncate">
                {ratingModalFilm.title}
              </p>
              <div className="flex justify-center gap-3 mb-12">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRatingModalScore(num)}
                    className={`h-14 w-12 rounded-2xl text-2xl font-black transition-all ${ratingModalScore === num ? "scale-110 bg-cyan-500 text-slate-950 shadow-xl" : "bg-slate-800 text-slate-300"}`}
                    disabled={ratingModalLoading}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="mb-6 text-left">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  Commentaire
                </label>
                <textarea
                  value={ratingModalComment}
                  onChange={(event) => setRatingModalComment(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-800 p-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:bg-slate-800/80"
                  placeholder="Votre commentaire (optionnel)"
                />
              </div>
              {ratingModalError && (
                <p className="mb-4 text-sm font-semibold text-rose-500">{ratingModalError}</p>
              )}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSaveRating}
                  className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-400 py-5 font-black uppercase tracking-widest text-slate-950 transition-all hover:brightness-105 disabled:opacity-60"
                  disabled={ratingModalLoading || ratingModalScore < 1 || ratingModalScore > 5}
                >
                  {ratingModalLoading ? "..." : "Confirmer"}
                </button>
                {Number.isFinite(Number(ratingModalFilm?.myRating)) && (
                  <button
                    onClick={handleDeleteRating}
                    className="text-red-500 font-bold uppercase text-xs tracking-widest py-2 disabled:opacity-60"
                    disabled={ratingModalLoading}
                  >
                    Supprimer ma note
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
    </div>
    </>
  );
}




