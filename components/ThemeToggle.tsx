import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { ThemeMode } from '../types';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; icon: React.ReactNode; title: string }[] = [
    { mode: 'light', icon: <Sun size={14} />, title: '' },
    { mode: 'system', icon: <Monitor size={14} />, title: '' },
    { mode: 'dark', icon: <Moon size={14} />, title: '' },
  ];

  return (
    <div className="flex items-center w-full p-1 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]">
      {options.map(({ mode, icon, title }) => (
        <button
          key={mode}
          onClick={() => setThemeMode(mode)}
          className={`flex-1 flex items-center justify-center h-7 rounded-md transition-all duration-200 text-xs font-semibold gap-1.5 ${themeMode === mode
              ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          title={`${title} mode`}
        >
          {icon}
          <span className="capitalize">{title}</span>
        </button>
      ))}
    </div>
  );
};