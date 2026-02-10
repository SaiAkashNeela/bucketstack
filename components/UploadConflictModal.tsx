import React, { useState } from 'react';
import { AlertTriangle, Copy, SkipForward, Edit3, X } from 'lucide-react';

interface UploadConflictModalProps {
    isOpen: boolean;
    fileName: string;
    isBatch: boolean;
    onResolve: (action: 'overwrite' | 'skip' | 'rename', applyToAll: boolean) => void;
}

export const UploadConflictModal: React.FC<UploadConflictModalProps> = ({
    isOpen,
    fileName,
    isBatch,
    onResolve
}) => {
    const [applyToAll, setApplyToAll] = useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">File Name Conflict</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                A file named <span className="font-mono font-bold text-[var(--text-primary)]">{fileName}</span> already exists in this folder.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <button
                            onClick={() => onResolve('overwrite', applyToAll)}
                            className="w-full flex items-center gap-3 p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Copy size={20} className="text-blue-500 group-hover:text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-[var(--text-primary)]">Overwrite</div>
                                <div className="text-xs text-[var(--text-tertiary)]">Replace the existing file with the new one.</div>
                            </div>
                        </button>

                        <button
                            onClick={() => onResolve('rename', applyToAll)}
                            className="w-full flex items-center gap-3 p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <Edit3 size={20} className="text-emerald-500 group-hover:text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-[var(--text-primary)]">Keep Both</div>
                                <div className="text-xs text-[var(--text-tertiary)]">The new file will be renamed (e.g., {fileName.split('.')[0]}_1.{fileName.split('.').pop()}).</div>
                            </div>
                        </button>

                        <button
                            onClick={() => onResolve('skip', applyToAll)}
                            className="w-full flex items-center gap-3 p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-primary)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center group-hover:bg-slate-500 group-hover:text-white transition-colors">
                                <SkipForward size={20} className="text-slate-500 group-hover:text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-[var(--text-primary)]">Skip</div>
                                <div className="text-xs text-[var(--text-tertiary)]">Don't upload this file.</div>
                            </div>
                        </button>
                    </div>

                    {isBatch && (
                        <label className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 cursor-pointer hover:bg-blue-500/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={applyToAll}
                                onChange={(e) => setApplyToAll(e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-primary)] text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Apply to all remaining conflicts</span>
                        </label>
                    )}
                </div>

                <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-end">
                    <button
                        onClick={() => onResolve('skip', false)}
                        className="text-sm font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Cancel Upload
                    </button>
                </div>
            </div>
        </div>
    );
};
