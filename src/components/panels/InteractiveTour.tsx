"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Box,
  Zap,
  Code,
  Play,
  CheckCircle2,
} from "lucide-react";

interface TourStep {
  selector: string;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  preferredPlacement: "right" | "left" | "bottom" | "top";
}

const TOUR_STEPS = [
  {
    selector: '[data-tour="library-panel"]',
    titleKey: "step1Title",
    descKey: "step1Desc",
    preferredPlacement: "right" as const,
  },
  {
    selector: '[data-tour="canvas-area"]',
    titleKey: "step2Title",
    descKey: "step2Desc",
    preferredPlacement: "bottom" as const,
  },
  {
    selector: '[data-tour="wire-toolbar"]',
    titleKey: "step3Title",
    descKey: "step3Desc",
    preferredPlacement: "bottom" as const,
  },
  {
    selector: '[data-tour="code-editor"]',
    titleKey: "step4Title",
    descKey: "step4Desc",
    preferredPlacement: "left" as const,
  },
  {
    selector: '[data-tour="run-button"]',
    titleKey: "step5Title",
    descKey: "step5Desc",
    preferredPlacement: "bottom" as const,
  },
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveTour({ isOpen, onClose }: InteractiveTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 100,
    left: 100,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const getStepIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Layers size={18} className="text-blue-400" />;
      case 1:
        return <Box size={18} className="text-cyan-400" />;
      case 2:
        return <Zap size={18} className="text-amber-400" />;
      case 3:
        return <Code size={18} className="text-purple-400" />;
      case 4:
        return <Play size={18} className="text-emerald-400" />;
      default:
        return <Sparkles size={18} className="text-sky-400" />;
    }
  };

  // Update target bounding box and tooltip positioning
  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    const elem = document.querySelector(step.selector);

    if (elem) {
      const rect = elem.getBoundingClientRect();
      setTargetRect(rect);

      // Tooltip position calculation
      const tooltipWidth = 340;
      const tooltipHeight = 220;
      const padding = 16;
      let top = 100;
      let left = 100;

      if (step.preferredPlacement === "right") {
        left = rect.right + padding;
        top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, rect.top + 20));
      } else if (step.preferredPlacement === "left") {
        left = Math.max(padding, rect.left - tooltipWidth - padding);
        top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, rect.top + 20));
      } else if (step.preferredPlacement === "bottom") {
        left = Math.max(
          padding,
          Math.min(window.innerWidth - tooltipWidth - padding, rect.left + rect.width / 2 - tooltipWidth / 2)
        );
        top = Math.min(window.innerHeight - tooltipHeight - padding, rect.bottom + padding);
      } else {
        left = Math.max(
          padding,
          Math.min(window.innerWidth - tooltipWidth - padding, rect.left + rect.width / 2 - tooltipWidth / 2)
        );
        top = Math.max(padding, rect.top - tooltipHeight - padding);
      }

      // Viewport safety boundary clamping
      left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));
      top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));

      setTooltipPos({ top, left });
    } else {
      // Fallback center of screen
      setTargetRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 110,
        left: Math.max(16, window.innerWidth / 2 - 170),
      });
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const title = (t.tour as Record<string, string>)[step.titleKey] || "";
  const desc = (t.tour as Record<string, string>)[step.descKey] || "";

  // Target cutout rect with margin
  const cutout = targetRect
    ? {
        x: Math.max(0, targetRect.left - 6),
        y: Math.max(0, targetRect.top - 6),
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
      {/* SVG Mask Spotlight Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background means visible/dimmed */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black rectangle cuts out the spotlight hole */}
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.width}
                height={cutout.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 8, 20, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Glowing Spotlight Border */}
      {cutout && (
        <div
          style={{
            position: "fixed",
            top: cutout.y,
            left: cutout.x,
            width: cutout.width,
            height: cutout.height,
            borderRadius: 14,
            border: "2px solid #38bdf8",
            boxShadow:
              "0 0 25px rgba(56, 189, 248, 0.75), inset 0 0 15px rgba(56, 189, 248, 0.3)",
            pointerEvents: "none",
            zIndex: 9991,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      )}

      {/* Click outside cutout dismiss / advance */}
      <div
        className="absolute inset-0 z-[9991]"
        onClick={onClose}
        style={{ pointerEvents: "auto" }}
      />

      {/* Floating Tour Tooltip Card */}
      <div
        ref={tooltipRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 340,
          zIndex: 9995,
        }}
        className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-sky-500/40 shadow-2xl rounded-2xl p-5 text-slate-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30">
              {getStepIcon(currentStep)}
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-sky-400">
              {t.tour.step} {currentStep + 1} {t.tour.of} {TOUR_STEPS.length}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label={t.tour.skipTour}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-base font-bold text-slate-100 mb-1 leading-snug">
            {title}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {desc}
          </p>
        </div>

        {/* Step Dots Progress */}
        <div className="flex items-center gap-1.5 py-1">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-6 bg-sky-400 shadow-sm shadow-sky-400/50"
                  : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
              title={`Langkah ${i + 1}`}
            />
          ))}
        </div>

        {/* Controls Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
          >
            {t.tour.skipTour}
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>{t.tour.prev}</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-lg shadow-sky-500/25 transition-all flex items-center gap-1.5"
            >
              {isLast ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>{t.tour.finish}</span>
                </>
              ) : (
                <>
                  <span>{t.tour.next}</span>
                  <ChevronRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
