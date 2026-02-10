import React, { useState } from 'react';
import { Shield, Info, CreditCard, Trash2, RefreshCw, History, AlertTriangle, CheckCircle2, X, Lock, CheckSquare, Square, ChevronRight } from 'lucide-react';


import { createPortal } from 'react-dom';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
    isReadOnly?: boolean; // If true, hide checkboxes and show "I've acknowledged"
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, onAccept, isReadOnly = false }) => {
    const [isAccepted, setIsAccepted] = useState(false);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-blue-600/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                Terms & Awareness
                            </h2>
                            <p className="text-xs text-[var(--text-tertiary)] font-medium mt-0.5 uppercase tracking-widest opacity-80">
                                Safety, Billing & Privacy
                            </p>
                        </div>
                    </div>
                    {isReadOnly && (
                        <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-tertiary)]">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scroll-smooth custom-scrollbar">
                    <section>
                        <p className="text-[var(--text-secondary)] leading-relaxed text-sm font-medium italic mb-6">
                            BucketStack is a <span className="text-[var(--text-primary)] font-bold">powerful tool</span> that connects directly to your own storage providers.
                            Please review the following information to understand how data, costs, and security are handled.
                        </p>

                        <div className="space-y-8">
                            {/* Security */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-blue-500">
                                    <Lock size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Credentials & Security</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-blue-500/20">
                                    <p>All operations are performed using <span className="text-[var(--text-primary)] font-bold">your own storage credentials</span>.</p>
                                    <p>Credentials are stored using <span className="text-[var(--text-primary)] font-bold">Machine-Bound AES-256-GCM Encryption</span>.</p>
                                    <p>The encryption key is derived from your unique hardware ID (CPU/Motherboard) mixed with an application salt. This ensures that even if your storage files are stolen, they <span className="text-red-500 font-bold underline">cannot be decrypted</span> on any other machine.</p>
                                    <p>BucketStack <span className="text-[var(--text-primary)] font-bold uppercase underline">never</span> uploads credentials, file contents, or metadata to any external server. All communication is directly between your device and your storage provider.</p>
                                </div>
                            </div>

                            {/* Billing */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <CreditCard size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Billing & Provider Charges (Very Important)</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-amber-500/20">
                                    <p>BucketStack itself is <span className="text-[var(--text-primary)] font-bold">free to use</span>, but your storage provider may charge for certain operations.</p>
                                    <div className="bg-amber-500/5 rounded-xl p-3 space-y-1.5 border border-amber-500/10 mt-2">
                                        <p className="text-xs font-bold text-amber-700/80 uppercase">You may be charged for:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs font-semibold">
                                            <li>Downloading data (egress / outbound bandwidth)</li>
                                            <li>Transferring data between providers (e.g., AWS S3 → Cloudflare R2)</li>
                                            <li>Frequent sync operations or large scans (API usage)</li>
                                            <li>Restoring files from cold or archive storage</li>
                                        </ul>
                                    </div>
                                    <p className="text-amber-600 font-bold bg-amber-500/10 px-2 py-1 rounded inline-block">⚠️ All storage and transfer charges are billed by your provider.</p>
                                    <p className="text-xs italic"><span className="font-bold">Tip:</span> Uploading data is usually free. Downloading or transferring data out may not be.</p>
                                </div>
                            </div>

                            {/* Deletions */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-red-500">
                                    <Trash2 size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Deletions, Trash & Move Operations</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-red-500/20">
                                    <p>Files deleted through BucketStack are moved to a hidden <span className="font-mono bg-[var(--bg-secondary)] px-1 rounded">.trash/</span> folder unless permanently deleted.  (Only if trash feature is enabled)</p>
                                    <p>Emptying Trash <span className="text-red-500 font-bold underline">permanently deletes</span> files and cannot be undone.</p>
                                    <p>Move operations <span className="text-red-500 font-bold">delete the original files</span> after a successful copy.</p>
                                    <p className="font-bold text-[var(--text-primary)] italic">⚠️ Always review the source and destination before moving or permanently deleting files.</p>
                                </div>
                            </div>

                            {/* Sync */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-indigo-500">
                                    <RefreshCw size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Sync & Background Tasks</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-indigo-500/20">
                                    <p>Scheduled sync jobs run <span className="text-[var(--text-primary)] font-bold">only while BucketStack is open</span> or running in the system tray.</p>
                                    <p>Sync jobs <span className="text-red-500 font-bold">do not run</span> when the app is fully closed.</p>
                                    <p>Incorrect sync configuration may <span className="text-red-500 font-bold uppercase underline">overwrite or replace</span> files automatically.</p>
                                    <p className="text-xs font-bold italic">⚠️ Always verify sync direction and settings before enabling scheduled sync.</p>
                                </div>
                            </div>

                            {/* External */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[var(--accent-blue)]">
                                    <AlertTriangle size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">External Changes & Monitoring</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-[var(--accent-blue)]/20">
                                    <p>BucketStack <span className="text-red-500 font-bold">cannot detect changes</span> made in your provider console in real time.</p>
                                </div>
                            </div>

                            {/* Privacy */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <History size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Activity Logs & Privacy</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-emerald-500/20">
                                    <p>Activity logs record <span className="text-[var(--text-primary)] font-bold underline">only actions performed through BucketStack</span>.</p>
                                    <p>Logs are <span className="text-[var(--text-primary)] font-bold">stored locally</span> on your device and are never uploaded.</p>
                                    <p>BucketStack does <span className="text-[var(--text-primary)] font-bold uppercase underline">not collect telemetry</span> or personal data.</p>
                                </div>
                            </div>

                            {/* Responsibility */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <X size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Limitations & Responsibility</h3>
                                </div>
                                <div className="space-y-2 text-sm text-[var(--text-secondary)] pl-6 border-l-2 border-rose-500/20">
                                    <p>All actions are executed directly against your storage provider.</p>
                                    <p>BucketStack <span className="text-red-500 font-bold">does not provide backups</span> unless you configure them yourself.</p>
                                    <p>You are <span className="text-[var(--text-primary)] font-bold uppercase">responsible</span> for reviewing operations that may delete data or incur charges.</p>
                                </div>
                            </div>

                            {/* Final Note */}
                            <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4">
                                <p className="text-sm font-bold text-blue-700 mb-2">✅ Final Note</p>
                                <p className="text-xs text-blue-900/80 leading-relaxed font-medium">
                                    BucketStack is designed to be safe, transparent, and fully under your control.
                                    If you are unsure about an operation, review the confirmation dialogs or this page before continuing.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                {!isReadOnly ? (
                    <div className="px-8 py-6 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] space-y-4">
                        <button
                            onClick={() => setIsAccepted(!isAccepted)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-[var(--bg-tertiary)] transition-all text-left border border-[var(--border-primary)] shadow-sm group"
                        >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isAccepted ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-[var(--bg-primary)] border-2 border-[var(--border-secondary)]'}`}>
                                {isAccepted && <CheckCircle2 size={18} strokeWidth={3} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[var(--text-primary)]">I Understand and Continue</p>
                                <p className="text-[11px] text-[var(--text-tertiary)]">I acknowledge all information regarding safety, billing, and data management.</p>
                            </div>
                        </button>

                        <button
                            onClick={onAccept}
                            disabled={!isAccepted}
                            className={`w-full py-4 rounded-2xl text-lg font-bold transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 ${isAccepted
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed opacity-50'
                                }`}
                        >
                            {isAccepted ? (
                                <>Continue to App <ChevronRight size={24} strokeWidth={3} /></>
                            ) : (
                                <>Acknowledge Terms Above</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="px-8 py-6 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-lg font-bold hover:bg-[var(--bg-secondary)] border border-[var(--border-primary)] transition-all shadow-sm active:scale-[0.98]"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
