import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Check,
  FileArchive,
  FilePen,
  FolderSync,
  Github,
  History,
  Link2,
  Menu,
  Undo2,
  X,
} from 'lucide-react';
import InteractiveFileManager from './components/InteractiveFileManager';
import DemoTrayWindow from './components/DemoTrayWindow';
import { HelmetProvider } from 'react-helmet-async';
import SEO from './components/SEO';
import { releaseService } from './services/releaseService';
import { AppleLogo, BuyMeACoffeeLogo, LinuxLogo, WindowsLogo } from './components/BrandIcons';

const GITHUB_URL = 'https://github.com/SaiAkashNeela/bucketstack';
const CONTACT_EMAIL = 'akash@bucketstack.app';
const COFFEE_URL = 'https://buymeacoffee.com/akash.neela';

type Platform = 'macos' | 'windows' | 'linux';

const PROVIDERS = [
  { name: 'AWS S3', src: '/icons/s3.svg' },
  { name: 'Cloudflare R2', src: '/icons/r2.svg' },
  { name: 'MinIO', src: '/icons/minio.jpeg' },
  { name: 'Wasabi', src: '/icons/wasabi.jpg' },
  { name: 'Backblaze B2', src: '/icons/backblaze-b2.png' },
  { name: 'DigitalOcean Spaces', src: '/icons/spaces.svg' },
  { name: 'Railway', src: '/icons/railway.svg' },
];

const PLATFORM_INFO: Record<Platform, { label: string; detail: string; Logo: React.FC<{ className?: string }> }> = {
  macos: { label: 'macOS', detail: 'Apple silicon and Intel', Logo: AppleLogo },
  windows: { label: 'Windows', detail: 'Windows 10 and 11, 64-bit', Logo: WindowsLogo },
  linux: { label: 'Linux', detail: 'AppImage, .deb and .rpm', Logo: LinuxLogo },
};

function detectPlatform(): Platform | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|Android/i.test(ua)) return null; // desktop app: no phone download
  if (/Mac/i.test(ua)) return 'macos';
  if (/Win/i.test(ua)) return 'windows';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return null;
}

/**
 * Keeps the live demo un-clipped on tablets: below the width it needs, it is laid out
 * at DEMO_WIDTH and scaled down to fit (still fully interactive). At desktop widths it
 * renders 1:1, and on phones (<768px) the demo uses its own preview mode.
 */
const DEMO_WIDTH = 1080;
const FitDemo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const available = outer.clientWidth;
      const next = window.innerWidth >= 768 && available < DEMO_WIDTH ? available / DEMO_WIDTH : 1;
      setScale(next);
      setInnerHeight(inner.offsetHeight);
    };
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    update();
    return () => observer.disconnect();
  }, []);

  const scaled = scale < 1;
  return (
    <div ref={outerRef} style={scaled && innerHeight ? { height: innerHeight * scale } : undefined}>
      <div
        ref={innerRef}
        data-fit-scaled={scaled ? '' : undefined}
        style={scaled ? { width: DEMO_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

/** Fades its content in as it scrolls into view (CSS only, see .reveal in index.css). */
const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`reveal ${className}`}>{children}</div>
);

const primaryButton =
  'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-btn text-on-btn text-[15px] font-medium whitespace-nowrap transition hover:bg-btn-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const secondaryButton =
  'inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-surface border border-line text-ink text-[15px] font-medium whitespace-nowrap transition hover:border-muted/50 hover:bg-surface-2 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [links, setLinks] = useState<{ version: string | null } & Record<Platform, string>>({
    version: null,
    macos: `${GITHUB_URL}/releases`,
    windows: `${GITHUB_URL}/releases`,
    linux: `${GITHUB_URL}/releases`,
  });

  useEffect(() => {
    setPlatform(detectPlatform());
    releaseService.getDownloadLinks().then(setLinks);
  }, []);

  // Visitor's own OS first as the main button, the other two next to it.
  const primaryPlatform: Platform = platform ?? 'macos';
  const heroPlatforms = [primaryPlatform, ...(['macos', 'windows', 'linux'] as Platform[]).filter(p => p !== primaryPlatform)];
  const externalIfLinux = (p: Platform) => (p === 'linux' ? { target: '_blank', rel: 'noopener noreferrer' } : {});

  return (
    <HelmetProvider>
      <SEO />
      <div className="min-h-[100dvh] flex flex-col font-sans antialiased selection:bg-accent-soft">
        {/* Navigation */}
        <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-line/70">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="" className="w-7 h-7" />
              <span className="font-semibold tracking-tight text-[17px]">BucketStack</span>
            </a>

            <nav className="hidden md:flex items-center gap-8 text-[15px] text-ink-soft">
              <a href="#features" className="hover:text-ink transition-colors">Features</a>
              <a href="#security" className="hover:text-ink transition-colors">Privacy</a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">GitHub</a>
              <a
                href={COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 -m-1 text-ink-soft hover:text-ink transition-colors"
                title="Buy me a coffee"
                aria-label="Buy me a coffee"
              >
                <BuyMeACoffeeLogo className="w-[18px] h-[18px]" />
              </a>
              <a href="#download" className="inline-flex items-center h-9 px-4 rounded-lg bg-btn text-on-btn text-sm font-medium hover:bg-btn-hover transition">
                Download
              </a>
            </nav>

            <div className="md:hidden flex items-center gap-1 -mr-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-ink"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="md:hidden border-t border-line px-4 py-4 flex flex-col text-base">
              {[
                ['Features', '#features'],
                ['Privacy', '#security'],
                ['Download', '#download'],
                ['GitHub', GITHUB_URL],
                ['Buy me a coffee', COFFEE_URL],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="py-2.5 text-ink-soft hover:text-ink"
                >
                  {label}
                </a>
              ))}
            </nav>
          )}
        </header>

        <main className="flex-1">
          {/* Hero: copy left + live demo right on wide screens; stacked below 1700px so
              the demo always keeps its full size (it needs ~1080px of width). */}
          <section className="pt-14 pb-20 md:pt-20 md:pb-28">
            <div className="max-w-[1400px] min-[1700px]:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 min-[1700px]:grid min-[1700px]:grid-cols-[minmax(480px,560px)_minmax(0,1fr)] min-[1700px]:gap-16 min-[1700px]:items-center">
              <div className="max-w-2xl mb-12 min-[1700px]:mb-0">
                <h1 className="text-[40px] leading-[1.05] sm:text-6xl sm:leading-[1.04] min-[1700px]:text-[56px] font-semibold tracking-[-0.035em] text-ink">
                  Your S3 buckets, as easy as a folder.
                </h1>
                <p className="mt-6 text-lg sm:text-xl leading-relaxed text-muted max-w-[34rem]">
                  Browse, upload, edit and share files on AWS S3, Cloudflare R2, MinIO and more. Free and open source.
                </p>
                <div className="mt-9 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
                  {heroPlatforms.map((p, i) => {
                    const { label, Logo } = PLATFORM_INFO[p];
                    return i === 0 ? (
                      <a key={p} href={links[p]} {...externalIfLinux(p)} className={`${primaryButton} col-span-2`}>
                        <Logo className="w-4 h-4" />
                        Download for {p === 'macos' ? 'Mac' : label}
                      </a>
                    ) : (
                      <a key={p} href={links[p]} {...externalIfLinux(p)} className={secondaryButton}>
                        <Logo className="w-4 h-4" />
                        {label}
                      </a>
                    );
                  })}
                </div>
              </div>

              <div id="demo" className="min-w-0 scroll-mt-24">
                <div className="app-font">
                  <FitDemo>
                    <InteractiveFileManager />
                  </FitDemo>
                </div>
                <p className="mt-4 text-sm text-muted text-center">
                  This is a live demo. Open folders, edit a file, switch views.
                </p>
              </div>
            </div>
          </section>

          {/* Providers */}
          <section className="pb-24 md:pb-32">
            <Reveal className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
              <h2 className="text-base text-muted">Works with the storage you already use</h2>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                {PROVIDERS.map(p => (
                  <li key={p.name} title={p.name}>
                    <img src={p.src} alt={p.name} className="h-9 w-9 object-contain rounded-md" loading="lazy" />
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-sm text-muted">Plus any other S3-compatible service.</p>
            </Reveal>
          </section>

          {/* Features */}
          <section id="features" className="pb-24 md:pb-32 scroll-mt-20">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] max-w-2xl">
                  The things you do every day, made simple.
                </h2>
              </Reveal>

              <Reveal className="mt-12 grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-4 rounded-2xl bg-accent-soft p-8 sm:p-10 flex flex-col justify-between min-h-[280px]">
                  <FilePen className="w-7 h-7 text-accent" strokeWidth={1.75} />
                  <div className="mt-10">
                    <h3 className="text-2xl font-semibold tracking-tight">Edit files right where they live</h3>
                    <p className="mt-3 text-ink-soft leading-relaxed max-w-md">
                      Open a config, a note or a script, change it, and save. No downloading and re-uploading.
                    </p>
                    <ul className="mt-6 flex flex-wrap gap-2 text-sm">
                      {['JSON', 'YAML', 'Markdown', 'CSV', 'HTML', 'Code'].map(t => (
                        <li key={t} className="px-3 py-1 rounded-full bg-surface/80 text-ink-soft">{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl bg-inverse text-on-inverse p-8 sm:p-10 flex flex-col justify-between min-h-[280px]">
                  <div className="flex items-center gap-3">
                    <img src="/icons/s3.svg" alt="AWS S3" className="w-10 h-10 rounded-lg bg-white p-1.5" />
                    <ArrowLeftRight className="w-5 h-5 text-on-inverse/60" strokeWidth={1.75} />
                    <img src="/icons/r2.svg" alt="Cloudflare R2" className="w-10 h-10 rounded-lg bg-white p-1.5" />
                  </div>
                  <div className="mt-10">
                    <h3 className="text-2xl font-semibold tracking-tight">Move between providers</h3>
                    <p className="mt-3 text-on-inverse/70 leading-relaxed">
                      Copy files from one cloud to another, straight across, with live progress.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl bg-surface border border-line p-8 sm:p-10 flex flex-col justify-between min-h-[260px]">
                  <Undo2 className="w-7 h-7 text-ink" strokeWidth={1.75} />
                  <div className="mt-10">
                    <h3 className="text-2xl font-semibold tracking-tight">Undo a mistake</h3>
                    <p className="mt-3 text-ink-soft leading-relaxed">
                      Turn on Trash, and deleted files wait there until you restore them.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-4 rounded-2xl bg-surface-2 p-8 sm:p-10 flex flex-col sm:flex-row gap-10 sm:items-end justify-between min-h-[260px]">
                  <div className="self-start sm:self-auto">
                    <Link2 className="w-7 h-7 text-ink" strokeWidth={1.75} />
                    <h3 className="mt-10 text-2xl font-semibold tracking-tight">Share a link that expires</h3>
                    <p className="mt-3 text-ink-soft leading-relaxed max-w-sm">
                      Right-click any file to copy a private download link. It stops working when you say so.
                    </p>
                  </div>
                  <div className="shrink-0 w-full sm:w-64 rounded-xl bg-surface p-4 shadow-[0_8px_30px_-12px_rgba(24,24,27,0.25)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Check className="w-4 h-4 text-accent" /> Link copied
                    </div>
                    <p className="mt-1 text-sm text-muted">report-q3.pdf, expires in 24 hours</p>
                  </div>
                </div>
              </Reveal>

              <Reveal className="mt-16 grid gap-x-12 gap-y-8 sm:grid-cols-2 max-w-4xl">
                {[
                  { icon: FolderSync, title: 'Back up a folder on a schedule', text: 'Keep a folder on your computer copied to a bucket, automatically.' },
                  { icon: History, title: 'See what happened', text: 'Every upload, rename and delete is logged. Export it any time.' },
                  { icon: FileArchive, title: 'Zip it up', text: 'Bundle files or whole folders into a .zip or .tar.gz in one step.' },
                  { icon: BarChart3, title: 'Know what takes space', text: 'A clear breakdown of your bucket by size, type and age.' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-4">
                    <Icon className="w-5 h-5 mt-1 shrink-0 text-accent" strokeWidth={1.75} />
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-muted leading-relaxed">{text}</p>
                    </div>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          {/* Menu bar */}
          <section className="py-24 md:py-32 bg-surface border-y border-line">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal className="lg:order-2">
                <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">
                  Also right there in your menu bar.
                </h2>
                <p className="mt-6 text-lg text-muted leading-relaxed max-w-lg">
                  Drop files on it to upload, copy a share link, or check that your folders are syncing. No need to open the full window.
                </p>
              </Reveal>
              <Reveal className="lg:order-1 app-font max-w-sm w-full mx-auto">
                <DemoTrayWindow />
              </Reveal>
            </div>
          </section>

          {/* Privacy */}
          <section id="security" className="py-24 md:py-32 scroll-mt-16">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal>
                <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] max-w-3xl">
                  Your keys stay on your computer.
                </h2>
                <p className="mt-6 text-lg text-muted leading-relaxed max-w-2xl">
                  BucketStack has no servers of its own. It connects straight to your storage provider, and nobody else is in the middle.
                </p>
              </Reveal>
              <Reveal className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 border-t border-line pt-10">
                {[
                  { title: 'Encrypted on disk', text: 'Access keys are stored with AES-256 encryption, locked to this computer.' },
                  { title: 'Direct connection', text: 'Files go between your computer and your provider. Nothing passes through us.' },
                  { title: 'No account, no tracking', text: 'Nothing to sign up for, and the app collects no usage data.' },
                  { title: 'Open source', text: 'Every line of code is public on GitHub under the MIT license.' },
                ].map(item => (
                  <div key={item.title}>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-muted leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </Reveal>
            </div>
          </section>

          {/* Download */}
          <section id="download" className="pb-24 md:pb-32 scroll-mt-16">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
              <Reveal className="rounded-3xl bg-inverse text-on-inverse px-6 py-14 sm:px-14 sm:py-16">
                <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-center">
                  <div>
                    <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">Download BucketStack</h2>
                    <p className="mt-5 text-lg text-on-inverse/70 leading-relaxed max-w-md">
                      Free, with no account needed. Updates install themselves.
                      {links.version && <> Current version {links.version}.</>}
                    </p>
                  </div>
                  <ul className="divide-y divide-on-inverse/10 border-y border-on-inverse/10">
                    {(['macos', 'windows', 'linux'] as Platform[]).map(p => {
                      const { label, detail, Logo } = PLATFORM_INFO[p];
                      return (
                        <li key={p}>
                          <a
                            href={links[p]}
                            {...(p === 'linux' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="group flex items-center gap-4 py-5 transition-colors"
                          >
                            <Logo className="w-6 h-6 shrink-0 text-on-inverse" />
                            <span className="flex-1">
                              <span className="block font-medium">{label}</span>
                              <span className="block text-sm text-on-inverse/60">{detail}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-on-inverse/80 group-hover:text-on-inverse">
                              Download <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer id="contact" className="border-t border-line">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <a href="/" className="inline-flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="w-6 h-6" />
                <span className="font-semibold tracking-tight">BucketStack</span>
              </a>
              <p className="mt-4 text-muted">
                Questions or ideas? Write to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a href="/developers" className="hover:text-ink">Developers</a>
              <a href="/about" className="hover:text-ink">About</a>
              <a href="/privacy" className="hover:text-ink">Privacy</a>
              <a href="/terms" className="hover:text-ink">Terms</a>
              <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                <BuyMeACoffeeLogo className="w-4 h-4" /> Buy me a coffee
              </a>
            </nav>
          </div>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-sm text-muted">
            © {new Date().getFullYear()} BucketStack. MIT licensed.
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
}

export default App;
