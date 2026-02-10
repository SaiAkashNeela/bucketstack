import React, { useState, useEffect } from 'react';
import { X, Check, Globe, Server, Cloud, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2, Database, Box, Trash2, Info, History } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { S3Account, S3ProviderType } from '../types';
import { s3Service } from '../services/s3Service';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: S3Account) => void;
  initialData?: S3Account;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<Partial<S3Account>>(initialData || {
    name: '',
    provider: 'custom',
    endpoint: '',
    region: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: ''
  });

  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error' | 'warning'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [accessMode, setAccessMode] = useState<'read-only' | 'read-write' | null>(initialData?.accessMode || null);
  const [enableTrash, setEnableTrash] = useState(initialData?.enableTrash ?? false);
  const [enableActivityLog, setEnableActivityLog] = useState(initialData?.enableActivityLog ?? false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          endpoint: (initialData.provider === 'aws' && !initialData.endpoint)
            ? 'https://s3.amazonaws.com'
            : initialData.endpoint
        });
      } else {
        setFormData({
          name: '',
          provider: 'custom',
          endpoint: '',
          region: 'us-east-1',
          accessKeyId: '',
          secretAccessKey: '',
          bucketName: ''
        });
      }
      setTestStatus('idle');
      setErrorMessage('');
      setStatusMessage('');
      setAccessMode(initialData?.accessMode || null);
      setEnableTrash(initialData?.enableTrash ?? false);
      setEnableActivityLog(initialData?.enableActivityLog ?? false);
    }
  }, [isOpen, initialData]);

  // Feature: Auto-fill AWS Endpoint with Bucket
  // Updates endpoint to match virtual-hosted style (https://bucket.s3.region.amazonaws.com)
  useEffect(() => {
    if (formData.provider === 'aws') {
      const region = formData.region || 'us-east-1';
      const bucket = formData.bucketName?.trim();
      const current = formData.endpoint || '';

      // Create new endpoint
      let newEndpoint = `https://s3.${region}.amazonaws.com`;
      if (bucket) {
        newEndpoint = `https://${bucket}.s3.${region}.amazonaws.com`;
      }

      // Update if current matches standard AWS pattern or is empty/default
      if (!current || current.includes('amazonaws.com')) {
        // Avoid infinite loops if value is same
        if (current !== newEndpoint) {
          setFormData(prev => ({ ...prev, endpoint: newEndpoint }));
        }
      }
    }
  }, [formData.bucketName, formData.region, formData.provider]);

  // Auto-fill Endpoint for AWS
  useEffect(() => {
    if (formData.provider === 'aws' && formData.region) {
      const newEndpoint = `https://s3.${formData.region}.amazonaws.com`;
      setFormData(prev => ({ ...prev, endpoint: newEndpoint }));
    }
  }, [formData.provider, formData.region]);

  if (!isOpen) return null;

  const handleProviderChange = (provider: S3ProviderType) => {
    let defaultEndpoint = '';
    let defaultRegion = 'us-east-1';

    switch (provider) {
      case 'aws': defaultEndpoint = 'https://s3.us-east-1.amazonaws.com'; break;
      case 'cloudflare': defaultEndpoint = 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com'; defaultRegion = 'auto'; break;
      case 'wasabi': defaultEndpoint = 'https://s3.wasabisys.com'; break;
      case 'digitalocean': defaultEndpoint = 'https://nyc3.digitaloceanspaces.com'; defaultRegion = 'nyc3'; break;
      case 'minio': defaultEndpoint = 'http://localhost:9000'; defaultRegion = 'us-east-1'; break;
      case 'backblaze': defaultEndpoint = 'https://s3.us-west-000.backblazeb2.com'; defaultRegion = 'us-west-000'; break;
      case 'railway': defaultEndpoint = ''; defaultRegion = 'auto'; break;
    }

    setFormData(prev => ({ ...prev, provider, endpoint: defaultEndpoint, region: defaultRegion }));
    setTestStatus('idle');
    setErrorMessage('');
  };

  const handleTestConnection = async () => {
    if (!formData.endpoint || !formData.accessKeyId || !formData.secretAccessKey || !formData.bucketName) {
      setTestStatus('error');
      setErrorMessage('Please fill in all fields including a bucket name to test.');
      return;
    }

    setTestStatus('testing');
    setErrorMessage('');
    setAccessMode(null);

    try {
      const result = await s3Service.testConnection(formData);
      setAccessMode(result.accessMode);
      setStatusMessage(result.message);

      if (result.accessMode === 'read-only') {
        setTestStatus('warning');
      } else {
        setTestStatus('success');
      }
    } catch (e: any) {
      setTestStatus('error');
      setErrorMessage(e.message || "Connection failed. Check credentials.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testStatus === 'testing') return;

    // If validation hasn't passed recently (success or warning), force a re-test
    if (testStatus !== 'success' && testStatus !== 'warning') {
      setTestStatus('testing');
      try {
        const result = await s3Service.testConnection(formData);
        setAccessMode(result.accessMode);
        // If strictly successful (Read-Write) OR Warning (Read-Only), we proceed to save

        onSave({
          id: initialData?.id || crypto.randomUUID(),
          name: formData.name!,
          provider: formData.provider as S3ProviderType,
          endpoint: formData.endpoint!,
          region: formData.region!,
          accessKeyId: formData.accessKeyId!,
          secretAccessKey: formData.secretAccessKey!,
          bucketName: formData.bucketName!,
          accessMode: result.accessMode,
          enableTrash,
          enableActivityLog
        });
      } catch (e: any) {
        setTestStatus('error');
        setErrorMessage(e.message || "Validation failed on save.");
      }
      return;
    }

    onSave({
      id: initialData?.id || crypto.randomUUID(),
      name: formData.name!,
      provider: formData.provider as S3ProviderType,
      endpoint: formData.endpoint!,
      region: formData.region!,
      accessKeyId: formData.accessKeyId!,
      secretAccessKey: formData.secretAccessKey!,
      bucketName: formData.bucketName!,
      accessMode: accessMode || 'read-only',
      enableTrash,
      enableActivityLog
    });
  };

  const inputStyles = "w-full px-3 py-2 rounded-md border bg-[var(--input-bg)] border-[var(--input-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)] transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[var(--border-primary)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="text-[var(--accent-blue)]" size={20} />
            {initialData ? 'Edit Connection' : 'Add Connection'}
          </h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus-ring rounded p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">

          {/* Provider Selection */}
          <div className="grid grid-cols-4 gap-2">
            {['aws', 'cloudflare', 'wasabi', 'digitalocean', 'minio', 'backblaze', 'railway', 'custom'].map((p) => {
              let label = p;
              let iconPath = '';
              let FallbackIcon = Database;

              switch (p) {
                case 'aws': label = 'AWS S3'; iconPath = '/icons/s3.svg'; break;
                case 'cloudflare': label = 'R2'; iconPath = '/icons/r2.svg'; break;
                case 'wasabi': label = 'Wasabi'; iconPath = '/icons/wasabi.jpg'; break;
                case 'digitalocean': label = 'Spaces'; iconPath = '/icons/spaces.svg'; break;
                case 'minio': label = 'MinIO'; iconPath = '/icons/minio.jpeg'; break;
                case 'backblaze': label = 'Backblaze B2'; iconPath = '/icons/backblaze-b2.png'; break;
                case 'railway': label = 'Railway'; iconPath = '/icons/railway.svg'; break;
                case 'custom': label = 'Custom'; FallbackIcon = Database; break;
              }

              const isCustom = p === 'custom';

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p as S3ProviderType)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] font-medium transition-all focus-ring gap-1.5 ${formData.provider === p
                    ? 'bg-[var(--bg-selected)] border-[var(--border-selected)] text-[var(--accent-blue)] shadow-sm'
                    : 'bg-[var(--bg-primary)] border-[var(--border-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                  {isCustom ? (
                    <FallbackIcon size={18} className="mb-0.5" />
                  ) : (
                    <div className="w-4 h-4 relative flex items-center justify-center">
                      <img
                        src={iconPath}
                        alt={label}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <Database className="hidden w-3.5 h-3.5 text-current absolute inset-0 m-auto" />
                    </div>
                  )}
                  <span className="capitalize truncate w-full">{label}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Name</label>
              <input
                type="text"
                required
                placeholder="My Project"
                className={inputStyles}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Region</label>
              <input
                type="text"
                required
                className={inputStyles}
                value={formData.region}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Bucket</label>
              <input
                type="text"
                required
                placeholder="my-bucket"
                className={inputStyles}
                value={formData.bucketName}
                onChange={e => setFormData({ ...formData, bucketName: e.target.value })}
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Endpoint</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  className={`${inputStyles} font-mono ${formData.endpoint?.startsWith('http://') ? 'border-[var(--border-warning)] bg-[var(--bg-warning-subtle)]' : ''}`}
                  value={formData.endpoint}
                  onChange={e => setFormData({ ...formData, endpoint: e.target.value })}
                />
                {formData.endpoint?.startsWith('http://') && (
                  <AlertCircle size={12} className="absolute right-2 top-2.5 text-[var(--text-warning-body)]" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-primary)]">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Access Key</label>
              <input
                type="text"
                required
                autoComplete="off"
                className={`${inputStyles} font-mono`}
                value={formData.accessKeyId}
                onChange={e => setFormData({ ...formData, accessKeyId: e.target.value })}
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Secret Key</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className={`${inputStyles} font-mono pr-8`}
                  value={formData.secretAccessKey}
                  onChange={e => setFormData({ ...formData, secretAccessKey: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-0.5 rounded transition-colors"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Trash Feature Toggle */}
          <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-primary)]">
            <div className="flex items-center h-5">
              <input
                id="enableTrash"
                type="checkbox"
                className="w-4 h-4 text-[var(--accent-blue)] border-[var(--border-secondary)] rounded focus:ring-[var(--accent-blue)] bg-[var(--input-bg)]"
                checked={enableTrash}
                onChange={(e) => setEnableTrash(e.target.checked)}
              />
            </div>
            <div className="flex-1 group">
              <label htmlFor="enableTrash" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                <Trash2 size={12} /> Enable Trash / Soft Delete <Info size={10} className="text-[var(--text-tertiary)] mt-0.5 group-hover:text-[var(--accent-blue)] transition-colors" />
              </label>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                Deleted files move to <code className="bg-[var(--bg-tertiary)] px-1 rounded">.trash/</code> instead of permanent deletion.
              </p>
              {enableTrash && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-1.5 rounded border border-[var(--border-secondary)] animate-in fade-in slide-in-from-top-1">
                  <Info size={12} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
                  <ul className="list-disc list-inside space-y-0.5 opacity-80">
                    <li>Move deleted files to .trash/</li>
                    <li>Auto-delete items in Trash after 30 days</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log Toggle */}
          <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-primary)]">
            <div className="flex items-center h-5">
              <input
                id="enableActivityLog"
                type="checkbox"
                className="w-4 h-4 text-[var(--accent-blue)] border-[var(--border-secondary)] rounded focus:ring-[var(--accent-blue)] bg-[var(--input-bg)]"
                checked={enableActivityLog}
                onChange={(e) => setEnableActivityLog(e.target.checked)}
              />
            </div>
            <div className="flex-1 group">
              <label htmlFor="enableActivityLog" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                <History size={12} /> Enable Activity Log <Info size={10} className="text-[var(--text-tertiary)] mt-0.5 group-hover:text-[var(--accent-blue)] transition-colors" />
              </label>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                Track all operations performed through BucketStack in a local SQLite database.
              </p>
              {enableActivityLog && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-1.5 rounded border border-[var(--border-secondary)] animate-in fade-in slide-in-from-top-1">
                  <Info size={12} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
                  <ul className="list-disc list-inside space-y-0.5 opacity-80">
                    <li>Logs uploads, deletes, renames, and all operations</li>
                    <li>Stored locally, never uploaded</li>
                    <li>Can be disabled anytime (preserves existing logs)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-[var(--bg-tertiary)] px-3 py-2.5 rounded-lg border border-[var(--border-primary)]">
            <Info size={14} className="text-[var(--accent-blue)] mt-0.5 shrink-0" />
            <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
              <strong>Write access</strong> is needed for you to perform operations in the bucket. If read-only is detected, you can only browse and view contents.
            </p>
          </div>

          {/* Test Connection Status */}
          <div className="min-h-[20px] flex items-center">
            {testStatus === 'testing' && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--accent-blue)] animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Verifying...
              </div>
            )}
            {testStatus === 'success' && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-success)] font-medium">
                <Check size={12} /> {statusMessage || 'Verified'}
              </div>
            )}
            {testStatus === 'warning' && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-warning-body)]">
                <AlertCircle size={12} /> Read-Only Access
              </div>
            )}
            {testStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-danger)]">
                <AlertCircle size={12} /> {errorMessage}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border-primary)]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-subtle)] rounded-md transition-colors flex items-center gap-2"
            >
              Test Connection
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testStatus === 'testing'}
                className="px-5 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] rounded-md shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Check size={16} /> Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};