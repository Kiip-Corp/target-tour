import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1200 } });
await p.goto('http://localhost:3001/marketingBoard', { waitUntil: 'networkidle' });
const names = await p.evaluate(() => [...document.querySelectorAll('button')].map((b, i) => `${i}:${b.innerText}|bg=${b.style.background}`));
console.log(names.join('\n'));
