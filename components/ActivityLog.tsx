import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search, X, Calendar, AlertCircle, CheckCircle, XCircle, FileText, Trash2, Upload, FolderPlus, Copy, Move, RotateCcw, Link, Archive, Repeat, Edit2, FilePlus, RefreshCw, Clock } from 'lucide-react';
import { S3Account, ActivityLogEntry, ActivityLogFilters } from '../types';
import { activityService } from '../services/activityService';

interface ActivityLogProps {
    activeAccount: S3Account | null;
    onNavigateBack: () => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activeAccount, onNavigateBack }) => {
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<ActivityLogFilters>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalEntries, setTotalEntries] = useState(0);
    const entriesPerPage = 100;

    // Load activity log
    const loadEntries = async () => {
        if (!activeAccount) return;

        setIsLoading(true);
        try {
            const filterParams: ActivityLogFilters = {
                connection_id: activeAccount.id,
                ...filters,
                search: searchQuery || undefined,
            };

            const result = await activityService.queryLog(
                filterParams,
                entriesPerPage,
                currentPage * entriesPerPage
            );

            setEntries(result);
            setTotalEntries(result.length);
        } catch (error) {
            console.error('Failed to load activity log:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEntries();
    }, [activeAccount, filters, searchQuery, currentPage]);

    // Export log
    const handleExport = async (format: 'csv' | 'json') => {
        if (!activeAccount) return;

        try {
            const filterParams: ActivityLogFilters = {
                connection_id: activeAccount.id,
                ...filters,
                search: searchQuery || undefined,
            };

            const data = await activityService.exportLog(format, filterParams);

            // Download file
            const blob = new Blob([data], {
                type: format === 'json' ? 'application/json' : 'text/csv'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-log-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export log:', error);
        }
    };

    // Get action icon
    const getActionIcon = (actionType: string) => {
        const iconClass = "text-[var(--text-tertiary)]";
        switch (actionType) {
            case 'upload': return <Upload size={14} className={iconClass} />;
            case 'download': return <Download size={14} className={iconClass} />;
            case 'create_file': return <FilePlus size={14} className={iconClass} />;
            case 'edit_file': return <Edit2 size={14} className={iconClass} />;
            case 'delete': return <Trash2 size={14} className={iconClass} />;
            case 'permanent_delete': return <Trash2 size={14} className="text-red-500" />;
            case 'empty_trash': return <Trash2 size={14} className="text-orange-500" />;
            case 'rename': return <FileText size={14} className={iconClass} />;
            case 'move': return <Move size={14} className={iconClass} />;
            case 'copy': return <Copy size={14} className={iconClass} />;
            case 'duplicate': return <Repeat size={14} className={iconClass} />;
            case 'restore': return <RotateCcw size={14} className={iconClass} />;
            case 'get_link': return <Link size={14} className={iconClass} />;
            case 'create_folder': return <FolderPlus size={14} className={iconClass} />;
            case 'compress': return <Archive size={14} className={iconClass} />;
            case 'sync': return <RefreshCw size={14} className={iconClass} />;
            case 'sync_mirror_enabled': return <RefreshCw size={14} className="text-red-500" />;
            case 'sync_mirror_disabled': return <RefreshCw size={14} className={iconClass} />;
            case 'sync_name_changed': return <Edit2 size={14} className="text-blue-500" />;
            case 'sync_interval_changed': return <Clock size={14} className="text-blue-500" />;
            case 'add_favorite': return <Upload size={14} className="text-yellow-500" />;
            case 'remove_favorite': return <FileText size={14} className="text-yellow-600" />;
            default: return <FileText size={14} className={iconClass} />;
        }
    };

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);

        // Always show full date/time format: 11th Oct 2025, 12:05 (24hr format)
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        // Add ordinal suffix (st, nd, rd, th)
        const ordinalSuffix = (n: number) => {
            const j = n % 10;
            const k = n % 100;
            if (j === 1 && k !== 11) return 'st';
            if (j === 2 && k !== 12) return 'nd';
            if (j === 3 && k !== 13) return 'rd';
            return 'th';
        };

        return `${day}${ordinalSuffix(day)} ${month} ${year}, ${hours}:${minutes}`;
    };

    // Format file size
    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    if (!activeAccount) {

        return (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
                <AlertCircle size={48} className="opacity-50" />
                <p className="ml-4">No account selected</p>
            </div>
        );
    }



    return (
        <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateBack}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Activity Log</h1>
                        <p className="text-xs text-[var(--text-secondary)]">{activeAccount.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showFilters
                            ? 'bg-[var(--accent-blue)] text-white'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-quaternary)]'
                            }`}
                    >
                        <Filter size={14} className="inline mr-1.5" />
                        Filters
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-quaternary)] transition-colors"
                    >
                        <Download size={14} className="inline mr-1.5" />
                        Export CSV
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-quaternary)] transition-colors"
                    >
                        <Download size={14} className="inline mr-1.5" />
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="mx-6 mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-700">
                    <p className="font-medium">Local Activity Log</p>
                    <p className="mt-0.5 opacity-80">
                        This log shows actions performed through BucketStack only.
                        Actions made in your storage provider or other tools are not tracked.
                    </p>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mx-6 mt-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Action Type
                            </label>
                            <select
                                value={filters.action_type || ''}
                                onChange={(e) => setFilters({ ...filters, action_type: e.target.value || undefined })}
                                className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-secondary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            >
                                <option value="">All Actions</option>
                                <option value="upload">Upload</option>
                                <option value="download">Download</option>
                                <option value="create_file">Create File</option>
                                <option value="edit_file">Edit File</option>
                                <option value="delete">Delete</option>
                                <option value="permanent_delete">Permanent Delete</option>
                                <option value="empty_trash">Empty Trash</option>
                                <option value="rename">Rename</option>
                                <option value="move">Move</option>
                                <option value="copy">Copy</option>
                                <option value="duplicate">Duplicate</option>
                                <option value="restore">Restore</option>
                                <option value="get_link">Get Link</option>
                                <option value="create_folder">Create Folder</option>
                                <option value="compress">Compress</option>
                                <option value="sync">Sync</option>
                                <option value="sync_mirror_enabled">Mirror Sync Enabled</option>
                                <option value="sync_mirror_disabled">Mirror Sync Disabled</option>
                                <option value="sync_name_changed">Sync Name Changed</option>
                                <option value="sync_interval_changed">Sync Interval Changed</option>
                                <option value="add_favorite">Add Favorite</option>
                                <option value="remove_favorite">Remove Favorite</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Status
                            </label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                                className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-secondary)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            >
                                <option value="">All Statuses</option>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                Bucket
                            </label>
                            <input
                                type="text"
                                value={filters.bucket || ''}
                                onChange={(e) => setFilters({ ...filters, bucket: e.target.value || undefined })}
                                placeholder="Filter by bucket..."
                                className="w-full px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-secondary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <button
                            onClick={() => {
                                setFilters({});
                                setSearchQuery('');
                            }}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="mx-6 mt-4">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by filename or path..."
                        className="w-full pl-10 pr-10 py-2 bg-[var(--input-bg)] border border-[var(--border-secondary)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Activity Table */}
            <div className="flex-1 overflow-auto mx-6 mt-4 mb-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)]">
                        <AlertCircle size={48} className="opacity-50 mb-3" />
                        <p>No activity entries found</p>
                        <p className="text-xs mt-1 opacity-70">Try adjusting your filters or perform some operations</p>
                    </div>
                ) : (
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Bucket</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Path</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Size</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]">
                                {entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                            {formatTimestamp(entry.timestamp)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(entry.action_type)}
                                                <span className="text-[var(--text-primary)] font-medium capitalize">
                                                    {entry.action_type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                                            {entry.bucket_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[var(--text-primary)] max-w-md truncate">
                                            {entry.object_path_after && entry.object_path_before !== entry.object_path_after ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[var(--text-tertiary)]">{entry.object_path_before}</span>
                                                    <span className="text-[var(--text-tertiary)]">→</span>
                                                    <span>{entry.object_path_after}</span>
                                                </div>
                                            ) : (
                                                entry.object_path_before || entry.object_path_after || '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                                            {formatSize(entry.file_size)}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {entry.status === 'success' ? (
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <CheckCircle size={14} />
                                                    <span className="font-medium">Success</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-600">
                                                    <XCircle size={14} />
                                                    <span className="font-medium">Failed</span>
                                                    {entry.error_message && (
                                                        <span className="text-xs text-[var(--text-tertiary)] ml-1 truncate max-w-xs" title={entry.error_message}>
                                                            ({entry.error_message})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalEntries > 0 && (
                <div className="px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between">
                    <div className="text-xs text-[var(--text-secondary)]">
                        Showing {currentPage * entriesPerPage + 1} - {Math.min((currentPage + 1) * entriesPerPage, totalEntries)} of {totalEntries} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-quaternary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={entries.length < entriesPerPage}
                            className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-quaternary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
