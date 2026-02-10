import React, { useState } from 'react';
import {
    Cloud,
    Plus,
    Eye,
    RotateCw,
    FileText,
    Database,
    ChevronDown,
    Check
} from 'lucide-react';

interface DemoBucket {
    id: string;
    name: string;
    provider: 'aws' | 'cloudflare' | 'minio' | 'wasabi' | 'digitalocean';
    icon: string;
}

const DEMO_BUCKETS: DemoBucket[] = [
    { id: '1', name: 'testt', provider: 'minio', icon: '/icons/minio.jpeg' },
    { id: '2', name: 'my-bucket', provider: 'aws', icon: '/icons/s3.svg' },
    { id: '3', name: 'media-assets', provider: 'cloudflare', icon: '/icons/r2.svg' },
    { id: '4', name: 'backups-2024', provider: 'wasabi', icon: '/icons/wasabi.jpg' },
    { id: '5', name: 'static-site', provider: 'digitalocean', icon: '/icons/spaces.svg' },
];

const DemoTrayWindow: React.FC = () => {
    // macOS System Font Stack
    const fontStyle = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" };

    const [selectedBucket, setSelectedBucket] = useState<DemoBucket>(DEMO_BUCKETS[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center py-10" style={fontStyle}>
            {/* Mock Menu Bar */}
            <div className="w-full max-w-[400px] h-[30px] bg-[#E8E8E8]/90 backdrop-blur-md rounded-t-lg border-b border-[#000000]/10 flex items-center justify-end px-4 gap-4 shadow-sm relative z-0 mb-4 opacity-50 grayscale">
                <div className="text-[13px] font-medium text-black/80">9:41 AM</div>
                <div className="text-[13px] font-medium text-black/80">Wed 10 Oct</div>
                <div className="flex items-center justify-center opacity-80">
                    <img src="/logo.png" alt="BS" className="w-4 h-4 object-contain" />
                </div>
            </div>

            {/* Tray Window (Popover) - Matches Screenshot */}
            <div className="w-[360px] bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col relative z-10 font-sans">
                {/* Header */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img src="/logo.png" alt="BucketStack" className="w-8 h-8 object-contain" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">BucketStack</h1>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl px-3 py-1.5 flex items-center gap-2 group"
                        >
                            <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center shadow-sm overflow-hidden p-0.5">
                                <img src={selectedBucket.icon} alt={selectedBucket.provider} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{selectedBucket.name}</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Bucket Selection Dropdown */}
                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10 cursor-default"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-50 mb-1">
                                        Select Bucket
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {DEMO_BUCKETS.map((bucket) => (
                                            <button
                                                key={bucket.id}
                                                onClick={() => {
                                                    setSelectedBucket(bucket);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-50 transition-colors ${selectedBucket.id === bucket.id ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <div className="w-5 h-5 bg-white border border-gray-100 rounded-md flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                                                    <img src={bucket.icon} alt={bucket.provider} className="w-full h-full object-contain" />
                                                </div>
                                                <span className={`text-sm truncate flex-1 text-left ${selectedBucket.id === bucket.id ? 'font-semibold text-blue-600' : 'text-gray-600'}`}>
                                                    {bucket.name}
                                                </span>
                                                {selectedBucket.id === bucket.id && (
                                                    <Check size={14} className="text-blue-500" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Drop Zone */}
                <div className="px-4 py-4">
                    <div className="bg-[#F5F7FA] rounded-[24px] border border-transparent hover:border-blue-200 transition-colors p-6 flex flex-col items-center justify-center relative group cursor-pointer h-[180px]">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-blue-500 group-hover:scale-110 transition-transform duration-300">
                            <Cloud size={32} fill="currentColor" className="text-blue-100" />
                        </div>
                        <h3 className="text-gray-800 font-bold text-lg mb-1.5">Click or Drag files</h3>
                        <p className="text-gray-400 text-xs text-center max-w-[200px] leading-relaxed">
                            Upload to <span className="font-semibold text-gray-500">{selectedBucket.name}</span><br />
                            Click the tray icon to close
                        </p>

                        {/* Plus Button */}
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-blue-500 hover:scale-105 transition-all cursor-pointer">
                            <Plus size={22} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Empty State / Content Area */}
                <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center opacity-40">
                    <FileText size={40} className="text-gray-300 mb-2" strokeWidth={1.5} />
                    <p className="text-gray-400 font-medium text-sm">No recent files</p>
                </div>

                {/* Footer Status */}
                <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100/50 rounded-full flex items-center justify-center text-blue-500 animate-spin-slow">
                                <RotateCw size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">1 Active Syncs</h4>
                                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">Syncing to {selectedBucket.provider}</p>
                            </div>
                        </div>
                        <button className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                            <Eye size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoTrayWindow;
