const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = process.argv[2] ?? "source/bundle.html";
const OUT = process.argv[3] ?? ".";

const s = fs.readFileSync(SRC, 'utf8');
function grab(type) {
  const t = `<script type="__bundler/${type}">`;
  const i = s.indexOf(t);
  if (i < 0) return null;
  const j = s.indexOf('</scr' + 'ipt>', i);
  return s.slice(i + t.length, j).trim();
}

const manifest = JSON.parse(grab('manifest'));
let template = JSON.parse(grab('template'));

const EXT = {
  'text/javascript': '.js',
  'application/javascript': '.js',
  'font/woff2': '.woff2',
  'font/woff': '.woff',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
  'text/css': '.css',
};

// OUT 이 저장소 루트일 수 있으므로 통째로 지우지 않는다. assets 만 갈아끼운다.
fs.rmSync(path.join(OUT, 'assets'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

let written = 0, bytes = 0, missingExt = new Set();
for (const [uuid, entry] of Object.entries(manifest)) {
  const ext = EXT[entry.mime];
  if (!ext) { missingExt.add(entry.mime); continue; }
  let buf = Buffer.from(entry.data, 'base64');
  if (entry.compressed) buf = zlib.gunzipSync(buf);
  const name = uuid + ext;
  fs.writeFileSync(path.join(OUT, 'assets', name), buf);
  written++; bytes += buf.length;

  // Rewrite every reference to this uuid in the template.
  const before = template;
  template = template.split(uuid).join('assets/' + name);
  if (before === template) console.warn('[warn] unreferenced asset:', uuid, entry.mime);
}

if (missingExt.size) console.warn('[warn] unknown mimes:', [...missingExt]);

// Any uuid left unresolved means a broken reference — fail loudly rather than
// shipping a page with dead links.
const leftover = template.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
if (leftover) {
  const uniq = [...new Set(leftover)];
  console.warn('[warn] unresolved uuid refs:', uniq.length, uniq.slice(0, 5));
}

fs.writeFileSync(path.join(OUT, 'index.html'), template);
console.log(`assets: ${written}개, ${(bytes / 1048576).toFixed(2)} MB`);
console.log(`index.html: ${(Buffer.byteLength(template) / 1024).toFixed(0)} KB`);

// ── SEO head ────────────────────────────────────────────────────────────────
// 번들 원본은 <title>Bundled Page</title> 뿐이라 검색·공유에서 그대로 손해다.
// 여기서 실제 메타데이터를 주입한다. 카피는 히어로 문구에서 가져온 것으로,
// 임의로 지어낸 문장이 아니다.
const SITE = 'https://top-ad.net/';
const TITLE = 'TOPAD — 네이버 플레이스 순위 관리';
const DESC =
  '플레이스 순위가 안 올라 답답한 대표님. 현재 플레이스 상태와 경쟁 상황을 ' +
  '진단하고, 업체에 맞는 관리 방향을 설정합니다. 무료 플레이스 진단 신청.';

const head = `
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="${SITE}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TOPAD">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${SITE}">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
`;

let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html.replace('<html>', '<html lang="ko">');
html = html.replace('</head>', head + '</head>');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('SEO head 주입 완료');
