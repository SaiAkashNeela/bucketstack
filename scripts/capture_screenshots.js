import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 1080, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  // 1. Capture File Explorer demo element
  const demoElement = await page.$('#demo');
  if (demoElement) {
    await demoElement.screenshot({
      path: '/home/ubuntu/workspace/bucketstack/docs/screenshots/file-explorer.png'
    });
    console.log('Saved file-explorer.png');
  }

  // 2. Scroll to System Tray section
  await page.evaluate(() => {
    const el = document.querySelector('section.bg-slate-900');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 600));

  const traySection = await page.$('section.bg-slate-900');
  if (traySection) {
    await traySection.screenshot({
      path: '/home/ubuntu/workspace/bucketstack/docs/screenshots/system-tray.png'
    });
    console.log('Saved system-tray.png');
  }

  // 3. Scroll to Security Section
  await page.evaluate(() => {
    const el = document.querySelector('#security');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 600));

  const securitySection = await page.$('#security');
  if (securitySection) {
    await securitySection.screenshot({
      path: '/home/ubuntu/workspace/bucketstack/docs/screenshots/security-vault.png'
    });
    console.log('Saved security-vault.png');
  }

  await browser.close();

  // Copy to site public
  fs.copyFileSync('/home/ubuntu/workspace/bucketstack/docs/screenshots/file-explorer.png', '/home/ubuntu/workspace/bucketstack/bucketstack-site/public/screenshots/file-explorer.png');
  fs.copyFileSync('/home/ubuntu/workspace/bucketstack/docs/screenshots/system-tray.png', '/home/ubuntu/workspace/bucketstack/bucketstack-site/public/screenshots/system-tray.png');
  fs.copyFileSync('/home/ubuntu/workspace/bucketstack/docs/screenshots/security-vault.png', '/home/ubuntu/workspace/bucketstack/bucketstack-site/public/screenshots/security-vault.png');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
