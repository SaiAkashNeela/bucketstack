import React, { useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Clock, BarChart3, Plus, Upload, Download, FolderPlus, Trash2, Copy, Move, RotateCcw, Link, Archive, Repeat, Edit2, FilePlus, FileText, CheckCircle2, AlertCircle, Play, Pause, Folder, Database, Search, Filter, X, ChevronRight, HardDrive, Percent, Calendar } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DemoViewProps {
  activeAccount: { id: string; name: string; bucketName: string };
  onNavigateBack: () => void;
}

export const DemoSyncManager: React.FC<DemoViewProps> = ({ activeAccount, onNavigateBack }) => {
  const demoJobs = [
    { id: '1', name: 'Documents Backup', direction: 'up', status: 'idle', lastRun: Date.now() - 3600000, localPath: '/Users/demo/Documents', remotePath: 'documents/', intervalSeconds: 86400 },
    { id: '2', name: 'Media Sync', direction: 'down', status: 'running', lastRun: Date.now() - 1800000, localPath: '/Users/demo/Media', remotePath: 'media/', intervalSeconds: 0 },
  ];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatInterval = (seconds: number) => {
    if (seconds === 0) return 'Manual';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="p-2 bg-[var(--accent-blue-subtle)] rounded-lg">
            <RefreshCw className="w-5 h-5 text-[var(--accent-blue)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Folder Sync</h2>
            <p className="text-xs text-[var(--text-tertiary)]">Mirror your local folders with remote buckets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-blue-hover)] transition-all shadow-lg shadow-blue-500/10">
            <Plus size={16} />
            <span>New Sync Job</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {demoJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="p-6 bg-[var(--bg-tertiary)] rounded-full border-2 border-[var(--border-primary)] border-dashed">
              <RefreshCw className="w-12 h-12 text-[var(--text-tertiary)] opacity-20" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">No Sync Jobs</h3>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Create a sync job to keep your local folders and bucket in sync.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {demoJobs.map(job => (
              <div
                key={job.id}
                className="group relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden hover:border-[var(--accent-blue)] transition-all shadow-sm hover:shadow-md"
              >
                <div className="p-5 flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${job.status === 'running' ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>
                    <Folder size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{job.name}</h3>
                      {job.status === 'running' && (
                        <div className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full flex items-center gap-1">
                          <RefreshCw size={10} className="animate-spin" />
                          Running
                        </div>
                      )}
                      {job.status === 'idle' && (
                        <div className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-full">
                          Idle
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-20">Direction:</span>
                        <span className="font-medium">{job.direction === 'up' ? 'Local → Bucket' : 'Bucket → Local'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-20">Local:</span>
                        <span className="font-mono text-xs truncate">{job.localPath}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-20">Remote:</span>
                        <span className="font-mono text-xs truncate">{job.remotePath}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-20">Interval:</span>
                        <span className="font-medium">{formatInterval(job.intervalSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-20">Last Run:</span>
                        <span className="text-xs">{formatDate(job.lastRun)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {job.status === 'running' ? (
                      <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
                        <Pause size={16} className="text-[var(--text-secondary)]" />
                      </button>
                    ) : (
                      <button className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg">
                        <Play size={16} className="text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DemoActivityLog: React.FC<DemoViewProps> = ({ activeAccount, onNavigateBack }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const demoEntries = [
    { id: '1', action: 'upload', object_key: 'documents/report.pdf', timestamp: Date.now() - 3600000, status: 'success', size: 2048576, details: 'Standard upload' },
    { id: '2', action: 'download', object_key: 'images/logo.png', timestamp: Date.now() - 7200000, status: 'success', size: 524288, details: 'Accessed via console' },
    { id: '3', action: 'delete', object_key: 'old-file.txt', timestamp: Date.now() - 10800000, status: 'success', details: 'Manual deletion' },
    { id: '4', action: 'create_folder', object_key: 'new-folder/', timestamp: Date.now() - 14400000, status: 'success', details: 'New directory' },
    { id: '5', action: 'rename', object_key: 'renamed-file.txt', timestamp: Date.now() - 18000000, status: 'success', details: 'Renamed from "file.txt"' },
    { id: '6', action: 'upload', object_key: 'backups/db-dump.sql', timestamp: Date.now() - 25000000, status: 'success', size: 157286400, details: 'Multipart upload' },
    { id: '7', action: 'copy', object_key: 'project/assets.zip', timestamp: Date.now() - 36000000, status: 'success', size: 45000000, details: 'Copied from bucket-A' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload size={14} className="text-blue-500" />;
      case 'download': return <Download size={14} className="text-green-500" />;
      case 'delete': return <Trash2 size={14} className="text-red-500" />;
      case 'create_folder': return <FolderPlus size={14} className="text-yellow-500" />;
      case 'rename': return <Edit2 size={14} className="text-purple-500" />;
      case 'copy': return <Copy size={14} className="text-indigo-500" />;
      default: return <FileText size={14} className="text-[var(--text-tertiary)]" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateBack}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Activity Log</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Track operations and access history</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-all">
              <Download size={14} />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-all">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-6 pb-4 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-blue)] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by object name, action, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent-blue)] rounded-xl text-sm outline-none transition-all placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <div className="h-6 w-px bg-[var(--border-primary)]" />
          <div className="flex gap-2">
            {['Action Type', 'Status', 'Date'].map(filter => (
              <button key={filter} className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors">
                {filter}
                <ChevronRight size={12} className="rotate-90 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-[var(--bg-secondary)]/30">
        <div className="min-w-[800px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--bg-secondary)] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-32">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider w-48">Time</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {demoEntries.map(entry => (
                <tr key={entry.id} className="group hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <span className="text-xs font-medium text-[var(--text-secondary)] capitalize">{entry.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">{formatTimestamp(entry.timestamp)}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center">
                        {getActionIcon(entry.action)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-[var(--text-primary)] font-medium">{entry.object_key.split('/').pop()}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                          <span>{entry.action.replace('_', ' ')}</span>
                          {entry.object_key.includes('/') && (
                            <>
                              <span>•</span>
                              <span>{entry.object_key.split('/')[0]}/</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs text-[var(--text-secondary)]">{entry.details}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <span className="text-xs text-[var(--text-secondary)] font-mono">{formatSize(entry.size)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const DemoStorageAnalytics: React.FC<DemoViewProps> = ({ activeAccount, onNavigateBack }) => {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  const stats = [
    { label: 'Total Storage', value: '45.2 GB', subtext: '1,234 Objects', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Object Count', value: '1,234', subtext: '+124 this month', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Bandwidth', value: '1.2 GB', subtext: 'Last 30 days', icon: RefreshCw, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Est. Cost', value: '$0.45', subtext: 'This month', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const fileTypeData = [
    { name: 'Images', value: 234 },
    { name: 'Documents', value: 156 },
    { name: 'Videos', value: 45 },
    { name: 'Archives', value: 12 },
    { name: 'Code', value: 89 },
  ];

  const storageClassData = [
    { name: 'Standard', value: 80 },
    { name: 'Infrequent', value: 15 },
    { name: 'Glacier', value: 5 },
  ];

  const largestFiles = [
    { name: 'database_backup_2024.sql', path: 'backups/', size: 2147483648, type: 'Database', date: '2 days ago' },
    { name: 'project_assets_v2.zip', path: 'assets/', size: 1073741824, type: 'Archive', date: '1 week ago' },
    { name: 'promo_video_4k.mp4', path: 'marketing/', size: 524288000, type: 'Video', date: '3 days ago' },
    { name: 'dataset_training_v1.csv', path: 'ml-data/', size: 262144000, type: 'CSV', date: '5 hours ago' },
    { name: 'high_res_photos.tar.gz', path: 'photos/', size: 104857600, type: 'Archive', date: '1 month ago' },
  ];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateBack}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2 bg-[var(--accent-blue-subtle)] rounded-lg">
              <BarChart3 className="w-5 h-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Storage Analytics</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">{activeAccount.bucketName}</span>
                <span className="text-[var(--text-tertiary)] opacity-30">•</span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">Updated just now</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-quaternary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium transition-all">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                  <stat.icon size={64} className={stat.color} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">{stat.label}</span>
                  <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                    <stat.icon size={18} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{stat.value}</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1 font-medium">{stat.subtext}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Distribution */}
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <Folder size={18} className="text-[var(--accent-blue)]" />
                File Type Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fileTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {fileTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', borderRadius: '12px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Storage Classes */}
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <HardDrive size={18} className="text-purple-500" />
                Storage Class Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storageClassData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.5 }}
                      contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)', borderRadius: '12px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {storageClassData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Largest Files Table */}
          <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={18} className="text-orange-500" />
                Largest Files
              </h3>
              <button className="text-xs font-medium text-[var(--accent-blue)] hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-tertiary)]/30">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Last Modified</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)]">
                  {largestFiles.map((file, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{file.name}</span>
                          <span className="text-xs text-[var(--text-tertiary)] font-mono">{file.path}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[10px] font-bold text-[var(--text-secondary)] border border-[var(--border-primary)] uppercase">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-[var(--text-secondary)]">{file.date}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-sm font-mono text-[var(--text-primary)]">{formatSize(file.size)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
