import React from 'react';
import { X, Plus, Grid3x3, Database } from 'lucide-react';

interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSingle: () => void;
  onSelectMultiple: () => void;
}

export const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSingle,
  onSelectMultiple
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-lg max-w-md w-full mx-4 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Connection</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={() => {
              onSelectSingle();
              onClose();
            }}
            className="w-full p-6 rounded-lg border-2 border-[var(--border-primary)] hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100/50 group-hover:bg-blue-100 transition-colors">
                <Database size={24} className="text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                  Add Single Bucket
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Connect to a single S3 bucket with manual configuration
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onSelectMultiple();
              onClose();
            }}
            className="w-full p-6 rounded-lg border-2 border-[var(--border-primary)] hover:border-green-500 hover:bg-green-50/30 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-green-100/50 group-hover:bg-green-100 transition-colors">
                <Grid3x3 size={24} className="text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-green-600 transition-colors">
                  Add Multiple Buckets
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Fetch and add multiple buckets using credentials at once
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="px-6 py-4 bg-[var(--bg-secondary)]/40 rounded-b-lg border-t border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-tertiary)]">
            💡 Use <strong>Single Bucket</strong> for simple setups. Use <strong>Multiple Buckets</strong> to discover and add all accessible buckets at once.
          </p>
        </div>
      </div>
    </div>
  );
};
