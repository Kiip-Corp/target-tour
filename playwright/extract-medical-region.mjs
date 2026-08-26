/**
 * 데이터랩 "지역별 의료소비 추이"(5번) 다운로드 → 보드가 읽는 통합 CSV 추출기
 *
 * `datalab-medical-region.mjs` 가 받아둔
 *   playwright/getMedicalTourSearch/<지역>/<기간>.zip
 * 를 전부 풀어, 지역 × 월 tidy CSV 하나로 합친다.
 *
 *   data/5지역월간/의료소비_월별.csv
 *   data/5지역월간/진료과목_연간.csv
 *
 * playwright/getMedicalTourSearch/ 는 .gitignore 대상이라 빌드(정적 export) 시점에는 없다 —
 * 그래서 원본 zip이 아니라 이 산출물 CSV를 커밋해서 data/ 에서 읽는다.
 *
 * 지역에는 17개 시도 외에 "전국"과 "전남광주통합특별시"가 함께 들어간다.
 *   - 전국은 17개 시도 합계보다 크다(시도가 특정되지 않은 소비가 있다). 분모로 쓸 수 있게 남긴다.
 *   - 전남광주통합특별시는 광주광역시 + 전라남도와 원 단위까지 같은 중복 행이다. 2026.07 이후
 *     구 시도가 제공되지 않아 그 달만 통합시로 나오므로, 합계를 낼 때 반드시 제외해야 한다.
 *
 * 진료과목별 비율은 국가 자료(4번)와 달리 월 구분이 없다 — 조회 기간 전체를 뭉갠 스냅샷 하나뿐이라
 * 기간(=연도) 단위로만 뽑는다. 인기 소비 동네 CSV는 /popularNeighborhoods 가 따로 다뤄 뽑지 않는다.
 *
 * 사용법
 *   node playwright/extract-medical-region.mjs
 *   node playwright/extract-medical-region.mjs --downloads <dir> --out <dir>
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

/** 데이터랩은 큰 수를 "5.5132709E7" 지수표기로 내려준다 — 그대로 두면 CSV 소비처가 헷갈린다. */
const plain = (v) => String(Math.round(Number(v)));

function collect(downloads) {
  const out = [];
  const specialtyRows = [];

  for (const region of listDirs(downloads)) {
    /** 기간 zip끼리 월이 겹칠 수 있어 맵으로 모은 뒤 정렬한다. */
    const rows = new Map();
    /** `기준연도|진료과목` → {소비액 비율, 소비건수 비율} */
    const spec = new Map();

    for (const file of fs.readdirSync(path.join(downloads, region)).sort()) {
      if (!file.endsWith('.zip')) continue;
      const entries = readZip(path.join(downloads, region, file));
      const cell = (ym) => {
        if (!rows.has(ym)) rows.set(ym, { amount: '', count: '' });
        return rows.get(ym);
      };

      // 기준연월,시도명,소비금액_(전체) / 기준연월,시도명,소비건수_(전체)
      for (const c of csvFrom(entries, `${region} 외국인 의료 소비액 추이.csv`)) cell(c[0]).amount = plain(c[2]);
      for (const c of csvFrom(entries, `${region} 외국인 의료 소비건수 추이.csv`)) cell(c[0]).count = plain(c[2]);

      // KTO카테고리소분류,비율_(카테고리별) — 기준연월 칸이 없어 zip 파일명(202401-202412)에서 연도를 딴다.
      const year = file.slice(0, 4);
      const specCell = (cat) => {
        const k = `${year}|${cat}`;
        if (!spec.has(k)) spec.set(k, { amountShare: '', countShare: '' });
        return spec.get(k);
      };
      for (const c of csvFrom(entries, `${region} 외국인 의료 소비액 진료과목별 비율.csv`)) {
        specCell(c[0]).amountShare = c[1];
      }
      for (const c of csvFrom(entries, `${region} 외국인 의료 소비건수 진료과목별 비율.csv`)) {
        specCell(c[0]).countShare = c[1];
      }
    }

    for (const ym of [...rows.keys()].sort()) {
      const r = rows.get(ym);
      out.push([region, ym, r.amount, r.count]);
    }
    for (const key of [...spec.keys()].sort()) {
      const [year, cat] = key.split('|');
      const r = spec.get(key);
      specialtyRows.push([region, year, cat, r.amountShare, r.countShare]);
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

const downloads = path.resolve(arg('--downloads', path.join(HERE, 'getMedicalTourSearch')));
const outDir = path.resolve(arg('--out', path.join(ROOT, 'data', '5지역월간')));

if (!fs.existsSync(downloads)) {
  console.error(
    `다운로드 폴더가 없습니다: ${downloads}\n먼저 node playwright/datalab-medical-region.mjs 를 실행하세요.`
  );
  process.exit(1);
}

const { out: rows, specialtyRows } = collect(downloads);
fs.mkdirSync(outDir, { recursive: true });

const write = (file, header, data) => {
  fs.writeFileSync(path.join(outDir, file), [header, ...data.map((r) => r.join(','))].join('\n') + '\n');
  console.log(`${file}: ${data.length.toLocaleString()}행`);
};

write('의료소비_월별.csv', '시도명,기준연월,의료 소비액,의료 소비건수', rows);
write('진료과목_연간.csv', '시도명,기준연도,진료과목,소비액 비율(%),소비건수 비율(%)', specialtyRows);
console.log(`지역 ${new Set(rows.map((r) => r[0])).size}개`);

const blank = [...rows, ...specialtyRows].filter((r) => r.some((c) => c === ''));
if (blank.length) console.log(`\n빈 칸이 있는 행 ${blank.length}건:`, blank.slice(0, 10));
