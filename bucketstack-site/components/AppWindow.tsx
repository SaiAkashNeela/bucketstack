import React from 'react';
import { HardDrive, Folder, File, MoreHorizontal, Search, ChevronRight, Cloud, DownloadCloud, ArrowUpCircle } from 'lucide-react';

const AppWindow: React.FC = () => {
  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Window Container */}
      <div className="bg-white rounded-xl shadow-window border border-gray-200 overflow-hidden flex flex-col aspect-[16/10] md:aspect-[16/9]">
        
        {/* Title Bar */}
        <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 space-x-2 shrink-0">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 text-center text-xs text-gray-400 font-medium">BucketStack</div>
          <div className="w-14"></div> {/* Spacer for balance */}
        </div>

        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-gray-100 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center space-x-4">
             <div className="flex space-x-1 text-gray-400">
               <div className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4 rotate-180" /></div>
               <div className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></div>
             </div>
             <div className="text-sm font-medium text-gray-700 flex items-center">
                <Cloud className="w-4 h-4 mr-2 text-indigo-500" />
                <span>production-assets</span>
                <span className="mx-2 text-gray-300">/</span>
                <span>images</span>
             </div>
          </div>
          <div className="flex items-center space-x-3">
             <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" />
                <input type="text" placeholder="Search..." className="pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
             </div>
             <div className="h-4 w-px bg-gray-200"></div>
             <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <DownloadCloud className="w-4 h-4" />
             </button>
             <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md">
                <ArrowUpCircle className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-48 md:w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-6 hidden sm:flex">
             <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accounts</h3>
                <ul className="space-y-1">
                   <li className="flex items-center space-x-2 px-2 py-1.5 bg-white shadow-sm border border-gray-200 rounded-md text-sm font-medium text-gray-800">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>AWS S3 (Main)</span>
                   </li>
                   <li className="flex items-center space-x-2 px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      <span>Cloudflare R2</span>
                   </li>
                </ul>
             </div>
             
             <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Buckets</h3>
                <ul className="space-y-1">
                   {['production-assets', 'backups-daily', 'user-uploads', 'static-site'].map((bucket, i) => (
                      <li key={bucket} className={`flex items-center space-x-2 px-2 py-1.5 text-sm rounded-md cursor-pointer ${i === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                         <HardDrive className={`w-4 h-4 ${i === 0 ? 'text-indigo-500' : 'text-gray-400'}`} />
                         <span className="truncate">{bucket}</span>
                      </li>
                   ))}
                </ul>
             </div>
          </div>

          {/* File List */}
          <div className="flex-1 bg-white flex flex-col">
             {/* Header */}
             <div className="grid grid-cols-12 px-6 py-2 border-b border-gray-100 text-xs font-medium text-gray-500">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-3">Last Modified</div>
                <div className="col-span-1"></div>
             </div>

             {/* Rows */}
             <div className="flex-1 overflow-y-auto p-2">
                {[
                  { name: 'landing-hero-v2.png', size: '2.4 MB', type: 'image', date: 'Just now' },
                  { name: 'icons-set.zip', size: '14 MB', type: 'zip', date: '2 min ago' },
                  { name: 'brand-guidelines.pdf', size: '450 KB', type: 'pdf', date: 'Yesterday' },
                  { name: 'mockups', size: '-', type: 'folder', date: 'Oct 24, 2023' },
                  { name: 'client-logos', size: '-', type: 'folder', date: 'Oct 20, 2023' },
                  { name: 'screenshot-01.jpg', size: '1.2 MB', type: 'image', date: 'Oct 15, 2023' },
                  { name: 'data-export.csv', size: '45 KB', type: 'text', date: 'Oct 12, 2023' },
                ].map((file, i) => (
                   <div key={i} className="group grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 rounded-lg cursor-default transition-colors border border-transparent hover:border-gray-100">
                      <div className="col-span-6 flex items-center space-x-3">
                         {file.type === 'folder' ? 
                            <Folder className="w-5 h-5 text-blue-400 fill-blue-50" /> : 
                            <File className="w-5 h-5 text-gray-400" />
                         }
                         <span className="text-sm text-gray-700 font-medium truncate">{file.name}</span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-500">{file.size}</div>
                      <div className="col-span-3 text-sm text-gray-500">{file.date}</div>
                      <div className="col-span-1 text-right opacity-0 group-hover:opacity-100">
                         <button className="p-1 hover:bg-gray-200 rounded"><MoreHorizontal className="w-4 h-4 text-gray-500" /></button>
                      </div>
                   </div>
                ))}
             </div>
             
             {/* Status Bar */}
             <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                <span>7 items selected</span>
                <span>Total size: 18.2 MB</span>
             </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-10 blur-2xl -z-10"></div>
    </div>
  );
};

export default AppWindow;