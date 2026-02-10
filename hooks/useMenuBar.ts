import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export const useMenuBar = (
  onQuickUpload: () => void,
  onNewFolder?: () => void,
  onCreateBucket?: () => void,
  onShowWindow?: () => void,
  onHideWindow?: () => void
) => {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Check if Tauri is available
    if (!((window as any).__TAURI_INTERNALS__)) {
      console.warn('Tauri not initialized yet, menu bar listeners will not be registered');
      return;
    }

    // Listen for quick upload from menu bar
    listen('quick-upload', () => {
      onQuickUpload();
    }).then((unlisten) => unsubscribers.push(unlisten))
      .catch((error) => console.warn('Failed to listen for quick-upload:', error));

    // Listen for new folder from menu bar
    if (onNewFolder) {
      listen('new-folder', () => {
        onNewFolder();
      }).then((unlisten) => unsubscribers.push(unlisten))
        .catch((error) => console.warn('Failed to listen for new-folder:', error));
    }

    // Listen for create bucket from menu bar
    if (onCreateBucket) {
      listen('create-bucket', () => {
        onCreateBucket();
      }).then((unlisten) => unsubscribers.push(unlisten))
        .catch((error) => console.warn('Failed to listen for create-bucket:', error));
    }

    // Listen for show window from menu bar
    if (onShowWindow) {
      listen('show-window', () => {
        onShowWindow();
      }).then((unlisten) => unsubscribers.push(unlisten))
        .catch((error) => console.warn('Failed to listen for show-window:', error));
    }

    // Listen for hide window from menu bar
    if (onHideWindow) {
      listen('hide-window', () => {
        onHideWindow();
      }).then((unlisten) => unsubscribers.push(unlisten))
        .catch((error) => console.warn('Failed to listen for hide-window:', error));
    }

    return () => {
      unsubscribers.forEach((unlisten) => unlisten());
    };
  }, [onQuickUpload, onNewFolder, onCreateBucket, onShowWindow, onHideWindow]);
};