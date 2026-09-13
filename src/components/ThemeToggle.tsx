"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        className="btn-icon tooltip p-1.5 w-7 h-7"
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
      className="btn-icon tooltip p-1.5 relative overflow-hidden w-7 h-7 flex items-center justify-center"
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
