// Cloudflare Pages Middleware for Agent Readiness, Markdown Content Negotiation & Agent-friendly 404s

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
}

type PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const acceptHeader = request.headers.get('Accept') || '';
  const isMarkdownAccept = acceptHeader.includes('text/markdown') || acceptHeader.includes('text/x-markdown');

  // Handle Markdown Content Negotiation (acceptmarkdown.com standard)
  if (isMarkdownAccept) {
    const llmsResponse = await env.ASSETS.fetch(new URL('/llms.txt', request.url));
    if (llmsResponse.ok) {
      const markdownBody = await llmsResponse.text();
      return new Response(markdownBody, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept, Accept-Encoding',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'x-markdown-tokens': `${Math.round(markdownBody.length / 4)}`,
        },
      });
    }
  }

  // Fetch standard asset
  const response = await env.ASSETS.fetch(request);

  // Check if asset was found or if it returned a 404 / soft-404
  const knownStaticRoutes = [
    '/',
    '/about',
    '/about/',
    '/about.html',
    '/contact',
    '/contact/',
    '/contact.html',
    '/privacy',
    '/privacy/',
    '/privacy.html',
    '/terms',
    '/terms/',
    '/terms.html',
    '/developers',
    '/developers/',
    '/developers.html',
    '/llms.txt',
    '/llms-full.txt',
    '/agent-instructions.txt',
    '/agent-instructions.md',
    '/.well-known/llms.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/logo.png',
    '/logo-1.png',
  ];

  const pathname = url.pathname;
  const isKnownRoute =
    knownStaticRoutes.includes(pathname) ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/screenshots/');

  // If path is unknown, return a real HTTP 404 with structured markdown guidance for AI agents
  if (!isKnownRoute && (!response.ok || response.status === 404)) {
    const notFoundBody = `# 404 Not Found — BucketStack

The requested resource \`${pathname}\` does not exist on https://www.bucketstack.app.

## Navigation Guidance for AI Agents & Crawlers:
- **LLM Summary**: https://www.bucketstack.app/llms.txt
- **Full Technical Context**: https://www.bucketstack.app/llms-full.txt
- **Agent Instructions**: https://www.bucketstack.app/agent-instructions.txt
- **Developer Portal**: https://www.bucketstack.app/developers
- **XML Sitemap**: https://www.bucketstack.app/sitemap.xml
- **Homepage**: https://www.bucketstack.app/

---
*BucketStack — Native Open Source S3 Desktop Workstation (Tauri 2.0 + Rust)*
`;

    return new Response(notFoundBody, {
      status: 404,
      statusText: 'Not Found',
      headers: {
        'Content-Type': isMarkdownAccept ? 'text/markdown; charset=utf-8' : 'text/html; charset=utf-8',
        'Vary': 'Accept, Accept-Encoding',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Clone response to add Vary header for content negotiation compliance
  const newHeaders = new Headers(response.headers);
  const existingVary = newHeaders.get('Vary') || '';
  if (!existingVary.toLowerCase().includes('accept')) {
    newHeaders.set('Vary', existingVary ? `${existingVary}, Accept` : 'Accept, Accept-Encoding');
  }
  newHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
