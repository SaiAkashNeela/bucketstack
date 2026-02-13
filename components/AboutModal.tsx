import React from 'react';
import { X, Globe, Mail, ExternalLink } from 'lucide-react';


import { createPortal } from 'react-dom';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version?: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, version = '1.0.0' }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">About BucketStack</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Logo & Version */}
          <div className="text-center">
            <img src="/logo.png" alt="BucketStack" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">BucketStack</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-2">Native S3 File Manager</p>
            <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              v{version}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-center">
            A beautiful, fast, and secure file manager for AWS S3, Cloudflare R2, MinIO, and other S3-compatible storage.
          </p>

          {/* Built with Rust */}
          <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Built with</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Rust • Tauri • React</p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <a
              href="https://www.bucketstack.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Globe size={16} />
              Visit Website
              <ExternalLink size={14} />
            </a>
            <a
              href="mailto:akash@bucketstack.app"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Mail size={16} />
              akash@bucketstack.app
            </a>
          </div>

          {/* License */}
          <div className="text-center text-xs text-[var(--text-tertiary)] space-y-1">
            <p>Open Source • MIT License</p>
            <p>© {new Date().getFullYear()} BucketStack</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
