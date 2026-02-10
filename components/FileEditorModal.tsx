import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface CreateFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, content: string) => Promise<void>;
    currentPath: string;
    initialName?: string;
    initialContent?: string;
    mode?: 'create' | 'edit';
}

export const FileEditorModal: React.FC<CreateFileModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentPath,
    initialName = '',
    initialContent = '',
    mode = 'create'
}) => {
    const [fileName, setFileName] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFileName(initialName);
            setContent(initialContent);
            setError('');
            setIsSaving(false);
        }
    }, [isOpen, initialName, initialContent]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileName.trim()) {
            setError('Please enter a filename.');
            return;
        }

        // Basic validation
        if (!fileName.includes('.')) {
            setError('Please include a file extension (e.g., .txt, .md, .json).');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            await onSave(fileName.trim(), content);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save file.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col h-[80vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center">
                            <FileText size={20} className="text-[var(--accent-blue)]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                {mode === 'edit' ? 'Edit File' : 'New File'}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                {mode === 'edit' ? 'Editing in: ' : 'Creating in: '}
                                <span className="font-mono text-[var(--text-primary)]">{currentPath || '/'}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Filename</label>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="e.g., notes.txt, readme.md, config.json"
                            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent outline-none transition-all text-sm font-mono"
                            autoFocus={mode === 'create'} // Auto-focus filename only in create mode
                            disabled={mode === 'edit'} // Disable filename editing in edit mode for simplicity first
                        />
                        {mode === 'edit' && (
                            <p className="text-xs text-[var(--text-secondary)]">
                                To rename, use the Rename option in the file list.
                            </p>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Content</label>
                        <div className="flex-1 border border-[var(--border-primary)] rounded-lg overflow-hidden">
                            <Editor
                                height="100%"
                                language={(() => {
                                    const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                    const languageMap: Record<string, string> = {
                                        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
                                        'json': 'json', 'html': 'html', 'css': 'css', 'scss': 'scss', 'xml': 'xml',
                                        'svg': 'xml', 'md': 'markdown', 'py': 'python', 'java': 'java', 'c': 'c',
                                        'cpp': 'cpp', 'cs': 'csharp', 'php': 'php', 'rb': 'ruby', 'go': 'go',
                                        'rs': 'rust', 'sh': 'shell', 'sql': 'sql', 'yaml': 'yaml', 'yml': 'yaml'
                                    };
                                    return languageMap[ext] || 'plaintext';
                                })()}
                                value={content}
                                onChange={(value) => setContent(value || '')}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 13,
                                    lineNumbers: 'on',
                                    renderWhitespace: 'selection',
                                    automaticLayout: true,
                                    wordWrap: 'on',
                                    folding: true,
                                    contextmenu: true,
                                    tabSize: 2,
                                    insertSpaces: true,
                                }}
                                loading={
                                    <div className="flex items-center justify-center h-full bg-[var(--bg-secondary)]">
                                        <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
                            {error}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] rounded-b-xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium bg-[var(--accent-blue)] hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save size={16} /> {mode === 'edit' ? 'Save Changes' : 'Create File'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
