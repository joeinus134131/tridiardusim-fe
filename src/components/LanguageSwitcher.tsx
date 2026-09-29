"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";

const OPTIONS: { id: Lang; label: string; flag: string }[] = [
  { id: "en", label: "EN", flag: "🇬🇧" },
  { id: "id", label: "ID", flag: "🇮🇩" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className="flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-0.5 shadow-2xs shrink-0"
      role="group"
      aria-label={t.common.language}
      title={`${t.common.language}: English / Bahasa Indonesia`}
    >
      {!compact && (
        <Globe size={12} className="ml-1.5 mr-0.5 text-slate-500 dark:text-slate-400 shrink-0" />
      )}
      {OPTIONS.map((o) => {
        const active = lang === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setLang(o.id)}
            aria-pressed={active}
            title={o.id === "en" ? t.common.english : t.common.indonesian}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
              active
                ? "bg-sky-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span aria-hidden>{o.flag}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
