/**
 * 데이터랩 다운로드(zip) → 보드가 읽는 통합 CSV 추출기
 *
 * `datalab-macro.mjs` 가 받아둔
 *   playwright/downloads/<거주지>/<방문지>/<기간>/{방문자수,관광소비}.zip
 * 를 전부 풀어, 국가 × 시도 × 월 단위 tidy CSV 두 개로 합친다.
 *
 *   data/7국가지역월간/방문_월별.csv
 *   data/7국가지역월간/관광소비_월별.csv
 *
 * playwright/downloads/ 는 .gitignore 대상이라 빌드(정적 export) 시점에는 없다 —
 * 그래서 원본 zip이 아니라 이 산출물 CSV를 커밋해서 data/ 에서 읽는다.
 *
 * 연간 지역분포(히트맵/관광소비 현황)는 따로 뽑지 않는다. 월별 추정치를 연 단위로
 * 합산하면 데이터랩이 주는 비율과 소수점 첫째 자리까지 일치함을 확인했다.
 *
 * 사용법
 *   node playwright/extract-datalab.mjs
 *   node playwright/extract-datalab.mjs --downloads <dir> --out <dir>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvFrom, readZip } from './datalab-zip.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/** 2026.07 출범한 통합시 — 매크로가 전 기간 스킵했고 실제 파일도 없다. */
const EXCLUDED_SIDO = '전남광주통합특별시';

// ────────────────────────────────────────────────────────────── 수집

const listDirs = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name.normalize('NFC'))
    .sort();

function collect(downloads) {
  const visit = [];
  const spend = [];
  const skipped = [];

  for (const nation of listDirs(downloads)) {
    for (const sido of listDirs(path.join(downloads, nation))) {
      if (sido === EXCLUDED_SIDO) continue;
      for (const range of listDirs(path.join(downloads, nation, sido))) {
        const dir = path.join(downloads, nation, sido, range);

        const visitZip = path.join(dir, '방문자수.zip');
        if (fs.existsSync(visitZip)) {
          const rows = csvFrom(readZip(visitZip), '방문 추이.csv');
          // 기준년월,구분,방문지,방문자 수,방문자 수 비율
          // "전체 외국인" 행에만 절대값이, "<국가>인" 행에만 비율이 들어 있다 — 월로 합친다.
          const total = new Map();
          const share = new Map();
          for (const c of rows) {
            if (c[1] === '전체 외국인') total.set(c[0], c[3]);
            else share.set(c[0], c[4]);
          }
          for (const ym of [...total.keys()].sort()) {
            visit.push([nation, sido, ym, total.get(ym), share.get(ym) ?? '']);
          }
        } else {
          skipped.push(`${nation}/${sido}/${range}/방문자수`);
        }

        const spendZip = path.join(dir, '관광소비.zip');
        if (fs.existsSync(spendZip)) {
          // 기준연월,방문자 거주지,방문지,거주지관광소비율(%),전체관광소비액(천원)
          // 소비액은 지수표기(3.63E8)로 내려와 그대로 두면 CSV 소비처가 헷갈린다 — 정수로 편다.
          for (const c of csvFrom(readZip(spendZip), '관광소비 추이.csv').sort((a, b) => a[0].localeCompare(b[0]))) {
            spend.push([nation, sido, c[0], c[3], String(Math.round(Number(c[4])))]);
          }
        } else {
          skipped.push(`${nation}/${sido}/${range}/관광소비`);
        }
      }
    }
  }
  return { visit, spend, skipped };
}

// ────────────────────────────────────────────────────────────── 실행

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const downloads = path.resolve(arg('--downloads', path.join(HERE, 'downloads')));
const outDir = path.resolve(arg('--out', path.join(ROOT, 'data', '7국가지역월간')));

if (!fs.existsSync(downloads)) {
  console.error(`다운로드 폴더가 없습니다: ${downloads}\n먼저 node playwright/datalab-macro.mjs 를 실행하세요.`);
  process.exit(1);
}

const { visit, spend, skipped } = collect(downloads);
fs.mkdirSync(outDir, { recursive: true });

const write = (file, header, rows) => {
  fs.writeFileSync(path.join(outDir, file), [header, ...rows.map((r) => r.join(','))].join('\n') + '\n');
  console.log(`${file}: ${rows.length.toLocaleString()}행`);
};

write('방문_월별.csv', '방문자 거주지,방문지,기준년월,전체 외국인 방문자 수,거주지 방문자 수 비율(%)', visit);
write('관광소비_월별.csv', '방문자 거주지,방문지,기준년월,거주지 관광소비 비율(%),전체 관광소비액(천원)', spend);

if (skipped.length) {
  console.log(`\n원본 zip 없음 ${skipped.length}건 (2026.07 시도 개편으로 광주·전남 2026 미제공):`);
  for (const s of skipped) console.log(`  - ${s}`);
}
