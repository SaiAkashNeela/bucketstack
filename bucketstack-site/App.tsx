import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Github,
  Terminal,
  Zap,
  Lock,
  RefreshCw,
  Trash2,
  Copy,
  Globe,
  Download,
  CheckCircle2,
  ServerOff,
  Coffee,
  Activity,
  Code2,
  LayoutGrid,
  Cpu,
  MousePointer2,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  HardDrive,
  FolderSync,
  FileCode2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import Button from './components/Button';
import Section from './components/Section';
import InteractiveFileManager from './components/InteractiveFileManager';
import DemoTrayWindow from './components/DemoTrayWindow';
import ProviderIcon from './components/ProviderIcon';
import { HelmetProvider } from 'react-helmet-async';
import SEO from './components/SEO';
import { releaseService } from './services/releaseService';

// Authentic OS Logos
const AppleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.64 3.98-1.54 1.29.08 2.36.85 2.81 1.62-3.14 1.87-2.31 6.55 1.05 7.91-.48 1.4-1.2 2.76-2.92 4.24zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const WindowsLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.551L24 0v11.4h-13.051V1.898zm-10.949 10.8h9.75V21.9L0 20.55v-7.852zm10.949 0H24V24l-13.051-1.898V12.698z" />
  </svg>
);

const LinuxLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.2c1.7 0 3.2.5 4.5 1.4-.4.8-1 2-1.7 3.3-1.3-.4-2.8-.4-4.2.3-.6-1.3-1.2-2.3-1.6-3 1.3-.9 2.8-1.4 4.5-1.4zm-6.2 4.1c.3.5.7 1.3 1.3 2.5-1.6 1.4-2.2 3.8-1.4 6 .1.3.3.6.4.9-.7.4-1.4 1-1.9 1.7-1.3-1.6-2.1-3.6-2.1 -5.8 0-2 1.3-3.8 3.7-5.3zm9.6 1.2c.4 1 1 2.3 1.8 3.6 1-.3 2.1-.3 3.1 0 .2-1.4.1-2.9-.5-4.2-1.2-.5-2.6-.3-3.7.6-.2 0-.4 0-.7 0zM12 10c2 0 3.9.7 5.4 1.8-.4 2-1.4 3.7-2.9 5v.2c0 1.9-1.5 2.4-1.9 2.5H11.4c-.4-.1-1.9-.6-1.9-2.5v-.2c-1.5-1.3-2.5-3-2.9-5C8.1 10.7 10 10 12 10zm-6.7 8.3c.7-.9 1.6-1.5 2.6-1.9.1.5.3 1 .6 1.4-.8.6-1.5 1.4-2 2.3-.4-.6-.9-1.2-1.2-1.8zm11.5 1.8c-.5-1-1.2-1.8-2-2.3.2-.4.4-.9.6-1.4 1 .4 1.9 1 2.6 1.9-.4.6-.8 1.2-1.2 1.8z" />
  </svg>
);

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState<{
    version: string | null;
    macos: string;
    windows: string;
    linux: string;
  } | null>(null);

  useEffect(() => {
    releaseService.getDownloadLinks().then((links) => {
      setDownloadLinks(links);
    });
  }, []);

  const versionText = downloadLinks?.version ? `v${downloadLinks.version}` : 'v1.0.6';

  return (
    <HelmetProvider>
      <SEO />
      <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        
        {/* Navigation Bar */}
        <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                <img src="/logo.png" alt="BucketStack" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                  BucketStack
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200/60">
                    Rust
                  </span>
                </span>
              </div>
            </a>

            <nav className="hidden md:flex items-center gap-7">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
              <a href="#demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Live Demo</a>
              <a href="#benchmarks" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Benchmarks</a>
              <a href="#security" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Security</a>
              <a href="/developers" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                Developers
                <span className="text-[10px] font-mono uppercase bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200/60">IPC</span>
              </a>
              <a href="/llms.txt" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
                <span>llms.txt</span>
              </a>
              <a href="#download" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Downloads</a>
              
              <div className="h-4 w-px bg-slate-200" />

              <a
                href="https://github.com/SaiAkashNeela/bucketstack"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300/80 transition-all shadow-xs"
              >
                <Github className="w-4 h-4 text-slate-900" />
                <span>Star on GitHub</span>
              </a>
            </nav>

            <div className="md:hidden flex items-center gap-2">
              <a
                href="https://github.com/SaiAkashNeela/bucketstack"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-600 hover:text-slate-900"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200"
                aria-label="Toggle navigation"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-6 flex flex-col gap-4 animate-in fade-in duration-150">
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Features</a>
              <a href="#demo" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Live Demo</a>
              <a href="#benchmarks" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Benchmarks</a>
              <a href="#security" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Security Architecture</a>
              <a href="/developers" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Developer Portal & IPC</a>
              <a href="/llms.txt" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Agent Knowledge (llms.txt)</a>
              <a href="#download" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Downloads</a>
              <a href="/about" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">About</a>
              <a href="/contact" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-slate-700 hover:text-slate-900 py-1">Contact Support</a>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <section className="relative pt-32 pb-16 md:pt-36 md:pb-24 overflow-hidden border-b border-slate-100 bg-radial-[at_top,_var(--tw-gradient-stops)] from-slate-50 via-white to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto mb-14">
                
                {/* Release Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-medium mb-8 shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>BucketStack {versionText} is live</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">Tauri 2.0 + Rust Engine</span>
                </div>

                {/* Primary Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-950 tracking-tight leading-[1.08] mb-6">
                  Manage S3 Buckets <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">
                    Like a Native Pro.
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto font-normal">
                  A high-speed desktop workstation for <strong className="text-slate-900 font-semibold">AWS S3, Cloudflare R2, MinIO, Wasabi, and Backblaze B2</strong>. Built in Rust with hardware-bound AES-256 encryption and built-in Monaco code editor.
                </p>

                {/* Download CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
                  <a href={downloadLinks?.macos || '#'} className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto h-12 px-6 text-sm gap-2.5 bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all hover:-translate-y-0.5">
                      <AppleLogo className="w-4 h-4" />
                      <span>Download for macOS</span>
                    </Button>
                  </a>
                  <a href={downloadLinks?.windows || '#'} className="w-full sm:w-auto">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 px-6 text-sm gap-2.5 border border-slate-300 text-slate-800 hover:bg-slate-100 transition-all">
                      <WindowsLogo className="w-4 h-4 text-blue-600" />
                      <span>Windows (x64)</span>
                    </Button>
                  </a>
                  <a href={downloadLinks?.linux || '#'} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto h-12 px-6 text-sm gap-2.5 border border-slate-300 text-slate-800 hover:bg-slate-100 transition-all">
                      <LinuxLogo className="w-4 h-4 text-amber-600" />
                      <span>Linux (.deb / AppImage)</span>
                    </Button>
                  </a>
                </div>

                {/* Trust & Spec Subtitle */}
                <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Zero Telemetry / Local-First
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-600" /> &lt;80MB RAM Footprint
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600" /> AES-256-GCM Vault
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-purple-600" /> MIT Open Source
                  </span>
                </div>
              </div>

              {/* Interactive File Explorer Live Demo */}
              <div id="demo" className="w-full scroll-mt-24 mt-4">
                <div className="text-center mb-4">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Interactive Live Sandbox — Click folders, edit files, switch views
                  </span>
                </div>
                <InteractiveFileManager />
              </div>

            </div>
          </section>

          {/* Supported Cloud Providers Strip */}
          <section className="py-12 bg-slate-50/70 border-b border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Universal S3 Standard • Zero Vendor Lock-in
                </p>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-85 hover:opacity-100 transition-opacity">
                {['AWS S3', 'Cloudflare R2', 'Wasabi', 'MinIO', 'DigitalOcean', 'Backblaze B2', 'Railway'].map((provider) => (
                  <div key={provider} className="flex items-center gap-2">
                    <ProviderIcon name={provider} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Core Feature Matrix */}
          <section id="features" className="py-20 md:py-28 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center mb-20">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-4 border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5" /> Capabilities
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
                  Built for Engineers Who Live in Object Storage.
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Every feature is tuned for speed, reliability, and security across multi-cloud environments.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  {
                    icon: Code2,
                    title: "In-Bucket Monaco Editor",
                    desc: "Edit JSON, YAML, configs, code, and markdown directly inside S3 buckets without downloading. Syntax highlighted with 50+ languages."
                  },
                  {
                    icon: RefreshCw,
                    title: "Cloud-to-Cloud Streaming",
                    desc: "Stream files directly between AWS S3, Cloudflare R2, and MinIO without writing temporary files to your local disk."
                  },
                  {
                    icon: FolderSync,
                    title: "Smart Background Sync",
                    desc: "Bi-directional folder synchronization running in the background with conflict resolution and automated scheduled intervals."
                  },
                  {
                    icon: Terminal,
                    title: "SQLite Activity Audit",
                    desc: "Every upload, download, move, rename, and delete is recorded in an embedded SQLite database. Search and export audit trails to CSV/JSON."
                  },
                  {
                    icon: Globe,
                    title: "Presigned Link Generator",
                    desc: "Create secure, temporary download URLs with custom expiry windows (15m, 1h, 24h, 7d) with a single right-click."
                  },
                  {
                    icon: Zap,
                    title: "Parallel Multipart Transfers",
                    desc: "High-throughput chunked uploads for multi-gigabyte datasets with automatic retry and pause/resume capabilities."
                  },
                  {
                    icon: Trash2,
                    title: "Soft Delete Trash Bin",
                    desc: "Accidental deletion protection. Deleted objects move to a soft-delete trash partition with instant one-click restoration."
                  },
                  {
                    icon: HardDrive,
                    title: "On-the-Fly Archiving",
                    desc: "Compress multiple remote objects into .zip or .tar.gz archives directly inside your S3 bucket without local downloads."
                  },
                  {
                    icon: Activity,
                    title: "Storage Analytics",
                    desc: "Interactive visual charts for bucket size distribution, MIME type breakdowns, object counts, and storage cost estimations."
                  }
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="p-8 rounded-2xl bg-slate-50/60 border border-slate-200/80 hover:border-blue-200 hover:bg-white hover:shadow-lg transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center mb-6 shadow-xs group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors">
                      <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2.5">{feature.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Menu Bar / Tray Window Spotlight */}
          <section className="py-20 md:py-28 bg-slate-900 text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div className="order-2 md:order-1 flex justify-center">
                  <div className="w-full max-w-sm">
                    <DemoTrayWindow />
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1 text-xs font-medium text-blue-400 mb-6">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>System Tray Integration</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6">
                    Always One Click Away in Your Menu Bar.
                  </h2>
                  <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                    BucketStack docks unobtrusively in your macOS menu bar or Windows/Linux system tray. Drag files directly onto the tray icon to upload without opening the full workstation window.
                  </p>
                  
                  <div className="space-y-4 font-medium text-sm text-slate-200">
                    {[
                      "Instant drag-and-drop file upload to active bucket",
                      "Live transfer progress and background sync monitors",
                      "Quick bucket switching and recently uploaded files list",
                      "Runs silently in background with <50MB resident memory"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benchmarks & Performance Section */}
          <section id="benchmarks" className="py-20 md:py-28 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full mb-4 border border-emerald-200">
                  <Zap className="w-3.5 h-3.5" /> Benchmarks
                </div>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
                  Native Rust vs. Electron.
                </h2>
                <p className="text-lg text-slate-600">
                  Ditching Chromium and Electron wrappers means lighter memory, zero bloat, and instantaneous startup.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto text-center">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 mb-2 font-mono">&lt; 1.5s</div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-600">Startup Time</div>
                  <p className="text-[11px] text-slate-400 mt-1">vs 6-10s Electron apps</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 mb-2 font-mono">~50 MB</div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-600">RAM Footprint</div>
                  <p className="text-[11px] text-slate-400 mt-1">vs 400MB+ Chromium</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-purple-600 mb-2 font-mono">100%</div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-600">Rust AWS SigV4</div>
                  <p className="text-[11px] text-slate-400 mt-1">Native compiled crypto</p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-amber-600 mb-2 font-mono">0</div>
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-600">Trackers / Telemetry</div>
                  <p className="text-[11px] text-slate-400 mt-1">100% private & local</p>
                </div>
              </div>
            </div>
          </section>

          {/* Security & Zero-Trust Architecture */}
          <section id="security" className="py-20 md:py-28 bg-slate-50/80 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full mb-4 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Hardware-Bound Cryptography
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
                    Zero-Trust Security by Design.
                  </h2>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    Cloud credentials must never leak. BucketStack connects directly to your S3 endpoints over TLS without passing data through any proxy servers or external infrastructure.
                  </p>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Lock className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">AES-256-GCM OS Hardware Keyring</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Secrets are encrypted using machine identifier derivation linked to macOS Keychain, Windows Credential Manager, or Linux Secret Service.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                        <ServerOff className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Direct Peer-to-Endpoint Connectivity</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          No intermediate relay servers or hosted proxies. All AWS SigV4 authorization signatures are calculated locally on your machine.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 border border-purple-200">
                        <Terminal className="w-4 h-4 text-purple-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Local SQLite Audit Database</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Activity logs stay completely on your device in an indexed SQLite database, exportable anytime to CSV or JSON.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Security Block */}
                <div className="bg-slate-950 rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl text-slate-300 font-mono text-xs leading-relaxed relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800 text-slate-500">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="text-[11px] ml-2 text-slate-400">src/security.rs • AES-256-GCM Vault</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-500">// Machine-bound credential derivation</p>
                    <p><span className="text-purple-400">let</span> machine_key = security::derive_machine_key()?;</p>
                    <p><span className="text-purple-400">let</span> cipher = Aes256Gcm::new(&amp;machine_key);</p>
                    <p className="text-slate-500 mt-3">// Decrypt credentials in-memory for SigV4</p>
                    <p><span className="text-purple-400">let</span> credentials = cipher.decrypt(nonce, secret_bytes)?;</p>
                    <p><span className="text-purple-400">let</span> client = aws_sdk_s3::Client::new(&amp;config);</p>
                    <p className="text-emerald-400 mt-3">// Direct TLS handshake to S3 endpoint (no proxy)</p>
                    <p><span className="text-blue-400">let</span> response = client.list_objects_v2().send().<span className="text-purple-400">await</span>?;</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Developer & Agent Integration Spotlight */}
          <section className="py-20 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-slate-900 rounded-3xl p-8 md:p-14 text-white">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-3 py-1 text-xs font-semibold text-blue-300 mb-6">
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Agents &amp; Automation</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                      LLM-Ready &amp; Built for Automation.
                    </h2>
                    <p className="text-slate-300 text-base mb-6 leading-relaxed">
                      BucketStack features first-class documentation for LLMs and AI agents via standardized <code className="text-blue-300 font-mono">/llms.txt</code> and <code className="text-blue-300 font-mono">/llms-full.txt</code> endpoints. Explore the full Tauri typed IPC command surface in our developer portal.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <a
                        href="/developers"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md"
                      >
                        <span>Open Developer Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <a
                        href="/llms.txt"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all"
                      >
                        <Bot className="w-4 h-4 text-blue-400" />
                        <span>View /llms.txt</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono text-xs text-slate-300 space-y-2.5">
                    <div className="text-slate-500">// Tauri typed IPC invoke interface</div>
                    <div><span className="text-purple-400">import</span> &#123; invoke &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">'@tauri-apps/api/core'</span>;</div>
                    <div className="pt-2"><span className="text-slate-500">// Stream between providers (AWS -&gt; Cloudflare R2)</span></div>
                    <div><span className="text-purple-400">await</span> invoke(<span className="text-amber-300">'stream_transfer_object'</span>, &#123;</div>
                    <div className="pl-4">srcAccount, srcBucket: <span className="text-emerald-400">'source-aws'</span>, srcKey,</div>
                    <div className="pl-4">dstAccount, dstBucket: <span className="text-emerald-400">'destination-r2'</span>, dstKey</div>
                    <div>&#125;);</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Download CTA Hub */}
          <section id="download" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                Download BucketStack Today.
              </h2>
              <p className="text-lg text-slate-600 mb-14 max-w-xl mx-auto">
                Free, open source, and available for all major operating systems.
              </p>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
                {/* macOS Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
                    <AppleLogo className="w-8 h-8 text-slate-900" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 mb-1">macOS</h3>
                  <p className="text-xs text-slate-500 mb-6">Universal Binary (Apple Silicon &amp; Intel)</p>
                  <a href={downloadLinks?.macos || '#'} className="w-full mt-auto">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">Download DMG</Button>
                  </a>
                </div>

                {/* Windows Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                    <WindowsLogo className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 mb-1">Windows</h3>
                  <p className="text-xs text-slate-500 mb-6">Windows 10 / 11 (64-bit EXE &amp; MSI)</p>
                  <a href={downloadLinks?.windows || '#'} className="w-full mt-auto">
                    <Button variant="secondary" className="w-full border border-slate-300 hover:bg-slate-100">Download EXE</Button>
                  </a>
                </div>

                {/* Linux Card */}
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
                    <LinuxLogo className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-xl text-slate-900 mb-1">Linux</h3>
                  <p className="text-xs text-slate-500 mb-6">AppImage, Debian (.deb), RedHat (.rpm)</p>
                  <a href={downloadLinks?.linux || '#'} target="_blank" rel="noopener noreferrer" className="w-full mt-auto">
                    <Button variant="secondary" className="w-full border border-slate-300 hover:bg-slate-100">All Linux Formats</Button>
                  </a>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Automated in-app updates supported across all platforms via Minisign cryptographic verification.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
                Questions, Feedback, or Bug Reports?
              </h2>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                BucketStack is actively maintained. Whether you found an issue, need enterprise guidance, or want to contribute, we'd love to connect.
              </p>
              <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="mailto:akash@bucketstack.app"
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm hover:-translate-y-0.5"
                >
                  akash@bucketstack.app
                </a>
                <a
                  href="https://github.com/SaiAkashNeela/bucketstack/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-slate-100 text-slate-800 rounded-xl font-semibold hover:bg-slate-200 border border-slate-300/80 transition-all"
                >
                  GitHub Issues &amp; Discussions
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* Comprehensive Trust Footer */}
        <footer className="bg-slate-50 border-t border-slate-200/80 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center p-1">
                    <img src="/logo.png" alt="BucketStack" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-lg text-slate-900">BucketStack</span>
                </div>
                <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                  The native, open-source S3 desktop workstation for engineers and teams. Fast, secure, and vendor-neutral.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/SaiAkashNeela/bucketstack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                    aria-label="GitHub Repository"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                  <a
                    href="https://x.com/SaiAkashNeela"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                    aria-label="X / Twitter"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-4">Product</h4>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                  <li><a href="#demo" className="hover:text-slate-900">Interactive Demo</a></li>
                  <li><a href="#benchmarks" className="hover:text-slate-900">Benchmarks</a></li>
                  <li><a href="#security" className="hover:text-slate-900">Security Vault</a></li>
                  <li><a href="#download" className="hover:text-slate-900">Downloads</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-4">Developers &amp; AI</h4>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li><a href="/developers" className="hover:text-slate-900">Developer Portal</a></li>
                  <li><a href="/llms.txt" className="hover:text-slate-900">llms.txt</a></li>
                  <li><a href="/llms-full.txt" className="hover:text-slate-900">llms-full.txt</a></li>
                  <li><a href="https://github.com/SaiAkashNeela/bucketstack/releases" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Changelog</a></li>
                  <li><a href="https://github.com/SaiAkashNeela/bucketstack" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">Source Code</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 mb-4">Trust &amp; Legal</h4>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li><a href="/about" className="hover:text-slate-900">About</a></li>
                  <li><a href="/contact" className="hover:text-slate-900">Contact</a></li>
                  <li><a href="/privacy" className="hover:text-slate-900">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-slate-900">Terms of Service</a></li>
                  <li><a href="https://github.com/SaiAkashNeela/bucketstack/blob/main/LICENSE.md" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">MIT License</a></li>
                </ul>
              </div>

            </div>

            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <p>© 2026 BucketStack. Free &amp; Open Source under MIT License. London, United Kingdom.</p>
              <a
                href="https://buymeacoffee.com/akash.neela"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-900 rounded-full font-medium border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Coffee size={14} className="text-amber-700" />
                <span>Buy me a coffee</span>
              </a>
            </div>
          </div>
        </footer>

      </div>
    </HelmetProvider>
  );
}

export default App;