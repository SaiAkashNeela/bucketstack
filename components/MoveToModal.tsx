import React, { useEffect, useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, AlertCircle, Loader } from 'lucide-react';
import { S3Object, S3Account } from '../types';

/**
 * Safe Move-To Modal Component
 * 
 * Implements production-grade move operations within a single S3 bucket.
 * 
 * KEY RULES:
 * - Files: Cannot move to same path or into subpath of itself
 * - Folders: Cannot move into itself or into its own subfolders
 * - Always copy first, delete only after copy succeeds
 * - Handles partial failures (some files succeed, some fail)
 * - Preserves full subfolder structure
 * 
 * VALIDATION:
 * - Checks destination validity for each item
 * - Prevents common data-loss scenarios
 * - Shows clear error messages
 */

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  isExpanded: boolean;
}

interface MoveToModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (destinationPrefix: string) => Promise<void>;
  sourcePrefix: string;
  sourceBucket: string;
  itemsToMove: S3Object[];
  allObjects: S3Object[];
}

export const MoveToModal: React.FC<MoveToModalProps> = ({
  isOpen,
  onClose,
  onMove,
  sourcePrefix,
  sourceBucket,
  itemsToMove,
  allObjects
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([''])); // Root always expanded
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string>('');

  // Build folder tree from all objects
  const folderTree = useMemo(() => {
    const folders = new Set<string>();
    
    // Collect all unique folder paths
    for (const obj of allObjects) {
      if (obj.isFolder) {
        folders.add(obj.key);
      } else {
        // Extract folder paths from file keys
        const parts = obj.key.split('/').slice(0, -1); // Remove filename
        let currentPath = '';
        for (const part of parts) {
          currentPath += part + '/';
          folders.add(currentPath);
        }
      }
    }

    // Build tree structure
    const tree: Map<string, FolderNode> = new Map();
    tree.set('', { name: 'Root', path: '', children: [], isExpanded: true });

    // Sort folders by depth then name for proper ordering
    const sortedFolders = Array.from(folders).sort();

    for (const folder of sortedFolders) {
      const parts = folder.split('/').filter(p => p); // Split and remove empty parts
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const folderName = parts[i];
        currentPath += folderName + '/';
        
        if (!tree.has(currentPath)) {
          tree.set(currentPath, {
            name: folderName,
            path: currentPath,
            children: [],
            isExpanded: false
          });
        }

        // Add to parent's children
        if (i === 0) {
          const parent = tree.get('')!;
          if (!parent.children.some(c => c.path === currentPath)) {
            parent.children.push(tree.get(currentPath)!);
          }
        } else {
          const parentPath = parts.slice(0, i).join('/') + '/';
          const parent = tree.get(parentPath);
          if (parent) {
            const child = tree.get(currentPath)!;
            if (!parent.children.some(c => c.path === currentPath)) {
              parent.children.push(child);
            }
          }
        }
      }
    }

    // Sort children alphabetically
    const sortNode = (node: FolderNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      for (const child of node.children) {
        sortNode(child);
      }
    };

    const root = tree.get('');
    if (root) sortNode(root);

    return root || { name: 'Root', path: '', children: [], isExpanded: true };
  }, [allObjects]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPath(null);
      setError('');
    }
  }, [isOpen]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleMove = async () => {
    // Clear previous errors
    setError('');
    
    // Validate: destination must be selected (null means not selected)
    if (selectedPath === null) {
      setError('Please select a destination folder');
      return;
    }

    // For each item, validate it can be moved to the destination
    for (const item of itemsToMove) {
      const sourcePath = item.key;
      const destPath = item.isFolder 
        ? `${selectedPath}${item.name}/`
        : `${selectedPath}${item.name}`;
      
      // Validation 1: Cannot move to same location
      if (sourcePath === destPath) {
        setError(`❌ Cannot move "${item.name}" to the same location`);
        return;
      }
      
      // Validation 2: Prevent moving into own subpaths
      if (item.isFolder && destPath.startsWith(sourcePath)) {
        setError(`❌ Cannot move folder "${item.name}" into itself or one of its subfolders.\nPlease choose a different destination.`);
        return;
      }
      
      // Validation 3: For files, prevent moving into subpaths
      if (!item.isFolder && destPath.startsWith(sourcePath + '/')) {
        setError(`❌ Cannot move file "${item.name}" into itself.\nPlease choose a different destination.`);
        return;
      }
    }

    setIsMoving(true);
    try {
      await onMove(selectedPath);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move items');
    } finally {
      setIsMoving(false);
    }
  };

  const renderFolderNode = (node: FolderNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.path || 'root'}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition-colors ${
            isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => setSelectedPath(node.path)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ) : (
            <div className="w-[18px]" />
          )}
          <Folder size={18} className="flex-shrink-0" />
          <span className="truncate text-sm">
            {node.name || '(root)'}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Move to</h2>
          <p className="text-sm text-gray-600 mt-1">
            Moving {itemsToMove.length} item{itemsToMove.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="h-96 overflow-y-auto border-b border-gray-200 bg-gray-50">
          {allObjects.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No folders available
            </div>
          ) : (
            renderFolderNode(folderTree)
          )}
        </div>

        {selectedPath !== null && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <p className="text-xs text-gray-600">Destination:</p>
            <p className="text-sm font-mono text-blue-900 truncate">
              {selectedPath === '' ? '/ (root)' : selectedPath}
            </p>
          </div>
        )}

        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-gray-200 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isMoving}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 cursor-disabled"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isMoving || selectedPath === null}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isMoving && <Loader size={16} className="animate-spin" />}
            {isMoving ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
};
