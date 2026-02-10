import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ArrowLeft, RefreshCw, AlertCircle, HardDrive, FileText, Database, Clock, ChevronRight } from 'lucide-react';
import { S3Account, BucketAnalytics, S3Object } from '../types';
import { s3Service } from '../services/s3Service';

interface StorageAnalyticsProps {
    activeAccount: S3Account | null;
    onNavigateBack: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b', '#ef4444'];

export const StorageAnalytics: React.FC<StorageAnalyticsProps> = ({ activeAccount, onNavigateBack }) => {
    const [analytics, setAnalytics] = useState<BucketAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const loadAnalytics = async () => {
        if (!activeAccount || !activeAccount.bucketName) return;

        setIsLoading(true);
        setError(null);
        setScanProgress(0);

        try {
            const data = await s3Service.scanBucket(activeAccount, activeAccount.bucketName, (scanned) => {
                setScanProgress(scanned);
            });
            setAnalytics(data);
        } catch (err: any) {
            console.error('Failed to load analytics:', err);
            setError(err.message || 'Failed to scan bucket. Please check your permissions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [activeAccount]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (!activeAccount) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p>No active account selected</p>
                <button onClick={onNavigateBack} className="mt-4 text-[var(--accent-blue)] hover:underline flex items-center gap-1">
                    <ArrowLeft size={16} /> Back to Explorer
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-6 bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateBack}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-[var(--text-primary)]">Storage Analytics</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--text-tertiary)]">{activeAccount.bucketName}</p>
                            {analytics && (
                                <>
                                    <span className="text-[var(--text-tertiary)] opacity-30">•</span>
                                    <p className="text-[10px] text-[var(--text-tertiary)] font-medium">
                                        Last Updated: {new Date(analytics.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadAnalytics}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-all ${isLoading ? 'opacity-50' : ''}`}
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 border-4 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin"></div>
                        <div className="text-center">
                            <p className="text-[var(--text-secondary)] font-medium">Scanning Objects...</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">{scanProgress.toLocaleString()} objects found</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-center max-w-md mx-auto">
                        <div className="p-4 bg-red-500/10 rounded-full text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <p className="text-[var(--text-primary)] font-bold">Analysis Failed</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{error}</p>
                        </div>
                        <button onClick={loadAnalytics} className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg font-medium">
                            Try Again
                        </button>
                    </div>
                ) : analytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
                        {/* Stats Summary Card */}
                        <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-primary)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Total Size</span>
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <Database size={18} />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">{formatSize(analytics.totalSize)}</div>
                            <div className="text-xs text-[var(--text-tertiary)] mt-2">Distributed across {analytics.totalObjects.toLocaleString()} objects</div>
                        </div>

                        {/* Summary: Top Categories */}
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* File Type Distribution */}
                            <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-primary)] flex flex-col">
                                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">File Distribution</span>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.fileTypeDistribution}
                                                dataKey="count"
                                                nameKey="type"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={5}
                                            >
                                                {analytics.fileTypeDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '12px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                    {analytics.fileTypeDistribution.slice(0, 4).map((item, i) => (
                                        <div key={item.type} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <span className="text-[10px] text-[var(--text-secondary)] capitalize">{item.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Storage Class Distribution */}
                            <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-primary)] flex flex-col">
                                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Storage Classes</span>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.storageClassDistribution} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="storageClass" type="category" width={80} style={{ fontSize: '10px' }} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px' }}
                                                formatter={(value: any) => [value, 'Count']}
                                            />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                {analytics.storageClassDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Age Distribution */}
                            <div className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-primary)] flex flex-col">
                                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Object Age</span>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.ageDistribution}
                                                dataKey="size"
                                                nameKey="ageRange"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={60}
                                                labelLine={false}
                                            >
                                                {analytics.ageDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px' }}
                                                formatter={(value: any) => [formatSize(value), 'Size']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-[10px] text-[var(--text-tertiary)] text-center mt-2">Distribution by Size</div>
                            </div>
                        </div>

                        {/* Largest Files Table */}
                        <div className="lg:col-span-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] overflow-hidden">
                            <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                                <h3 className="font-bold text-[var(--text-primary)]">Largest Files</h3>
                                <div className="p-1 px-2 bg-[var(--bg-tertiary)] rounded text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Top 20</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--bg-tertiary)]/50 text-[var(--text-tertiary)] text-xs uppercase">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">File Name</th>
                                            <th className="px-6 py-3 font-semibold">Path</th>
                                            <th className="px-6 py-3 font-semibold">Format</th>
                                            <th className="px-6 py-3 font-semibold">Size</th>
                                            <th className="px-6 py-3 font-semibold">Last Modified</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-primary)]">
                                        {analytics.largestFiles.map((file, idx) => (
                                            <tr key={file.key} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <FileText size={16} className="text-[var(--text-tertiary)]" />
                                                        <span className="font-medium text-[var(--text-primary)]">{file.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-[var(--text-tertiary)] text-xs truncate max-w-xs">{file.key}</td>
                                                <td className="px-6 py-3">
                                                    <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px] uppercase font-bold text-[var(--text-secondary)]">
                                                        {file.name.split('.').pop() || 'File'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-[var(--text-primary)] font-semibold">{formatSize(file.size)}</td>
                                                <td className="px-6 py-3 text-[var(--text-tertiary)] whitespace-nowrap">
                                                    {new Date(file.lastModified).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                        <HardDrive size={64} className="opacity-10" />
                        <p className="text-[var(--text-tertiary)]">Start analysis to view bucket insights</p>
                        <button onClick={loadAnalytics} className="px-6 py-2 bg-[var(--accent-blue)] text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                            Run Full Scan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
