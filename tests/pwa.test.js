import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readProjectFile = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('아이폰 홈 화면 설치에 필요한 설정과 아이콘을 제공한다', () => {
  const manifest = JSON.parse(readProjectFile('public/manifest.webmanifest'));
  const html = readProjectFile('index.html');

  assert.equal(manifest.short_name, '체스 교실');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
  assert.ok(readFileSync(new URL('../public/icon-192.png', import.meta.url)).length > 1000);
  assert.ok(readFileSync(new URL('../public/icon-512.png', import.meta.url)).length > 1000);
});

test('서비스워커가 앱 화면과 새 배포 파일을 오프라인 저장하도록 구성된다', () => {
  const serviceWorker = readProjectFile('public/sw.js');
  const main = readProjectFile('src/main.jsx');

  assert.match(main, /serviceWorker/);
  assert.match(serviceWorker, /cacheAppShell/);
  assert.match(serviceWorker, /networkFirst/);
  assert.match(serviceWorker, /request\.mode === 'navigate'/);
});
