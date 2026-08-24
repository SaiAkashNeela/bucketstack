import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

const siteDir = path.resolve('.');
const publicDir = path.join(siteDir, 'public');

console.log('\n--- 1. Content without JavaScript Check ---');
const indexHtml = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf-8');
const rootStartIndex = indexHtml.indexOf('<div id="root">');
const scriptStartIndex = indexHtml.indexOf('<script type="module"', rootStartIndex);
const rootContent = rootStartIndex !== -1 && scriptStartIndex !== -1
  ? indexHtml.slice(rootStartIndex, scriptStartIndex)
  : '';
const rootText = rootContent.replace(/<[^>]*>/g, '').trim();

assert(rootContent.includes('<h1'), 'index.html contains <h1> in root container');
assert(rootText.length >= 500, `index.html has ${rootText.length} chars of raw text without JS (>= 500 required)`);

console.log('\n--- 2. Agent-friendly 404s Check ---');
assert(fs.existsSync(path.join(publicDir, '404.html')), 'public/404.html exists');
const notFoundHtml = fs.readFileSync(path.join(publicDir, '404.html'), 'utf-8');
assert(notFoundHtml.includes('llms.txt') && notFoundHtml.includes('sitemap.xml'), '404.html points agents to sitemap & llms.txt');

const middlewareTs = fs.readFileSync(path.join(siteDir, 'functions/_middleware.ts'), 'utf-8');
assert(middlewareTs.includes('status: 404'), 'Cloudflare Pages middleware returns real HTTP 404 for nonexistent paths');

console.log('\n--- 3 & 4. Agent Crawler Reachability & Bot Whitelist ---');
const robotsTxt = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf-8');
const requiredBots = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Google-Extended', 'ora-agent', 'DeepSeekBot', 'PerplexityBot'];
requiredBots.forEach(bot => {
  assert(robotsTxt.includes(`User-agent: ${bot}`), `robots.txt explicitly permits ${bot}`);
});

console.log('\n--- 5. Markdown Content Negotiation (acceptmarkdown.com) ---');
assert(middlewareTs.includes('text/markdown'), 'Middleware detects Accept: text/markdown');
assert(middlewareTs.includes('Vary') && middlewareTs.includes('Accept'), 'Middleware adds Vary: Accept, Accept-Encoding');
const headersFile = fs.readFileSync(path.join(publicDir, '_headers'), 'utf-8');
assert(headersFile.includes('Vary: Accept, Accept-Encoding'), 'public/_headers enforces Vary: Accept, Accept-Encoding');
assert(indexHtml.includes('rel="alternate" type="text/markdown"'), 'index.html includes alternate text/markdown link');

console.log('\n--- 6. Developer Portal Check ---');
assert(fs.existsSync(path.join(publicDir, 'developers.html')), 'public/developers.html exists');
assert(fs.existsSync(path.join(publicDir, 'developers/index.html')), 'public/developers/index.html exists');
const devHtml = fs.readFileSync(path.join(publicDir, 'developers.html'), 'utf-8');
assert(devHtml.includes('invoke(') && devHtml.includes('test_s3_connection'), 'Developer portal documents Tauri IPC API');

console.log('\n--- 7 & 8. CLI Tool & Agent Instructions / When-to-Use ---');
assert(fs.existsSync(path.join(publicDir, 'agent-instructions.txt')), 'public/agent-instructions.txt exists');
assert(fs.existsSync(path.join(publicDir, 'llms.txt')), 'public/llms.txt exists');
assert(fs.existsSync(path.join(publicDir, 'llms-full.txt')), 'public/llms-full.txt exists');
const llmsTxt = fs.readFileSync(path.join(publicDir, 'llms.txt'), 'utf-8');
const agentInstr = fs.readFileSync(path.join(publicDir, 'agent-instructions.txt'), 'utf-8');
assert(llmsTxt.toLowerCase().includes('when to use'), 'llms.txt contains explicit "When to Use" guidance');
assert(agentInstr.toLowerCase().includes('when to use'), 'agent-instructions.txt contains "When to Use" decision matrix');
assert(llmsTxt.includes('CLI') || llmsTxt.includes('tauri:dev'), 'llms.txt documents CLI / automation command interface');

console.log(`\n========================================`);
console.log(`Total: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
