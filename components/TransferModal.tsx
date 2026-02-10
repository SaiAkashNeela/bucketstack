import React, { useState, useEffect } from 'react';
import { X, Search, ChevronRight, Database, Folder, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { S3AccountMetadata, S3Object, TransferJob } from '../types';
import { s3Service } from '../services/s3Service';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceAccount: S3AccountMetadata;
    sourceBucket: string;
    selectedObjects: S3Object[];
    type: 'copy' | 'move';
    onStartTransfer: (jobs: TransferJob[]) => void;
}

interface DestinationConfig {
    accountId: string;
    bucketName: string;
    targetFolder: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
    isOpen,
    onClose,
    sourceAccount,
    sourceBucket,
    selectedObjects,
    type,
    onStartTransfer,
}) => {
    const [accounts, setAccounts] = useState<S3AccountMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDestinations, setSelectedDestinations] = useState<DestinationConfig[]>([]);
    const [step, setStep] = useState<'select' | 'confirm'>('select');

    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setSelectedDestinations([]);
            setSearch('');
            loadAccounts();
        }
    }, [isOpen]);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const metadata = await s3Service.getAccountMetadata();
            setAccounts(metadata);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleDestination = (account: S3AccountMetadata) => {
        if (account.accessMode === 'read-only') return;
        const exists = selectedDestinations.find(d => d.accountId === account.id);
        if (exists) {
            setSelectedDestinations(selectedDestinations.filter(d => d.accountId !== account.id));
        } else {
            setSelectedDestinations([...selectedDestinations, {
                accountId: account.id,
                bucketName: account.bucketName,
                targetFolder: '',
            }]);
        }
    };

    const updateTargetFolder = (accountId: string, folder: string) => {
        setSelectedDestinations(selectedDestinations.map(d =>
            d.accountId === accountId ? { ...d, targetFolder: folder } : d
        ));
    };

    const handleProceed = () => {
        if (selectedDestinations.length === 0) return;
        setStep('confirm');
    };

    const handleStart = () => {
        const jobs: TransferJob[] = [];
        selectedDestinations.forEach(dest => {
            const destAccount = accounts.find(a => a.id === dest.accountId)!;
            selectedObjects.forEach(obj => {
                const destKey = dest.targetFolder
                    ? (dest.targetFolder.endsWith('/') ? dest.targetFolder : dest.targetFolder + '/') + obj.name
                    : obj.name;

                jobs.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type,
                    sourceAccount,
                    sourceBucket,
                    sourceKey: obj.key,
                    destAccount,
                    destBucket: dest.bucketName,
                    destKey: obj.isFolder ? destKey + '/' : destKey,
                    fileName: obj.name,
                    isFolder: obj.isFolder,
                    status: 'pending',
                    progress: 0,
                    bytesTransferred: 0,
                    totalBytes: obj.size,
                    speed: 0,
                });
            });
        });

        onStartTransfer(jobs);
        onClose();
    };

    if (!isOpen) return null;

    const filteredAccounts = accounts.filter(a =>
        !(a.id === sourceAccount.id && a.bucketName === sourceBucket) && // Filter out source connection + bucket combination
        (a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.bucketName.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {type === 'copy' ? 'Copy to Bucket' : 'Move to Bucket'}
                        </h2>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {selectedObjects.length} item{selectedObjects.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-tertiary)]">
                        <X size={20} />
                    </button>
                </div>

                {step === 'select' ? (
                    <>
                        {/* Search */}
                        <div className="px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                <input
                                    type="text"
                                    placeholder="Search buckets or connections..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Account List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                                    <Loader2 className="animate-spin mb-3" size={32} />
                                    <p className="text-sm font-medium">Loading buckets...</p>
                                </div>
                            ) : filteredAccounts.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-sm text-[var(--text-tertiary)] font-medium">No buckets found</p>
                                </div>
                            ) : (
                                filteredAccounts.map(account => {
                                    const isReadOnly = account.accessMode === 'read-only';
                                    const isSelected = selectedDestinations.some(d => d.accountId === account.id);
                                    const config = selectedDestinations.find(d => d.accountId === account.id);

                                    return (
                                        <div
                                            key={account.id}
                                            className={`rounded-xl border transition-all overflow-hidden ${isSelected
                                                ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-md'
                                                : isReadOnly
                                                    ? 'border-[var(--border-primary)] bg-[var(--bg-secondary)] opacity-60 grayscale-[0.5]'
                                                    : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]'
                                                }`}
                                        >
                                            <button
                                                onClick={() => toggleDestination(account)}
                                                disabled={isReadOnly}
                                                className={`w-full flex items-center gap-4 p-4 text-left ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)]'
                                                    }`}>
                                                    <Database size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{account.name}</h3>
                                                        {isReadOnly && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold uppercase tracking-tight">Read-Only</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--text-tertiary)] truncate">{account.bucketName}</p>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)] text-white scale-110' : 'border-[var(--border-secondary)]'
                                                        }`}>
                                                        {isSelected && <CheckCircle2 size={16} strokeWidth={3} />}
                                                    </div>
                                                )}
                                                {isReadOnly && (
                                                    <div className="text-[var(--text-tertiary)]">
                                                        <AlertTriangle size={18} />
                                                    </div>
                                                )}
                                            </button>

                                            {isSelected && (
                                                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex items-center gap-2 mt-2 bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-primary)] shadow-inner">
                                                        <Folder size={14} className="text-[var(--text-tertiary)]" />
                                                        <input
                                                            type="text"
                                                            placeholder="Destination path (optional)"
                                                            value={config?.targetFolder || ''}
                                                            onChange={(e) => updateTargetFolder(account.id, e.target.value)}
                                                            className="flex-1 bg-transparent border-none text-xs focus:ring-0 p-0 font-medium placeholder:text-[var(--text-tertiary)]/50"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-[var(--text-tertiary)] mt-1 ml-1 italic">
                                                        Leave empty to copy/move to the bucket root.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                                {selectedDestinations.length} destination{selectedDestinations.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={selectedDestinations.length === 0}
                                    onClick={handleProceed}
                                    className="px-6 py-2.5 text-sm font-bold text-white bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:grayscale rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    Continue <ChevronRight size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-8 flex flex-col items-center text-center">
                            {type === 'move' ? (
                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 animate-bounce-subtle">
                                    <AlertTriangle size={32} />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-[var(--accent-blue)]/10 rounded-full flex items-center justify-center text-[var(--accent-blue)] mb-6 animate-pulse">
                                    <CheckCircle2 size={32} />
                                </div>
                            )}

                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                Confirm {type === 'move' ? 'Move' : 'Copy'}
                            </h2>

                            <p className="text-[var(--text-secondary)] max-w-md text-sm leading-relaxed mb-6">
                                {type === 'move' ? (
                                    <>
                                        You are about to <span className="text-red-500 font-bold underline underline-offset-4">MOVE</span>
                                        <span className="font-bold"> {selectedObjects.length} item{selectedObjects.length !== 1 ? 's' : ''}</span>.
                                        They will be <span className="text-red-500 font-bold uppercase">deleted</span> from <span className="font-bold">{sourceBucket}</span> and transferred to:
                                    </>
                                ) : (
                                    <>
                                        You are about to copy <span className="font-bold">{selectedObjects.length} item{selectedObjects.length !== 1 ? 's' : ''}</span> to:
                                    </>
                                )}
                            </p>

                            {/* Egress Warning */}
                            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-start gap-4 text-left animate-in slide-in-from-bottom-2">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-amber-700 mb-1">Egress Cost Warning</h4>
                                    <p className="text-[11px] text-amber-800/90 leading-relaxed font-medium">
                                        Transferring data between different providers or regions may incur <span className="font-bold text-amber-900 underline decoration-amber-500/30">egress fees</span> from your source provider.
                                        Please ensure you are aware of potential data transfer costs.
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-[var(--bg-secondary)] rounded-2xl p-4 mb-8 border border-[var(--border-primary)] shadow-inner max-h-48 overflow-y-auto">
                                <div className="space-y-3">
                                    {selectedDestinations.map(dest => (
                                        <div key={dest.accountId} className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] shadow-sm">
                                            <Database size={16} className="text-[var(--accent-blue)]" />
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{dest.bucketName}</p>
                                                {dest.targetFolder && (
                                                    <p className="text-[10px] text-[var(--text-tertiary)] font-medium truncate flex items-center gap-1">
                                                        <Folder size={10} /> {dest.targetFolder}
                                                    </p>
                                                )}
                                                {!dest.targetFolder && (
                                                    <p className="text-[10px] text-[var(--text-tertiary)] font-medium italic truncate flex items-center gap-1">
                                                        <Folder size={10} className="opacity-50" /> Root directory
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[10px] text-[var(--text-tertiary)] mb-6 text-center italic">
                                Tip: Items without a destination path will be placed in the bucket's root.
                            </p>

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setStep('select')}
                                    className="flex-1 py-3 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-2xl transition-colors border border-[var(--border-primary)]"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStart}
                                    className={`flex-1 py-3 text-sm font-bold text-white rounded-2xl transition-all shadow-lg active:scale-95 ${type === 'move' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] shadow-[var(--accent-blue)]/20'
                                        }`}
                                >
                                    Start {type === 'move' ? 'Move' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
