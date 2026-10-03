"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Laptop, Smartphone, X, Sparkles, Hand } from "lucide-react";

export function MobileWarningBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user already dismissed the warning during this session
    const dismissed = sessionStorage.getItem("ardusim_dismiss_mobile_notice");
    if (dismissed === "true") return;

    const userAgent = navigator.userAgent || "";
    const isMobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isSmallScreen = window.innerWidth <= 820;
    const isTouch = navigator.maxTouchPoints > 0;

    if (isMobileUA || (isSmallScreen && isTouch)) {
      // Delay showing slightly so page renders smoothly first
      const timer = setTimeout(() => {
        setVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("ardusim_dismiss_mobile_notice", "true");
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl rounded-2xl p-4 text-slate-100 flex flex-col gap-3">
        {/* Header with icons & close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shadow-inner">
              <Laptop size={16} />
              <span className="text-xs font-bold text-slate-400">/</span>
              <Smartphone size={14} className="text-amber-300" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {t.mobileWarning.title}
              </h4>
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <Sparkles size={11} />
                <span>Simulasi CAD 3D & IDE</span>
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label={t.common.close}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs text-slate-300 leading-relaxed">
          {t.mobileWarning.message}
        </p>

        {/* Touch navigation tip toggle */}
        <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
          <Hand size={14} className="text-sky-400 shrink-0 mt-0.5" />
          <div className="leading-tight">
            <span className="font-semibold text-sky-400 block mb-0.5">Navigasi Touch:</span>
            <span>{t.mobileWarning.touchTip}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all"
          >
            {t.mobileWarning.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
