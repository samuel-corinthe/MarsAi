import { useState, useRef, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { getVideoMetadata, validateVideoFrontend, VIDEO_CONSTRAINTS } from '../utils/videoValidation';
import { validateForm, FORM_CONSTRAINTS, exceedsMaxLength } from '../utils/formvalidation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import usePhaseAccessController from "../controllers/usePhaseAccessController";
import { getLocalizedPath } from "../utils/localizedRoutes";
import {
    fetchAltchaChallenge,
    fetchUploadCountries,
    fetchYoutubeUploadStatus,
    postYoutubeUpload,
} from '../services/uploadApiService';
import { buildApiPath, withDeploymentBase } from "../utils/deploymentPath";
import 'altcha';

const YOUTUBE_STATUS_POLL_INTERVAL_MS = 15000;
const YOUTUBE_STATUS_MAX_POLLS = 20;
const ALTCHA_CHALLENGE_URL = buildApiPath('/api/altcha/challenge');
const POSTER_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const POSTER_TARGET_ASPECT_RATIO = 2 / 3;
const POSTER_MAX_WIDTH = 1200;
const POSTER_MAX_HEIGHT = 1800;
const STEP_1_FIELDS = [
    'email',
    'firstName',
    'lastName',
    'age',
];
const STEP_2_FIELDS = [
    'title',
    'description',
    'countryAlpha2',
    'language',
    'aiTools',
    'bio',
    'socialWebsite',
    'socialInstagram',
    'socialFacebook',
    'socialX',
    'castMembers',
];
const STEP_3_FIELDS = [
    'poster',
    'subtitle',
    'file',
    'altcha',
];
const STEP_FIELDS = {
    1: STEP_1_FIELDS,
    2: STEP_2_FIELDS,
    3: STEP_3_FIELDS,
};
const LIVE_VALIDATION_FIELDS = [...STEP_1_FIELDS, ...STEP_2_FIELDS];
const CAST_AVATAR_URL_PATTERN = /^https?:\/\/.+/i;

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Unable to process the image.'));
                return;
            }
            resolve(blob);
        }, type, quality);
    });
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const tempUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(tempUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            reject(new Error('Invalid image.'));
        };
        image.src = tempUrl;
    });
}

async function normalizePosterFile(file) {
    const image = await loadImageFromFile(file);
    const sourceAspect = image.width / image.height;
    const targetAspect = POSTER_TARGET_ASPECT_RATIO;
    const hasAspectGap = Math.abs(sourceAspect - targetAspect) > 0.01;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    if (sourceAspect > targetAspect) {
        sourceWidth = Math.round(image.height * targetAspect);
        sourceX = Math.round((image.width - sourceWidth) / 2);
    } else if (sourceAspect < targetAspect) {
        sourceHeight = Math.round(image.width / targetAspect);
        sourceY = Math.round((image.height - sourceHeight) / 2);
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > POSTER_MAX_WIDTH) {
        const ratio = POSTER_MAX_WIDTH / targetWidth;
        targetWidth = POSTER_MAX_WIDTH;
        targetHeight = Math.round(targetHeight * ratio);
    }
    if (targetHeight > POSTER_MAX_HEIGHT) {
        const ratio = POSTER_MAX_HEIGHT / targetHeight;
        targetHeight = POSTER_MAX_HEIGHT;
        targetWidth = Math.round(targetWidth * ratio);
    }

    let quality = 0.92;
    let outputMime = 'image/webp';
    let blob = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(targetWidth));
        canvas.height = Math.max(1, Math.round(targetHeight));
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas indisponible.');
        }

        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height,
        );

        try {
            blob = await canvasToBlob(canvas, outputMime, quality);
        } catch {
            outputMime = 'image/jpeg';
            blob = await canvasToBlob(canvas, outputMime, quality);
        }

        if (blob.size <= POSTER_MAX_SIZE_BYTES) {
            break;
        }

        if (quality > 0.55) {
            quality = Math.max(0.55, quality - 0.08);
            continue;
        }

        if (targetWidth <= 480 || targetHeight <= 720) {
            break;
        }

        targetWidth = Math.round(targetWidth * 0.88);
        targetHeight = Math.round(targetHeight * 0.88);
    }

    if (!blob || blob.size > POSTER_MAX_SIZE_BYTES) {
        throw new Error('POSTER_TOO_LARGE');
    }

    const baseName = String(file.name || 'poster').replace(/\.[^/.]+$/, '').trim() || 'poster';
    const extension = outputMime === 'image/jpeg' ? 'jpg' : 'webp';
    const normalizedFile = new File([blob], `${baseName}-cropped.${extension}`, {
        type: outputMime,
        lastModified: Date.now(),
    });

    return {
        file: normalizedFile,
        wasAdjusted: hasAspectGap || outputMime !== file.type,
    };
}

function buildFlagAssetPath(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return withDeploymentBase(raw);
}

function isTerminalYoutubeStatus(status) {
    const processingStatus = status?.processingStatus;
    const uploadStatus = status?.uploadStatus;
    return (
        ['succeeded', 'failed', 'terminated'].includes(processingStatus) ||
        ['processed', 'failed', 'rejected'].includes(uploadStatus)
    );
}

function formatUploadElapsed(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function estimateUploadPayloadSize({ videoFile, posterFile, subtitleFile }) {
    const videoSize = Number(videoFile?.size) || 0;
    const posterSize = Number(posterFile?.size) || 0;
    const subtitleSize = Number(subtitleFile?.size) || 0;
    const multipartOverheadBytes = 128 * 1024;
    return Math.max(1, videoSize + posterSize + subtitleSize + multipartOverheadBytes);
}

export default function YoutubeUpload() {
    const { t, i18n } = useTranslation();
    const { isLight } = useTheme();
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [age, setAge] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStartedAt, setUploadStartedAt] = useState(0);
    const [uploadElapsedSeconds, setUploadElapsedSeconds] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isValidating, setIsValidating] = useState(false);
    const [errors, setErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});
    const [altchaPayload, setAltchaPayload] = useState(null);
    const [honeypotFieldName, setHoneypotFieldName] = useState('');
    const [honeypotToken, setHoneypotToken] = useState('');
    const [honeypotValue, setHoneypotValue] = useState('');
    const [countryAlpha2, setCountryAlpha2] = useState('');
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [language, setLanguage] = useState('');
    const [aiTools, setAiTools] = useState('');
    const [bio, setBio] = useState('');
    const [socialWebsite, setSocialWebsite] = useState('');
    const [socialInstagram, setSocialInstagram] = useState('');
    const [socialFacebook, setSocialFacebook] = useState('');
    const [socialX, setSocialX] = useState('');
    const [castMembers, setCastMembers] = useState([{ name: '', role: '', avatarUrl: '' }]);
    const [subtitleFile, setSubtitleFile] = useState(null);
    const [posterFile, setPosterFile] = useState(null);
    const [posterPreview, setPosterPreview] = useState(null);
    const [isPosterProcessing, setIsPosterProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [youtubeVideoId, setYoutubeVideoId] = useState('');
    const [youtubeStatus, setYoutubeStatus] = useState(null);
    const [youtubeStatusError, setYoutubeStatusError] = useState('');
    const [isCheckingYoutubeStatus, setIsCheckingYoutubeStatus] = useState(false);
    const { loading: uploadAccessLoading, isUploadAllowed } = usePhaseAccessController();


    const fileInputRef = useRef(null);
    const statusRef = useRef(null);
    const youtubeStatusPollRef = useRef(null);
    const youtubeStatusPollCountRef = useRef(0);

    useEffect(() => {
        if (!uploading || uploadStartedAt <= 0 || progress >= 100) return undefined;

        const updateElapsedTime = () => {
            const elapsed = Math.max(0, Math.floor((Date.now() - uploadStartedAt) / 1000));
            setUploadElapsedSeconds(elapsed);
        };

        updateElapsedTime();
        const intervalId = setInterval(updateElapsedTime, 1000);

        return () => clearInterval(intervalId);
    }, [progress, uploadStartedAt, uploading]);

    useEffect(() => {
        const loadChallenge = async () => {
            try {
                const payload = await fetchAltchaChallenge();
                if (payload?.honeypot) {
                    setHoneypotFieldName(payload.honeypot.fieldName);
                    setHoneypotToken(payload.honeypot.token);
                }
            } catch (error) {
                console.error('[HONEYPOT] Erreur chargement challenge:', error);
            }
        };

        loadChallenge();
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadCountries = async () => {
            setCountriesLoading(true);
            try {
                const payload = await fetchUploadCountries();
                if (cancelled) return;
                const rows = Array.isArray(payload?.countries)
                    ? payload.countries
                    : [];

                const normalized = rows
                    .map((row) => {
                        const alpha2 = String(row?.alpha2 || '').trim().toUpperCase();
                        if (!alpha2) return null;
                        return {
                            alpha2,
                            nameFr: String(row?.nameFr || row?.name_fr || '').trim(),
                            nameEn: String(row?.nameEn || row?.name_eng || '').trim(),
                            flagPath: buildFlagAssetPath(row?.flagPath || row?.flag_path || ''),
                        };
                    })
                    .filter(Boolean);

                setCountries(normalized);
            } catch (error) {
                if (!cancelled) {
                    console.error('[UPLOAD] Impossible de charger la liste des pays:', error);
                    setCountries([]);
                }
            } finally {
                if (!cancelled) {
                    setCountriesLoading(false);
                }
            }
        };

        loadCountries();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (youtubeStatusPollRef.current) {
                clearInterval(youtubeStatusPollRef.current);
                youtubeStatusPollRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (posterPreview && posterPreview.startsWith('blob:')) {
                URL.revokeObjectURL(posterPreview);
            }
        };
    }, [posterPreview]);

    const stopYoutubeStatusPolling = () => {
        if (youtubeStatusPollRef.current) {
            clearInterval(youtubeStatusPollRef.current);
            youtubeStatusPollRef.current = null;
        }
    };

    const syncUploadFeedbackFromJob = useCallback((statusData) => {
        if (!statusData || typeof statusData !== 'object') return;

        const safeJobStatus = String(statusData?.jobStatus || '').trim().toLowerCase();
        if (safeJobStatus === 'failed') {
            const failureReason = String(
                statusData?.rejectionReason || statusData?.processingFailureReason || '',
            ).trim();
            setStatus({
                type: 'error',
                message: failureReason
                    ? `${t('upload.errors.upload_failed')} (${failureReason})`
                    : t('upload.errors.upload_failed')
            });
            return;
        }

        if (safeJobStatus !== 'succeeded') return;

        const confirmationEmailSent = statusData?.confirmationEmailSent;
        const confirmationEmailError = String(statusData?.confirmationEmailError || '').trim();
        if (confirmationEmailSent === false) {
            setStatus({
                type: 'success',
                message: `${t('upload.status.video_uploaded_email_failed')}${confirmationEmailError ? ` (${confirmationEmailError})` : ''}`
            });
            return;
        }

        if (confirmationEmailSent === true) {
            setStatus({
                type: 'success',
                message: t('upload.status.upload_success')
            });
        }
    }, [t]);

    const fetchYoutubeStatus = async (videoId) => {
        if (!videoId) return null;

        setIsCheckingYoutubeStatus(true);
        setYoutubeStatusError('');

        try {
            const payload = await fetchYoutubeUploadStatus(videoId);
            const statusData = payload.status || null;
            setYoutubeStatus(statusData);
            syncUploadFeedbackFromJob(statusData);
            return statusData;
        } catch (error) {
            const details =
                error?.response?.data?.error ||
                error?.message ||
                t('upload.youtube_status.fetch_failed');
            setYoutubeStatusError(details);
            return null;
        } finally {
            setIsCheckingYoutubeStatus(false);
        }
    };

    const startYoutubeStatusPolling = async (videoId) => {
        stopYoutubeStatusPolling();
        youtubeStatusPollCountRef.current = 0;

        const firstStatus = await fetchYoutubeStatus(videoId);
        if (firstStatus && isTerminalYoutubeStatus(firstStatus)) {
            return;
        }

        youtubeStatusPollRef.current = setInterval(async () => {
            youtubeStatusPollCountRef.current += 1;

            const statusData = await fetchYoutubeStatus(videoId);
            if (statusData && isTerminalYoutubeStatus(statusData)) {
                stopYoutubeStatusPolling();
                return;
            }

            if (youtubeStatusPollCountRef.current >= YOUTUBE_STATUS_MAX_POLLS) {
                stopYoutubeStatusPolling();
            }
        }, YOUTUBE_STATUS_POLL_INTERVAL_MS);
    };

    const buildValidationPayload = useCallback(() => ({
        email,
        firstName,
        lastName,
        age,
        title,
        description,
        countryAlpha2,
        language,
        aiTools,
        bio,
        socialWebsite,
        socialInstagram,
        socialFacebook,
        socialX,
        castMembers,
    }), [
        email,
        firstName,
        lastName,
        age,
        title,
        description,
        countryAlpha2,
        language,
        aiTools,
        bio,
        socialWebsite,
        socialInstagram,
        socialFacebook,
        socialX,
        castMembers,
    ]);

    const markFieldTouched = (field) => {
        setTouchedFields((prev) => {
            if (prev[field]) return prev;
            return { ...prev, [field]: true };
        });
    };

    const markFieldsTouched = (fields) => {
        setTouchedFields((prev) => {
            const next = { ...prev };
            fields.forEach((field) => {
                next[field] = true;
            });
            return next;
        });
    };

    const markAllFieldsTouched = () => {
        markFieldsTouched(LIVE_VALIDATION_FIELDS);
    };

    useEffect(() => {
        const touchedKeys = LIVE_VALIDATION_FIELDS.filter((field) => touchedFields[field]);
        if (touchedKeys.length === 0) return;

        const liveValidation = validateForm(buildValidationPayload(), t);
        setErrors((prev) => {
            const next = { ...prev };
            touchedKeys.forEach((field) => {
                next[field] = liveValidation.errors[field] || '';
            });
            return next;
        });
    }, [touchedFields, buildValidationPayload, t]);

    const getCastFieldError = (member, field) => {
        const name = String(member?.name || '').trim();
        const role = String(member?.role || '').trim();
        const avatarUrl = String(member?.avatarUrl || '').trim();
        const hasAnyContent = Boolean(name || role || avatarUrl);

        if (!hasAnyContent) return '';

        if (field === 'name') {
            if (!name) return t('upload.errors.cast_name_required', 'Name is required');
            if (name.length > 120) return t('upload.errors.cast_name_too_long', 'Name is too long (max 120 characters)');
            return '';
        }

        if (field === 'role') {
            if (!role) return t('upload.errors.cast_role_required', 'Role is required');
            if (role.length > 120) return t('upload.errors.cast_role_too_long', 'Role is too long (max 120 characters)');
            return '';
        }

        if (field === 'avatarUrl' && avatarUrl && !CAST_AVATAR_URL_PATTERN.test(avatarUrl)) {
            return t('upload.errors.cast_avatar_invalid', 'Invalid avatar URL (https:// required)');
        }

        return '';
    };

    const validateStep = (stepNumber) => {
        if (stepNumber === 1 || stepNumber === 2) {
            const stepFields = STEP_FIELDS[stepNumber] || [];
            const validation = validateForm(buildValidationPayload(), t);
            const nextStepErrors = {};
            let hasError = false;

            stepFields.forEach((field) => {
                const message = validation.errors[field] || '';
                nextStepErrors[field] = message;
                if (message) {
                    hasError = true;
                }
            });

            markFieldsTouched(stepFields);
            setErrors((prev) => ({ ...prev, ...nextStepErrors }));
            return !hasError;
        }

        return true;
    };

    const handleNextStep = () => {
        if (currentStep >= 3) return;
        if (!validateStep(currentStep)) return;
        setCurrentStep((prev) => Math.min(3, prev + 1));
    };

    const handlePreviousStep = () => {
        setCurrentStep((prev) => Math.max(1, prev - 1));
    };

    const handleStepSelect = (targetStep) => {
        if (uploading || isValidating || isPosterProcessing) return;
        if (targetStep === currentStep) return;

        if (targetStep < currentStep) {
            setCurrentStep(targetStep);
            return;
        }

        for (let step = currentStep; step < targetStep; step += 1) {
            if (!validateStep(step)) return;
        }

        setCurrentStep(targetStep);
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        
        if (selectedFile.type !== 'video/mp4') {
            const error = t('upload.errors.format_mp4');
            setStatus({ type: 'error', message: error });
            setErrors(prev => ({ ...prev, file: error }));
            setFile(null);
            return;
        }

       
        const maxSize = VIDEO_CONSTRAINTS.FILE.MAX_SIZE;
        if (selectedFile.size > maxSize) {
            const error = t('upload.errors.file_size', { size: maxSize / (1024 * 1024) });
            setStatus({ type: 'error', message: error });
            setErrors(prev => ({ ...prev, file: error }));
            setFile(null);
            return;
        }

        try {
            setIsValidating(true);
            setStatus({ type: '', message: '' });
            setErrors(prev => ({ ...prev, file: '' }));

            const metadata = await getVideoMetadata(selectedFile, t);
            const validation = validateVideoFrontend(metadata, t);

            if (!validation.isValid) {
                setFile(null);
                const errorMessage = `${t('upload.errors.not_compliant')}: ${validation.errors.join(' ')}`;
                setStatus({
                    type: 'error',
                    message: errorMessage
                });
                setErrors(prev => ({ ...prev, file: errorMessage }));
                return;
            }

            setFile(selectedFile);
            setStatus({ type: 'success', message: t('upload.status.video_validated') });


            setTimeout(() => {
                statusRef.current?.focus();
            }, 100);

        } catch (err) {
            console.error(err);
            setFile(null);
            const errorMessage = typeof err === 'string' ? err : t('upload.errors.analysis_failed');
            setStatus({ type: 'error', message: errorMessage });
            setErrors(prev => ({ ...prev, file: errorMessage }));
        } finally {
            setIsValidating(false);
        }
    };

    const handlePosterChange = async (event) => {
        const selected = event.target.files?.[0];
        if (!selected) {
            setPosterFile(null);
            setPosterPreview(null);
            setErrors((prev) => ({ ...prev, poster: '' }));
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(selected.type)) {
            setErrors((prev) => ({ ...prev, poster: t('upload.errors.poster_format') }));
            setPosterFile(null);
            setPosterPreview(null);
            return;
        }

        setIsPosterProcessing(true);
        try {
            const normalizedPoster = await normalizePosterFile(selected);
            setPosterFile(normalizedPoster.file);
            setPosterPreview((prev) => {
                if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(normalizedPoster.file);
            });
            setErrors((prev) => ({ ...prev, poster: '' }));
        } catch (error) {
            const tooLarge = error instanceof Error && error.message === 'POSTER_TOO_LARGE';
            setErrors((prev) => ({
                ...prev,
                poster: tooLarge ? t('upload.errors.poster_too_large') : t('upload.errors.poster_format'),
            }));
            setPosterFile(null);
            setPosterPreview((prev) => {
                if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return null;
            });
        } finally {
            setIsPosterProcessing(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (currentStep < 3) {
            handleNextStep();
            return;
        }

        stopYoutubeStatusPolling();
        setYoutubeVideoId('');
        setYoutubeStatus(null);
        setYoutubeStatusError('');

        const validation = validateForm(buildValidationPayload(), t);

        if (!validation.isValid) {
            markAllFieldsTouched();
            setErrors(validation.errors);
            setStatus({ type: 'error', message: t('upload.errors.form_invalid') });
            return;
        }

        if (!file) {
            setErrors((prev) => ({ ...prev, file: t('upload.errors.select_video') }));
            setStatus({ type: 'error', message: t('upload.errors.select_video') });
            return;
        }

        if (!altchaPayload) {
            setErrors((prev) => ({ ...prev, altcha: t('upload.errors.altcha_missing') }));
            setStatus({ type: 'error', message: t('upload.errors.altcha_missing') });
            return;
        }


        const formData = new FormData();
        formData.append('video', file);
        formData.append('email', validation.cleanedData.email);
        formData.append('firstName', validation.cleanedData.firstName);
        formData.append('lastName', validation.cleanedData.lastName);
        formData.append('age', validation.cleanedData.age);
        formData.append('title', validation.cleanedData.title);
        formData.append('description', validation.cleanedData.description);
        formData.append('countryAlpha2', validation.cleanedData.countryAlpha2);
        formData.append('language', validation.cleanedData.language);
        formData.append('lang', i18n.language);
        formData.append('aiTools', validation.cleanedData.aiTools);
        if (validation.cleanedData.bio) formData.append('bio', validation.cleanedData.bio);
        if (validation.cleanedData.socialWebsite) formData.append('socialWebsite', validation.cleanedData.socialWebsite);
        if (validation.cleanedData.socialInstagram) formData.append('socialInstagram', validation.cleanedData.socialInstagram);
        if (validation.cleanedData.socialFacebook) formData.append('socialFacebook', validation.cleanedData.socialFacebook);
        if (validation.cleanedData.socialX) formData.append('socialX', validation.cleanedData.socialX);
        if (Array.isArray(validation.cleanedData.castMembers) && validation.cleanedData.castMembers.length > 0) {
            formData.append('cast', JSON.stringify(validation.cleanedData.castMembers));
        }
        if (subtitleFile) formData.append('subtitle', subtitleFile);
        if (posterFile) formData.append('poster', posterFile);
        formData.append('altcha', altchaPayload);
        formData.append('honeypotToken', honeypotToken);
        
        if (honeypotFieldName) {
            formData.append(honeypotFieldName, honeypotValue);
        }
        const estimatedUploadTotalBytes = estimateUploadPayloadSize({
            videoFile: file,
            posterFile,
            subtitleFile,
        });

        try {
            setUploading(true);
            setProgress(0);
            setUploadStartedAt(Date.now());
            setUploadElapsedSeconds(0);
            setStatus({ type: '', message: '' });

            const responsePayload = await postYoutubeUpload(
                formData,
                (progressEvent) => {
                    const loadedBytes = Number(progressEvent?.loaded) || 0;
                    if (loadedBytes <= 0) {
                        return;
                    }
                    const eventTotalBytes = Number(progressEvent?.total);
                    const hasReliableTotal = Number.isFinite(eventTotalBytes) && eventTotalBytes > 0;
                    const effectiveTotalBytes = hasReliableTotal ? eventTotalBytes : estimatedUploadTotalBytes;
                    if (!Number.isFinite(effectiveTotalBytes) || effectiveTotalBytes <= 0) {
                        return;
                    }
                    const isTransferCompleted = hasReliableTotal && loadedBytes >= eventTotalBytes;
                    if (isTransferCompleted) {
                        setUploadStartedAt((prev) => (prev > 0 ? 0 : prev));
                    }
                    const percent = Math.max(0, Math.min(99, Math.round((loadedBytes * 100) / effectiveTotalBytes)));
                    setProgress(percent);
                },
            );
            setProgress(100);
            const uploadedVideoId = String(responsePayload.videoId || '').trim();
            if (uploadedVideoId) {
                setYoutubeVideoId(uploadedVideoId);
                setYoutubeStatus(null);
                setYoutubeStatusError('');
                startYoutubeStatusPolling(uploadedVideoId);
                setStatus({
                    type: 'success',
                    message: t('upload.status.video_uploaded_checking')
                });
            } else {
                const confirmationEmailSent = responsePayload?.confirmationEmailSent !== false;
                const confirmationEmailError = String(responsePayload?.confirmationEmailError || '').trim();
                setStatus({
                    type: 'success',
                    message: confirmationEmailSent
                        ? t('upload.status.upload_success')
                        : `${t('upload.status.video_uploaded_email_failed')}${confirmationEmailError ? ` (${confirmationEmailError})` : ''}`
                });
            }

            setFile(null);
            setEmail('');
            setFirstName('');
            setLastName('');
            setAge('');
            setTitle('');
            setDescription('');
            setCountryAlpha2('');
            setLanguage('');
            setAiTools('');
            setBio('');
            setSocialWebsite('');
            setSocialInstagram('');
            setSocialFacebook('');
            setSocialX('');
            setCastMembers([{ name: '', role: '', avatarUrl: '' }]);
            setSubtitleFile(null);
            setPosterFile(null);
            setPosterPreview(null);
            setAltchaPayload(null);
            setErrors({});
            setTouchedFields({});
            setCurrentStep(1);

            setTimeout(() => {
                statusRef.current?.focus();
            }, 100);

        } catch (err) {
            console.error(err);
            const timeoutMessage = err?.code === 'ECONNABORTED'
                ? t('upload.errors.timeout', 'Processing timeout exceeded. Please try again.')
                : null;
            const backendMessage = err?.response?.data?.error || err?.response?.data?.details || '';
            setStatus({
                type: 'error',
                message: timeoutMessage || backendMessage || t('upload.errors.upload_failed')
            });
        } finally {
            setUploading(false);
            setProgress(0);
            setUploadStartedAt(0);
            setUploadElapsedSeconds(0);
        }
    };

    const clearError = (field) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const updateCastMember = (index, field, value) => {
        setCastMembers((prev) => prev.map((member, i) => (
            i === index ? { ...member, [field]: value } : member
        )));
        markFieldTouched('castMembers');
        clearError('castMembers');
    };

    const addCastMember = () => {
        setCastMembers((prev) => {
            if (prev.length >= 10) return prev;
            return [...prev, { name: '', role: '', avatarUrl: '' }];
        });
        markFieldTouched('castMembers');
        clearError('castMembers');
    };

    const removeCastMember = (index) => {
        setCastMembers((prev) => {
            if (prev.length <= 1) return [{ name: '', role: '', avatarUrl: '' }];
            return prev.filter((_, i) => i !== index);
        });
        markFieldTouched('castMembers');
        clearError('castMembers');
    };

    const selectedCountryCode = String(countryAlpha2 || '').trim().toUpperCase();
    const selectedCountry = countries.find((country) => country.alpha2 === selectedCountryCode) || null;
    const selectedCountryName = selectedCountry
        ? (selectedCountry.nameFr || selectedCountry.nameEn || selectedCountry.alpha2)
        : '';
    const requiredLabel = t('upload.form.required');
    const optionalLabel = t('upload.form.optional');
    const altchaStrings = JSON.stringify({
        label: t('altcha.label'),
        verifying: t('altcha.verifying'),
        verified: t('altcha.verified'),
        error: t('altcha.error'),
        expired: t('altcha.expired')
    });
    const errorFieldLabels = {
        email: t('upload.form.email_label'),
        firstName: t('upload.form.first_name_label'),
        lastName: t('upload.form.last_name_label'),
        age: t('upload.form.age_label'),
        title: t('upload.form.movie_title_label'),
        description: t('upload.form.description_label'),
        countryAlpha2: t('upload.form.country_label'),
        language: t('upload.form.language_label'),
        aiTools: t('upload.form.ai_tools_label'),
        bio: t('upload.form.bio_label'),
        socialWebsite: t('upload.form.website_label'),
        socialInstagram: t('upload.form.instagram_label'),
        socialFacebook: t('upload.form.facebook_label'),
        socialX: t('upload.form.x_label'),
        castMembers: t('upload.form.casting_label'),
        poster: t('upload.form.poster_label'),
        subtitle: t('upload.form.subtitle_label'),
        file: t('upload.form.video_label'),
        altcha: t('upload.form.antispam_label'),
    };
    const currentStepFields = STEP_FIELDS[currentStep] || [];
    const errorSummaryEntries = Object.entries(errors).filter(([field, message]) => (
        currentStepFields.includes(field) && String(message || '').trim().length > 0
    ));
    const uploadElapsedLabel = formatUploadElapsed(uploadElapsedSeconds);
    const uploadSteps = [
        { id: 1, badge: t('upload.form.part_1_badge', 'Part 1/3'), title: t('upload.form.part_1_title', 'Participant information') },
        { id: 2, badge: t('upload.form.part_2_badge', 'Part 2/3'), title: t('upload.form.part_2_title', 'Movie information') },
        { id: 3, badge: t('upload.form.part_3_badge', 'Part 3/3'), title: t('upload.form.part_3_title', 'Files and verification') },
    ];
    const resolvedYoutubeVideoId = String(youtubeStatus?.youtubeVideoId || '').trim();
    const trackingReferenceId = String(youtubeStatus?.trackingId || youtubeVideoId || '').trim();
    const showTrackingReference = Boolean(trackingReferenceId);
    const stepProgressPercent = Math.round(((currentStep - 1) / Math.max(1, uploadSteps.length - 1)) * 100);
    const shellClass = isLight
        ? 'border-slate-200/90 bg-white/95 text-slate-900 shadow-[0_20px_55px_rgba(15,23,42,0.14)]'
        : 'border-slate-500/35 bg-slate-900/55 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]';
    const headerClass = isLight
        ? 'border-slate-200/90 text-slate-900'
        : 'border-slate-500/35 text-white';
    const headerSubtitleClass = isLight ? 'text-slate-600' : 'text-slate-300';
    const stepPanelClass = isLight
        ? 'border-slate-200/90 bg-slate-50/90'
        : 'border-slate-500/45 bg-slate-900/60';
    const stepButtonBaseClass = isLight
        ? 'border-slate-300/90 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700'
        : 'border-slate-600/80 bg-slate-900/45 text-slate-200 hover:border-cyan-300 hover:text-cyan-100';
    const stepButtonCurrentClass = isLight
        ? 'border-cyan-500 bg-cyan-100 text-cyan-800 shadow-[0_0_0_2px_rgba(34,211,238,0.25)]'
        : 'border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_0_2px_rgba(103,232,249,0.25)]';
    const stepButtonDoneClass = isLight
        ? 'border-emerald-400/80 bg-emerald-100 text-emerald-800'
        : 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100';

    if (uploadAccessLoading) {
        return (
            <div className="section app-container upload-modern-page py-12">
                <div className={`upload-modern-shell max-w-2xl mx-auto rounded-2xl border p-8 text-center ${shellClass}`}>
                    {t("ui.loading_upload_access", "Checking upload access...")}
                </div>
            </div>
        );
    }

    if (!isUploadAllowed) {
        const redirectPath = getLocalizedPath('call', i18n.language);
        return <Navigate to={redirectPath} replace />;
    }

    return (
        <div className="section app-container upload-modern-page relative overflow-hidden py-12">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl"></div>
                <div className="absolute -left-20 top-52 h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl"></div>
            </div>

            <div className={`upload-modern-shell relative mx-auto max-w-2xl overflow-hidden rounded-2xl border ${shellClass}`}>
                <div className={`border-b p-8 ${headerClass}`}>
                    <p className="inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                        Upload
                    </p>
                    <h1 className="text-3xl font-bold">{t('upload.page_title')}</h1>
                    <p className={`mt-2 ${headerSubtitleClass}`}>{t('upload.page_subtitle')}</p>
                </div>

                <form onSubmit={handleUpload} className="upload-modern-form p-8 space-y-6" noValidate>
                    <div className={`rounded-xl border p-4 md:p-5 ${stepPanelClass}`}>
                        <div className="mb-4">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 transition-all duration-300 ease-out"
                                    style={{ width: `${stepProgressPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                            {uploadSteps.map((step) => {
                                const isCurrent = step.id === currentStep;
                                const isDone = step.id < currentStep;
                                return (
                                    <button
                                        key={step.id}
                                        type="button"
                                        onClick={() => handleStepSelect(step.id)}
                                        aria-label={`${t('upload.form.step_label', 'Part')} ${step.id}`}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        disabled={uploading || isValidating || isPosterProcessing}
                                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                            isCurrent
                                                ? stepButtonCurrentClass
                                                : isDone
                                                    ? stepButtonDoneClass
                                                    : stepButtonBaseClass
                                        }`}
                                    >
                                        {step.id}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-6">
                    <section className={`rounded-xl border border-slate-200 p-4 md:p-5 space-y-6 ${currentStep === 1 ? '' : 'hidden'}`}>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                {t('upload.form.part_1_badge', 'Part 1/3')}
                            </p>
                            <h2 className="text-base font-semibold text-slate-900">
                                {t('upload.form.part_1_title', 'Participant information')}
                            </h2>
                        </div>
                    {/* Email */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="email-input"
                                className="block text-sm font-semibold text-slate-700"
                            >
                                {t('upload.form.email_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                            <span className={`text-xs ${email.length > FORM_CONSTRAINTS.EMAIL.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {email.length}/{FORM_CONSTRAINTS.EMAIL.MAX_LENGTH}
                            </span>
                        </div>
                        <input
                            id="email-input"
                            type="email"
                            placeholder={t('upload.form.email_placeholder')}
                            maxLength={FORM_CONSTRAINTS.EMAIL.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.email ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                            value={email}
                            onChange={(e) => {
                                markFieldTouched('email');
                                if (!exceedsMaxLength('EMAIL', e.target.value)) {
                                    setEmail(e.target.value);
                                    clearError('email');
                                }
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : "email-hint"}
                        />
                        {errors.email && (
                            <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.email}
                            </p>
                        )}
                        <span id="email-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.email_hint')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PrÃ©nom */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label
                                    htmlFor="firstname-input"
                                    className="block text-sm font-semibold text-slate-700"
                                >
                                    {t('upload.form.first_name_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                                </label>
                                <span className={`text-xs ${firstName.length > FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                    {firstName.length}/{FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH}
                                </span>
                            </div>
                            <input
                                id="firstname-input"
                                type="text"
                                placeholder={t('upload.form.first_name_placeholder')}
                                maxLength={FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH}
                                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.firstName ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                    }`}
                                value={firstName}
                                onChange={(e) => {
                                    markFieldTouched('firstName');
                                    if (!exceedsMaxLength('FIRST_NAME', e.target.value)) {
                                        setFirstName(e.target.value);
                                        clearError('firstName');
                                    }
                                }}
                                required
                                aria-required="true"
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? "firstname-error" : undefined}
                            />
                            {errors.firstName && (
                                <p id="firstname-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.firstName}
                                </p>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label
                                    htmlFor="lastname-input"
                                    className="block text-sm font-semibold text-slate-700"
                                >
                                    {t('upload.form.last_name_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                                </label>
                                <span className={`text-xs ${lastName.length > FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                    {lastName.length}/{FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH}
                                </span>
                            </div>
                            <input
                                id="lastname-input"
                                type="text"
                                placeholder={t('upload.form.last_name_placeholder')}
                                maxLength={FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH}
                                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.lastName ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                    }`}
                                value={lastName}
                                onChange={(e) => {
                                    markFieldTouched('lastName');
                                    if (!exceedsMaxLength('LAST_NAME', e.target.value)) {
                                        setLastName(e.target.value);
                                        clearError('lastName');
                                    }
                                }}
                                required
                                aria-required="true"
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? "lastname-error" : undefined}
                            />
                            {errors.lastName && (
                                <p id="lastname-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.lastName}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Ã‚ge */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="age-input"
                                className="block text-sm font-semibold text-slate-700"
                            >
                                {t('upload.form.age_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                        </div>
                        <input
                            id="age-input"
                            type="number"
                            placeholder={t('upload.form.age_placeholder')}
                            min="18"
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.age ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                            value={age}
                            onChange={(e) => {
                                markFieldTouched('age');
                                setAge(e.target.value);
                                clearError('age');
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.age}
                            aria-describedby={errors.age ? "age-error" : "age-hint"}
                        />
                        {errors.age && (
                            <p id="age-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.age}
                            </p>
                        )}
                        <span id="age-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.age_hint')}
                        </span>
                    </div>

                    </section>

                    <section className={`rounded-xl border border-slate-200 p-4 md:p-5 space-y-6 ${currentStep === 2 ? '' : 'hidden'}`}>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                {t('upload.form.part_2_badge', 'Part 2/3')}
                            </p>
                            <h2 className="text-base font-semibold text-slate-900">
                                {t('upload.form.part_2_title', 'Movie information')}
                            </h2>
                        </div>

                    {/* Titre */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="title-input"
                                className="block text-sm font-semibold text-slate-700"
                            >
                                {t('upload.form.movie_title_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                            <span className={`text-xs ${title.length > FORM_CONSTRAINTS.TITLE.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {title.length}/{FORM_CONSTRAINTS.TITLE.MAX_LENGTH}
                            </span>
                        </div>
                        <input
                            id="title-input"
                            type="text"
                            placeholder={t('upload.form.movie_title_placeholder')}
                            maxLength={FORM_CONSTRAINTS.TITLE.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.title ? 'border-red-500 bg-red-50' : 'border-slate-200'
                                }`}
                            value={title}
                            onChange={(e) => {
                                markFieldTouched('title');
                                if (!exceedsMaxLength('TITLE', e.target.value)) {
                                    setTitle(e.target.value);
                                    clearError('title');
                                }
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.title}
                            aria-describedby={errors.title ? "title-error" : "title-hint"}
                        />
                        {errors.title && (
                            <p id="title-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.title}
                            </p>
                        )}
                        <span id="title-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.movie_title_hint')}
                        </span>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="description-input"
                                className="block text-sm font-semibold text-slate-700"
                            >
                                {t('upload.form.description_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span>
                            </label>
                            <span className={`text-xs ${description.length > FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {description.length}/{FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH}
                            </span>
                        </div>
                        <textarea
                            id="description-input"
                            placeholder={t('upload.form.description_placeholder')}
                            maxLength={FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-y ${errors.description ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={description}
                            onChange={(e) => {
                                markFieldTouched('description');
                                if (!exceedsMaxLength('DESCRIPTION', e.target.value)) {
                                    setDescription(e.target.value);
                                    clearError('description');
                                }
                            }}
                            aria-describedby={errors.description ? "description-error" : "description-hint"}
                            aria-invalid={!!errors.description}
                        />
                        {errors.description && (
                            <p id="description-error" className="text-red-600 text-sm mt-1" role="alert">
                                {errors.description}
                            </p>
                        )}
                        <span id="description-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.description_hint')}
                        </span>
                    </div>
                    {/* Code pays */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="country-input" className="block text-sm font-semibold text-slate-700">
                                {t('upload.form.country_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                            <span className={`text-xs ${countryAlpha2.length > FORM_CONSTRAINTS.COUNTRY_ALPHA2.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {countryAlpha2.length}/{FORM_CONSTRAINTS.COUNTRY_ALPHA2.MAX_LENGTH}
                            </span>
                        </div>
                        <input
                            id="country-input"
                            type="text"
                            placeholder={t('upload.form.country_placeholder')}
                            list="upload-country-options"
                            maxLength={FORM_CONSTRAINTS.COUNTRY_ALPHA2.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase ${errors.countryAlpha2 ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={countryAlpha2}
                            onChange={(e) => {
                                markFieldTouched('countryAlpha2');
                                setCountryAlpha2(e.target.value.toUpperCase());
                                clearError('countryAlpha2');
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.countryAlpha2}
                            aria-describedby={errors.countryAlpha2 ? "country-error" : "country-hint"}
                        />
                        <datalist id="upload-country-options">
                            {countries.map((country) => (
                                <option
                                    key={country.alpha2}
                                    value={country.alpha2}
                                    label={`${country.alpha2} - ${country.nameFr || country.nameEn || country.alpha2}`}
                                />
                            ))}
                        </datalist>
                        {errors.countryAlpha2 && (
                            <p id="country-error" className="text-red-600 text-sm mt-1" role="alert">{errors.countryAlpha2}</p>
                        )}
                        <span id="country-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.country_hint')}
                        </span>
                        {countriesLoading && (
                            <p className="text-xs text-slate-400">{t('upload.form.country_loading')}</p>
                        )}
                        {!countriesLoading && selectedCountry && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                {selectedCountry.flagPath && (
                                    <img
                                        src={selectedCountry.flagPath}
                                        alt={`${t('upload.form.flag_alt')} ${selectedCountryName}`}
                                        className="h-4 w-6 rounded-sm border border-slate-200 object-cover"
                                        loading="lazy"
                                    />
                                )}
                                <span className="text-xs font-semibold text-slate-600">
                                    {selectedCountryName} ({selectedCountry.alpha2})
                                </span>
                            </div>
                        )}
                    </div>

                    {/* {t('upload.form.language_label')} */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="language-input" className="block text-sm font-semibold text-slate-700">
                                {t('upload.form.language_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                            <span className={`text-xs ${language.length > FORM_CONSTRAINTS.LANGUAGE.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {language.length}/{FORM_CONSTRAINTS.LANGUAGE.MAX_LENGTH}
                            </span>
                        </div>
                        <input
                            id="language-input"
                            type="text"
                            placeholder={t('upload.form.language_placeholder')}
                            maxLength={FORM_CONSTRAINTS.LANGUAGE.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.language ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={language}
                            onChange={(e) => {
                                markFieldTouched('language');
                                if (!exceedsMaxLength('LANGUAGE', e.target.value)) {
                                    setLanguage(e.target.value);
                                    clearError('language');
                                }
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.language}
                            aria-describedby={errors.language ? "language-error" : undefined}
                        />
                        {errors.language && (
                            <p id="language-error" className="text-red-600 text-sm mt-1" role="alert">{errors.language}</p>
                        )}
                    </div>

                    {/* Outils IA */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="aitools-input" className="block text-sm font-semibold text-slate-700">
                                {t('upload.form.ai_tools_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                            </label>
                            <span className={`text-xs ${aiTools.length > FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {aiTools.length}/{FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH}
                            </span>
                        </div>
                        <input
                            id="aitools-input"
                            type="text"
                            placeholder={t('upload.form.ai_tools_placeholder')}
                            maxLength={FORM_CONSTRAINTS.AI_TOOLS.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.aiTools ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={aiTools}
                            onChange={(e) => {
                                markFieldTouched('aiTools');
                                if (!exceedsMaxLength('AI_TOOLS', e.target.value)) {
                                    setAiTools(e.target.value);
                                    clearError('aiTools');
                                }
                            }}
                            required
                            aria-required="true"
                            aria-invalid={!!errors.aiTools}
                            aria-describedby={errors.aiTools ? "aitools-error" : "aitools-hint"}
                        />
                        {errors.aiTools && (
                            <p id="aitools-error" className="text-red-600 text-sm mt-1" role="alert">{errors.aiTools}</p>
                        )}
                        <span id="aitools-hint" className="text-xs text-slate-500 block">
                            {t('upload.form.ai_tools_hint')}
                        </span>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="bio-input" className="block text-sm font-semibold text-slate-700">
                                {t('upload.form.bio_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span>
                            </label>
                            <span className={`text-xs ${bio.length > FORM_CONSTRAINTS.BIO.MAX_LENGTH ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                {bio.length}/{FORM_CONSTRAINTS.BIO.MAX_LENGTH}
                            </span>
                        </div>
                        <textarea
                            id="bio-input"
                            placeholder={t('upload.form.bio_placeholder')}
                            maxLength={FORM_CONSTRAINTS.BIO.MAX_LENGTH}
                            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-y ${errors.bio ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            value={bio}
                            onChange={(e) => {
                                markFieldTouched('bio');
                                if (!exceedsMaxLength('BIO', e.target.value)) {
                                    setBio(e.target.value);
                                    clearError('bio');
                                }
                            }}
                            aria-invalid={!!errors.bio}
                            aria-describedby={errors.bio ? "bio-error" : undefined}
                        />
                        {errors.bio && (
                            <p id="bio-error" className="text-red-600 text-sm mt-1" role="alert">{errors.bio}</p>
                        )}
                    </div>

                    {/* {t('upload.form.social_links_label')} */}
                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-slate-700">{t('upload.form.social_links_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="social-website" className="text-xs text-slate-600">{t('upload.form.website_label')}</label>
                                <input
                                    id="social-website"
                                    type="url"
                                    placeholder="https://..."
                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${errors.socialWebsite ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                    value={socialWebsite}
                                    onChange={(e) => { markFieldTouched('socialWebsite'); setSocialWebsite(e.target.value); clearError('socialWebsite'); }}
                                />
                                {errors.socialWebsite && <p className="text-red-600 text-xs" role="alert">{errors.socialWebsite}</p>}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="social-instagram" className="text-xs text-slate-600">{t('upload.form.instagram_label')}</label>
                                <input
                                    id="social-instagram"
                                    type="url"
                                    placeholder="https://instagram.com/..."
                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${errors.socialInstagram ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                    value={socialInstagram}
                                    onChange={(e) => { markFieldTouched('socialInstagram'); setSocialInstagram(e.target.value); clearError('socialInstagram'); }}
                                />
                                {errors.socialInstagram && <p className="text-red-600 text-xs" role="alert">{errors.socialInstagram}</p>}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="social-facebook" className="text-xs text-slate-600">{t('upload.form.facebook_label')}</label>
                                <input
                                    id="social-facebook"
                                    type="url"
                                    placeholder="https://facebook.com/..."
                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${errors.socialFacebook ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                    value={socialFacebook}
                                    onChange={(e) => { markFieldTouched('socialFacebook'); setSocialFacebook(e.target.value); clearError('socialFacebook'); }}
                                />
                                {errors.socialFacebook && <p className="text-red-600 text-xs" role="alert">{errors.socialFacebook}</p>}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="social-x" className="text-xs text-slate-600">{t('upload.form.x_label')}</label>
                                <input
                                    id="social-x"
                                    type="url"
                                    placeholder="https://x.com/..."
                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${errors.socialX ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                    value={socialX}
                                    onChange={(e) => { markFieldTouched('socialX'); setSocialX(e.target.value); clearError('socialX'); }}
                                />
                                {errors.socialX && <p className="text-red-600 text-xs" role="alert">{errors.socialX}</p>}
                            </div>
                        </div>
                    </div>

                    {/* {t('upload.form.casting_label')} */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">
                                {t('upload.form.casting_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span>
                            </p>
                            <button
                                type="button"
                                onClick={addCastMember}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                + {t('upload.form.add_cast_member')}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {castMembers.map((member, index) => {
                                const castNameError = getCastFieldError(member, 'name');
                                const castRoleError = getCastFieldError(member, 'role');
                                const castAvatarError = getCastFieldError(member, 'avatarUrl');

                                return (
                                    <div key={`cast-${index}`} className="rounded-lg border border-slate-200 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                {t('upload.form.cast_member')} #{index + 1}
                                            </p>
                                            {castMembers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCastMember(index)}
                                                    className="text-xs text-red-600 hover:text-red-700"
                                                >
                                                    {t('upload.form.remove_cast_member')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    aria-label={t('upload.form.cast_field_aria', { num: index + 1, field: t('upload.form.cast_name_placeholder') })}
                                                    placeholder={t('upload.form.cast_name_placeholder')}
                                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${castNameError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                                    value={member.name}
                                                    onChange={(e) => updateCastMember(index, 'name', e.target.value)}
                                                />
                                                {castNameError && (
                                                    <p className="text-red-600 text-xs" role="alert">{castNameError}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    aria-label={t('upload.form.cast_field_aria', { num: index + 1, field: t('upload.form.cast_role_placeholder') })}
                                                    placeholder={t('upload.form.cast_role_placeholder')}
                                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${castRoleError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                                    value={member.role}
                                                    onChange={(e) => updateCastMember(index, 'role', e.target.value)}
                                                />
                                                {castRoleError && (
                                                    <p className="text-red-600 text-xs" role="alert">{castRoleError}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <input
                                                    type="url"
                                                    aria-label={t('upload.form.cast_field_aria', { num: index + 1, field: t('upload.form.cast_avatar_placeholder') })}
                                                    placeholder={t('upload.form.cast_avatar_placeholder')}
                                                    className={`w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${castAvatarError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                                                    value={member.avatarUrl}
                                                    onChange={(e) => updateCastMember(index, 'avatarUrl', e.target.value)}
                                                />
                                                {castAvatarError && (
                                                    <p className="text-red-600 text-xs" role="alert">{castAvatarError}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {errors.castMembers && (
                            <p className="text-red-600 text-sm" role="alert">{errors.castMembers}</p>
                        )}
                        <span className="text-xs text-slate-500 block">
                            {t('upload.form.casting_hint')}
                        </span>
                        <span className="text-xs text-slate-500 block">
                            {t('upload.form.cast_role_required_hint', 'If you add a cast member, role is required.')}
                        </span>
                    </div>

                    </section>

                    <section className={`rounded-xl border border-slate-200 p-4 md:p-5 space-y-6 ${currentStep === 3 ? '' : 'hidden'}`}>
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                {t('upload.form.part_3_badge', 'Part 3/3')}
                            </p>
                            <h2 className="text-base font-semibold text-slate-900">
                                {t('upload.form.part_3_title', 'Files and verification')}
                            </h2>
                        </div>

                    {/* {t('upload.form.poster_label')} */}
                    <div className="space-y-2">
                        <label htmlFor="poster-upload" className="block text-sm font-semibold text-slate-700">
                            {t('upload.form.poster_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span>
                        </label>
                        <input
                            id="poster-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handlePosterChange}
                            className={`w-full border p-3 rounded-lg text-sm ${errors.poster ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                        />
                        {isPosterProcessing && (
                            <p className="text-slate-600 text-sm" aria-live="polite">
                                {t('upload.form.poster_processing')}
                            </p>
                        )}
                        {posterPreview && (
                            <img
                                src={posterPreview}
                                alt={t('upload.form.poster_preview_alt')}
                                className="mt-2 max-h-48 rounded-lg border border-slate-200"
                            />
                        )}
                        {errors.poster && (
                            <p className="text-red-600 text-sm mt-1" role="alert">{errors.poster}</p>
                        )}
                        <span className="text-xs text-slate-500 block">
                            {t('upload.form.poster_hint')}
                        </span>
                        <span className="text-xs text-slate-500 block">
                            {t('upload.form.poster_auto_crop_hint', 'Automatic crop to 2:3 before upload.')}
                        </span>
                    </div>

                    {/* Fichier sous-titres SRT */}
                    <div className="space-y-2">
                        <label htmlFor="subtitle-upload" className="block text-sm font-semibold text-slate-700">
                            {t('upload.form.subtitle_label')} <span className="text-slate-500 font-normal">({optionalLabel})</span>
                        </label>
                        <input
                            id="subtitle-upload"
                            type="file"
                            accept=".srt"
                            onChange={(e) => {
                                const selected = e.target.files[0];
                                if (selected) {
                                    if (!selected.name.toLowerCase().endsWith('.srt')) {
                                        setErrors(prev => ({ ...prev, subtitle: t('upload.errors.subtitle_format') }));
                                        setSubtitleFile(null);
                                        return;
                                    }
                                    if (selected.size > 1024 * 1024) {
                                        setErrors(prev => ({ ...prev, subtitle: t('upload.errors.subtitle_too_large') }));
                                        setSubtitleFile(null);
                                        return;
                                    }
                                    setSubtitleFile(selected);
                                    clearError('subtitle');
                                }
                            }}
                            className={`w-full border p-3 rounded-lg text-sm ${errors.subtitle ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                        />
                        {subtitleFile && (
                            <p className="text-slate-700 text-sm" aria-live="polite">{subtitleFile.name}</p>
                        )}
                        {errors.subtitle && (
                            <p className="text-red-600 text-sm mt-1" role="alert">{errors.subtitle}</p>
                        )}
                    </div>

                    {/* HONEYPOT - Champ piÃ¨ge dynamique invisible */}
                    {honeypotFieldName && (
                        <div
                            style={{
                                position: 'absolute',
                                left: '-9999px',
                                width: '1px',
                                height: '1px',
                                overflow: 'hidden'
                            }}
                            aria-hidden="true"
                        >
                            <label htmlFor={honeypotFieldName}>
                                {t('upload.form.honeypot_label')}
                            </label>
                            <input
                                id={honeypotFieldName}
                                type="text"
                                name={honeypotFieldName}
                                tabIndex="-1"
                                autoComplete="off"
                                value={honeypotValue}
                                onChange={(e) => setHoneypotValue(e.target.value)}
                            />
                        </div>
                    )}

                    

                    {/* Fichier vidÃ©o */}
                    <div className="space-y-2">
                        <label htmlFor="video-upload" className="block text-sm font-semibold text-slate-700">
                            {t('upload.form.video_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                        </label>
                        <div className={`border-2 border-dashed rounded-lg p-8 transition-colors ${errors.file ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-blue-400'
                            }`}>
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isValidating}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    aria-controls="video-upload"
                                    aria-describedby="video-requirements"
                                >
                                    {isValidating ? t('upload.button.analyzing_short') : t('upload.button.choose_video')}
                                </button>
                                <input
                                    id="video-upload"
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/mp4"
                                    onChange={handleFileChange}
                                    className="sr-only"
                                    aria-label={t('upload.form.video_input_aria')}
                                    aria-required="true"
                                    aria-invalid={!!errors.file}
                                    aria-describedby="video-requirements"
                                />
                                {file && (
                                    <p className="text-slate-700 font-medium" aria-live="polite">
                                        vidéo {file.name}
                                    </p>
                                )}
                                <p id="video-requirements" className="text-xs text-slate-500 text-center">
                                    {t('upload.form.video_requirements')}
                                </p>
                            </div>
                        </div>
                        {errors.file && (
                            <p className="text-red-600 text-sm mt-1" role="alert">
                                {errors.file}
                            </p>
                        )}
                    </div>

                    {/* {t('upload.form.antispam_label')} Altcha */}
                    <div className="space-y-2">
                        <p className="block text-sm font-semibold text-slate-700">
                            {t('upload.form.antispam_label')} <abbr title={requiredLabel} className="text-red-600 no-underline">*</abbr>
                        </p>
                        <div className={`${errors.altcha ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                            <altcha-widget
                                challengeurl={ALTCHA_CHALLENGE_URL}
                                hidefooter="true"
                                strings={altchaStrings}
                                ref={(el) => {
                                    if (el) {
                                        el.addEventListener('statechange', (ev) => {
                                            if (ev.detail.state === 'verified' && ev.detail.payload) {
                                                setAltchaPayload(ev.detail.payload);
                                                setErrors(prev => ({ ...prev, altcha: '' }));
                                            }
                                        });
                                    }
                                }}
                            />
                        </div>
                        {errors.altcha && (
                            <p className="text-red-600 text-sm mt-1" role="alert">
                                {errors.altcha}
                            </p>
                        )}
                        <span className="text-xs text-slate-500 block">
                            {t('upload.form.antispam_hint')}
                        </span>
                    </div>

                    {/* Barre de progression */}
                    {uploading && (
                        <div className="space-y-2" role="region" aria-label={t('upload.progress.region_aria')}>
                            <div
                                role="progressbar"
                                aria-valuenow={progress}
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-label={t('upload.progress.bar_aria', { progress })}
                                className="w-full bg-slate-100 rounded-full h-3 overflow-hidden"
                            >
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-sm font-medium text-slate-600 text-center" aria-live="polite">
                                {t('upload.progress.uploading_with_progress', { progress })}
                            </p>
                            {progress < 100 && (
                                <p className="text-xs text-slate-500 text-center" aria-live="polite">
                                    {t('upload.progress.elapsed_label', { time: uploadElapsedLabel, defaultValue: 'Elapsed time: {{time}}' })}
                                </p>
                            )}
                        </div>
                    )}

                    </section>

                    {/* Messages de statut */}
                    {status.message && (
                        <div
                            ref={statusRef}
                            role="alert"
                            aria-live="polite"
                            aria-atomic="true"
                            tabIndex="-1"
                            className={`p-4 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${status.type === 'success'
                                ? 'bg-green-50 text-green-700 border border-green-200 focus:ring-green-500'
                                : 'bg-red-50 text-red-700 border border-red-200 focus:ring-red-500'
                                }`}
                        >
                            {status.message}
                        </div>
                    )}

                    {youtubeVideoId && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800">{t('upload.youtube_status.title')}</p>
                                <button
                                    type="button"
                                    className="text-xs text-slate-500 hover:text-slate-800"
                                    onClick={stopYoutubeStatusPolling}
                                >
                                    {t('upload.youtube_status.stop_refresh')}
                                </button>
                            </div>
                            {resolvedYoutubeVideoId && (
                                <p className="text-xs text-slate-500 break-all">
                                    {t('upload.youtube_status.video_id_label')}: {resolvedYoutubeVideoId}
                                </p>
                            )}
                            {showTrackingReference && (
                                <p className="text-xs text-slate-500 break-all">
                                    {t('upload.youtube_status.tracking_id_label', 'Tracking ID')}: {trackingReferenceId}
                                </p>
                            )}
                            <p className="text-sm text-slate-700">
                                {youtubeStatus
                                    ? `${t('upload.youtube_status.state_label')}: ${youtubeStatus.processingStatus || youtubeStatus.uploadStatus || t('upload.youtube_status.unknown')}`
                                    : isCheckingYoutubeStatus
                                        ? t('upload.youtube_status.checking')
                                        : t('upload.youtube_status.waiting')}
                            </p>
                            {youtubeStatusError && (
                                <p className="text-sm text-red-600">{youtubeStatusError}</p>
                            )}
                            <button
                                type="button"
                                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                onClick={() => fetchYoutubeStatus(youtubeVideoId)}
                                disabled={isCheckingYoutubeStatus}
                            >
                                {t('upload.youtube_status.refresh_now')}
                            </button>
                        </div>
                    )}

                    {errorSummaryEntries.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert" aria-live="polite">
                            <p className="text-sm font-semibold text-red-700">
                                {t('upload.errors.summary_title', 'Please fix the following fields:')}
                            </p>
                            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-red-700">
                                {errorSummaryEntries.map(([field, message]) => (
                                    <li key={field}>
                                        <span className="font-semibold">{errorFieldLabels[field] || field} :</span> {message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handlePreviousStep}
                            disabled={currentStep === 1 || uploading || isValidating || isPosterProcessing}
                            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('upload.form.step_back', 'Back')}
                        </button>

                        {currentStep < 3 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                            >
                                {t('upload.form.step_next', 'Next')}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={uploading || isValidating || isPosterProcessing || !file}
                                aria-busy={uploading || isValidating || isPosterProcessing}
                                aria-disabled={uploading || isValidating || isPosterProcessing || !file}
                                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                {isValidating
                                    ? t('upload.button.analyzing')
                                    : uploading
                                        ? t('upload.progress.uploading_with_progress', { progress })
                                        : t('upload.button.submit_participation')}
                            </button>
                        )}
                    </div>

                    {currentStep === 3 && (!file || uploading || isValidating || isPosterProcessing) && (
                        <p className="sr-only" aria-live="polite">
                            {!file
                                ? t('upload.sr.need_file')
                                : isPosterProcessing
                                    ? t('upload.sr.poster_processing')
                                    : isValidating
                                        ? t('upload.sr.validating')
                                        : t('upload.sr.uploading')}
                        </p>
                    )}
                    </div>
                </form>

                <style>{isLight ? `
                    .upload-modern-page {
                        background: linear-gradient(180deg, #f4f8ff 0%, #ebf4ff 55%, #f8fcff 100%);
                    }

                    .upload-modern-shell {
                        backdrop-filter: blur(10px);
                    }

                    .upload-modern-form .rounded-xl.border {
                        border-color: rgba(148, 163, 184, 0.45);
                        background: rgba(255, 255, 255, 0.92);
                    }

                    .upload-modern-form label {
                        color: #334155 !important;
                    }

                    .upload-modern-form input:not([type='file']):not(.sr-only),
                    .upload-modern-form textarea,
                    .upload-modern-form select {
                        border-color: rgba(148, 163, 184, 0.55) !important;
                        background: #ffffff !important;
                        color: #0f172a !important;
                    }

                    .upload-modern-form input::placeholder,
                    .upload-modern-form textarea::placeholder {
                        color: #64748b !important;
                    }

                    .upload-modern-form input:focus,
                    .upload-modern-form textarea:focus,
                    .upload-modern-form select:focus {
                        border-color: rgba(14, 165, 233, 0.75) !important;
                        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.24) !important;
                    }
                ` : `
                    .upload-modern-page {
                        background: linear-gradient(180deg, #020617 0%, #102042 52%, #020617 100%);
                    }

                    .upload-modern-shell {
                        backdrop-filter: blur(12px);
                    }

                    .upload-modern-form .rounded-xl.border {
                        border-color: rgba(125, 145, 175, 0.5);
                        background: rgba(15, 23, 42, 0.72);
                    }

                    .upload-modern-form label {
                        color: #f8fafc !important;
                    }

                    .upload-modern-form input:not([type='file']):not(.sr-only),
                    .upload-modern-form textarea,
                    .upload-modern-form select {
                        border-color: rgba(125, 145, 175, 0.65) !important;
                        background: rgba(15, 23, 42, 0.92) !important;
                        color: #f8fafc !important;
                    }

                    .upload-modern-form input::placeholder,
                    .upload-modern-form textarea::placeholder {
                        color: #cbd5e1 !important;
                    }

                    .upload-modern-form input:focus,
                    .upload-modern-form textarea:focus,
                    .upload-modern-form select:focus {
                        border-color: rgba(165, 243, 252, 0.95) !important;
                        box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.35) !important;
                    }

                    .upload-modern-form .text-slate-700,
                    .upload-modern-form .text-slate-800,
                    .upload-modern-form .text-slate-900 {
                        color: #f8fafc !important;
                    }

                    .upload-modern-form .text-slate-600,
                    .upload-modern-form .text-slate-500,
                    .upload-modern-form .text-slate-400 {
                        color: #cbd5e1 !important;
                    }

                    .upload-modern-form .bg-slate-50 {
                        background: rgba(15, 23, 42, 0.75) !important;
                    }

                    .upload-modern-form .border-slate-200,
                    .upload-modern-form .border-slate-300 {
                        border-color: rgba(125, 145, 175, 0.55) !important;
                    }

                    .upload-modern-form .bg-slate-100 {
                        background: rgba(30, 41, 59, 0.75) !important;
                    }

                    .upload-modern-form .bg-slate-900,
                    .upload-modern-form .hover\\:bg-slate-800:hover {
                        background: linear-gradient(90deg, #67e8f9 0%, #38bdf8 100%) !important;
                        color: #0f172a !important;
                    }

                    .upload-modern-form .bg-blue-600,
                    .upload-modern-form .hover\\:bg-blue-700:hover {
                        background: linear-gradient(90deg, #67e8f9 0%, #38bdf8 100%) !important;
                        color: #0f172a !important;
                    }

                    .upload-modern-form .text-blue-700,
                    .upload-modern-form .text-blue-900 {
                        color: #a5f3fc !important;
                    }
                `}</style>
            </div>
        </div>
    );
}










