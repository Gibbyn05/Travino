const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const file = path.join(process.cwd(), 'dist', 'index.html');
let html = readFileSync(file, 'utf8');
const marker = '<!-- travino-social-meta -->';
const meta = `${marker}
    <title>Travino: plan trips together and keep the memories</title>
    <meta name="description" content="Travino keeps shared packing, day plans, today’s details and travel memories together." />
    <meta property="og:title" content="Travino: plan trips together and keep the memories" />
    <meta property="og:description" content="A calmer shared home for every plan, packing list and travel memory." />
    <meta property="og:image" content="https://travino.vercel.app/travino-share.jpg" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Travino: plan trips together and keep the memories" />
    <meta name="twitter:description" content="A calmer shared home for every plan, packing list and travel memory." />
    <meta name="twitter:image" content="https://travino.vercel.app/travino-share.jpg" />
    <link rel="icon" href="/favicon.png" />`;

html = html.replace(/\s*<title>[^<]*<\/title>/, '');
if (!html.includes(marker)) html = html.replace('<head>', `<head>\n    ${meta}`);
writeFileSync(file, html);
