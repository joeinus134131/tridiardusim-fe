"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="btn-icon p-1.5 w-7 h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-60"
        aria-label="Toggle Theme"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="btn-icon tooltip p-1.5 relative overflow-hidden w-7 h-7 flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shrink-0 cursor-pointer shadow-2xs transition-colors"
      data-tooltip="Toggle Theme"
      aria-label="Toggle Theme"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          size={16}
          className={`absolute transition-all duration-300 ${
            currentTheme === "dark"
              ? "scale-0 opacity-0 rotate-90"
              : "scale-100 opacity-100 rotate-0"
          }`}
        />
        <Moon
          size={16}
          className={`absolute transition-all duration-300 ${
            currentTheme === "dark"
              ? "scale-100 opacity-100 rotate-0"
              : "scale-0 opacity-0 -rotate-90"
          }`}
        />
      </div>
    </button>
  );
}
