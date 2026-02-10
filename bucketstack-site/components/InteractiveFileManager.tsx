import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Search, Grid, List as ListIcon, MoreVertical, Download, Trash2, Edit2,
  FolderPlus, FilePlus, Copy, Scissors, Repeat, Folder, File, Share2,
  ChevronRight, ChevronLeft, LayoutGrid, LayoutList, Image as ImageIcon,
  SortAsc, SortDesc, Filter, RefreshCw, X, ArrowLeft, ArrowRight, Save,
  ExternalLink, Maximize2, Minimize2, Settings, Columns, Eye, Link,
  Clock, Hash, Calendar, Archive, RotateCcw, Box, Check, CheckCircle2, Zap,
  LayoutTemplate, GalleryThumbnails, Upload, ArrowUp, AlertCircle, Plus, ClipboardCopy, FileText,
  Star, StarOff, Pin, BarChart3, Database, Server, ArrowRight as ArrowRightIcon
} from 'lucide-react';
import { DemoSyncManager, DemoActivityLog, DemoStorageAnalytics } from './DemoViews';
import { SettingsModal } from './DemoModals';

// Demo data types matching real types
interface DemoObject {
  key: string;
  name: string;
  size: number;
  lastModified: number;
  type: string; // mime type or extension
  isFolder: boolean;
}

interface DemoAccount {
  id: string;
  name: string;
  provider: 'aws' | 'cloudflare' | 'minio' | 'wasabi' | 'digitalocean' | 'backblaze' | 'custom';
  bucketName: string;
  accessMode: 'read-write' | 'read-only';
  endpoint?: string;
  enableTrash?: boolean;
}



type ContextMenuType = 'item' | 'background' | 'account';

type ViewMode = 'list' | 'grid' | 'gallery' | 'columns';

// 5 Accounts from 5 different providers
const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: '1', name: 'AWS Production', provider: 'aws', bucketName: 'my-bucket', accessMode: 'read-write', endpoint: 's3.us-east-1.amazonaws.com', enableTrash: true },
  { id: '2', name: 'Cloudflare R2', provider: 'cloudflare', bucketName: 'cdn-assets', accessMode: 'read-write', endpoint: 'abc123.r2.cloudflarestorage.com', enableTrash: true },
  { id: '3', name: 'MinIO Local', provider: 'minio', bucketName: 'development', accessMode: 'read-only', endpoint: 'localhost:9000', enableTrash: false },
  { id: '4', name: 'Wasabi Storage', provider: 'wasabi', bucketName: 'backups', accessMode: 'read-write', endpoint: 's3.wasabisys.com', enableTrash: true },
  { id: '5', name: 'DigitalOcean Spaces', provider: 'digitalocean', bucketName: 'media-files', accessMode: 'read-write', endpoint: 'nyc3.digitaloceanspaces.com', enableTrash: true },
];

const generateDemoObjects = (): DemoObject[] => {
  const now = Date.now();
  const objects: DemoObject[] = [
    // Folders
    { key: 'documents/', name: 'documents', size: 0, lastModified: now - 86400000, type: 'folder', isFolder: true },
    { key: 'images/', name: 'images', size: 0, lastModified: now - 172800000, type: 'folder', isFolder: true },
    { key: 'videos/', name: 'videos', size: 0, lastModified: now - 259200000, type: 'folder', isFolder: true },
    { key: 'src/', name: 'src', size: 0, lastModified: now - 345600000, type: 'folder', isFolder: true },
    { key: 'assets/', name: 'assets', size: 0, lastModified: now - 100000, type: 'folder', isFolder: true },
    { key: 'logs/', name: 'logs', size: 0, lastModified: now - 50000, type: 'folder', isFolder: true },
    { key: 'backups/', name: 'backups', size: 0, lastModified: now - 600000, type: 'folder', isFolder: true },

    // Root Files
    { key: 'config.json', name: 'config.json', size: 1024, lastModified: now - 21600000, type: 'json', isFolder: false },
    { key: 'readme.md', name: 'readme.md', size: 2048, lastModified: now - 3600000, type: 'markdown', isFolder: false },
    { key: 'package.json', name: 'package.json', size: 856, lastModified: now - 40000, type: 'json', isFolder: false },
    { key: 'data.csv', name: 'data.csv', size: 4500, lastModified: now - 300000, type: 'csv', isFolder: false },
    { key: 'website_logo.png', name: 'website_logo.png', size: 524288, lastModified: now - 10800000, type: 'image', isFolder: false },

    // Documents
    { key: 'documents/report.pdf', name: 'report.pdf', size: 2048576, lastModified: now - 7200000, type: 'pdf', isFolder: false },
    { key: 'documents/invoice_jan.pdf', name: 'invoice_jan.pdf', size: 102400, lastModified: now - 7500000, type: 'pdf', isFolder: false },
    { key: 'documents/invoice_feb.pdf', name: 'invoice_feb.pdf', size: 102400, lastModified: now - 7800000, type: 'pdf', isFolder: false },
    { key: 'documents/notes.txt', name: 'notes.txt', size: 512, lastModified: now - 8000000, type: 'text', isFolder: false },

    // Images
    { key: 'images/vacation.jpg', name: 'vacation.jpg', size: 3145728, lastModified: now - 14400000, type: 'image', isFolder: false },
    { key: 'images/banner.png', name: 'banner.png', size: 2097152, lastModified: now - 15400000, type: 'image', isFolder: false },
    { key: 'images/profile.jpg', name: 'profile.jpg', size: 1048576, lastModified: now - 16400000, type: 'image', isFolder: false },
    { key: 'images/design_mockup_v1.png', name: 'design_mockup_v1.png', size: 5242880, lastModified: now - 17400000, type: 'image', isFolder: false },
    { key: 'images/design_mockup_v2.png', name: 'design_mockup_v2.png', size: 5242880, lastModified: now - 18400000, type: 'image', isFolder: false },

    // Src
    { key: 'src/index.ts', name: 'index.ts', size: 4096, lastModified: now - 432000000, type: 'typescript', isFolder: false },
    { key: 'src/utils.ts', name: 'utils.ts', size: 8192, lastModified: now - 518400000, type: 'typescript', isFolder: false },
    { key: 'src/App.tsx', name: 'App.tsx', size: 12000, lastModified: now - 400000, type: 'typescript', isFolder: false },
    { key: 'src/components/', name: 'components', size: 0, lastModified: now - 450000, type: 'folder', isFolder: true },
    { key: 'src/components/Button.tsx', name: 'Button.tsx', size: 2500, lastModified: now - 460000, type: 'typescript', isFolder: false },

    // Logs
    { key: 'logs/access.log', name: 'access.log', size: 10240000, lastModified: now - 55000, type: 'text', isFolder: false },
    { key: 'logs/error.log', name: 'error.log', size: 2048, lastModified: now - 60000, type: 'text', isFolder: false },

    // Backups
    { key: 'backups/db_dump_2023.sql', name: 'db_dump_2023.sql', size: 524288000, lastModified: now - 600000, type: 'sql', isFolder: false },
    { key: 'backups/site_backup.zip', name: 'site_backup.zip', size: 262144000, lastModified: now - 650000, type: 'zip', isFolder: false },
  ];

  // Add more generic files to fill up
  for (let i = 1; i <= 20; i++) {
    objects.push({
      key: `assets/image_${i}.jpg`,
      name: `image_${i}.jpg`,
      size: Math.floor(Math.random() * 5000000),
      lastModified: now - Math.floor(Math.random() * 100000000),
      type: 'image',
      isFolder: false
    });
  }

  return objects;
};

const generateTrashObjects = (): DemoObject[] => {
  const now = Date.now();
  return [
    { key: '.trash/old-file.txt', name: 'old-file.txt', size: 1024, lastModified: now - 604800000, type: 'text', isFolder: false },
    { key: '.trash/deleted-folder/', name: 'deleted-folder', size: 0, lastModified: now - 518400000, type: 'folder', isFolder: true },
  ];
};

const AccountIcon: React.FC<{ account: DemoAccount, className?: string }> = ({ account, className }) => {
  let iconPath = '';
  switch (account.provider) {
    case 'aws': iconPath = '/icons/s3.svg'; break;
    case 'cloudflare': iconPath = '/icons/r2.svg'; break;
    case 'minio': iconPath = '/icons/minio.jpeg'; break;
    case 'wasabi': iconPath = '/icons/wasabi.jpg'; break;
    case 'digitalocean': iconPath = '/icons/spaces.svg'; break;
    case 'backblaze': iconPath = '/icons/backblaze-b2.png'; break;
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

const InteractiveFileManager: React.FC = () => {

  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [allObjects, setAllObjects] = useState<DemoObject[]>(generateDemoObjects());
  const [trashObjects, setTrashObjects] = useState<DemoObject[]>(generateTrashObjects());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: ContextMenuType; item?: DemoObject; account?: DemoAccount } | null>(null);
  const [renameItem, setRenameItem] = useState<{ key: string; newName: string } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ hasItems: boolean; isCut: boolean; itemKeys: string[] } | null>(null);
  // View State: 'files' | 'sync' | 'activity' | 'analytics'
  const [activeView, setActiveView] = useState<'files' | 'sync' | 'activity' | 'analytics'>('files');
  const [activeAccount, setActiveAccount] = useState<DemoAccount>(DEMO_ACCOUNTS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [previewObject, setPreviewObject] = useState<DemoObject | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isTrash = currentPrefix?.startsWith('.trash/') || false;
  const currentObjects = isTrash ? trashObjects : allObjects;

  // Filter objects by current path - matching real FileExplorer logic
  const processedObjects = useMemo(() => {
    let filtered = currentObjects.filter(obj => {
      if (currentPrefix === '') {
        return !obj.key.includes('/') || obj.key.startsWith('.trash/');
      }
      const prefixMatch = obj.key.startsWith(currentPrefix);
      const remainingPath = obj.key.substring(currentPrefix.length);
      return prefixMatch && remainingPath && !remainingPath.includes('/');
    });

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(obj =>
        obj.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: folders first, then by name
    filtered.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [currentObjects, currentPrefix, searchQuery]);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number): string => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const navigateTo = (prefix: string) => {
    setCurrentPrefix(prefix);
    setSelectedKeys(new Set());
  };

  const navigateUp = () => {
    if (currentPrefix === '') return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    setCurrentPrefix(parts.length > 0 ? parts.join('/') + '/' : '');
    setSelectedKeys(new Set());
  };

  const handleDelete = (items: DemoObject[]) => {
    if (isTrash) {
      // Permanent delete from trash
      setTrashObjects(prev => prev.filter(obj => !items.some(item => item.key === obj.key)));
    } else if (activeAccount.enableTrash) {
      // Move to trash
      const trashItems = items.map(item => ({
        ...item,
        key: `.trash/${item.key}`,
        lastModified: Date.now()
      }));
      setTrashObjects(prev => [...prev, ...trashItems]);
      setAllObjects(prev => prev.filter(obj => !items.some(item => item.key === obj.key)));
    } else {
      // Permanent delete
      setAllObjects(prev => prev.filter(obj => !items.some(item => item.key === obj.key)));
    }
    setSelectedKeys(new Set());
    showToastMessage(`Deleted ${items.length} item(s)`, 'success');
  };

  const handleRestore = (items: DemoObject[]) => {
    const restored = items.map(item => ({
      ...item,
      key: item.key.replace('.trash/', ''),
      lastModified: Date.now()
    }));
    setAllObjects(prev => [...prev, ...restored]);
    setTrashObjects(prev => prev.filter(obj => !items.some(item => item.key === obj.key)));
    setSelectedKeys(new Set());
    showToastMessage(`Restored ${items.length} item(s)`, 'success');
  };

  const handleRename = (item: DemoObject, newName: string) => {
    if (newName === item.name) return;

    const newKey = item.key.replace(item.name, newName);
    if (isTrash) {
      setTrashObjects(prev => prev.map(obj =>
        obj.key === item.key ? { ...obj, key: newKey, name: newName } : obj
      ));
    } else {
      setAllObjects(prev => prev.map(obj =>
        obj.key === item.key ? { ...obj, key: newKey, name: newName } : obj
      ));
    }
    showToastMessage(`Renamed to "${newName}"`, 'success');
  };

  const handleCreateFolder = (name: string) => {
    const folderKey = currentPrefix + name + '/';
    if (allObjects.some(obj => obj.key === folderKey)) {
      showToastMessage('Folder already exists', 'error');
      return;
    }
    setAllObjects(prev => [...prev, {
      key: folderKey,
      name,
      size: 0,
      lastModified: Date.now(),
      type: 'folder',
      isFolder: true
    }]);
    showToastMessage(`Created folder "${name}"`, 'success');
    setShowCreateFolder(false);
    setNewFolderName('');
  };

  const handleCreateFile = () => {
    const fileName = `new-file-${Date.now()}.txt`;
    const fileKey = currentPrefix + fileName;
    setAllObjects(prev => [...prev, {
      key: fileKey,
      name: fileName,
      size: 0,
      lastModified: Date.now(),
      type: 'text',
      isFolder: false
    }]);
    showToastMessage(`Created file "${fileName}"`, 'success');
  };

  const handleToggleFavourite = (item: DemoObject) => {
    const favKey = `${activeAccount.id}:${activeAccount.bucketName}:${item.key}`;
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(favKey)) {
        next.delete(favKey);
        showToastMessage('Removed from favourites', 'success');
      } else {
        next.add(favKey);
        showToastMessage('Added to favourites', 'success');
      }
      return next;
    });
  };

  const handleDuplicate = (items: DemoObject[]) => {
    const duplicated = items.map(item => ({
      ...item,
      key: item.key.replace(item.name, `copy-of-${item.name}`),
      name: `copy-of-${item.name}`,
      lastModified: Date.now()
    }));
    setAllObjects(prev => [...prev, ...duplicated]);
    showToastMessage(`Duplicated ${items.length} item(s)`, 'success');
  };

  const handleCopy = (items: DemoObject[]) => {
    setClipboard({ hasItems: true, isCut: false, itemKeys: items.map(i => i.key) });
    showToastMessage(`Copied ${items.length} item(s)`, 'success');
  };

  const handleCut = (items: DemoObject[]) => {
    setClipboard({ hasItems: true, isCut: true, itemKeys: items.map(i => i.key) });
    showToastMessage(`Cut ${items.length} item(s)`, 'success');
  };

  const handlePaste = () => {
    if (!clipboard?.hasItems) return;
    const itemsToPaste = currentObjects.filter(obj => clipboard.itemKeys.includes(obj.key));
    const pasted = itemsToPaste.map(item => ({
      ...item,
      key: currentPrefix + item.name + (item.isFolder ? '/' : ''),
      lastModified: Date.now()
    }));
    setAllObjects(prev => [...prev, ...pasted]);
    if (clipboard.isCut) {
      setAllObjects(prev => prev.filter(obj => !clipboard.itemKeys.includes(obj.key)));
      setClipboard(null);
    }
    showToastMessage(`Pasted ${pasted.length} item(s)`, 'success');
  };

  const handleCompress = (items: DemoObject[]) => {
    showToastMessage(`Compressing ${items.length} item(s)...`, 'success');
    setTimeout(() => {
      showToastMessage(`Compressed ${items.length} item(s)`, 'success');
    }, 1000);
  };

  const handleTransfer = (items: DemoObject[], type: 'copy' | 'move') => {
    showToastMessage(`${type === 'copy' ? 'Copying' : 'Moving'} ${items.length} item(s) to bucket...`, 'success');
  };

  const handleRefresh = () => {
    setAllObjects(generateDemoObjects());
    setTrashObjects(generateTrashObjects());
    showToastMessage('Refreshed', 'success');
  };

  const getFileIcon = (obj: DemoObject) => {
    if (obj.isFolder) return Folder;
    if (obj.type === 'image') return ImageIcon;
    if (obj.type === 'pdf') return FileText;
    if (['zip', 'rar', 'tar', 'gz'].includes(obj.type)) return Archive;
    if (['javascript', 'typescript', 'json', 'html', 'css', 'xml', 'markdown'].includes(obj.type)) return FileText;
    return FileText;
  };

  const renderIcon = (obj: DemoObject, sizeClass: string) => {
    const Icon = getFileIcon(obj);
    if (obj.isFolder) {
      return <Folder className={`text-[var(--icon-color-accent)] fill-[var(--icon-color-accent)]/20 ${sizeClass}`} />;
    }
    if (obj.type === 'image') return <ImageIcon className={`text-purple-500 ${sizeClass}`} />;
    if (obj.type === 'pdf') return <FileText className={`text-red-500 ${sizeClass}`} />;
    if (['zip', 'rar', 'tar', 'gz'].includes(obj.type)) return <Archive className={`text-yellow-600 ${sizeClass}`} />;
    if (['javascript', 'typescript', 'json', 'html', 'css', 'xml'].includes(obj.type)) return <FileText className={`text-blue-500 ${sizeClass}`} />;
    return <FileText className={`text-[var(--icon-color)] ${sizeClass}`} />;
  };

  const getSelectedObjects = () => {
    return processedObjects.filter(obj => selectedKeys.has(obj.key));
  };

  const isCut = (key: string) => clipboard?.isCut && clipboard.itemKeys.includes(key);

  const handleContextMenu = (e: React.MouseEvent, type: ContextMenuType, data?: DemoObject | DemoAccount) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    const y = e.clientY;
    if (type === 'item') {
      setContextMenu({ x, y, type, item: data as DemoObject });
    } else if (type === 'account') {
      setContextMenu({ x, y, type, account: data as DemoAccount });
    } else {
      setContextMenu({ x, y, type: 'background' });
    }
  };

  const handleSelection = (e: React.MouseEvent, key: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } else {
      setSelectedKeys(new Set([key]));
    }
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const breadcrumbs = useMemo(() => {
    if (currentPrefix === '') return [];
    return currentPrefix.split('/').filter(Boolean);
  }, [currentPrefix]);

  return (
    <div className={`w-full ${isMobile ? 'h-[320px] overflow-hidden flex justify-center bg-gray-50/50 rounded-xl border border-gray-100/50' : ''}`}>
      <div
        className={`flex h-[600px] md:h-[750px] bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 rounded-xl shadow-2xl border border-[var(--border-primary)] overflow-hidden ${isMobile ? 'pointer-events-none origin-top' : ''}`}
        style={isMobile ? {
          minWidth: '800px',
          transform: 'scale(0.45)',
          marginBottom: '-330px' // Compensate for scaled height
        } : {}}
      >
        {/* Sidebar - Exact match to real Sidebar */}
        <div className={`w-48 md:w-64 flex flex-col border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-xl h-full z-20 select-none ${isMobile ? 'pointer-events-auto' : ''}`}>
          <div className="h-10 w-full select-none flex items-center px-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BucketStack" className="w-5 h-5" />
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
                onClick={() => showToastMessage('Add Connection feature coming soon', 'success')}
                className="text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)] rounded-lg p-1 transition-colors focus-ring flex items-center justify-center w-6 h-6 group"
                title="Add Connection"
              >
                <div className="relative flex items-center justify-center w-full h-full group-hover:scale-110 transition-transform">
                  <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                </div>
              </button>
            </div>

            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map(acc => (
                <li key={acc.id} className="relative group list-none">
                  <button
                    onClick={() => {
                      setActiveAccount(acc);
                      setCurrentPrefix('');
                      setSelectedKeys(new Set());
                      setActiveView('files');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 transition-all relative ${activeAccount.id === acc.id
                      ? 'bg-[var(--accent-blue)] text-white shadow-md font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    onContextMenu={(e) => handleContextMenu(e, 'account', acc)}
                  >
                    <div className="shrink-0 flex items-center justify-center w-4 h-4 bg-white/10 rounded overflow-hidden relative">
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
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Bucket Features */}
          {activeAccount && (
            <div className="px-3 pb-2 flex-shrink-0 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] pt-2">
              <div className="px-2 mb-1">
                <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Bucket Features
                </label>
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    navigateTo('');
                    setActiveView('files');
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors ${activeView === 'files' && !currentPrefix.startsWith('.trash/') ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  <Box size={14} className="text-[var(--icon-color)]" />
                  <span>Root</span>
                </button>
                {activeAccount.enableTrash && (
                  <button
                    onClick={() => {
                      navigateTo('.trash/');
                      setActiveView('files');
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors ${activeView === 'files' && currentPrefix.startsWith('.trash/') ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Trash2 size={14} className="text-[var(--text-secondary)]" />
                    <span>Trash</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveView('sync')}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors ${activeView === 'sync' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  <RefreshCw size={14} className="text-[var(--text-secondary)]" />
                  <span>Folder Sync</span>
                </button>
                <button
                  onClick={() => setActiveView('activity')}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors ${activeView === 'activity' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  <Clock size={14} className="text-[var(--text-secondary)]" />
                  <span>Activity</span>
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors ${activeView === 'analytics' ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'}`}
                >
                  <BarChart3 size={14} className="text-[var(--text-secondary)]" />
                  <span>Storage Analytics</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-3 border-t border-[var(--border-primary)] flex items-center gap-2">
            <button
              onClick={() => showToastMessage('Settings coming soon', 'success')}
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer shadow-sm"
            >
              <Settings size={14} className="text-[var(--text-secondary)]" />
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content - Exact match to real FileExplorer */}
        {activeView === 'sync' ? (
          <DemoSyncManager activeAccount={activeAccount} onNavigateBack={() => setActiveView('files')} />
        ) : activeView === 'activity' ? (
          <DemoActivityLog activeAccount={activeAccount} onNavigateBack={() => setActiveView('files')} />
        ) : activeView === 'analytics' ? (
          <DemoStorageAnalytics activeAccount={activeAccount} onNavigateBack={() => setActiveView('files')} />
        ) : (
          <div className={`flex-1 flex flex-col h-full bg-[var(--bg-primary)] relative select-none transition-colors duration-200 ${isMobile ? 'pointer-events-auto overflow-auto' : ''}`}>
            {/* Toolbar */}
            <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-4 bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-20 shrink-0 relative">
              {showMobileSearch ? (
                <div className="absolute inset-0 bg-[var(--bg-primary)] z-30 flex items-center px-4">
                  <Search size={18} className="text-[var(--text-tertiary)] mr-3" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowMobileSearch(false)}
                    className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                  />
                  <button onClick={() => setShowMobileSearch(false)} className="p-2 ml-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">Cancel</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-1 mr-2 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={navigateUp}
                        disabled={currentPrefix === ''}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      >
                        <ArrowLeft size={18} />
                      </button>
                    </div>

                    <div className="flex items-center text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg border border-[var(--border-secondary)] flex-1 shadow-sm overflow-hidden min-w-0">
                      {activeAccount?.endpoint ? (
                        <span className="text-[var(--text-tertiary)] mr-1 font-medium select-none truncate shrink-0 hidden sm:inline">
                          {activeAccount.endpoint.replace(/^(https?:\/\/)/, '')}/
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)] mr-1 font-medium select-none shrink-0 hidden sm:inline">s3://</span>
                      )}
                      <span className="text-[var(--text-primary)] font-semibold shrink-0">{activeAccount.bucketName}</span>
                      <span className="mx-1 text-[var(--text-tertiary)] shrink-0">/</span>
                      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                        {breadcrumbs.map((part, i, arr) => (
                          <React.Fragment key={i}>
                            <span
                              className="hover:text-[var(--accent-blue)] hover:underline cursor-pointer transition-colors"
                              onClick={() => navigateTo(arr.slice(0, i + 1).join('/') + '/')}
                            >
                              {part}
                            </span>
                            <span className="mx-1 text-[var(--text-tertiary)]">/</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden md:flex items-center gap-2">
                      {selectedKeys.size > 0 ? (
                        <div className="flex items-center gap-1 mr-2">
                          <span className="px-2 py-1 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded-md">
                            {selectedKeys.size} selected
                          </span>
                          <button onClick={() => handleDelete(getSelectedObjects())} className="p-2 rounded-md hover:bg-[var(--bg-danger-subtle)] text-[var(--text-danger)] transition-colors" title="Delete Selected">
                            <Trash2 size={16} />
                          </button>
                          <div className="h-4 w-px bg-[var(--border-primary)] mx-1" />
                          <button
                            onClick={() => setSelectedKeys(new Set())}
                            className="p-2 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors text-xs"
                            title="Deselect All"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedKeys(new Set(processedObjects.map(obj => obj.key)))}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] rounded-md transition-colors"
                          title="Select All"
                        >
                          Select All
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setShowMobileSearch(true)}
                      className="p-2 md:hidden text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg"
                    >
                      <Search size={18} />
                    </button>

                    <div className="relative group hidden md:block">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-blue)] transition-colors" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm w-32 focus:w-48 xl:focus:w-56 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)] transition-all"
                      />
                    </div>

                    <div className="h-6 w-px bg-[var(--border-primary)] hidden md:block" />

                    <div className="hidden sm:flex items-center bg-[var(--bg-tertiary)] rounded-lg p-1 border border-[var(--border-primary)] shadow-sm">
                      <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="List">
                        <ListIcon size={16} />
                      </button>
                      <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Grid">
                        <Grid size={16} />
                      </button>
                      <button onClick={() => setViewMode('gallery')} className={`p-1.5 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Gallery">
                        <GalleryThumbnails size={16} />
                      </button>
                    </div>

                    {!isTrash && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-[var(--accent-blue)] text-[var(--text-on-accent)] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--accent-blue-hover)] transition-all shadow-sm hover:shadow active:scale-95"
                      >
                        <Upload size={16} />
                        <span className="hidden lg:inline">Upload</span>
                      </button>
                    )}

                    <button
                      onClick={handleRefresh}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="*/*" onChange={() => showToastMessage('Upload started', 'success')} />
                  </div>
                </>
              )}
            </div>

            {/* Trash Info Note */}
            {isTrash && (
              <div className="bg-[var(--bg-secondary)] px-4 py-3 border-b border-[var(--border-primary)] flex items-start gap-3">
                <AlertCircle size={18} className="text-[var(--text-tertiary)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  If no deleted files appear here, they may have been permanently deleted from this bucket or removed directly from your storage provider, or the <code className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-primary)] font-mono">.trash/</code> folder may have been deleted externally.
                </p>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-2" onContextMenu={(e) => handleContextMenu(e, 'background')}>
              {processedObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] pb-20">
                  <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-3xl flex items-center justify-center mb-6 border border-[var(--border-primary)] border-dashed">
                    <Upload size={32} className="text-[var(--text-tertiary)]" />
                  </div>
                  <p className="font-semibold text-[var(--text-primary)] text-lg">Empty Folder</p>
                  <p className="text-sm mt-1 text-[var(--text-tertiary)]">Drag files here to upload or Right Click to start</p>
                </div>
              ) : (
                <>
                  {/* VIEW MODE: LIST */}
                  {viewMode === 'list' && (
                    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] shadow-sm overflow-hidden">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="text-xs font-semibold text-[var(--text-tertiary)] uppercase bg-[var(--bg-secondary)]/80 border-b border-[var(--border-primary)] sticky top-0 backdrop-blur-sm z-10">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                checked={selectedKeys.size > 0 && selectedKeys.size === processedObjects.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedKeys(new Set(processedObjects.map(obj => obj.key)));
                                  } else {
                                    setSelectedKeys(new Set());
                                  }
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </th>
                            <th className="px-4 py-3 flex-1">Name</th>
                            <th className="px-4 py-3 w-32">Size</th>
                            <th className="px-4 py-3 w-48">{isTrash ? 'Date Deleted' : 'Date Modified'}</th>
                            <th className="px-4 py-3 w-20">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-primary)]">
                          {processedObjects.map((obj) => {
                            const isSelected = selectedKeys.has(obj.key);
                            const cutOpacity = isCut(obj.key) ? 'opacity-50' : 'opacity-100';
                            const favKey = `${activeAccount.id}:${activeAccount.bucketName}:${obj.key}`;
                            const isFav = favourites.has(favKey);

                            return (
                              <tr
                                key={obj.key}
                                className={`group transition-colors ${isSelected ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-subtle)]'} ${cutOpacity}`}
                                onDoubleClick={() => obj.isFolder ? navigateTo(obj.key) : null}
                                onContextMenu={(e) => handleContextMenu(e, 'item', obj)}
                              >
                                <td className="px-4 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleSelection(e, obj.key);
                                    }}
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                </td>
                                <td className="px-4 py-2.5 flex items-center gap-3 cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>
                                  {renderIcon(obj, "w-5 h-5")}
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium truncate ${obj.isFolder ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{obj.name}</span>
                                    {isFav && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-[var(--text-secondary)] font-mono text-xs cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{formatSize(obj.size)}</td>
                                <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{formatDate(obj.lastModified)}</td>
                                <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs uppercase tracking-wider cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{obj.isFolder ? 'Prefix' : obj.type}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW MODE: GRID */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4 p-2">
                      {processedObjects.map((obj) => {
                        const isSelected = selectedKeys.has(obj.key);
                        const cutOpacity = isCut(obj.key) ? 'opacity-50' : 'opacity-100';
                        const favKey = `${activeAccount.id}:${activeAccount.bucketName}:${obj.key}`;
                        const isFav = favourites.has(favKey);
                        const isImage = obj.type === 'image' && !obj.isFolder;

                        return (
                          <div
                            key={obj.key}
                            onDoubleClick={() => obj.isFolder ? navigateTo(obj.key) : null}
                            onContextMenu={(e) => handleContextMenu(e, obj)}
                            onClick={(e) => {
                              if (isImage) setPreviewObject(obj);
                              handleSelection(e, obj.key);
                            }}
                            className={`group flex flex-col items-center p-4 rounded-xl cursor-pointer border transition-all relative ${cutOpacity} ${isSelected
                              ? 'bg-[var(--bg-selected)] border-[var(--border-selected)] shadow-sm'
                              : 'bg-[var(--bg-primary)] border-transparent hover:border-[var(--border-secondary)] hover:shadow-sm hover:bg-[var(--bg-subtle)]'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelection(e, obj.key);
                              }}
                              className="absolute top-2 right-2 w-4 h-4 cursor-pointer z-10"
                            />
                            <div className="w-16 h-16 mb-3 flex items-center justify-center bg-[var(--bg-secondary)] rounded-2xl shadow-inner group-hover:scale-105 transition-transform duration-200 relative overflow-hidden">
                              {isImage ? (
                                <img
                                  src={`https://picsum.photos/seed/${obj.key}/64/64`}
                                  alt={obj.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={isImage ? 'hidden' : ''}>
                                {renderIcon(obj, "w-8 h-8")}
                              </div>
                              {isFav && <Star size={12} className="absolute -top-1 -right-1 text-yellow-500 fill-yellow-500 z-10" />}
                            </div>
                            <span className="text-xs font-medium text-center text-[var(--text-primary)] w-full truncate px-1 select-none">{obj.name}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] mt-1">{formatSize(obj.size)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* VIEW MODE: GALLERY */}
                  {viewMode === 'gallery' && (
                    <div className="flex h-full gap-4 overflow-hidden">
                      <div className="w-64 border-r border-[var(--border-primary)] bg-[var(--bg-primary)] overflow-y-auto pr-1">
                        {processedObjects.map((obj) => {
                          const isSelected = selectedKeys.has(obj.key);
                          const cutOpacity = isCut(obj.key) ? 'opacity-50' : 'opacity-100';
                          const favKey = `${activeAccount.id}:${activeAccount.bucketName}:${obj.key}`;
                          const isFav = favourites.has(favKey);
                          const isImage = obj.type === 'image' && !obj.isFolder;

                          return (
                            <div
                              key={obj.key}
                              className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${cutOpacity} ${isSelected ? 'bg-[var(--bg-selected)] border-[var(--border-selected)]' : 'border-[var(--border-primary)] hover:bg-[var(--bg-subtle)]'
                                }`}
                              onClick={(e) => {
                                if (obj.isFolder) {
                                  navigateTo(obj.key);
                                } else {
                                  setPreviewObject(obj);
                                  handleSelection(e, obj.key);
                                }
                              }}
                              onContextMenu={(e) => handleContextMenu(e, obj)}
                            >
                              {isImage ? (
                                <img
                                  src={`https://picsum.photos/seed/${obj.key}/48/48`}
                                  alt={obj.name}
                                  className="w-12 h-12 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={isImage ? 'hidden' : ''}>
                                {renderIcon(obj, "w-8 h-8")}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{obj.name}</p>
                                  {isFav && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                                </div>
                                <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(obj.size)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] m-2 rounded-xl border border-[var(--border-primary)] p-4">
                        {previewObject && previewObject.type === 'image' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img
                              src={`https://picsum.photos/seed/${previewObject.key}/800/600`}
                              alt={previewObject.name}
                              className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden text-center text-[var(--text-tertiary)]">
                              {renderIcon(previewObject, "w-16 h-16 mx-auto mb-4 opacity-50")}
                              <p className="font-semibold text-lg text-[var(--text-secondary)]">No preview available</p>
                            </div>
                          </div>
                        ) : previewObject ? (
                          <div className="text-center text-[var(--text-tertiary)]">
                            {renderIcon(previewObject, "w-16 h-16 mx-auto mb-4 opacity-50")}
                            <p className="font-semibold text-lg text-[var(--text-secondary)]">{previewObject.name}</p>
                            <p className="text-sm mt-1">{formatSize(previewObject.size)}</p>
                            <p className="text-xs mt-2 text-[var(--text-tertiary)]">{formatDate(previewObject.lastModified)}</p>
                          </div>
                        ) : (
                          <div className="text-center text-[var(--text-tertiary)]">
                            <GalleryThumbnails size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-semibold text-lg text-[var(--text-secondary)]">Select an item to preview</p>
                            <p className="text-sm mt-1">Click on a file from the list to see its details here.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Stats */}
            <div className="h-9 border-t border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur flex items-center px-4 text-[11px] font-medium text-[var(--text-tertiary)] justify-between select-none">
              <div className="flex gap-4">
                <span>{processedObjects.length} item{processedObjects.length !== 1 && 's'}</span>
                <span className="text-[var(--border-secondary)]">|</span>
                <span>
                  {selectedKeys.size > 0 ? `${selectedKeys.size} selected` : `${formatSize(processedObjects.reduce((acc, obj) => acc + obj.size, 0))} total`}
                </span>
              </div>
              {!currentPrefix && viewMode !== 'gallery' && (
                <div className="hidden sm:block text-[10px] italic opacity-60">
                  tip: change view to Gallery to automatically see your file previews
                </div>
              )}
            </div>

            {/* Context Menu - Complete match to real FileExplorer */}
            {contextMenu && (
              <div
                className="fixed bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl rounded-xl py-2 z-50 w-64 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                {contextMenu.type === 'item' && contextMenu.item ? (
                  // Item Context Menu
                  isTrash ? (
                    <>
                      <button
                        onClick={() => { handleRestore(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <RotateCcw size={14} className="text-[var(--text-tertiary)]" /> Restore
                      </button>
                      <div className="border-t border-[var(--border-primary)] my-1" />
                      <button
                        onClick={() => {
                          handleDelete(getSelectedObjects());
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-danger)] hover:bg-[var(--bg-danger-subtle)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Trash2 size={14} /> Delete Permanently
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedKeys.size === 1 ? (
                        // Single item selected
                        <>
                          {contextMenu.item.isFolder ? (
                            <button
                              onClick={() => { navigateTo(contextMenu.item!.key); setContextMenu(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                            >
                              <Folder size={14} className="text-[var(--text-tertiary)]" /> Open
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => { showToastMessage('Download started', 'success'); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                              >
                                <Download size={14} className="text-[var(--text-tertiary)]" /> Download
                              </button>
                              <button
                                onClick={() => { showToastMessage('Opening preview...', 'success'); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium border-l-2 border-[var(--accent-blue)]"
                              >
                                <Eye size={14} className="text-[var(--accent-blue)]" /> View / Preview
                              </button>
                              <button
                                onClick={() => { showToastMessage('Link generated', 'success'); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                              >
                                <Link size={14} className="text-[var(--text-tertiary)]" /> Get Link
                              </button>
                            </>
                          )}
                          {!contextMenu.item.isFolder && (
                            <button
                              onClick={() => { showToastMessage('Opening editor...', 'success'); setContextMenu(null); }}
                              className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors ${activeAccount?.accessMode === 'read-only' ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={activeAccount?.accessMode === 'read-only'}
                            >
                              <Edit2 size={14} className="text-[var(--text-tertiary)]" /> Edit
                            </button>
                          )}
                          <button
                            onClick={() => { handleToggleFavourite(contextMenu.item!); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            {favourites.has(`${activeAccount.id}:${activeAccount.bucketName}:${contextMenu.item!.key}`) ? (
                              <>
                                <StarOff size={14} className="text-yellow-500" /> Remove from Favourites
                              </>
                            ) : (
                              <>
                                <Star size={14} className="text-yellow-500" /> Add to Favourites
                              </>
                            )}
                          </button>
                          <div className="border-t border-[var(--border-primary)] my-1" />
                          <button
                            onClick={() => { handleCut(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Scissors size={14} className="text-[var(--text-tertiary)]" /> Move to
                          </button>
                          <button
                            onClick={() => { handleCopy(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Copy size={14} className="text-[var(--text-tertiary)]" /> Copy
                          </button>
                          <button
                            onClick={() => { handleDuplicate(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Repeat size={14} className="text-[var(--text-tertiary)]" /> Duplicate
                          </button>
                          <div className="border-t border-[var(--border-primary)] my-1" />
                          <button
                            onClick={() => { handleTransfer(getSelectedObjects(), 'copy'); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium"
                          >
                            <ArrowRightIcon size={14} className="text-[var(--accent-blue)]" /> Copy to Bucket...
                          </button>
                          <div className="border-t border-[var(--border-primary)] my-1" />
                          <button
                            onClick={() => {
                              const selected = getSelectedObjects();
                              if (selected.length !== 1) {
                                showToastMessage('Please select exactly one item to rename', 'error');
                                setContextMenu(null);
                                return;
                              }
                              setRenameItem({ key: selected[0].key, newName: selected[0].name });
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Edit2 size={14} className="text-[var(--text-tertiary)]" /> Rename
                          </button>
                        </>
                      ) : (
                        // Multiple items selected
                        <>
                          <button
                            onClick={() => { handleCompress(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Archive size={14} className="text-[var(--text-tertiary)]" /> Compress & Download
                          </button>
                          <div className="border-t border-[var(--border-primary)] my-1" />
                          <button
                            onClick={() => { handleCopy(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Copy size={14} className="text-[var(--text-tertiary)]" /> Copy
                          </button>
                          <button
                            onClick={() => { handleCut(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Scissors size={14} className="text-[var(--text-tertiary)]" /> Move to
                          </button>
                          <button
                            onClick={() => { handleCompress(getSelectedObjects()); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Archive size={14} className="text-[var(--text-tertiary)]" /> Compress to Zip
                          </button>
                          <div className="border-t border-[var(--border-primary)] my-1" />
                          <button
                            onClick={() => { handleTransfer(getSelectedObjects(), 'copy'); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium"
                          >
                            <ArrowRightIcon size={14} className="text-[var(--accent-blue)]" /> Copy to Bucket...
                          </button>
                        </>
                      )}
                      <div className="border-t border-[var(--border-primary)] my-2 mx-1" />
                      <button
                        onClick={() => {
                          handleDelete(getSelectedObjects());
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-danger)] hover:bg-[var(--bg-danger-subtle)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )
                ) : (
                  // Background Context Menu
                  contextMenu.type === 'background' ? (
                    !isTrash && (
                      <>
                        <button
                          onClick={() => { setNewFolderName(''); setShowCreateFolder(true); setContextMenu(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                        >
                          <FolderPlus size={14} className="text-[var(--text-tertiary)]" /> New Folder
                        </button>
                        <button
                          onClick={() => { handleCreateFile(); setContextMenu(null); }}
                          className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors ${activeAccount?.accessMode === 'read-only' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={activeAccount?.accessMode === 'read-only'}
                        >
                          <FilePlus size={14} className="text-[var(--text-tertiary)]" /> New File
                        </button>
                        <button
                          onClick={() => { fileInputRef.current?.click(); setContextMenu(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                        >
                          <Upload size={14} className="text-[var(--text-tertiary)]" /> Upload Files
                        </button>
                        <div className="border-t border-[var(--border-primary)] my-2 mx-1" />
                        <button
                          onClick={() => { handlePaste(); setContextMenu(null); }}
                          disabled={!clipboard?.hasItems || clipboard?.isCut}
                          className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-md mx-1 transition-colors"
                          title={clipboard?.isCut ? "Use 'Move to' instead" : undefined}
                        >
                          <ClipboardCopy size={14} className="text-[var(--text-tertiary)]" /> Paste
                        </button>
                      </>
                    )
                  ) : contextMenu.type === 'account' ? (
                    // Account Context Menu
                    <>
                      <button
                        onClick={() => { showToastMessage('Refreshing ' + contextMenu.account?.name, 'success'); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <RefreshCw size={14} className="text-[var(--text-tertiary)]" /> Refresh
                      </button>
                      <button
                        onClick={() => { showToastMessage('Editing ' + contextMenu.account?.name, 'success'); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Edit2 size={14} className="text-[var(--text-tertiary)]" /> Edit Connection
                      </button>
                      <div className="border-t border-[var(--border-primary)] my-1" />
                      <button
                        onClick={() => { showToastMessage('Deleting ' + contextMenu.account?.name, 'success'); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-danger)] hover:bg-[var(--bg-danger-subtle)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </>
                  ) : null
                )}
              </div>
            )}

            {/* Rename Modal */}
            {renameItem && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Rename</h3>
                    <input
                      type="text"
                      value={renameItem.newName}
                      onChange={(e) => setRenameItem({ ...renameItem, newName: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const item = currentObjects.find(obj => obj.key === renameItem.key);
                          if (item) {
                            handleRename(item, renameItem.newName);
                            setRenameItem(null);
                          }
                        } else if (e.key === 'Escape') {
                          setRenameItem(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)]"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4 justify-end">
                      <button
                        onClick={() => setRenameItem(null)}
                        className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const item = currentObjects.find(obj => obj.key === renameItem.key);
                          if (item) {
                            handleRename(item, renameItem.newName);
                            setRenameItem(null);
                          }
                        }}
                        className="px-4 py-2 bg-[var(--accent-blue)] text-[var(--text-on-accent)] rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create Folder Modal */}
            {showCreateFolder && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Create Folder</h3>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName) {
                          handleCreateFolder(newFolderName);
                        } else if (e.key === 'Escape') {
                          setShowCreateFolder(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder="Folder name"
                      className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)]"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4 justify-end">
                      <button
                        onClick={() => {
                          setShowCreateFolder(false);
                          setNewFolderName('');
                        }}
                        className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newFolderName) {
                            handleCreateFolder(newFolderName);
                          }
                        }}
                        className="px-4 py-2 bg-[var(--accent-blue)] text-[var(--text-on-accent)] rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Toast */}
            {toast && (
              <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-in fade-in ${toast.type === 'success' ? 'bg-[var(--bg-success-subtle)] text-[var(--text-success)]' : 'bg-[var(--bg-danger-subtle)] text-[var(--text-danger)]'
                }`}>
                {toast.message}
              </div>
            )}

            {/* FAB Menu & Button */}
            {!isTrash && !isMobile && (
              <>
                {fabOpen && (
                  <div className="absolute bottom-24 right-8 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 min-w-max">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setFabOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 transition-colors"
                    >
                      <Upload size={18} className="text-[var(--text-secondary)]" />
                      <span>Upload Files</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowCreateFolder(true);
                        setFabOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 transition-colors border-t border-[var(--border-primary)]"
                    >
                      <FolderPlus size={18} className="text-[var(--text-secondary)]" />
                      <span>Create Folder</span>
                    </button>
                    <button
                      onClick={() => {
                        handleCreateFile();
                        setFabOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 transition-colors"
                    >
                      <FilePlus size={18} className="text-[var(--text-secondary)]" />
                      <span>Create File</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setFabOpen(!fabOpen)}
                  className="absolute bottom-8 right-8 w-14 h-14 bg-[var(--accent-blue)] text-[var(--text-on-accent)] rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 hover:bg-[var(--accent-blue-hover)] transition-all active:scale-95 z-40 group"
                  title={fabOpen ? "Close" : "Upload or Create"}
                >
                  <Plus size={32} strokeWidth={2.5} className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''} group-hover:scale-110`} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};

export default InteractiveFileManager;
