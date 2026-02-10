import React from 'react';
import { X, ArrowLeft, RefreshCw, Clock, BarChart3, Plus, Database, Grid3x3, Upload, Download, FolderPlus, Trash2, Copy, Move, RotateCcw, Link, Archive, Repeat, Edit2, FilePlus, FileText, CheckCircle2, AlertCircle, Play, Pause } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncManagerModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const demoJobs = [
    { id: '1', name: 'Documents Backup', direction: 'up', status: 'idle', lastRun: Date.now() - 3600000 },
    { id: '2', name: 'Media Sync', direction: 'down', status: 'running', lastRun: Date.now() - 1800000 },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Folder Sync</h1>
              <p className="text-xs text-[var(--text-tertiary)]">Automated folder synchronization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X size={20} className="text-[var(--text-tertiary)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-[var(--text-on-accent)] rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors">
              <Plus size={16} />
              <span>New Sync Job</span>
            </button>
          </div>
          <div className="space-y-3">
            {demoJobs.map(job => (
              <div key={job.id} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${job.status === 'running' ? 'bg-green-500/10' : 'bg-[var(--bg-tertiary)]'}`}>
                      {job.status === 'running' ? <RefreshCw size={16} className="text-green-500 animate-spin" /> : <RefreshCw size={16} className="text-[var(--text-tertiary)]" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{job.name}</h3>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {job.direction === 'up' ? 'Local → Bucket' : 'Bucket → Local'}
                      </p>
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
                <div className="text-xs text-[var(--text-tertiary)] mt-2">
                  Last run: {new Date(job.lastRun).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActivityLogModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const demoEntries = [
    { id: '1', action: 'upload', object_key: 'documents/report.pdf', timestamp: Date.now() - 3600000, status: 'success' },
    { id: '2', action: 'download', object_key: 'images/logo.png', timestamp: Date.now() - 7200000, status: 'success' },
    { id: '3', action: 'delete', object_key: 'old-file.txt', timestamp: Date.now() - 10800000, status: 'success' },
    { id: '4', action: 'create_folder', object_key: 'new-folder/', timestamp: Date.now() - 14400000, status: 'success' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload size={14} className="text-[var(--text-tertiary)]" />;
      case 'download': return <Download size={14} className="text-[var(--text-tertiary)]" />;
      case 'delete': return <Trash2 size={14} className="text-red-500" />;
      case 'create_folder': return <FolderPlus size={14} className="text-[var(--text-tertiary)]" />;
      default: return <FileText size={14} className="text-[var(--text-tertiary)]" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Activity Log</h1>
              <p className="text-xs text-[var(--text-tertiary)]">All operations tracked</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg">
              Export CSV
            </button>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--text-tertiary)]" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {demoEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg">
                <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{entry.action.replace('_', ' ')}</span>
                    <CheckCircle2 size={14} className="text-green-500" />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{entry.object_key}</p>
                </div>
                <div className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StorageAnalyticsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Storage Analytics</h1>
              <p className="text-xs text-[var(--text-tertiary)]">Bucket storage analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg flex items-center gap-2">
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--text-tertiary)]" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-xs text-[var(--text-tertiary)] mb-1">Total Objects</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">1,234</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-xs text-[var(--text-tertiary)] mb-1">Total Size</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">45.2 GB</div>
            </div>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
              <div className="text-xs text-[var(--text-tertiary)] mb-1">File Types</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">12</div>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">File Type Distribution</h3>
            <div className="space-y-2">
              {['Images', 'Documents', 'Videos', 'Archives', 'Code'].map((type, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-blue)]" style={{ width: `${20 + i * 15}%` }} />
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] w-12 text-right">{20 + i * 15}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NewConnectionModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Connection</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X size={20} className="text-[var(--text-tertiary)]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <button className="w-full p-6 rounded-lg border-2 border-[var(--border-primary)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-selected)] transition-all group">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] group-hover:bg-blue-500/10 transition-colors">
                <Database size={24} className="text-[var(--accent-blue)]" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                  Add Single Bucket
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Connect to a single S3 bucket with manual configuration
                </p>
              </div>
            </div>
          </button>
          <button className="w-full p-6 rounded-lg border-2 border-[var(--border-primary)] hover:border-green-500 hover:bg-green-50/30 transition-all group">
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

export const SettingsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <X size={20} className="text-[var(--text-tertiary)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Theme</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg">Light</button>
                <button className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg">Dark</button>
                <button className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg">System</button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">General</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm text-[var(--text-secondary)]">Enable trash system</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="text-sm text-[var(--text-secondary)]">Enable activity logging</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
