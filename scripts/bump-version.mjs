// 배포 전에 실행: node scripts/bump-version.mjs
// 모든 CSS·JS 주소 뒤에 ?v=버전 을 붙여, 브라우저가 예전 파일을 캐시에서 섞어 쓰지 않게 한다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const now = new Date(Date.now() + 9 * 3600000); // 한국 시간
const v = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');

const files = ['index.html', ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
for (const f of files) {
  let s = readFileSync(f, 'utf8');
  s = s
    .replace(/(from '\.\/[\w-]+\.js)(\?v=[\w-]+)?'/g, `$1?v=${v}'`)
    .replace(/((?:href|src)="(?:css|js)\/[\w-]+\.(?:css|js))(\?v=[\w-]+)?"/g, `$1?v=${v}"`)
    .replace(/(export const APP_VERSION = ')[\w-]*(')/, `$1${v}$2`);
  writeFileSync(f, s);
}
console.log(`버전 ${v} 적용: ${files.join(', ')}`);
