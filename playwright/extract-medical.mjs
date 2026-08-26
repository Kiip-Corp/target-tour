/**
 * 데이터랩 "국가별 의료소비 추이"(4번) 다운로드 → 보드가 읽는 통합 CSV 추출기
 *
 * `datalab-medical.mjs` 가 받아둔
 *   playwright/medical/<국가>/<기간>.zip
 * 를 전부 풀어, 국가 × 월 tidy CSV 하나로 합친다.
 *
 *   data/4국가월간/의료소비_월별.csv
 *   data/4국가월간/진료과목_월별.csv
 *
 * playwright/medical/ 은 .gitignore 대상이라 빌드(정적 export) 시점에는 없다 —
 * 그래서 원본 zip이 아니라 이 산출물 CSV를 커밋해서 data/ 에서 읽는다.
 *
 * 진료과목은 "비율 추이"(월별) 쪽만 뽑는다 — 기간 전체를 뭉갠 스냅샷은 월별을 합치면 나온다.
 *
 * 사용법
 *   node playwright/extract-medical.mjs
 *   node playwright/extract-medical.mjs --downloads <dir> --out <dir>
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvFrom, readZip } from './datalab-zip.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const listDirs = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name.normalize('NFC'))
    .sort();

/** 데이터랩은 큰 수를 "1.2117792E7" 지수표기로 내려준다 — 그대로 두면 CSV 소비처가 헷갈린다. */
const plain = (v) => String(Math.round(Number(v)));

function collect(downloads) {
  /** 국가 → 기준연월 → 열 4종. 기간 zip끼리 월이 겹칠 수 있어 맵으로 모은 뒤 정렬한다. */
  const byNation = new Map();
  /** 국가 → `기준연월|진료과목` → {소비액 비율, 소비건수 비율} */
  const specialty = new Map();

  for (const nation of listDirs(downloads)) {
    const rows = new Map();
    const spec = new Map();
    for (const file of fs.readdirSync(path.join(downloads, nation)).sort()) {
      if (!file.endsWith('.zip')) continue;
      const entries = readZip(path.join(downloads, nation, file));
      const cell = (ym) => {
        if (!rows.has(ym)) rows.set(ym, { amount: '', count: '', amountShare: '', countShare: '' });
        return rows.get(ym);
      };

      // 국가명,기준연월,소비금액 / 국가명,기준연월,소비건수
      for (const c of csvFrom(entries, `${nation} 외국인 소비액 추이.csv`)) cell(c[1]).amount = plain(c[2]);
      for (const c of csvFrom(entries, `${nation} 외국인 소비건수 추이.csv`)) cell(c[1]).count = plain(c[2]);

      // (기준연월),국가명,KTO카테고리소분류,비율 — 소분류가 "전체"인 행이 전체 외국인 대비 비율이다.
      for (const c of csvFrom(entries, `${nation} 외국인 의료 소비액 비율.csv`)) {
        if (c[2] === '전체') cell(c[0]).amountShare = c[3];
      }
      for (const c of csvFrom(entries, `${nation} 외국인 의료 소비건수 비율.csv`)) {
        if (c[2] === '전체') cell(c[0]).countShare = c[3];
      }

      // 기준연월,국가명,KTO카테고리소분류,비율_전체 — 그 달 이 국가 의료소비의 진료과목 구성이다.
      const specCell = (ym, cat) => {
        const k = `${ym}|${cat}`;
        if (!spec.has(k)) spec.set(k, { amountShare: '', countShare: '' });
        return spec.get(k);
      };
      for (const c of csvFrom(entries, `${nation} 외국인 의료 소비액 진료과목별 비율 추이.csv`)) {
        specCell(c[0], c[2]).amountShare = c[3];
      }
      for (const c of csvFrom(entries, `${nation} 외국인 의료 소비건수 진료과목별 비율 추이.csv`)) {
        specCell(c[0], c[2]).countShare = c[3];
      }
    }
    byNation.set(nation, rows);
    specialty.set(nation, spec);
  }

  const out = [];
  for (const [nation, rows] of byNation) {
    for (const ym of [...rows.keys()].sort()) {
      const r = rows.get(ym);
      out.push([nation, ym, r.amount, r.count, r.amountShare, r.countShare]);
    }
  }

  const specialtyRows = [];
  for (const [nation, spec] of specialty) {
    for (const key of [...spec.keys()].sort()) {
      const [ym, cat] = key.split('|');
      const r = spec.get(key);
      specialtyRows.push([nation, ym, cat, r.amountShare, r.countShare]);
    }
  }
  return { out, specialtyRows };
}

// ────────────────────────────────────────────────────────────── 실행

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const downloads = path.resolve(arg('--downloads', path.join(HERE, 'medical')));
const outDir = path.resolve(arg('--out', path.join(ROOT, 'data', '4국가월간')));

if (!fs.existsSync(downloads)) {
  console.error(`다운로드 폴더가 없습니다: ${downloads}\n먼저 node playwright/datalab-medical.mjs 를 실행하세요.`);
  process.exit(1);
}

const { out: rows, specialtyRows } = collect(downloads);
fs.mkdirSync(outDir, { recursive: true });

const write = (file, header, data) => {
  fs.writeFileSync(path.join(outDir, file), [header, ...data.map((r) => r.join(','))].join('\n') + '\n');
  console.log(`${file}: ${data.length.toLocaleString()}행`);
};

write(
  '의료소비_월별.csv',
  '국가명,기준연월,의료 소비액,의료 소비건수,전체 외국인 대비 소비액 비율(%),전체 외국인 대비 소비건수 비율(%)',
  rows
);
write('진료과목_월별.csv', '국가명,기준연월,진료과목,소비액 비율(%),소비건수 비율(%)', specialtyRows);

const blank = [...rows, ...specialtyRows].filter((r) => r.some((c) => c === ''));
if (blank.length) console.log(`\n빈 칸이 있는 행 ${blank.length}건:`, blank.slice(0, 10));
