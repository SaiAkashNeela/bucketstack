import React, { useState, useEffect, ReactNode } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
  });

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
      setErrorState({
        hasError: true,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      setErrorState({
        hasError: true,
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (errorState.hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-primary)] p-6 font-sans">
        <div className="max-w-md w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-[var(--bg-danger-subtle)] text-[var(--text-danger)] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Application Error</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
            To protect your data, the application has paused execution because an unexpected error occurred.
          </p>

          <div className="bg-[var(--bg-tertiary)] p-3 rounded text-left mb-6 overflow-hidden">
              <code className="text-xs text-[var(--text-secondary)] font-mono break-all">
                  {errorState.error?.message || "Unknown error"}
              </code>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--text-on-accent)] rounded-lg font-medium transition-colors"
          >
            <RefreshCcw size={16} />
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};