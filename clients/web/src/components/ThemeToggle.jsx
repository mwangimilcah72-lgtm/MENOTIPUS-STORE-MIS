import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        isDark ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`absolute flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
          isDark ? 'translate-x-8' : 'translate-x-1'
        }`}
      >
        {isDark
          ? <Moon className="h-3 w-3 text-blue-600" />
          : <Sun className="h-3 w-3 text-yellow-500" />
        }
      </span>
    </button>
  );
};

export default ThemeToggle;
