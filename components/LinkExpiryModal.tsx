import React, { useState } from 'react';
import { X, Clock, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { S3Object } from '../types';

interface LinkExpiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    objects: S3Object[];
    onConfirm: (duration: number) => void;
}

export const LinkExpiryModal: React.FC<LinkExpiryModalProps> = ({ isOpen, onClose, objects, onConfirm }) => {
    const [mode, setMode] = useState<'preset' | 'custom'>('preset');
    const [presetDuration, setPresetDuration] = useState<number>(3600); // Default 1 hour
    const [custom, setCustom] = useState({ d: 0, h: 1, m: 0 });

    if (!isOpen) return null;

    const options = [
        { label: '15 Minutes', value: 900 },
        { label: '1 Hour', value: 3600 },
        { label: '12 Hours', value: 43200 },
        { label: '1 Day', value: 86400 },
        { label: '7 Days', value: 604800 },
    ];

    const getDuration = () => {
        if (mode === 'preset') return presetDuration;
        return (parseInt(String(custom.d)) || 0) * 86400 +
            (parseInt(String(custom.h)) || 0) * 3600 +
            (parseInt(String(custom.m)) || 0) * 60;
    };

    const handleConfirm = () => {
        const seconds = getDuration();
        if (seconds <= 0) {
            alert("Please specify a valid duration.");
            return;
        }
        onConfirm(seconds);
        onClose();
    };

    const InputGroup = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">{label}</span>
            <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
            <div className="bg-[var(--bg-primary)] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-[var(--border-primary)] flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)]">
                    <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <LinkIcon className="text-[var(--accent-blue)]" size={18} />
                        Generate Link
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors rounded p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Create temporary access link{objects.length > 1 ? 's' : ''} for <span className="font-medium text-[var(--text-primary)]">{objects.length > 1 ? `${objects.length} items` : objects[0]?.name}</span>.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wide flex items-center gap-1.5 mb-2">
                                <Clock size={12} /> Expiration
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setMode('preset');
                                            setPresetDuration(opt.value);
                                        }}
                                        className={`px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-center gap-2 ${mode === 'preset' && presetDuration === opt.value
                                            ? 'bg-[var(--bg-selected)] border-[var(--border-selected)] text-[var(--accent-blue)] font-medium shadow-sm'
                                            : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                                            }`}
                                    >
                                        {mode === 'preset' && presetDuration === opt.value && <Check size={14} />}
                                        {opt.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setMode('custom')}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-all flex items-center justify-center gap-2 ${mode === 'custom'
                                        ? 'bg-[var(--bg-selected)] border-[var(--border-selected)] text-[var(--accent-blue)] font-medium shadow-sm'
                                        : 'bg-[var(--bg-tertiary)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                                        }`}
                                >
                                    {mode === 'custom' && <Check size={14} />}
                                    Custom
                                </button>
                            </div>
                        </div>

                        {/* Custom Inputs */}
                        {mode === 'custom' && (
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-primary)] animate-in slide-in-from-top-2 fade-in">
                                <div className="grid grid-cols-3 gap-3">
                                    <InputGroup label="Days" value={custom.d} onChange={(v) => setCustom(p => ({ ...p, d: v }))} />
                                    <InputGroup label="Hours" value={custom.h} onChange={(v) => setCustom(p => ({ ...p, h: v }))} />
                                    <InputGroup label="Minutes" value={custom.m} onChange={(v) => setCustom(p => ({ ...p, m: v }))} />
                                </div>
                                <div className="mt-2 text-xs text-[var(--text-tertiary)] text-center">
                                    Total: {(getDuration() / 3600).toFixed(1)} hours
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-5 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <Copy size={16} /> Copy Link{objects.length > 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
