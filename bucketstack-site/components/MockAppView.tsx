import React, { useState, useEffect } from 'react';
import {
    HardDrive, Folder, File, MoreHorizontal, Search, ChevronRight,
    Box, Trash2, RefreshCw, Settings, History, BarChart3,
    Plus, MoreVertical, Download, Link, Eye, Edit2,
    FilePlus, FolderPlus, ArrowLeft, Database, Server,
    List, Grid, Layout, Upload, Shield, Share2, Clipboard
} from 'lucide-react';

// --- Types ---
interface MockObject {
    name: string;
    key: string;
    size: string;
    type: 'folder' | 'image' | 'zip' | 'pdf' | 'text' | 'code';
    date: string;
}

interface MockBucket {
    name: string;
    objects: MockObject[];
}

interface MockAccount {
    id: string;
    name: string;
    provider: string;
    buckets: MockBucket[];
    accessMode: 'read-write' | 'read-only';
}

// --- Mock Data ---
const MOCK_DATA: MockAccount[] = [
    {
        id: 'mio-testt',
        name: 'mio',
        provider: 'minio',
        accessMode: 'read-write',
        buckets: [{ name: 'testt', objects: [] }]
    },
    {
        id: 'my-one',
        name: 'MyOne',
        provider: 'aws',
        accessMode: 'read-write',
        buckets: [{ name: 'test-b', objects: [] }]
    }
];

const MockAppView: React.FC = () => {
    const [activeAccount, setActiveAccount] = useState<MockAccount>(MOCK_DATA[0]);
    const [activeBucket, setActiveBucket] = useState<MockBucket>(MOCK_DATA[0].buckets[0]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any } | null>(null);

    const handleAccountSelect = (acc: MockAccount) => {
        setActiveAccount(acc);
        setActiveBucket(acc.buckets[0]);
        setCurrentPath('');
        setSelectedKeys(new Set());
    };

    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    return (
        <div className="relative mx-auto max-w-6xl w-full group/window select-none">
            {/* Container */}
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[750px] font-sans text-gray-900 transition-all duration-700">

                {/* Title Bar - Center Aligned */}
                <div className="h-10 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
                    <div className="flex space-x-2 w-20">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                    </div>
                    <div className="flex-1 text-center text-xs font-bold text-gray-900 tracking-tight">BucketStack</div>
                    <div className="w-20"></div>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar - Exact match to screenshot */}
                    <div className="w-64 flex flex-col border-r border-gray-100 bg-white h-full shrink-0">
                        {/* Logo area */}
                        <div className="h-12 flex items-center px-4 gap-2 mb-2">
                            <div className="p-1 bg-indigo-50 rounded">
                                <img src="/logo.png" alt="Logo" className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-black text-gray-900 tracking-tight">BucketStack</span>
                        </div>

                        {/* Permission Legend */}
                        <div className="px-4 mb-4">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="flex items-center gap-1">
                                    <span className="flex items-center justify-center w-3 h-3 text-[8px] font-bold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">R</span>
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Read-only</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="flex items-center justify-center w-3 h-3 text-[8px] font-bold rounded bg-gray-100 text-gray-500 border border-gray-200">W</span>
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">Write Access</span>
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-300 leading-tight">Right-click connection to reload permissions if access changes.</p>
                        </div>

                        {/* Connections Section */}
                        <div className="px-3 space-y-4">
                            <div>
                                <div className="px-2 mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Connections</span>
                                    <Plus size={14} className="text-gray-400 hover:text-indigo-600 cursor-pointer" />
                                </div>
                                <div className="space-y-1">
                                    {MOCK_DATA.map(acc => (
                                        <button
                                            key={acc.id}
                                            onClick={() => handleAccountSelect(acc)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeAccount.id === acc.id ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/25' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <div className={`w-5 h-5 flex items-center justify-center rounded ${activeAccount.id === acc.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                                <img src={acc.provider === 'minio' ? '/icons/minio.jpeg' : '/icons/s3.svg'} className="w-3.5 h-3.5 object-contain" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[13px] font-bold truncate">{acc.name}</span>
                                                    <span className={`flex items-center justify-center w-3.5 h-3.5 text-[9px] font-bold rounded ${activeAccount.id === acc.id ? 'bg-white text-blue-600' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>W</span>
                                                </div>
                                                <p className={`text-[10px] ${activeAccount.id === acc.id ? 'text-blue-100' : 'text-gray-400'}`}>{acc.buckets[0].name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 mt-20">
                                <div className="px-2 mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Bucket Features</span>
                                </div>
                                <div className="space-y-0.5">
                                    {[
                                        { icon: Box, label: 'Root' },
                                        { icon: Trash2, label: 'Trash' },
                                        { icon: RefreshCw, label: 'Folder Sync' },
                                        { icon: History, label: 'Activity' },
                                        { icon: BarChart3, label: 'Storage Analytics', active: true },
                                    ].map((item, i) => (
                                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 text-xs transition-colors rounded-lg cursor-pointer ${item.active ? 'text-blue-600 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>
                                            <item.icon size={16} className={item.active ? 'text-blue-600' : 'text-gray-400'} />
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto p-3 border-t border-gray-100 flex items-center gap-2">
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                                <Settings size={14} className="text-gray-500" />
                                <span className="text-[11px] font-bold text-gray-600">BucketStack Settings</span>
                            </div>
                            <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shadow-sm">
                                <Shield size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Explorer Area */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                        {/* Exact Toolbar from Screenshot */}
                        <div className="h-16 border-b border-gray-100 flex items-center px-4 gap-4 justify-between bg-white z-10 shrink-0">
                            <div className="flex items-center gap-4 flex-1">
                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></button>

                                {/* Address Bar */}
                                <div className="flex items-center bg-[#F3F4F6] border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-0 gap-1 shadow-inner">
                                    <span className="text-xs text-gray-400 font-medium">localhost:9000/</span>
                                    <span className="text-xs text-gray-900 font-bold truncate">testt</span>
                                    <span className="text-xs text-gray-300">/</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="text-[11px] font-bold text-blue-600 hover:underline">Select All</button>

                                {/* Search Bar */}
                                <div className="relative group w-48">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                                </div>

                                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                                {/* View Controls */}
                                <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-100">
                                    <button className="p-1.5 text-blue-600 bg-white shadow-sm border border-gray-200/50 rounded-md"><List size={14} /></button>
                                    <button className="p-1.5 text-gray-400 hover:text-gray-600"><Grid size={14} /></button>
                                    <button className="p-1.5 text-gray-400 hover:text-gray-600"><Layout size={14} /></button>
                                </div>

                                <button className="flex items-center gap-2 bg-[#3B82F6] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                    <Upload size={14} strokeWidth={3} />
                                    <span>Upload</span>
                                </button>

                                <button className="p-2 text-gray-400 hover:text-gray-600"><RefreshCw size={16} /></button>
                            </div>
                        </div>

                        {/* Empty State / File List */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white relative">
                            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100/50 overflow-hidden relative group/icon">
                                <Upload size={32} className="text-[#3B82F6] transition-transform duration-500" strokeWidth={1.5} />
                                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/icon:opacity-100 transition-opacity"></div>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Empty Folder</h3>
                            <p className="text-xs text-gray-400 font-medium">Drag files here to upload or Right Click to start</p>

                            {/* Floating Action Button (FAB) */}
                            <button className="absolute bottom-8 right-8 w-14 h-14 bg-[#3B82F6] text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all z-20">
                                <Plus size={32} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Status Bar */}
                        <div className="h-10 bg-white border-t border-gray-100 px-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
                                <span>0 items</span>
                                <span className="w-px h-3 bg-gray-200"></span>
                                <span>-- total</span>
                            </div>
                            <div className="text-[10px] text-gray-300 italic font-medium -tracking-tight">
                                tip: change view to Gallery to automatically see your file previews
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Decorative Layer */}
            <div className="absolute -inset-16 bg-gradient-to-tr from-blue-50/50 via-indigo-50/50 to-purple-50/50 blur-[120px] -z-20 pointer-events-none rounded-full opacity-0 group-hover/window:opacity-100 transition-opacity duration-1000"></div>
        </div>
    );
};

export default MockAppView;
