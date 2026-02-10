import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Eye, Code, Copy, Check } from 'lucide-react';

interface MonacoFilePreviewProps {
    content: string;
    fileName: string;
    fileType: string;
    theme?: 'light' | 'dark';
}

export const MonacoFilePreview: React.FC<MonacoFilePreviewProps> = ({
    content,
    fileName,
    fileType,
    theme = 'dark'
}) => {
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    // Determine Monaco language from file extension
    const getLanguage = (name: string): string => {
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'json': 'json',
            'json5': 'json',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'xml': 'xml',
            'svg': 'xml',
            'md': 'markdown',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'hpp': 'cpp',
            'h': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'sh': 'shell',
            'bash': 'shell',
            'sql': 'sql',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'ini': 'ini',
            'dockerfile': 'dockerfile',
            'graphql': 'graphql',
            'vue': 'html',
            'svelte': 'html',
            'txt': 'plaintext',
        };
        return languageMap[ext] || 'plaintext';
    };

    const language = getLanguage(fileName);
    const isSVG = fileType === 'image' && fileName.toLowerCase().endsWith('.svg');

    // For SVG files, show preview/code toggle
    const showToggle = isSVG;

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toggle for SVG files */}
            {showToggle && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)]">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'preview'
                            ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                    >
                        <Eye size={16} />
                        Preview
                    </button>
                    <button
                        onClick={() => setViewMode('code')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'code'
                            ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                    >
                        <Code size={16} />
                        Code
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`}
                        title="Copy to clipboard"
                    >
                        {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        {isCopied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}

            {!showToggle && (
                <div className="flex items-center justify-end mb-2">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]`}
                        title="Copy to clipboard"
                    >
                        {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        {isCopied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-[var(--border-primary)]">
                {isSVG && viewMode === 'preview' ? (
                    // SVG Preview
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] p-8">
                        <div
                            className="max-w-full max-h-full"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                ) : (
                    // Monaco Editor for code view
                    <Editor
                        height="100%"
                        language={language}
                        value={content}
                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                        options={{
                            readOnly: true,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            lineNumbers: 'on',
                            renderWhitespace: 'selection',
                            automaticLayout: true,
                            wordWrap: 'on',
                            folding: true,
                            contextmenu: true,
                            selectOnLineNumbers: true,
                            roundedSelection: false,
                            cursorStyle: 'line',
                            glyphMargin: false,
                            lineDecorationsWidth: 0,
                            lineNumbersMinChars: 3,
                            renderLineHighlight: 'all',
                            scrollbar: {
                                vertical: 'auto',
                                horizontal: 'auto',
                                useShadows: false,
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10,
                            },
                        }}
                        loading={
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-[var(--border-primary)] border-t-[var(--accent-blue)] rounded-full animate-spin" />
                            </div>
                        }
                    />
                )}
            </div>
        </div>
    );
};
