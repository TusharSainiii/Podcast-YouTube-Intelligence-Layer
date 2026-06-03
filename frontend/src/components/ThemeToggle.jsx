import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-theme-bg-secondary hover:bg-theme-bg-tertiary border border-theme-border-muted hover:border-theme-accent-purple text-theme-text-secondary hover:text-theme-text-primary transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center relative group active:scale-95"
      aria-label="Toggle Theme"
      id="theme-toggle-btn"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-200" />
          <span className="sr-only">Switch to Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform duration-200" />
          <span className="sr-only">Switch to Dark Mode</span>
        </>
      )}
    </button>
  );
}
