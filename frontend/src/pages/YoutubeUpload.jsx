import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next"; // Ajout de l'import
import {
  getVideoMetadata,
  validateVideoFrontend,
  VIDEO_CONSTRAINTS,
} from "../utils/videoValidation";
import {
  validateForm,
  FORM_CONSTRAINTS,
  exceedsMaxLength,
} from "../utils/formvalidation";
import "altcha";

export default function YoutubeUpload() {
  const { t } = useTranslation(); // Initialisation de i18n

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState({});
  const [altchaPayload, setAltchaPayload] = useState(null);
  const [honeypotFieldName, setHoneypotFieldName] = useState("");
  const [honeypotToken, setHoneypotToken] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");

  const fileInputRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/altcha/challenge",
        );
        if (response.data.honeypot) {
          setHoneypotFieldName(response.data.honeypot.fieldName);
          setHoneypotToken(response.data.honeypot.token);
        }
      } catch (error) {
        console.error("[HONEYPOT] Erreur chargement challenge:", error);
      }
    };
    loadChallenge();
  }, []);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "video/mp4") {
      const error = t("upload.errors.format_mp4");
      setStatus({ type: "error", message: error });
      setErrors((prev) => ({ ...prev, file: error }));
      setFile(null);
      return;
    }

    const maxSize = VIDEO_CONSTRAINTS.FILE.MAX_SIZE;
    if (selectedFile.size > maxSize) {
      const error = t("upload.errors.file_size", {
        size: maxSize / (1024 * 1024),
      });
      setStatus({ type: "error", message: error });
      setErrors((prev) => ({ ...prev, file: error }));
      setFile(null);
      return;
    }

    try {
      setIsValidating(true);
      setStatus({ type: "", message: "" });
      setErrors((prev) => ({ ...prev, file: "" }));

      const metadata = await getVideoMetadata(selectedFile);
      const validation = validateVideoFrontend(metadata);

      if (!validation.isValid) {
        setFile(null);
        const errorMessage = `${t("upload.errors.not_compliant")} : ${validation.errors.join(" ")}`;
        setStatus({ type: "error", message: errorMessage });
        setErrors((prev) => ({ ...prev, file: errorMessage }));
        return;
      }

      setFile(selectedFile);
      setStatus({
        type: "success",
        message: t("upload.status.video_validated"),
      });

      setTimeout(() => {
        statusRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error(err);
      setFile(null);
      const errorMessage =
        typeof err === "string" ? err : t("upload.errors.analysis_failed");
      setStatus({ type: "error", message: errorMessage });
      setErrors((prev) => ({ ...prev, file: errorMessage }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    const validation = validateForm({
      email,
      firstName,
      lastName,
      age,
      title,
      description,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      setStatus({ type: "error", message: t("upload.errors.form_invalid") });
      return;
    }

    if (!file) {
      setErrors({ file: t("upload.errors.select_video") });
      setStatus({ type: "error", message: t("upload.errors.select_video") });
      return;
    }

    if (!altchaPayload) {
      setErrors({ altcha: t("upload.errors.altcha_missing") });
      setStatus({ type: "error", message: t("upload.errors.altcha_missing") });
      return;
    }

    const formData = new FormData();
    formData.append("video", file);
    formData.append("email", validation.cleanedData.email);
    formData.append("firstName", validation.cleanedData.firstName);
    formData.append("lastName", validation.cleanedData.lastName);
    formData.append("age", validation.cleanedData.age);
    formData.append("title", validation.cleanedData.title);
    formData.append("description", validation.cleanedData.description);
    formData.append("altcha", altchaPayload);
    formData.append("honeypotToken", honeypotToken);
    if (honeypotFieldName) {
      formData.append(honeypotFieldName, honeypotValue);
    }

    try {
      setUploading(true);
      setStatus({ type: "", message: "" });

      await axios.post("http://localhost:3000/api/upload/youtube", formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setProgress(percent);
        },
      });

      setStatus({
        type: "success",
        message: t("upload.status.upload_success"),
      });

      setFile(null);
      setEmail("");
      setFirstName("");
      setLastName("");
      setAge("");
      setTitle("");
      setDescription("");
      setAltchaPayload(null);
      setErrors({});

      setTimeout(() => {
        statusRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: err.response?.data?.error || t("upload.errors.upload_failed"),
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="section app-container py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-8 text-white">
          <h1 className="text-3xl font-bold">{t("upload.title")}</h1>
          <p className="text-slate-400 mt-2">{t("upload.subtitle")}</p>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-6" noValidate>
          {/* Email */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="email-input"
                className="block text-sm font-semibold text-slate-700"
              >
                {t("upload.form.email_label")}{" "}
                <abbr
                  title={t("upload.form.required")}
                  className="text-red-600 no-underline"
                >
                  *
                </abbr>
              </label>
              <span
                className={`text-xs ${email.length > FORM_CONSTRAINTS.EMAIL.MAX_LENGTH ? "text-red-600 font-semibold" : "text-slate-500"}`}
              >
                {email.length}/{FORM_CONSTRAINTS.EMAIL.MAX_LENGTH}
              </span>
            </div>
            <input
              id="email-input"
              type="email"
              placeholder={t("upload.form.email_placeholder")}
              maxLength={FORM_CONSTRAINTS.EMAIL.MAX_LENGTH}
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.email ? "border-red-500 bg-red-50" : "border-slate-200"}`}
              value={email}
              onChange={(e) => {
                if (!exceedsMaxLength("EMAIL", e.target.value)) {
                  setEmail(e.target.value);
                  clearError("email");
                }
              }}
              required
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
            <span className="text-xs text-slate-500 block">
              {t("upload.form.email_hint")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prénom */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="firstname-input"
                  className="block text-sm font-semibold text-slate-700"
                >
                  {t("upload.form.first_name_label")}{" "}
                  <abbr
                    title={t("upload.form.required")}
                    className="text-red-600 no-underline"
                  >
                    *
                  </abbr>
                </label>
                <span
                  className={`text-xs ${firstName.length > FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH ? "text-red-600 font-semibold" : "text-slate-500"}`}
                >
                  {firstName.length}/{FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH}
                </span>
              </div>
              <input
                id="firstname-input"
                type="text"
                placeholder={t("upload.form.first_name_placeholder")}
                maxLength={FORM_CONSTRAINTS.FIRST_NAME.MAX_LENGTH}
                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.firstName ? "border-red-500 bg-red-50" : "border-slate-200"}`}
                value={firstName}
                onChange={(e) => {
                  if (!exceedsMaxLength("FIRST_NAME", e.target.value)) {
                    setFirstName(e.target.value);
                    clearError("firstName");
                  }
                }}
                required
              />
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="lastname-input"
                  className="block text-sm font-semibold text-slate-700"
                >
                  {t("upload.form.last_name_label")}{" "}
                  <abbr
                    title={t("upload.form.required")}
                    className="text-red-600 no-underline"
                  >
                    *
                  </abbr>
                </label>
                <span
                  className={`text-xs ${lastName.length > FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH ? "text-red-600 font-semibold" : "text-slate-500"}`}
                >
                  {lastName.length}/{FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH}
                </span>
              </div>
              <input
                id="lastname-input"
                type="text"
                placeholder={t("upload.form.last_name_placeholder")}
                maxLength={FORM_CONSTRAINTS.LAST_NAME.MAX_LENGTH}
                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.lastName ? "border-red-500 bg-red-50" : "border-slate-200"}`}
                value={lastName}
                onChange={(e) => {
                  if (!exceedsMaxLength("LAST_NAME", e.target.value)) {
                    setLastName(e.target.value);
                    clearError("lastName");
                  }
                }}
                required
              />
              {errors.lastName && (
                <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Âge */}
          <div className="space-y-2">
            <label
              htmlFor="age-input"
              className="block text-sm font-semibold text-slate-700"
            >
              {t("upload.form.age_label")}{" "}
              <abbr
                title={t("upload.form.required")}
                className="text-red-600 no-underline"
              >
                *
              </abbr>
            </label>
            <input
              id="age-input"
              type="number"
              placeholder={t("upload.form.age_placeholder")}
              min="18"
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.age ? "border-red-500 bg-red-50" : "border-slate-200"}`}
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                clearError("age");
              }}
              required
            />
            {errors.age && (
              <p className="text-red-600 text-sm mt-1">{errors.age}</p>
            )}
            <span className="text-xs text-slate-500 block">
              {t("upload.form.age_hint")}
            </span>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="title-input"
                className="block text-sm font-semibold text-slate-700"
              >
                {t("upload.form.title_label")}{" "}
                <abbr
                  title={t("upload.form.required")}
                  className="text-red-600 no-underline"
                >
                  *
                </abbr>
              </label>
              <span
                className={`text-xs ${title.length > FORM_CONSTRAINTS.TITLE.MAX_LENGTH ? "text-red-600 font-semibold" : "text-slate-500"}`}
              >
                {title.length}/{FORM_CONSTRAINTS.TITLE.MAX_LENGTH}
              </span>
            </div>
            <input
              id="title-input"
              type="text"
              placeholder={t("upload.form.title_placeholder")}
              maxLength={FORM_CONSTRAINTS.TITLE.MAX_LENGTH}
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.title ? "border-red-500 bg-red-50" : "border-slate-200"}`}
              value={title}
              onChange={(e) => {
                if (!exceedsMaxLength("TITLE", e.target.value)) {
                  setTitle(e.target.value);
                  clearError("title");
                }
              }}
              required
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="description-input"
                className="block text-sm font-semibold text-slate-700"
              >
                {t("upload.form.description_label")}{" "}
                <span className="font-normal">
                  ({t("upload.form.optional")})
                </span>
              </label>
              <span
                className={`text-xs ${description.length > FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH ? "text-red-600 font-semibold" : "text-slate-500"}`}
              >
                {description.length}/{FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="description-input"
              placeholder={t("upload.form.description_placeholder")}
              maxLength={FORM_CONSTRAINTS.DESCRIPTION.MAX_LENGTH}
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-y ${errors.description ? "border-red-500 bg-red-50" : "border-slate-200"}`}
              value={description}
              onChange={(e) => {
                if (!exceedsMaxLength("DESCRIPTION", e.target.value)) {
                  setDescription(e.target.value);
                  clearError("description");
                }
              }}
            />
            <span className="text-xs text-slate-500 block">
              {t("upload.form.description_hint")}
            </span>
          </div>

          {/* Fichier vidéo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("upload.form.video_label")}{" "}
              <abbr
                title={t("upload.form.required")}
                className="text-red-600 no-underline"
              >
                *
              </abbr>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 transition-colors ${errors.file ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-blue-400"}`}
            >
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isValidating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                >
                  {isValidating
                    ? t("upload.button.analyzing")
                    : t("upload.button.choose_video")}
                </button>
                <input
                  id="video-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                {file && (
                  <p className="text-slate-700 font-medium">📁 {file.name}</p>
                )}
                <p className="text-xs text-slate-500 text-center">
                  {t("upload.form.video_requirements")}
                </p>
              </div>
            </div>
            {errors.file && (
              <p className="text-red-600 text-sm mt-1">{errors.file}</p>
            )}
          </div>

          {/* Altcha */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("upload.form.antispam_label")}{" "}
              <abbr
                title={t("upload.form.required")}
                className="text-red-600 no-underline"
              >
                *
              </abbr>
            </label>
            <div
              className={
                errors.altcha ? "border-2 border-red-500 rounded-lg p-2" : ""
              }
            >
              <altcha-widget
                challengeurl="http://localhost:3000/api/altcha/challenge"
                hidefooter="true"
                strings={JSON.stringify({
                  label: t("altcha.label"),
                  verifying: t("altcha.verifying"),
                  verified: t("altcha.verified"),
                  error: t("altcha.error"),
                  expired: t("altcha.expired"),
                })}
                ref={(el) => {
                  if (el) {
                    el.addEventListener("statechange", (ev) => {
                      if (ev.detail.state === "verified" && ev.detail.payload) {
                        setAltchaPayload(ev.detail.payload);
                        setErrors((prev) => ({ ...prev, altcha: "" }));
                      }
                    });
                  }
                }}
              />
            </div>
          </div>

          {/* Barre de progression */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-slate-600 text-center">
                {t("upload.button.uploading")} {progress}%
              </p>
            </div>
          )}

          {/* Status Message */}
          {status.message && (
            <div
              ref={statusRef}
              tabIndex="-1"
              className={`p-4 rounded-lg text-sm font-medium ${status.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || isValidating || !file}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:bg-slate-300 shadow-lg active:scale-95"
          >
            {isValidating
              ? t("upload.button.analyzing")
              : uploading
                ? `${t("upload.button.uploading")} ${progress}%`
                : t("upload.button.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
