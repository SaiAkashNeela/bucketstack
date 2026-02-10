import React, { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Shield, Grid3x3, Database, Search, ArrowLeft, Check, Info } from 'lucide-react';
import { S3Account, S3ProviderType } from '../types';
import { invoke } from '@tauri-apps/api/core';

interface BucketInfo {
  name: string;
  accessLevel: 'read-only' | 'read-write';
  isSelected: boolean;
  alreadyAdded: boolean;
}

interface MultiBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBuckets: (accounts: Partial<S3Account>[]) => void;
  existingBuckets: string[];
}

export const MultiBucketModal: React.FC<MultiBucketModalProps> = ({
  isOpen,
  onClose,
  onAddBuckets,
  existingBuckets
}) => {
  const [step, setStep] = useState<'credentials' | 'buckets'>('credentials');
  const [provider, setProvider] = useState<S3ProviderType>('aws');
  const [region, setRegion] = useState('us-east-1');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://s3.us-east-1.amazonaws.com');
  const [showSecret, setShowSecret] = useState(false);

  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [addingBuckets, setAddingBuckets] = useState(false);

  // Common Styles from AccountModal
  const inputStyles = "w-full px-3 py-2 rounded-md border bg-[var(--input-bg)] border-[var(--input-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)] transition-all";

  const handleProviderChange = (newProvider: S3ProviderType) => {
    setProvider(newProvider);
    let defaultEndpoint = '';
    let defaultRegion = 'us-east-1';

    switch (newProvider) {
      case 'aws': defaultEndpoint = 'https://s3.us-east-1.amazonaws.com'; break;
      case 'cloudflare': defaultEndpoint = 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com'; defaultRegion = 'auto'; break;
      case 'wasabi': defaultEndpoint = 'https://s3.wasabisys.com'; break;
      case 'digitalocean': defaultEndpoint = 'https://nyc3.digitaloceanspaces.com'; defaultRegion = 'nyc3'; break;
      case 'minio': defaultEndpoint = 'http://localhost:9000'; defaultRegion = 'us-east-1'; break;
      case 'backblaze': defaultEndpoint = 'https://s3.us-west-000.backblazeb2.com'; defaultRegion = 'us-west-000'; break;
      case 'railway': defaultEndpoint = ''; defaultRegion = 'auto'; break;
    }

    setEndpoint(defaultEndpoint);
    setRegion(defaultRegion);
    setFetchError('');
  };

  const handleFetchBuckets = async () => {
    if (!accessKey || !secretKey) {
      setFetchError('Please enter access key and secret key');
      return;
    }

    if (provider !== 'aws' && !endpoint) {
      setFetchError('Please enter endpoint for non-AWS providers');
      return;
    }

    setFetchLoading(true);
    setFetchError('');

    try {
      // Call Rust backend to list buckets
      const bucketList: string[] = await invoke('list_buckets', {
        endpoint,
        region,
        accessKeyId: accessKey.trim(),
        secretAccessKey: secretKey.trim(),
      });

      const bucketInfos: BucketInfo[] = bucketList.map(name => ({
        name: name,
        accessLevel: 'read-write', // Default to read-write as list_buckets only returns names
        isSelected: false,
        alreadyAdded: existingBuckets.includes(name),
      }));

      setBuckets(bucketInfos);
      setStep('buckets');
    } catch (error: any) {
      setFetchError(error.message || 'Failed to fetch buckets. Check your credentials and endpoint.');
    } finally {
      setFetchLoading(false);
    }
  };

  const toggleBucketSelection = (bucketName: string) => {
    setBuckets(buckets.map(b =>
      b.name === bucketName && !b.alreadyAdded
        ? { ...b, isSelected: !b.isSelected }
        : b
    ));
  };

  const toggleAll = () => {
    const selectable = buckets.filter(b => !b.alreadyAdded);
    const allSelected = selectable.every(b => b.isSelected);
    setBuckets(buckets.map(b =>
      b.alreadyAdded ? b : { ...b, isSelected: !allSelected }
    ));
  };

  const handleAddBuckets = async () => {
    const selectedBuckets = buckets.filter(b => b.isSelected);
    if (selectedBuckets.length === 0) {
      setFetchError('Please select at least one bucket');
      return;
    }

    setAddingBuckets(true);

    try {
      const accounts: Partial<S3Account>[] = selectedBuckets.map(b => ({
        name: b.name,
        provider,
        endpoint: provider === 'aws' ? '' : endpoint, // API handles AWS endpoints automatically if empty? Or we should pass generic
        // Actually, let's pass the endpoint we used to discover them, unless it was generic AWS
        // The App.tsx logic handles re-deriving endpoints usually.
        // Let's stick to existing logic:
        // "endpoint: provider === 'aws' ? '' : endpoint" logic from previous version seems to rely on App.tsx or service to default AWS.
        // But in this file we set a default AWS endpoint. Let's pass it if it's not the generic one, or just empty for AWS to be safe.
        // Reverting to previous logic for safety:
        region,
        bucketName: b.name,
        accessMode: b.accessLevel,
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      }));

      onAddBuckets(accounts);
      handleReset();
      onClose();
    } catch (error: any) {
      setFetchError('Failed to add buckets');
    } finally {
      setAddingBuckets(false);
    }
  };

  const handleReset = () => {
    setStep('credentials');
    setProvider('aws');
    setRegion('us-east-1');
    setAccessKey('');
    setSecretKey('');
    setEndpoint('https://s3.us-east-1.amazonaws.com');
    setBuckets([]);
    setFetchError('');
    setFilterQuery('');
  };

  const filteredBuckets = buckets.filter(b =>
    (b.name || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
      <div className="bg-[var(--bg-primary)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[var(--border-primary)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Grid3x3 className="text-[var(--accent-blue)]" size={20} />
            {step === 'credentials' ? 'Discover Buckets' : 'Select Buckets'}
          </h2>
          <button onClick={() => { handleReset(); onClose(); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors focus-ring rounded p-1">
            <X size={20} />
          </button>
        </div>

        {step === 'credentials' && (
          <div className="p-5 space-y-4 overflow-y-auto">
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
                    onClick={() => handleProviderChange(p as S3ProviderType)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] font-medium transition-all focus-ring gap-1.5 ${provider === p
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
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={inputStyles}
                  placeholder="e.g. us-east-1"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Endpoint</label>
                <div className="relative">
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className={`${inputStyles} font-mono`}
                    placeholder="https://..."
                  />
                  {endpoint?.startsWith('http://') && (
                    <AlertCircle size={12} className="absolute right-2 top-2.5 text-[var(--text-warning-body)]" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Access Key</label>
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  className={`${inputStyles} font-mono`}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className={`${inputStyles} font-mono pr-8`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-0.5 rounded transition-colors"
                  >
                    {showSecret ? <Info size={14} /> : <Database size={14} />}
                    {/* Using generic icons for show/hide if Eye/EyeOff not imported, but let's stick to text or standard icons */}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {fetchError && (
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-200/50 flex items-start gap-2">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{fetchError}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleFetchBuckets}
                disabled={fetchLoading || !accessKey || !secretKey}
                className="px-5 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] rounded-md shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {fetchLoading && <Loader2 size={16} className="animate-spin" />}
                {fetchLoading ? 'Discovering...' : 'Discover Buckets'}
              </button>
            </div>
          </div>
        )}

        {step === 'buckets' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-subtle)] flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Filter buckets..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-secondary)] bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                />
              </div>
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Select All
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredBuckets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-tertiary)]">
                  <Database size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No buckets found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredBuckets.map(bucket => (
                    <div
                      key={bucket.name}
                      onClick={() => !bucket.alreadyAdded && toggleBucketSelection(bucket.name)}
                      className={`
                        group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                        ${bucket.alreadyAdded
                          ? 'bg-[var(--bg-subtle)] border-transparent opacity-60 cursor-not-allowed'
                          : bucket.isSelected
                            ? 'bg-[var(--bg-selected)] border-[var(--border-selected)] shadow-sm'
                            : 'bg-[var(--bg-primary)] border-[var(--border-secondary)] hover:border-[var(--accent-blue)] hover:shadow-sm'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center transition-colors
                        ${bucket.isSelected
                          ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)]'
                          : 'bg-[var(--bg-primary)] border-[var(--border-secondary)] group-hover:border-[var(--accent-blue)]'
                        }
                      `}>
                        {bucket.isSelected && <Check size={12} className="text-[var(--text-on-accent)]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${bucket.isSelected ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'}`}>
                            {bucket.name}
                          </span>
                          {bucket.alreadyAdded && (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">Added</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Shield size={10} className={bucket.accessLevel === 'read-only' ? 'text-[var(--text-warning-body)]' : 'text-[var(--text-success)]'} />
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {bucket.accessLevel === 'read-only' ? 'Read-only Access' : 'Read & Write Access'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex justify-between items-center">
              <button
                onClick={() => setStep('credentials')}
                className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Back
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {buckets.filter(b => b.isSelected).length} selected
                </span>
                <button
                  onClick={handleAddBuckets}
                  disabled={addingBuckets || buckets.filter(b => b.isSelected).length === 0}
                  className="px-5 py-2 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] rounded-md shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {addingBuckets && <Loader2 size={16} className="animate-spin" />}
                  {addingBuckets ? 'Adding...' : 'Add Selected'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
