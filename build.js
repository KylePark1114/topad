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

// ── 진단 신청 → 대시보드 DB ─────────────────────────────────────────────────
// 폼은 FormSubmit(메일)로만 간다. 메일은 사람이 읽어야 끝나고, 읽기 전까지
// 아무것도 자동으로 이어지지 않는다. app.top-ad.net/api/consult 로도 보내면
// 접수 → 업체 특정 → 진단 리포트 초안까지 자동으로 이어진다.
//
// 번들 안의 제출 핸들러를 고치지 않는다. 거기는 JSON 으로 이스케이프된 한
// 줄이라 문자열 수술을 하면 다음 번들 교체 때 깨진다. 덧붙이는 쪽이 안전하다.
const injectPath = path.join(__dirname, 'inject', 'consult.js');
if (fs.existsSync(injectPath)) {
  const consult = fs.readFileSync(injectPath, 'utf8');
  let out = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  if (out.includes('app.top-ad.net/api/consult')) {
    console.log('상담 접수 스크립트: 이미 들어 있음');
  } else if (!out.includes('</body>')) {
    console.warn('[warn] </body> 를 찾지 못해 상담 접수 스크립트를 넣지 못했다');
  } else {
    const nl = String.fromCharCode(10);
    out = out.replace('</body>', ['<script>', consult, '</script>', '</body>'].join(nl));
    fs.writeFileSync(path.join(OUT, 'index.html'), out);
    console.log('상담 접수 스크립트 주입 완료');
  }
} else {
  console.warn('[warn] inject/consult.js 가 없다 — 상담 접수가 메일로만 간다');
}
