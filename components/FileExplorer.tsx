import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Search, Grid, List as ListIcon, MoreVertical, Download, Trash2, Edit2,
  FolderPlus, FilePlus, Copy, Scissors, Repeat, Folder, File, Share2,
  ChevronRight, ChevronLeft, LayoutGrid, LayoutList, Image as ImageIcon,
  SortAsc, SortDesc, Filter, RefreshCw, X, ArrowLeft, ArrowRight, Save,
  ExternalLink, Maximize2, Minimize2, Settings, Columns, Eye, Link,
  Clock, Hash, Calendar, Archive, RotateCcw, Box, Check, CheckCircle2, Zap,
  LayoutTemplate, GalleryThumbnails, Upload, ArrowUp, AlertCircle, Plus, ClipboardCopy, FileText
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { S3Account, S3Object, ViewMode, UploadProgress, SortField, SortOrder, FilterOptions } from '../types';
import { MonacoFilePreview } from './MonacoFilePreview';

interface FileExplorerProps {
  objects: S3Object[];
  currentBucket: string | null;
  currentPrefix: string;
  viewMode: ViewMode;
  isLoading: boolean;
  uploadStatus: UploadProgress | null;
  operationStatus: { name: string; status: 'processing' | 'completed' | 'error' } | null;
  activeAccount: S3Account | null;
  clipboard: { hasItems: boolean; isCut: boolean; itemKeys: string[] } | null;
  onNavigate: (prefix: string) => void;
  onNavigateUp: () => void;
  onToggleView: (mode: ViewMode) => void;
  onUpload: (items: { file: File, path?: string }[] | FileList) => void;
  onDelete: (objects: S3Object[]) => void;
  onRename: (object: S3Object, newName: string) => void;
  onCreateFolder: (folderName?: string) => void;
  onDownload: (object: S3Object | S3Object[]) => void;
  onCopy: (objects: S3Object[]) => void;
  onCut: (objects: S3Object[]) => void;
  onPaste: () => void;
  onDuplicate: (objects: S3Object[]) => void;
  onCompress: (objects: S3Object[]) => void;
  onGetLink: (objects: S3Object[]) => void;
  onTransfer: (objects: S3Object[], type: 'copy' | 'move') => void;
  onGetPreviewUrl: (object: S3Object) => Promise<string>;
  onRefresh: () => void;
  onCreateFile: () => void;
  onEditFile: (object: S3Object) => void;
  onGlobalSearch: (query: string) => void;
  onGetContent: (object: S3Object) => Promise<string>; // For preview
  isSearchResults?: boolean;
  onRestore?: (objects: S3Object[]) => void;
  onEmptyTrash?: () => void;
  favourites?: FavouriteItem[];
  onToggleFavourite?: (object: S3Object) => void;
}

import { FavouriteItem } from '../types';
import { Pin, Star, StarOff } from 'lucide-react';

export const FileExplorer: React.FC<FileExplorerProps> = ({
  objects,
  currentBucket,
  currentPrefix,
  viewMode,
  isLoading,
  uploadStatus,
  operationStatus,
  activeAccount,
  clipboard,
  onNavigate,
  onNavigateUp,
  onToggleView,
  onUpload,
  onDelete,
  onRename,
  onCreateFolder,
  onDownload,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onCompress,
  onGetLink,
  onTransfer,
  onGetPreviewUrl,
  onRefresh,
  onCreateFile,
  onEditFile,
  onGlobalSearch,
  onGetContent,
  isSearchResults = false,
  onRestore,
  onEmptyTrash,
  favourites = [],
  onToggleFavourite,
}) => {
  const isTrash = currentPrefix?.startsWith('.trash/') || false;
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filters, setFilters] = useState<FilterOptions>({ search: '', fileType: 'all' });

  // Selection State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: S3Object | null } | null>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ items: S3Object[] } | null>(null);

  // Rename Modal State
  const [renameModal, setRenameModal] = useState<{ object: S3Object; newName: string } | null>(null);

  // Create Folder Modal State
  const [folderNameModal, setFolderNameModal] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');

  // Floating Action Button State
  const [fabOpen, setFabOpen] = useState(false);

  // Gallery & Manual Preview State
  const [preview, setPreview] = useState<{ url: string; content?: string; object: S3Object } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingObject, setViewingObject] = useState<S3Object | null>(null);

  // Responsive Toolbar State
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showToolbarMenu, setShowToolbarMenu] = useState(false);

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Clear selection on navigation
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [currentBucket, currentPrefix]);

  // --- Helpers ---
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isCut = (key: string) => clipboard?.isCut && clipboard.itemKeys.includes(key);

  // --- Filtering & Sorting Logic ---
  const processedObjects = useMemo(() => {
    let result = [...objects];

    // Filter
    if (filters.search) {
      result = result.filter(o => o.name.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.fileType !== 'all') {
      if (filters.fileType === 'image') result = result.filter(o => o.type === 'image');
      if (filters.fileType === 'document') result = result.filter(o => ['pdf', 'doc', 'txt'].includes(o.type));
    }

    // Sort
    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let compare = 0;
      switch (sortField) {
        case 'name': compare = a.name.localeCompare(b.name); break;
        case 'size': compare = a.size - b.size; break;
        case 'date': compare = a.lastModified - b.lastModified; break;
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

    return result;
  }, [objects, filters, sortField, sortOrder]);

  const getSelectedObjects = () => objects.filter(o => selectedKeys.has(o.key));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          if (cmdOrCtrl) {
            e.preventDefault();
            // Select all
            setSelectedKeys(new Set(processedObjects.map(obj => obj.key)));
          }
          break;
        case 'c':
          if (cmdOrCtrl && selectedKeys.size > 0) {
            e.preventDefault();
            onCopy(getSelectedObjects());
          }
          break;
        case 'x':
          if (cmdOrCtrl && selectedKeys.size > 0) {
            e.preventDefault();
            onCut(getSelectedObjects());
          }
          break;
        case 'v':
          if (cmdOrCtrl && clipboard?.hasItems) {
            e.preventDefault();
            onPaste();
          }
          break;
        case 'n':
          if (cmdOrCtrl) {
            e.preventDefault();
            onCreateFolder();
          }
          break;
        case 'u':
          if (cmdOrCtrl) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
          break;
        case 'delete':
        case 'backspace':
          if (selectedKeys.size > 0) {
            e.preventDefault();
            handleBatchDelete();
          }
          break;
        case 'enter':
          if (selectedKeys.size === 1) {
            e.preventDefault();
            const selectedObj = getSelectedObjects()[0];
            if (selectedObj.isFolder) {
              onNavigate(selectedObj.key);
            } else {
              onDownload(selectedObj);
            }
          }
          break;
        case 'f2':
          if (selectedKeys.size === 1) {
            e.preventDefault();
            const obj = getSelectedObjects()[0];
            setRenameModal({ object: obj, newName: obj.name });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedKeys, processedObjects, clipboard, onCopy, onCut, onPaste, onCreateFolder, onDownload, onNavigate, onRename]);

  // Effect for Preview (Gallery or Modal)
  useEffect(() => {
    let targetObject = viewingObject;

    // Fallback to selection in gallery view if no specific viewingObject is set
    if (!targetObject && viewMode === 'gallery') {
      targetObject = getSelectedObjects()[0];
    }

    if (!targetObject) {
      setPreview(null);
      return;
    }

    const loadPreview = async (obj: S3Object) => {
      setIsPreviewLoading(true);
      try {
        if (obj.type === 'image' || obj.type === 'pdf') {
          const url = await onGetPreviewUrl(obj);
          setPreview({ url, object: obj });
        } else if (obj.type === 'text' || ['javascript', 'typescript', 'json', 'html', 'css', 'xml'].includes(obj.type)) {
          const content = await onGetContent(obj);
          setPreview({ url: '', content, object: obj });
        } else {
          setPreview({ url: '', object: obj });
        }
      } catch (err) {
        console.error("Failed to load preview:", err);
        setPreview(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    loadPreview(targetObject);
  }, [viewingObject, selectedKeys, viewMode, onGetPreviewUrl, onGetContent]);

  // --- Handlers ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (activeAccount?.accessMode !== 'read-only') {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOver(false);
    // Real file drop handling is done by the native Tauri listener in App.tsx

    // Internal move handling (App -> App)
    const rawData = e.dataTransfer.getData('application/x-bucketstack-items');
    if (rawData) {
      try {
        const data = JSON.parse(rawData);
        // If we implement drop-into-folder, we'd handle it here.
        // For now, if dropped on background, it does nothing or moves to current.

      } catch (err) { console.error('Failed to parse internal drop data:', err); }
    }
  };

  const handleSelection = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const newSet = new Set(selectedKeys);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setSelectedKeys(newSet);
    } else {
      setSelectedKeys(new Set([key]));
    }
  };

  const handleBackgroundClick = () => {
    setSelectedKeys(new Set());
  };

  const handleContextMenu = (e: React.MouseEvent, item: S3Object | null) => {
    e.preventDefault(); e.stopPropagation();
    if (item && !selectedKeys.has(item.key)) {
      setSelectedKeys(new Set([item.key]));
    }

    // Improved positioning to stay within viewport
    const menuWidth = 256;
    const menuHeight = item ? 400 : 250; // Estimate height based on content
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    // Boundary checks
    if (x < 0) x = 10;
    if (y < 0) y = 10;

    setContextMenu({ x, y, item });
  };

  const handleDragStart = (e: React.DragEvent, obj: S3Object) => {
    const selected = getSelectedObjects();
    const finalItems = selectedKeys.has(obj.key) ? selected : [obj];

    // Internal App Drag & Drop (for moving items between folders)
    e.dataTransfer.setData('application/x-bucketstack-items', JSON.stringify({
      items: finalItems,
      sourceAccount: activeAccount,
      sourceBucket: activeAccount?.bucketName
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Batch Handlers
  const handleBatchDelete = () => {

    const items = getSelectedObjects();

    if (items.length === 0) {
      alert('No items selected to delete');
      return;
    }
    setDeleteConfirm({ items });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const renderIcon = (obj: S3Object, sizeClass: string) => {
    if (obj.isFolder) return <Folder className={`text-[var(--icon-color-accent)] fill-[var(--icon-color-accent)]/20 ${sizeClass}`} />;
    if (obj.type === 'image') return <ImageIcon className={`text-purple-500 ${sizeClass}`} />;
    if (obj.type === 'pdf') return <FileText className={`text-red-500 ${sizeClass}`} />;
    if (['zip', 'rar', 'tar', 'gz'].includes(obj.type)) return <Archive className={`text-yellow-600 ${sizeClass}`} />;
    if (['javascript', 'typescript', 'json', 'html', 'css', 'xml'].includes(obj.type)) return <FileText className={`text-blue-500 ${sizeClass}`} />;
    return <FileText className={`text-[var(--icon-color)] ${sizeClass}`} />;
  };

  if (!currentBucket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] bg-[var(--bg-secondary)]">
        <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <LayoutTemplate size={32} className="text-[var(--text-tertiary)]" />
        </div>
        <p className="text-lg font-semibold text-[var(--text-secondary)]">No Bucket Selected</p>
        <p className="text-sm mt-2 max-w-xs text-center text-[var(--text-tertiary)]">Select a bucket from the sidebar to start browsing your storage.</p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full bg-[var(--bg-primary)] relative select-none transition-colors duration-200 ${isDraggingOver ? 'bg-[var(--bg-selected)] ring-2 ring-inset ring-[var(--accent-blue)] ring-opacity-50' : ''
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >

      {/* --- Toolbar --- */}
      <div className="h-16 border-b border-[var(--border-primary)] flex items-center justify-between px-4 bg-[var(--bg-primary)]/80 backdrop-blur-md sticky top-0 z-20 shrink-0 relative">

        {/* Mobile Search Overlay */}
        {showMobileSearch ? (
          <div className="absolute inset-0 bg-[var(--bg-primary)] z-30 flex items-center px-4 animate-in fade-in slide-in-from-top-2">
            <Search size={18} className="text-[var(--text-tertiary)] mr-3" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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
                  onClick={onNavigateUp}
                  disabled={currentPrefix === ''}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-ring"
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
                <span className="text-[var(--text-primary)] font-semibold shrink-0">{currentBucket}</span>
                <span className="mx-1 text-[var(--text-tertiary)] shrink-0">/</span>
                <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                  {(currentPrefix || '').split('/').filter(Boolean).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span
                        className="hover:text-[var(--accent-blue)] hover:underline cursor-pointer transition-colors"
                        onClick={() => onNavigate(arr.slice(0, i + 1).join('/') + '/')}
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
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                {selectedKeys.size > 0 ? (
                  <div className="flex items-center gap-1 mr-2 animate-in fade-in zoom-in-95">
                    <span className="px-2 py-1 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded-md">
                      {selectedKeys.size} selected
                    </span>
                    <button onClick={() => onDownload(getSelectedObjects())} className="p-2 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors" title="Download Selected">
                      <Download size={16} />
                    </button>
                    <button onClick={() => onGetLink(getSelectedObjects())} disabled={selectedKeys.size > 1} className="p-2 rounded-md hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent text-[var(--text-secondary)] transition-colors" title={selectedKeys.size > 1 ? "Get Link only for single item" : "Get Links"}>
                      <Link size={16} />
                    </button>
                    <button onClick={handleBatchDelete} className="p-2 rounded-md hover:bg-[var(--bg-danger-subtle)] text-[var(--text-danger)] transition-colors" title="Delete Selected">
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

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2 md:hidden text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg"
              >
                <Search size={18} />
              </button>

              {/* Desktop Search */}
              <div className="relative group hidden md:block">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-blue)] transition-colors" />
                <input
                  type="text"
                  placeholder={isSearchResults ? "Results..." : "Search..."}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onGlobalSearch(filters.search);
                    }
                  }}
                  className="pl-8 pr-3 py-1.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm w-32 focus:w-48 xl:focus:w-56 focus:outline-none focus:ring-2 focus:ring-[var(--input-focus-ring)] focus:border-[var(--accent-blue)] transition-all"
                />
              </div>

              <div className="h-6 w-px bg-[var(--border-primary)] hidden md:block" />

              {/* View Toggle - Hidden on very small screens, maybe show in overflow? */}
              <div className="hidden sm:flex items-center bg-[var(--bg-tertiary)] rounded-lg p-1 border border-[var(--border-primary)] shadow-sm">
                <button onClick={() => onToggleView('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="List">
                  <ListIcon size={16} />
                </button>
                <button onClick={() => onToggleView('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Grid">
                  <Grid size={16} />
                </button>
                <button onClick={() => onToggleView('gallery')} className={`p-1.5 rounded-md transition-all ${viewMode === 'gallery' ? 'bg-[var(--bg-primary)] shadow text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Gallery">
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
              {isTrash && processedObjects.length > 0 && onEmptyTrash && (
                <button
                  onClick={onEmptyTrash}
                  className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-all shadow-sm hover:shadow active:scale-95"
                >
                  <Trash2 size={16} />
                  <span className="hidden lg:inline">Empty Trash</span>
                </button>
              )}

              {/* Overflow Menu for Mobile */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setShowToolbarMenu(!showToolbarMenu)}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <MoreVertical size={18} />
                </button>

                {showToolbarMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl z-50 py-1 animate-in fade-in zoom-in-95" onClick={() => setShowToolbarMenu(false)}>
                    <div className="px-3 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Actions
                    </div>

                    {selectedKeys.size > 0 ? (
                      <>
                        <button onClick={() => onDownload(getSelectedObjects())} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2">
                          <Download size={16} /> Download
                        </button>
                        <button onClick={handleBatchDelete} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                          <Trash2 size={16} /> Delete
                        </button>
                        <div className="border-t border-[var(--border-primary)] my-1" />
                        <button onClick={() => setSelectedKeys(new Set())} className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                          Clear Selection
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setSelectedKeys(new Set(processedObjects.map(obj => obj.key)))} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                        Select All
                      </button>
                    )}

                    <div className="border-t border-[var(--border-primary)] my-1" />
                    {/* Create Buttons in Overflow if needed, though they have FAB */}
                    <button
                      onClick={() => onCreateFile()}
                      className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 ${activeAccount?.accessMode === 'read-only' ? 'opacity-50' : ''}`}
                      disabled={activeAccount?.accessMode === 'read-only'}
                    >
                      <FilePlus size={16} /> New File
                    </button>
                    <button
                      onClick={() => onCreateFolder()}
                      className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 ${activeAccount?.accessMode === 'read-only' ? 'opacity-50' : ''}`}
                      disabled={activeAccount?.accessMode === 'read-only'}
                    >
                      <FolderPlus size={16} /> New Folder
                    </button>

                    <div className="border-t border-[var(--border-primary)] my-1 sm:hidden" />
                    {/* View Toggles for very small screens */}
                    <div className="flex justify-between px-4 py-2 sm:hidden">
                      <button onClick={() => onToggleView('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-[var(--bg-tertiary)]' : ''}`}><ListIcon size={16} /></button>
                      <button onClick={() => onToggleView('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[var(--bg-tertiary)]' : ''}`}><Grid size={16} /></button>
                      <button onClick={() => onToggleView('gallery')} className={`p-2 rounded ${viewMode === 'gallery' ? 'bg-[var(--bg-tertiary)]' : ''}`}><GalleryThumbnails size={16} /></button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onRefresh}
                className={`p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors ${isLoading ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <RefreshCw size={16} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept="*/*" onChange={(e) => e.target.files && onUpload(e.target.files)} />
            </div>
          </>
        )}
      </div>

      {/* --- Upload Status Overlay --- */}
      {uploadStatus && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-4 min-w-[300px] animate-in slide-in-from-top-4 fade-in">
          <div className={`p-2 rounded-full ${uploadStatus.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
            <ArrowUp size={18} className={uploadStatus.status === 'uploading' ? 'animate-bounce' : ''} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="truncate max-w-[150px]">{uploadStatus.fileName}</span>
              <span>{Math.round(uploadStatus.progress)}%</span>
            </div>
            <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${uploadStatus.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* --- Operation Status Overlay --- */}
      {operationStatus && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-4 min-w-[300px] animate-in slide-in-from-top-4 fade-in">
          <div className={`p-2 rounded-full flex-shrink-0 ${operationStatus.status === 'error'
            ? 'bg-red-500/20 text-red-400'
            : operationStatus.status === 'completed'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-500/20 text-blue-400'
            }`}>
            {operationStatus.status === 'processing' && (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
            {operationStatus.status === 'completed' && <Check size={18} />}
            {operationStatus.status === 'error' && <Trash2 size={18} />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium truncate">{operationStatus.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {operationStatus.status === 'processing' ? 'Processing...' : operationStatus.status === 'completed' ? 'Done!' : 'Failed'}
            </div>
          </div>
        </div>
      )}

      {/* Feature: Trash Info Note */}
      {isTrash && (
        <div className="bg-[var(--bg-secondary)] px-4 py-3 border-b border-[var(--border-primary)] flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
          <AlertCircle size={18} className="text-[var(--text-tertiary)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            If no deleted files appear here, they may have been permanently deleted from this bucket or removed directly from your storage provider, or the <code className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-primary)] font-mono">.trash/</code> folder may have been deleted externally.
          </p>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-2" onClick={handleBackgroundClick}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
            <div className="w-10 h-10 border-4 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin mb-4"></div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">Loading contents...</span>
          </div>
        ) : processedObjects.length === 0 ? (
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
                      <th className="px-4 py-3 flex-1 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors" onClick={() => setSortField('name')}>Name</th>
                      {isSearchResults && <th className="px-4 py-3 text-[var(--text-tertiary)]">Path</th>}
                      <th className="px-4 py-3 w-32 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors" onClick={() => setSortField('size')}>Size</th>
                      <th className="px-4 py-3 w-48 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors" onClick={() => setSortField('date')}>{isTrash ? 'Date Deleted' : 'Date Modified'}</th>
                      <th className="px-4 py-3 w-20">Type</th>
                      {isTrash && <th className="px-4 py-3 w-32 text-[var(--text-tertiary)]">Expiry</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)]">
                    {processedObjects.map((obj) => {
                      const isSelected = selectedKeys.has(obj.key);
                      const cutOpacity = isCut(obj.key) ? 'opacity-50' : 'opacity-100';

                      return (
                        <tr
                          key={obj.key}
                          className={`group transition-colors ${isSelected ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-subtle)]'} ${cutOpacity}`}
                          onDoubleClick={() => obj.isFolder ? onNavigate(obj.key) : null}
                          onContextMenu={(e) => handleContextMenu(e, obj)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, obj)}
                        >
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSet = new Set(selectedKeys);
                                if (newSet.has(obj.key)) newSet.delete(obj.key);
                                else newSet.add(obj.key);
                                setSelectedKeys(newSet);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5 flex items-center gap-3 cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>
                            {renderIcon(obj, "w-5 h-5")}
                            <span className={`font-medium truncate ${obj.isFolder ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{obj.name}</span>
                          </td>
                          {isSearchResults && <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs truncate max-w-[200px]" title={obj.key}>{obj.key}</td>}
                          <td className="px-4 py-2.5 text-[var(--text-secondary)] font-mono text-xs cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{formatSize(obj.size)}</td>
                          <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{formatDate(obj.lastModified)}</td>
                          <td className="px-4 py-2.5 text-[var(--text-tertiary)] text-xs uppercase tracking-wider cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>{obj.isFolder ? 'Prefix' : obj.type}</td>
                          {isTrash && (
                            <td className="px-4 py-2.5 text-[var(--text-warning-body)] text-xs font-medium cursor-pointer" onClick={(e) => handleSelection(e, obj.key)}>
                              {formatDate(obj.lastModified + 30 * 24 * 60 * 60 * 1000)}
                            </td>
                          )}
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

                  return (
                    <div
                      key={obj.key}
                      onDoubleClick={() => obj.isFolder ? onNavigate(obj.key) : null}
                      onContextMenu={(e) => handleContextMenu(e, obj)}
                      onClick={(e) => handleSelection(e, obj.key)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, obj)}
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
                          const newSet = new Set(selectedKeys);
                          if (newSet.has(obj.key)) newSet.delete(obj.key);
                          else newSet.add(obj.key);
                          setSelectedKeys(newSet);
                        }}
                        className="absolute top-2 right-2 w-4 h-4 cursor-pointer"
                      />
                      <div className="w-16 h-16 mb-3 flex items-center justify-center bg-[var(--bg-secondary)] rounded-2xl shadow-inner group-hover:scale-105 transition-transform duration-200">
                        {renderIcon(obj, "w-8 h-8")}
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
                    return (
                      <div
                        key={obj.key}
                        className={`flex items-center gap-3 p-3 cursor-pointer border-b transition-colors ${cutOpacity} ${isSelected ? 'bg-[var(--bg-selected)] border-[var(--border-selected)]' : 'border-[var(--border-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        onClick={(e) => {
                          if (obj.isFolder) {
                            onNavigate(obj.key);
                          } else {
                            handleSelection(e, obj.key);
                          }
                        }}
                        onContextMenu={(e) => handleContextMenu(e, obj)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, obj)}
                      >
                        {renderIcon(obj, "w-8 h-8")}
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{obj.name}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{formatSize(obj.size)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] m-2 rounded-xl border border-[var(--border-primary)] p-4">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                      <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin mb-4"></div>
                      <span className="text-xs">Loading preview...</span>
                    </div>
                  ) : preview?.object ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 flex items-center justify-center min-h-0">
                        {preview.url && preview.object.type === 'image' ? (
                          <img src={preview.url} alt={preview.object.name} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                        ) : preview.url && preview.object.type === 'pdf' ? (
                          <iframe src={preview.url} className="w-full h-full rounded-lg shadow-md border-none" title="PDF Preview" />
                        ) : typeof preview.content === 'string' ? (
                          <div className="w-full h-full overflow-hidden">
                            <MonacoFilePreview
                              content={preview.content}
                              fileName={preview.object.name}
                              fileType={preview.object.type}
                              theme={theme === 'dark' ? 'dark' : 'light'}
                            />
                          </div>
                        ) : (
                          <div className="text-center text-[var(--text-tertiary)]">
                            {renderIcon(preview.object, "w-16 h-16 mx-auto mb-4 opacity-50")}
                            <p className="font-semibold text-lg text-[var(--text-secondary)]">No preview available</p>
                            <p className="text-sm mt-1">This file type cannot be previewed.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-4 pt-4 border-t border-[var(--border-primary)]">
                        <p className="font-semibold text-lg text-[var(--text-primary)] truncate">{preview.object.name}</p>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] mt-2">
                          <span>{formatSize(preview.object.size)}</span>
                          <span className="text-[var(--border-secondary)]">|</span>
                          <span>Modified: {formatDate(preview.object.lastModified)}</span>
                        </div>
                      </div>
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
            {viewMode === 'columns' && (
              <div className="flex gap-4 p-4 text-center justify-center items-center h-full text-[var(--text-tertiary)]">
                <div>
                  <LayoutTemplate size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Column view requires deep file tree data.</p>
                  <button onClick={() => onToggleView('list')} className="text-[var(--accent-blue)] text-sm hover:underline mt-2">Switch to List</button>
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

      {/* --- Context Menu --- */}
      {
        contextMenu && (
          <div
            className="fixed bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl rounded-xl py-2 z-50 w-64 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.item ? (
              // Item Context Menu
              isTrash ? (
                <>
                  <button
                    onClick={() => { if (onRestore) onRestore(getSelectedObjects()); setContextMenu(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                  >
                    <RotateCcw size={14} className="text-[var(--text-tertiary)]" /> Restore
                  </button>
                  <div className="border-t border-[var(--border-primary)] my-1" />
                  <button
                    onClick={() => {
                      handleBatchDelete();
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
                          onClick={() => { onNavigate(contextMenu.item!.key); setContextMenu(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                        >
                          <Folder size={14} className="text-[var(--text-tertiary)]" /> Open
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => { onDownload(contextMenu.item!); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Download size={14} className="text-[var(--text-tertiary)]" /> Download
                          </button>
                          <button
                            onClick={() => {
                              setViewingObject(contextMenu.item!);
                              setIsViewModalOpen(true);
                              setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium border-l-2 border-[var(--accent-blue)]"
                          >
                            <Eye size={14} className="text-[var(--accent-blue)]" /> View / Preview
                          </button>
                          <button
                            onClick={() => { onGetLink([contextMenu.item!]); setContextMenu(null); }}
                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                          >
                            <Link size={14} className="text-[var(--text-tertiary)]" /> Get Link
                          </button>
                        </>
                      )}
                      {/* EDIT FILE OPTION */}
                      {!contextMenu.item.isFolder && (
                        <button
                          onClick={() => { onEditFile(contextMenu.item!); setContextMenu(null); }}
                          className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors ${activeAccount?.accessMode === 'read-only' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={activeAccount?.accessMode === 'read-only'}
                        >
                          <Edit2 size={14} className="text-[var(--text-tertiary)]" /> Edit
                        </button>
                      )}

                      {/* FAVOURITE OPTION */}
                      <button
                        onClick={() => { onToggleFavourite && onToggleFavourite(contextMenu.item!); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        {favourites.some(f => f.accountId === activeAccount?.id && f.bucket === currentBucket && f.key === contextMenu.item?.key) ? (
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
                        onClick={() => { onCut(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Scissors size={14} className="text-[var(--text-tertiary)]" /> Move to
                      </button>

                      <button
                        onClick={() => { onCopy(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Copy size={14} className="text-[var(--text-tertiary)]" /> Copy
                      </button>

                      <button
                        onClick={() => { onDuplicate(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Repeat size={14} className="text-[var(--text-tertiary)]" /> Duplicate
                      </button>

                      <div className="border-t border-[var(--border-primary)] my-1" />

                      <button
                        onClick={() => { onTransfer(getSelectedObjects(), 'copy'); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium"
                      >
                        <ArrowRight size={14} className="text-[var(--accent-blue)]" /> Copy to Bucket...
                      </button>

                      {/* TODO: Cross-bucket move is deferred for future release as it's a sensitive operation.
                          For now, users should copy to bucket first, then manually delete from source if needed.
                          This ensures data safety and prevents accidental data loss. */}

                      <div className="border-t border-[var(--border-primary)] my-1" />

                      <button
                        onClick={() => {

                          const selected = getSelectedObjects();

                          if (selected.length !== 1) {
                            alert("Please select exactly one item to rename.");
                            setContextMenu(null);
                            return;
                          }

                          setRenameModal({ object: selected[0], newName: selected[0].name });
                          setContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                        title="Rename"
                      >
                        <Edit2 size={14} className="text-[var(--text-tertiary)]" /> Rename
                      </button>
                    </>
                  ) : (
                    // Multiple items selected (>=2)
                    <>
                      <button
                        onClick={() => { onCompress(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Archive size={14} className="text-[var(--text-tertiary)]" /> Compress & Download
                      </button>

                      <div className="border-t border-[var(--border-primary)] my-1" />

                      <button
                        onClick={() => { onCopy(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Copy size={14} className="text-[var(--text-tertiary)]" /> Copy
                      </button>

                      <button
                        onClick={() => { onCut(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Scissors size={14} className="text-[var(--text-tertiary)]" /> Move to
                      </button>

                      <button
                        onClick={() => { onCompress(getSelectedObjects()); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                      >
                        <Archive size={14} className="text-[var(--text-tertiary)]" /> Compress to Zip
                      </button>

                      <div className="border-t border-[var(--border-primary)] my-1" />

                      <button
                        onClick={() => { onTransfer(getSelectedObjects(), 'copy'); setContextMenu(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors font-medium"
                      >
                        <ArrowRight size={14} className="text-[var(--accent-blue)]" /> Copy to Bucket...
                      </button>
                    </>
                  )}

                  {/* TODO: Cross-bucket move is deferred for future release as it's a sensitive operation.
                      For now, users should copy to bucket first, then manually delete from source if needed.
                      This ensures data safety and prevents accidental data loss. */}

                  <div className="border-t border-[var(--border-primary)] my-2 mx-1" />

                  <button
                    onClick={() => {

                      handleBatchDelete();
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
              !isTrash && (
                <>
                  <button
                    onClick={() => { setFolderNameInput(''); setFolderNameModal(true); setContextMenu(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors"
                  >
                    <FolderPlus size={14} className="text-[var(--text-tertiary)]" /> New Folder
                  </button>
                  <button
                    onClick={() => { onCreateFile(); setContextMenu(null); }}
                    className={`w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 rounded-md mx-1 transition-colors ${activeAccount?.accessMode === 'read-only' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                    onClick={() => { onPaste(); setContextMenu(null); }}
                    disabled={!clipboard?.hasItems || clipboard?.isCut}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-md mx-1 transition-colors"
                    title={clipboard?.isCut ? "Use 'Move to' instead" : undefined}
                  >
                    <ClipboardCopy size={14} className="text-[var(--text-tertiary)]" /> Paste
                  </button>
                </>
              )
            )}
          </div>
        )
      }

      {/* --- Delete Confirmation Modal --- */}
      {
        deleteConfirm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-danger-subtle)] flex items-center justify-center">
                    <Trash2 size={20} className="text-[var(--text-danger)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Items</h3>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {deleteConfirm.items.length === 1
                    ? isTrash
                      ? `Are you sure you want to permanently delete "${deleteConfirm.items[0].name}"? This cannot be undone.`
                      : activeAccount?.enableTrash
                        ? `Are you sure you want to move "${deleteConfirm.items[0].name}" to Trash?`
                        : `Are you sure you want to delete "${deleteConfirm.items[0].name}"? This cannot be undone.`
                    : isTrash
                      ? `Are you sure you want to permanently delete ${deleteConfirm.items.length} items? This cannot be undone.`
                      : activeAccount?.enableTrash
                        ? `Are you sure you want to move ${deleteConfirm.items.length} items to Trash?`
                        : `Are you sure you want to delete ${deleteConfirm.items.length} items? This cannot be undone.`}
                </p>

                <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
                  <div className="space-y-1 text-xs text-[var(--text-tertiary)]">
                    {deleteConfirm.items.map((item) => (
                      <div key={item.key} className="truncate text-[var(--text-secondary)]">
                        • {item.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {

                      onDelete(deleteConfirm.items);
                      setDeleteConfirm(null);
                      setSelectedKeys(new Set());
                      setContextMenu(null);
                    }}
                    className="px-4 py-2 bg-[var(--text-danger)] text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Delete {deleteConfirm.items.length > 1 ? `(${deleteConfirm.items.length})` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- Rename Modal --- */}
      {
        renameModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <Edit2 size={20} className="text-[var(--text-secondary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Rename Item</h3>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Enter a new name for <span className="font-semibold">{renameModal.object.name}</span>
                </p>

                <input
                  type="text"
                  autoFocus
                  value={renameModal.newName}
                  onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {

                      if (renameModal.newName.trim() && renameModal.newName !== renameModal.object.name) {
                        onRename(renameModal.object, renameModal.newName);
                        setRenameModal(null);
                      } else if (renameModal.newName === renameModal.object.name) {
                        alert("Name is the same as the current name.");
                      } else {
                        alert("Please enter a valid name.");
                      }
                    } else if (e.key === 'Escape') {
                      setRenameModal(null);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] mb-4 font-medium"
                  placeholder="Enter new name..."
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setRenameModal(null)}
                    className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {

                      if (renameModal.newName.trim() && renameModal.newName !== renameModal.object.name) {
                        onRename(renameModal.object, renameModal.newName);
                        setRenameModal(null);
                      } else if (renameModal.newName === renameModal.object.name) {
                        alert("Name is the same as the current name.");
                      } else {
                        alert("Please enter a valid name.");
                      }
                    }}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Rename
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- Floating Action Button --- */}
      {
        currentBucket && !isTrash && (
          <>
            {/* FAB Menu */}
            {fabOpen && (
              <div className="fixed bottom-24 right-6 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 min-w-max">
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
                    setFolderNameModal(true);
                    setFabOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 transition-colors border-t border-[var(--border-primary)]"
                >
                  <FolderPlus size={18} className="text-[var(--text-secondary)]" />
                  <span>Create Folder</span>
                </button>
                <button
                  onClick={() => {
                    onCreateFile();
                    setFabOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-3 transition-colors ${activeAccount?.accessMode === 'read-only' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  disabled={activeAccount?.accessMode === 'read-only'}
                >
                  <FilePlus size={18} className="text-[var(--text-secondary)]" />
                  <span>Create File</span>
                </button>
              </div>
            )}

            {/* FAB Button */}
            <button
              onClick={() => setFabOpen(!fabOpen)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--accent-blue)] hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95 z-40 group"
              title={fabOpen ? "Close" : "Upload or Create"}
            >
              <Plus size={24} className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''} group-hover:scale-110`} />
            </button>
          </>
        )
      }

      {/* --- Create Folder Modal --- */}
      {
        folderNameModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                    <FolderPlus size={20} className="text-[var(--text-secondary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create Folder</h3>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Enter a name for the new folder
                </p>

                <input
                  type="text"
                  autoFocus
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (folderNameInput.trim()) {
                        onCreateFolder(folderNameInput);
                        setFolderNameInput('');
                        setFolderNameModal(false);
                      } else {
                        alert("Please enter a folder name.");
                      }
                    } else if (e.key === 'Escape') {
                      setFolderNameInput('');
                      setFolderNameModal(false);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] mb-4 font-medium"
                  placeholder="Folder name..."
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setFolderNameInput('');
                      setFolderNameModal(false);
                    }}
                    className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (folderNameInput.trim()) {
                        onCreateFolder(folderNameInput);
                        setFolderNameInput('');
                        setFolderNameModal(false);
                      } else {
                        alert("Please enter a folder name.");
                      }
                    }}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }


      {/* --- Preview Modal --- */}
      {isViewModalOpen && viewingObject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => { setIsViewModalOpen(false); setViewingObject(null); }}>
          <div
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-3xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 backdrop-blur">
              <div className="flex items-center gap-3 overflow-hidden">
                {renderIcon(viewingObject, "w-6 h-6 shrink-0")}
                <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">{viewingObject.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDownload(viewingObject)}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all active:scale-95"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => { setIsViewModalOpen(false); setViewingObject(null); }}
                  className="p-2.5 rounded-xl hover:bg-[var(--bg-danger-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-danger)] transition-all active:scale-95 ml-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden relative bg-[var(--bg-secondary)]">
              {isPreviewLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                  <div className="w-10 h-10 border-4 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin mb-4"></div>
                  <span className="font-medium">Loading preview...</span>
                </div>
              ) : preview?.object && preview.object.key === viewingObject.key ? (
                <div className="w-full h-full flex flex-col p-6">
                  <div className="flex-1 flex items-center justify-center min-h-0 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-primary)] overflow-hidden shadow-inner">
                    {preview.url && preview.object.type === 'image' ? (
                      <img src={preview.url} alt={preview.object.name} className="max-w-full max-h-full object-contain" />
                    ) : preview.url && preview.object.type === 'pdf' ? (
                      <iframe src={preview.url} className="w-full h-full border-none" title="PDF Preview" />
                    ) : typeof preview.content === 'string' ? (
                      <div className="w-full h-full overflow-hidden">
                        <MonacoFilePreview
                          content={preview.content}
                          fileName={preview.object.name}
                          fileType={preview.object.type}
                          theme={theme === 'dark' ? 'dark' : 'light'}
                        />
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        {renderIcon(preview.object, "w-24 h-24 mx-auto mb-6 opacity-30")}
                        <p className="font-bold text-xl text-[var(--text-primary)]">No preview available</p>
                        <p className="text-[var(--text-tertiary)] mt-2">The format of this file doesn't support in-app viewing.</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Size</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{formatSize(preview.object.size)}</span>
                      </div>
                      <div className="flex flex-col border-l border-[var(--border-primary)] pl-6">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Last Modified</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{formatDate(preview.object.lastModified)}</span>
                      </div>
                      <div className="flex flex-col border-l border-[var(--border-primary)] pl-6">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Type</span>
                        <span className="text-sm font-medium text-[var(--text-primary)] uppercase">{preview.object.type || 'unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                  <p>Initializing preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};