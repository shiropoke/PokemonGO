import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const navigationCss = readFileSync(
  new URL('../src/styles/navigation-refresh.css', import.meta.url),
  'utf8',
);
const designCss = readFileSync(
  new URL('../src/styles/design-refresh.css', import.meta.url),
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

const bodyRule = designCss.match(/(?:^|\n)body\s*\{([^}]*)\}/s)?.[1];
if (!bodyRule || /background-image\s*:/i.test(bodyRule)) {
  throw new Error('bodyのスクロール背景画像を固定レイヤーへ移動してください。');
}

const fixedBackgroundRule = designCss.match(/\.app-shell::before\s*\{([^}]*)\}/s)?.[1];
if (
  !fixedBackgroundRule
  || !/position:\s*fixed\s*;/i.test(fixedBackgroundRule)
  || !/inset:\s*0\s*;/i.test(fixedBackgroundRule)
  || !/pointer-events:\s*none\s*;/i.test(fixedBackgroundRule)
  || !/background-image\s*:/i.test(fixedBackgroundRule)
) {
  throw new Error('app-shell::beforeをviewport固定の非操作背景レイヤーにしてください。');
}
if (!/\[data-theme='dark'\]\s+\.app-shell::before\s*\{[^}]*background-image\s*:/s.test(designCss)) {
  throw new Error('ダークモード用の固定背景を維持してください。');
}

console.log(`viewport: ${viewport}`);
console.log('main-tab-swipe-surface: pan-y pinch-zoom');
console.log('background: fixed app-shell layer');
