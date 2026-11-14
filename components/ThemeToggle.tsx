'use client';

import React, { useState, useEffect, useCallback } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'yapshield-theme';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system');
  const [mounted, setMounted] = useState<boolean>(false);

  // Read persisted theme on mount (default to 'system')
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeChoice(stored);
      } else {
        setThemeChoice('system');
      }
    } catch {
      setThemeChoice('system');
    }
  }, []);

  // Resolve and apply data-theme on <html>
  const applyTheme = useCallback((choice: ThemeChoice) => {
    if (typeof window === 'undefined') return;

    let targetTheme: 'light' | 'dark';
    if (choice === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      targetTheme = isDark ? 'dark' : 'light';
    } else {
      targetTheme = choice;
    }

    document.documentElement.setAttribute('data-theme', targetTheme);
  }, []);

  // Apply whenever themeChoice changes, and listen for system color-scheme changes if 'system'
  useEffect(() => {
    if (!mounted) return;

    applyTheme(themeChoice);

    if (themeChoice !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mql.addEventListener('change', handleSystemChange);
    return () => {
      mql.removeEventListener('change', handleSystemChange);
    };
  }, [themeChoice, mounted, applyTheme]);

  // Handle user selection: persist ONLY the theme choice
  const handleSelect = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage access disabled or quota exceeded
    }
    applyTheme(choice);
  };

  const options: { value: ThemeChoice; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
    {
      value: 'system',
      label: 'System',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = themeChoice === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${opt.label} theme`}
            onClick={() => handleSelect(opt.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isSelected
                ? 'bg-[var(--surface)] text-[var(--accent)] font-semibold border border-[var(--border)] shadow-xs'
                : 'text-[var(--text-dim)] hover:text-[var(--text)] border border-transparent'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
