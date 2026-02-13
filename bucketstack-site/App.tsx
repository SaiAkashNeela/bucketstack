import React from 'react';
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
  X
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
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [downloadLinks, setDownloadLinks] = React.useState<any>(null);

  React.useEffect(() => {
    releaseService.getDownloadLinks().then(setDownloadLinks);
  }, []);

  return (
    <HelmetProvider>
      <SEO />
      <div className="min-h-screen flex flex-col bg-white">
        {/* Navbar */}
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="BucketStack" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg tracking-tight text-gray-900">BucketStack</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</a>
              <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-gray-900">Demo</a>
              <a href="#performance" className="text-sm font-medium text-gray-600 hover:text-gray-900">Benchmarks</a>
              <a href="#download" className="text-sm font-medium text-gray-600 hover:text-gray-900">Download</a>
              <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">Contact</a>
              <a href="https://github.com/SaiAkashNeela/bucketstack" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900">
                <Github className="w-5 h-5" />
              </a>
            </nav>
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-lg p-4 flex flex-col space-y-4 animate-in slide-in-from-top-2">
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-gray-900 py-2">Features</a>
              <a href="#demo" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-gray-900 py-2">Demo</a>
              <a href="#performance" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-gray-900 py-2">Benchmarks</a>
              <a href="#download" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-gray-900 py-2">Download</a>
              <a href="#contact" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600 hover:text-gray-900 py-2">Contact</a>
              <a href="https://github.com/SaiAkashNeela/bucketstack" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </a>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <div className="relative pt-32 pb-16 overflow-hidden">
          <Section className="!py-0 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-6 border border-blue-100">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
                v1.0.1
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-8 leading-[1.1]">
                Manage S3 Buckets <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Like a Pro.</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                A native, beautiful, and secure file manager for AWS S3, Cloudflare R2, MinIO, and more. <span className="text-gray-900 font-medium">No electrons harmed (Built with Rust).</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                <a href={downloadLinks?.macos || '#'}>
                  <Button size="lg" className="h-12 px-6 text-sm gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5">
                    <AppleLogo className="w-5 h-5 -mt-0.5" />
                    <span>macOS</span>
                  </Button>
                </a>
                <a href={downloadLinks?.windows || '#'}>
                  <Button size="lg" variant="secondary" className="h-12 px-6 text-sm gap-2 border border-gray-200">
                    <WindowsLogo className="w-5 h-5" />
                    <span>Windows</span>
                  </Button>
                </a>
                <a href={downloadLinks?.linux || '#'} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="secondary" className="h-12 px-6 text-sm gap-2 border border-gray-200">
                    <LinuxLogo className="w-5 h-5" />
                    <span>Linux</span>
                  </Button>
                </a>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Free & Open Source • All Platforms • Built with Rust
              </p>
            </div>

            <div id="demo" className="w-full scroll-mt-24">
              <InteractiveFileManager />
            </div>

          </Section>
        </div>

        {/* Trusted By & Providers */}
        <Section className="bg-white border-y border-gray-100">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">If it speaks S3, BucketStack can talk to it. Connect to any S3-compatible endpoint.</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-70 hover:opacity-100 transition-all duration-500">
            {['AWS S3', 'Cloudflare R2', 'Wasabi', 'MinIO', 'DigitalOcean', 'Backblaze B2', 'Railway'].map(p => (
              <ProviderIcon key={p} name={p} />
            ))}
          </div>
        </Section>

        {/* Tray Window Feature */}
        <Section className="bg-gray-50">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <DemoTrayWindow />
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center space-x-2 bg-indigo-50 rounded-full px-3 py-1 text-xs font-medium text-indigo-600 mb-6">
                <LayoutGrid className="w-3 h-3" />
                <span>Menu Bar App</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Always one click away.</h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                BucketStack lives in your menu bar. Quickly upload files, creating folders, or check recent uploads without breaking your flow.
              </p>
              <ul className="space-y-4">
                {[
                  "Drag & Drop uploads to menu bar icon",
                  "Access recent files instantly",
                  "Quick-switch between buckets",
                  "Native performance & minimal RAM usage"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Features Grid */}
        <Section id="features">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Everything you need.</h2>
            <p className="text-xl text-gray-600">Built for developers who demand power and simplicity.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: RefreshCw, title: "Smart Sync", desc: "Bidirectional sync between local folders and S3 buckets with conflict resolution." },
              { icon: Terminal, title: "Activity Log", desc: "Audit every action. Keep track of upgrades, downloads, and deletes locally." },
              { icon: Globe, title: "Presigned Links", desc: "Generate secure, time-limited download links for any file with one click." },
              { icon: Zap, title: "Multipart Uploads", desc: "Optimized for large files. Pause, resume, and parallelize uploads automatically." },
              { icon: Trash2, title: "Safety First", desc: "Accidental deletion protection with a dedicated Trash folder for every bucket." },
              { icon: Code2, title: "Developer Friendly", desc: "Edit text, JSON, and code files directly in S3 without downloading them." },
              { icon: Activity, title: "Analytics", desc: "Visualize storage usage, file type distribution, and cost estimates." },
              { icon: MousePointer2, title: "Native UI", desc: "Feels right at home on macOS. Supports Dark Mode, Retina displays, and gestures." },
              { icon: Lock, title: "Encryption", desc: "Server-side encryption support. Your data stays safe at rest and in transit." },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Performance Section */}
        <Section id="performance" className="bg-gray-900 text-white rounded-3xl mx-4 my-8 !py-20 md:mx-8">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Blazing Fast. Rust Powered.</h2>
            <p className="text-gray-400 text-lg">We ditched Electron for a lightweight, native experience.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-800">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">&lt; 2s</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Startup Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">~50MB</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">RAM Usage</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">MB/s Upload</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">0</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Trackers</div>
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-gray-800/50 rounded-full px-6 py-3 border border-gray-700">
              <Cpu className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300 font-mono text-sm">Built with Tauri + React + Rust</span>
            </div>
          </div>
        </Section>

        {/* Security Section (Defense in Depth) */}
        <Section className="bg-white">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-green-50 rounded-full px-3 py-1 text-xs font-medium text-green-700 mb-6">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero-Trust Architecture</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-8">Secure by Design.</h2>
              <p className="text-xl text-gray-600 mb-8">Your credentials are yours. They never touch our servers because we don't have any.</p>

              <div className="space-y-6">
                {[
                  { title: "Secure Machine Storage", desc: "Credentials stored in an AES-256-GCM encrypted database, bound to your machine's unique identifier." },
                  { title: "End-to-End Encryption", desc: "Direct connection to AWS/S3. No middleman proxies." },
                  { title: "Sandboxed Environment", desc: "Strict OS-level sandboxing prevents unauthorized access." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 relative overflow-hidden">
              {/* Abstract Code/Security illustration */}
              <div className="font-mono text-xs text-gray-400 space-y-2">
                <p><span className="text-purple-600">const</span> <span className="text-blue-600">credentials</span> = <span className="text-purple-600">await</span> secureStorage.<span className="text-yellow-600">get</span>(<span className="text-green-600">"aws_access_key"</span>);</p>
                <p className="pl-4"><span className="text-gray-500">// Credentials retrieved securely from OS</span></p>
                <p><span className="text-purple-600">const</span> <span className="text-blue-600">s3</span> = <span className="text-purple-600">new</span> S3Client({`{`}</p>
                <p className="pl-4">region: <span className="text-green-600">"us-east-1"</span>,</p>
                <p className="pl-4">credentials: credentials</p>
                <p>{`}`});</p>
                <p className="text-gray-500">// Direct connection established</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lock size={200} />
              </div>
            </div>
          </div>
        </Section>

        {/* Download CTA */}
        <Section id="download" className="bg-gray-50 border-t border-gray-200">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to take control?</h2>
            <p className="text-xl text-gray-500 mb-12">Start using BucketStack today.</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center w-full md:w-64 hover:border-blue-400 hover:shadow-md transition-all">
                <AppleLogo className="w-12 h-12 mb-6 text-gray-900" />
                <h3 className="font-bold text-lg mb-1">macOS</h3>
                <p className="text-xs text-gray-500 mb-6">Universal (Apple Silicon/Intel)</p>
                <a href={downloadLinks?.macos || '#'} className="w-full">
                  <Button className="w-full">Download DMG</Button>
                </a>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center w-full md:w-64 hover:border-blue-400 hover:shadow-md transition-all">
                <WindowsLogo className="w-12 h-12 mb-6 text-blue-600" />
                <h3 className="font-bold text-lg mb-1">Windows</h3>
                <p className="text-xs text-gray-500 mb-6">Windows 10/11 (x64)</p>
                <a href={downloadLinks?.windows || '#'} className="w-full">
                  <Button variant="secondary" className="w-full">Download EXE</Button>
                </a>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center w-full md:w-64 hover:border-blue-400 hover:shadow-md transition-all">
                <LinuxLogo className="w-12 h-12 mb-6 text-orange-500" />
                <h3 className="font-bold text-lg mb-1">Linux</h3>
                <p className="text-xs text-gray-500 mb-6">AppImage / RPM / Deb Available</p>
                <a href={downloadLinks?.linux || '#'} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button variant="secondary" className="w-full">See Releases</Button>
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* Contact Section */}
        <Section id="contact" className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Have a question?</h2>
            <p className="text-xl text-gray-600 mb-8">
              We'd love to hear from you. Have feedback, found a bug, or just want to say hi?
            </p>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-sm mx-auto">
              <p className="text-gray-600 mb-4">Email us at:</p>
              <a
                href="mailto:akash@bucketstack.app"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                akash@bucketstack.app
              </a>
              <p className="text-gray-500 text-sm mt-6">
                We'll get back to you as soon as possible.
              </p>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <footer className="bg-white py-16 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <img src="/logo.png" alt="BucketStack" className="w-6 h-6 object-contain" />
                  <span className="font-bold text-xl text-gray-900">BucketStack</span>
                </div>
                <p className="text-gray-500 max-w-sm mb-6">
                  The modern, native file manager for your object storage. Secure, fast, and open source.
                </p>
                <div className="flex gap-4">
                  <a href="https://github.com/SaiAkashNeela/bucketstack" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><Github size={20} /></a>
                  <a href="#" className="text-gray-400 hover:text-gray-600">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#features" className="hover:text-blue-600">Features</a></li>
                  <li><a href="#security" className="hover:text-blue-600">Security</a></li>
                  <li><a href="#download" className="hover:text-blue-600">Download</a></li>
                  <li><a href="https://github.com/SaiAkashNeela/bucketstack/releases" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">Changelog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="https://github.com/SaiAkashNeela/bucketstack/blob/main/LICENSE.md" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">License</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">© {new Date().getFullYear()} BucketStack. Open Source under MIT License.</p>
              <a href="#" className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-100 transition-colors">
                <Coffee size={16} />
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