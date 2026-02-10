import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit2, Cloud, Server, Database, Box, Eye, Globe, MoreVertical, RefreshCw, History, Shield, CheckCircle2, Pin, BarChart3, Star, XCircle, Settings, Info } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { S3Account, FavouriteItem } from '../types';
import { AboutModal } from './AboutModal';

interface SidebarProps {
  accounts: S3Account[];
  activeAccount: S3Account | null;
  onSelectAccount: (account: S3Account) => void;
  onReloadPermissions?: (account: S3Account) => void;
  onAddAccount: () => void;
  onEditAccount?: (account: S3Account) => void;
  onRemoveAccount: (id: string) => void;
  onRemoveAllAccounts: () => void;
  deleteConfirm?: { accountId: string; accountName: string } | null;
  onDeleteConfirmChange?: (confirm: { accountId: string; accountName: string } | null) => void;
  onNavigate?: (path: string) => void;
  onShowSync?: () => void;
  onShowActivity?: () => void;
  onTransfer?: (objects: any[], type: 'copy' | 'move', destAccount: S3Account) => void;
  favourites?: FavouriteItem[];
  onSelectFavourite?: (fav: FavouriteItem) => void;
  onRemoveFavourite?: (id: string) => void;
  onShowAnalytics?: () => void;
  onShowTerms?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  onResetApplication?: () => void;
}

const AccountIcon: React.FC<{ account: S3Account, className?: string }> = ({ account, className }) => {
  let iconPath = '';
  switch (account.provider) {
    case 'aws': iconPath = '/icons/s3.svg'; break;
    case 'cloudflare': iconPath = '/icons/r2.svg'; break;
    case 'minio': iconPath = '/icons/minio.jpeg'; break;
    case 'wasabi': iconPath = '/icons/wasabi.jpg'; break;
    case 'digitalocean': iconPath = '/icons/spaces.svg'; break;
    // case 'railway': iconPath = '/icons/railway.svg'; break;
    case 'custom': return <Server className={className} />;
    default: return <Database className={className} />;
  }

  return (
    <img
      src={iconPath}
      alt={account.provider}
      className={`${className} object-contain rounded-sm`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  accounts,
  activeAccount,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onRemoveAccount,
  onRemoveAllAccounts,
  deleteConfirm,
  onDeleteConfirmChange,
  onNavigate,
  onShowSync,
  onShowActivity,
  onTransfer,
  favourites = [],
  onSelectFavourite,
  onRemoveFavourite,
  onShowAnalytics,
  onShowTerms,
  onReloadPermissions,
  onShowToast,
  onResetApplication,
}) => {
  const { theme } = useTheme();
  const [accountContextMenu, setAccountContextMenu] = useState<{ x: number, y: number, accountId: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);


  const handleAccountContext = (e: React.MouseEvent, accountId: string) => {
    e.preventDefault(); e.stopPropagation();

    // Improved positioning to stay within viewport
    const menuWidth = 192; // w-48
    const menuHeight = 200; // estimated
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    if (x < 0) x = 10;
    if (y < 0) y = 10;

    setAccountContextMenu({ x, y, accountId });
  };

  useEffect(() => {
    const close = () => {
      setAccountContextMenu(null);
      setSettingsOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className="w-64 flex flex-col border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-xl h-full z-20 select-none">
      <div className="h-10 w-full select-none app-drag-region flex items-center px-4">
        <div className="flex items-center gap-2">
          <img src="./logo.png" alt="BucketStack" className="w-5 h-5" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">BucketStack</span>
        </div>
      </div>

      {/* Permission Legend */}
      <div className="px-4 pb-3 mb-1 border-b border-[var(--border-primary)]/50">
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)] mb-1">
          <div className="flex items-center gap-1.5" title="Read-Only Access">
            <span className="flex items-center justify-center w-3 h-3 text-[8px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">R</span>
            <span>Read-only</span>
          </div>
          <div className="flex items-center gap-1.5" title="Read & Write Access">
            <span className="flex items-center justify-center w-3 h-3 text-[8px] font-bold rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-secondary)]">W</span>
            <span>Write Access</span>
          </div>
        </div>
        <div className="text-[9px] text-[var(--text-tertiary)] opacity-60 leading-tight">
          Right-click connection to reload permissions if access changes.
        </div>
      </div>

      {/* Connections List */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="px-2 mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Connections
          </label>
          <button
            onClick={onAddAccount}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)] rounded-lg p-1 transition-colors focus-ring flex items-center justify-center w-6 h-6 group"
            title="Add Connection"
          >
            <div className="relative flex items-center justify-center w-full h-full group-hover:scale-110 transition-transform">
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            </div>
          </button>
        </div>

        {accounts.length > 0 ? (
          <ul className="space-y-1">
            {accounts.map(acc => (
              <li key={acc.id} className="relative group list-none">
                <button
                  onClick={() => onSelectAccount(acc)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onReloadPermissions) {
                      // If we want the full menu:
                      handleAccountContext(e, acc.id);
                    }
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 transition-all relative focus-ring ${activeAccount?.id === acc.id
                    ? 'bg-[var(--accent-blue)] text-white shadow-md font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <div className={`shrink-0 flex items-center justify-center w-4 h-4 bg-white/10 rounded overflow-hidden relative`}>
                    <AccountIcon account={acc} className="w-full h-full" />
                    <Database className="hidden w-3 h-3 absolute inset-0 m-auto text-current pointer-events-none" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate font-medium text-xs">{acc.name}</div>
                      {acc.accessMode === 'read-write' && (
                        <div className="flex-shrink-0 text-[9px] font-bold px-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-secondary)]" title="Read & Write Access">W</div>
                      )}
                      {acc.accessMode === 'read-only' && (
                        <div className="flex-shrink-0 text-[9px] font-bold px-1.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20" title="Read-Only Access">R</div>
                      )}
                    </div>
                    <div className="text-[10px] opacity-70 truncate">{acc.bucketName}</div>
                  </div>
                  {/*
                  {acc.accessMode === 'read-only' && (
                    <div className="pl-2" title="Read-Only Access">
                      <Eye size={12} className={activeAccount?.id === acc.id ? "text-white/70" : "text-[var(--text-tertiary)]"} />
                    </div>
                  )}
                  */}
                </button>
                {/* Drop Zone Overlay */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none"
                  onDragOver={(e) => {
                    if (acc.accessMode === 'read-only') return;
                    e.preventDefault();
                    e.currentTarget.parentElement?.classList.add('scale-[1.02]', 'ring-2', 'ring-[var(--accent-blue)]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.parentElement?.classList.remove('scale-[1.02]', 'ring-2', 'ring-[var(--accent-blue)]');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.parentElement?.classList.remove('scale-[1.02]', 'ring-2', 'ring-[var(--accent-blue)]');

                    const data = e.dataTransfer.getData('application/x-bucketstack-items');
                    if (data && onTransfer) {
                      try {
                        const { items, sourceAccount, sourceBucket } = JSON.parse(data);
                        // Prevent dropping on the same bucket
                        if (acc.id === sourceAccount.id) return;

                        onTransfer(items, 'copy', acc);
                      } catch (err) {
                        console.error('Failed to parse dropped items:', err);
                      }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccountContext(e, acc.id);
                  }}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 ${activeAccount?.id === acc.id
                    ? 'text-white hover:bg-white/20'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] shadow-sm'
                    }`}
                >
                  <MoreVertical size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">No connections added</p>
          </div>
        )}
      </div>

      {activeAccount && activeAccount.bucketName && (
        <div className="px-3 pb-2 flex-shrink-0 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] pt-2">
          <div className="px-2 mb-1">
            <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Bucket Features
            </label>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate && onNavigate('')}
              className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Box size={14} className="text-[var(--icon-color)]" />
              <span>Root</span>
            </button>
            {activeAccount?.enableTrash && (
              <button
                onClick={() => onNavigate && onNavigate('.trash/')}
                className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Trash2 size={14} className="text-[var(--text-secondary)]" />
                <span>Trash</span>
              </button>
            )}
            <button
              onClick={() => onShowSync && onShowSync()}
              className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <RefreshCw size={14} className="text-[var(--text-secondary)]" />
              <span>Folder Sync</span>
            </button>
            {activeAccount?.enableActivityLog && (
              <button
                onClick={() => onShowActivity && onShowActivity()}
                className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <History size={14} className="text-[var(--text-secondary)]" />
                <span>Activity</span>
              </button>
            )}
            <button
              onClick={() => onShowAnalytics && onShowAnalytics()}
              className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors group"
            >
              <BarChart3 size={14} className="text-[var(--accent-blue)]" />
              <span className="flex-1">Storage Analytics</span>
              <div className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase">Insights</div>
            </button>
          </div>
        </div>
      )}

      {/* Favourites Section - Only show when account is active, has a bucket, and has pins */}
      {activeAccount && activeAccount.bucketName && favourites.filter(f => f.accountId === activeAccount.id).length > 0 && (
        <div className="px-3 pb-2 flex-shrink-0 animate-in slide-in-from-left-2 fade-in">
          <div className="px-2 mb-1">
            <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider flex items-center justify-between">
              Favourites
              <Star size={10} className="fill-[var(--text-tertiary)] text-[var(--text-tertiary)]" />
            </label>
          </div>
          <div className="space-y-0.5">
            {favourites
              .filter(f => f.accountId === activeAccount.id)
              .map(fav => (
                <div key={fav.id} className="group relative">
                  <button
                    onClick={() => onSelectFavourite && onSelectFavourite(fav)}
                    className="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all group/fav"
                    title={`${fav.bucket}/${fav.key}`}
                  >
                    <Star size={12} className="text-yellow-500/80 fill-yellow-500/20" />
                    <span className="truncate flex-1">{fav.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavourite && onRemoveFavourite(fav.id);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Favourite"
                  >
                    <XCircle size={10} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Settings Bar */}
      <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] mt-auto" ref={settingsRef}>
        <div className="flex items-center gap-2 relative">

          {/* Upwards Dropdown */}
          {settingsOpen && (
            <div
              className="absolute bottom-full left-0 w-full mb-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in z-50 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Appearance</div>
              <div className="px-2 pb-2">
                <ThemeToggle />
              </div>


              <div className="border-t border-[var(--border-primary)] my-1"></div>

              <div className="px-3 py-2 text-[10px] font-bold text-red-500/80 uppercase tracking-wider">Danger Zone</div>
              <div className="px-2 pb-1">
                <button
                  onClick={() => {
                    onResetApplication?.();
                    setSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors focus-ring"
                >
                  <Trash2 size={14} />
                  Reset BucketStack
                </button>
              </div>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(!settingsOpen);
            }}
            className={`flex-1 min-w-0 flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors border ${settingsOpen
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-secondary)]'
              : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Settings size={14} className="shrink-0" />
            <span className="truncate">Settings</span>
          </button>

          <button
            onClick={() => onShowTerms && onShowTerms()}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors border border-[var(--accent-blue)]/20"
            title="Terms & Safety"
          >
            <Shield size={14} />
          </button>

          <button
            onClick={() => setShowAbout(true)}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] bg-[var(--text-secondary)]/5 hover:bg-[var(--text-secondary)]/10 hover:text-[var(--text-primary)] transition-colors border border-[var(--text-secondary)]/10"
            title="About BucketStack"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} version="0.0.1" />

      {/* Account Context Menu */}
      {
        accountContextMenu && (
          <div
            className="fixed bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl rounded-xl py-2 z-50 w-48 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: accountContextMenu.y, left: accountContextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {onEditAccount && (
              <>
                <button
                  onClick={() => {
                    const account = accounts.find(a => a.id === accountContextMenu.accountId);
                    if (account && onReloadPermissions) {
                      onReloadPermissions(account);
                    }
                    setAccountContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                >
                  <RefreshCw size={14} /> Reload Permissions
                </button>
                <div className="border-t border-[var(--border-primary)] my-1" />
                <button
                  onClick={() => {
                    const account = accounts.find(a => a.id === accountContextMenu.accountId);
                    if (account) onEditAccount(account);
                    setAccountContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                >
                  <Edit2 size={14} /> Edit Connection
                </button>
                <div className="border-t border-[var(--border-primary)] my-1" />
              </>
            )}
            <button
              onClick={() => {
                const account = accounts.find(a => a.id === accountContextMenu.accountId);
                if (account && onDeleteConfirmChange) {
                  onDeleteConfirmChange({ accountId: account.id, accountName: account.name });
                }
                setAccountContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
            >
              <Trash2 size={14} /> Remove Connection
            </button>
          </div>
        )
      }

    </div >
  );
};