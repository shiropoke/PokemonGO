import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const navigationCss = readFileSync(
  new URL('../src/styles/navigation-refresh.css', import.meta.url),
  'utf8',
);

const viewportMatch = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"\s*\/>/i);
if (!viewportMatch) throw new Error('index.htmlにviewport metaがありません。');

const viewport = viewportMatch[1];
if (/user-scalable\s*=\s*no/i.test(viewport)) {
  throw new Error('通常viewportでuser-scalable=noを使用しないでください。');
}
if (/maximum-scale\s*=\s*1(?:\.0+)?(?:\s*,|\s*$)/i.test(viewport)) {
  throw new Error('通常viewportでmaximum-scale=1を使用しないでください。');
}
if (!/\.main-tab-swipe-surface\s*\{[^}]*touch-action:\s*pan-y\s+pinch-zoom\s*;/s.test(navigationCss)) {
  throw new Error('main-tab-swipe-surfaceでpan-yとpinch-zoomを許可してください。');
}

console.log(`viewport: ${viewport}`);
console.log('main-tab-swipe-surface: pan-y pinch-zoom');
