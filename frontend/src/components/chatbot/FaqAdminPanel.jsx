import React, { useEffect, useState } from "react";

const TRANSLATION_LANGUAGES = ["fr", "en", "ar"];

function formatDateLabel(value, locale) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function TranslationEditor({
  language,
  copy,
  isLight,
  value,
  onChange,
  disabled,
}) {
  const shellClass = isLight
    ? "border-slate-200 bg-slate-50/80"
    : "border-slate-700 bg-slate-900/50";
  const labelClass = isLight ? "text-slate-600" : "text-slate-300";
  const inputClass = isLight
    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
    : "border-slate-600 bg-slate-950 text-slate-100 placeholder:text-slate-500";

  return (
    <section className={`rounded-2xl border p-3 space-y-3 ${shellClass}`}>
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em]">
        {copy.languages[language]}
      </h4>

      <label className="block space-y-1">
        <span className={`text-[11px] uppercase tracking-[0.14em] ${labelClass}`}>
          {copy.questionLabel}
        </span>
        <input
          type="text"
          value={value.question}
          disabled={disabled}
          onChange={(event) => onChange(language, "question", event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
          placeholder={copy.questionPlaceholder}
        />
      </label>

      <label className="block space-y-1">
        <span className={`text-[11px] uppercase tracking-[0.14em] ${labelClass}`}>
          {copy.answerLabel}
        </span>
        <textarea
          rows="4"
          value={value.answer}
          disabled={disabled}
          onChange={(event) => onChange(language, "answer", event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition resize-y ${inputClass}`}
          placeholder={copy.answerPlaceholder}
        />
      </label>

      <label className="block space-y-1">
        <span className={`text-[11px] uppercase tracking-[0.14em] ${labelClass}`}>
          {copy.keywordsLabel}
        </span>
        <input
          type="text"
          value={value.keywords}
          disabled={disabled}
          onChange={(event) => onChange(language, "keywords", event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
          placeholder={copy.keywordsPlaceholder}
        />
      </label>
    </section>
  );
}

export default function FaqAdminPanel({
  copy,
  locale,
  isLight,
  items,
  summary,
  draft,
  themeOptions,
  questionOptions,
  filterThemeKey,
  loading,
  saving,
  deleting,
  error,
  notice,
  onSelect,
  onCreate,
  onFilterThemeChange,
  onMetaChange,
  onTranslationChange,
  onSubmit,
  onReset,
  onDelete,
}) {
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);
  const cardClass = isLight
    ? "border-slate-200 bg-white"
    : "border-slate-700 bg-slate-900/85";
  const mutedTextClass = isLight ? "text-slate-500" : "text-slate-400";
  const badgeClass = isLight
    ? "border-slate-200 bg-slate-100 text-slate-700"
    : "border-slate-700 bg-slate-800 text-slate-200";
  const inputClass = isLight
    ? "border-slate-300 bg-white text-slate-900"
    : "border-slate-600 bg-slate-950 text-slate-100";
  const primaryButtonClass = isLight
    ? "bg-cyan-600 text-white hover:bg-cyan-700"
    : "bg-cyan-400 text-slate-950 hover:bg-cyan-300";
  const secondaryButtonClass = isLight
    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
    : "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800";
  const dangerShellClass = isLight
    ? "border-red-200 bg-red-50/80"
    : "border-red-500/30 bg-red-500/10";
  const dangerButtonClass = isLight
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-red-500 text-white hover:bg-red-400";
  const isBusy = saving || deleting;
  const total = Number(summary?.total || 0);
  const active = Number(summary?.active || 0);
  const totalUsage = Number(summary?.totalUsage || 0);
  const selectedFaqKey = draft.mode === "edit" ? draft.faqKey : "";
  const selectedItem = items.find((item) => item?.faqKey === selectedFaqKey) || null;
  const updatedAtLabel = formatDateLabel(selectedItem?.updatedAt || selectedItem?.createdAt, locale);
  const selectedQuestionLabel = selectedItem?.translations?.fr?.question
    || selectedItem?.translations?.en?.question
    || selectedItem?.faqKey
    || "";

  useEffect(() => {
    setIsDeleteArmed(false);
  }, [selectedFaqKey, draft.mode]);

  return (
    <div className="space-y-4">
      <section className={`rounded-3xl border p-4 space-y-4 ${cardClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.2em] ${mutedTextClass}`}>
              {copy.kicker}
            </p>
            <h3 className="text-lg font-semibold">{copy.title}</h3>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={isBusy}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${secondaryButtonClass}`}
          >
            {copy.newFaq}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-2xl border p-3 ${cardClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${mutedTextClass}`}>
              {copy.totalLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold">{total}</p>
          </div>
          <div className={`rounded-2xl border p-3 ${cardClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${mutedTextClass}`}>
              {copy.activeLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold">{active}</p>
          </div>
          <div className={`rounded-2xl border p-3 ${cardClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${mutedTextClass}`}>
              {copy.usageLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold">{totalUsage}</p>
          </div>
        </div>
      </section>

      <section className={`rounded-3xl border p-4 space-y-4 ${cardClass}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={`text-[11px] uppercase tracking-[0.14em] ${mutedTextClass}`}>
              {copy.filterThemeLabel}
            </span>
            <select
              value={filterThemeKey}
              onChange={(event) => onFilterThemeChange(event.target.value)}
              disabled={isBusy}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
            >
              {themeOptions.map((option) => (
                <option key={`theme_filter_${option.id}`} value={option.id}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className={`text-[11px] uppercase tracking-[0.14em] ${mutedTextClass}`}>
              {copy.filterQuestionLabel}
            </span>
            <select
              value={selectedFaqKey}
              onChange={(event) => {
                const nextItem = items.find((item) => item?.faqKey === event.target.value);
                if (nextItem) onSelect(nextItem);
              }}
              disabled={isBusy}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
            >
              <option value="">{copy.filterQuestionPlaceholder}</option>
              {questionOptions.map((item) => (
                <option key={`faq_option_${item.faqKey}`} value={item.faqKey}>
                  {item?.translations?.fr?.question || item?.translations?.en?.question || item?.faqKey}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <p className={`text-sm ${mutedTextClass}`}>{copy.loading}</p>
        ) : null}

        {!loading && selectedItem ? (
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass}`}>
              {copy.selectedThemeLabel}: {themeOptions.find((option) => option.id === selectedItem.themeKey)?.label || selectedItem.themeKey}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass}`}>
              {copy.selectedUsageLabel}: {Number(selectedItem.usageCount || 0)}
            </span>
            {updatedAtLabel ? (
              <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass}`}>
                {copy.selectedUpdatedLabel}: {updatedAtLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {!loading && questionOptions.length === 0 ? (
          <p className={`text-sm ${mutedTextClass}`}>{copy.emptyState}</p>
        ) : null}
      </section>

      <section className={`rounded-3xl border p-4 space-y-4 ${cardClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.2em] ${mutedTextClass}`}>
              {draft.mode === "edit" ? copy.editKicker : copy.createKicker}
            </p>
            <h3 className="text-lg font-semibold">
              {draft.mode === "edit" ? copy.editTitle : copy.createTitle}
            </h3>
            {draft.faqKey ? (
              <p className={`mt-1 text-xs ${mutedTextClass}`}>{draft.faqKey}</p>
            ) : null}
          </div>

          <label className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${badgeClass}`}>
            <input
              type="checkbox"
              checked={draft.isActive}
              disabled={isBusy}
              onChange={(event) => onMetaChange("isActive", event.target.checked)}
            />
            <span>{copy.activeToggle}</span>
          </label>
        </div>

        <label className="block space-y-1">
          <span className={`text-[11px] uppercase tracking-[0.14em] ${mutedTextClass}`}>
            {copy.themeFieldLabel}
          </span>
          <select
            value={draft.themeKey}
            onChange={(event) => onMetaChange("themeKey", event.target.value)}
            disabled={isBusy}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
          >
            {themeOptions.map((option) => (
              <option key={`theme_value_${option.id}`} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error ? (
          <div className={isLight ? "rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" : "rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"}>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className={isLight ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" : "rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"}>
            {notice}
          </div>
        ) : null}

        <div className="space-y-3">
          {TRANSLATION_LANGUAGES.map((language) => (
            <TranslationEditor
              key={`editor_${language}`}
              language={language}
              copy={copy}
              isLight={isLight}
              value={draft.translations[language]}
              disabled={isBusy}
              onChange={onTranslationChange}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isBusy}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${primaryButtonClass}`}
          >
            {saving
              ? copy.saving
              : draft.mode === "edit"
                ? copy.saveEdit
                : copy.saveCreate}
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isBusy}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${secondaryButtonClass}`}
          >
            {copy.reset}
          </button>
        </div>

        {selectedItem ? (
          <div className={`rounded-2xl border p-3 space-y-3 ${dangerShellClass}`}>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500">
                {copy.deleteHint}
              </p>
              <p className="text-sm">
                {copy.deletePrompt}
              </p>
              {selectedQuestionLabel ? (
                <p className={`text-xs ${mutedTextClass}`}>
                  {copy.deleteTargetLabel}: {selectedQuestionLabel}
                </p>
              ) : null}
            </div>

            {isDeleteArmed ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteArmed(false)}
                  disabled={isBusy}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${secondaryButtonClass}`}
                >
                  {copy.deleteCancel}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(selectedItem)}
                  disabled={isBusy}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${dangerButtonClass}`}
                >
                  {deleting ? copy.deleting : copy.deleteConfirm}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDeleteArmed(true)}
                disabled={isBusy}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${dangerButtonClass}`}
              >
                {copy.deleteAction}
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
