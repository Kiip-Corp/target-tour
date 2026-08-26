/**
 * 한국관광 데이터랩 - 고부가관광(의료관광) > 진료과목별 의료소비 추이 일괄 다운로드 매크로
 *
 *   https://datalab.visitkorea.or.kr/datalab/portal/theme/getMedicalTourSearch.do
 *
 * 조회 조건
 *   탭    : "진료과목별 의료소비 추이" (지역/국가 선택 없이 기간만 있는 탭)
 *   기준  : 월간, yyyy01 ~ yyyy12 — 사이트가 제공하는 전체 기간을 연 단위로 훑는다.
 *
 * 조합마다 로딩 완료 후 상단 "전체 다운로드"를 눌러 zip 1개를 받는다.
 * zip 안에는 소비액/소비건수 계열 CSV 6개가 들어 있다.
 *
 * 다운로드는 로그인 필수. .env.local 의 DATALAB_ID / DATALAB_PW 를 사용한다.
 *
 * 사용법
 *   node playwright/datalab-medical-treatment.mjs                 # 전체 기간
 *   node playwright/datalab-medical-treatment.mjs --from-year 2024 --to-year 2024
 *   node playwright/datalab-medical-treatment.mjs --dry-run
 *   node playwright/datalab-medical-treatment.mjs --headed --slow 150
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const ORIGIN = 'https://datalab.visitkorea.or.kr';
const TARGET_URL = `${ORIGIN}/datalab/portal/theme/getMedicalTourSearch.do`;
const LOGIN_URL = `${ORIGIN}/datalab/portal/mbr/getMbrLoginForm.do`;

/** "진료과목별 의료소비 추이" 탭. 지역/국가 선택 없이 기간만으로 조회한다. */
const TAB = { index: '2', link: '#tab2 > a', name: '진료과목별 의료소비 추이' };

/** tabDiv=2 조회 1회당 발생하는 getTempleteData.do 호출 수 (부족해도 경고만 하고 진행) */
const EXPECT_CHARTS = 6;

/** "전체 다운로드"(tabDiv=2)가 그대로 재사용하는 차트 파라미터 키 — CSV 6개에 대응 */
const REQUIRED_CHART_KEYS = ['chart_03_01', 'chart_03', 'chart_05', 'chart_03_02', 'chart_04', 'chart_06'];

const BLOCKING_ALERTS = [
  '로그인 후 이용이 가능합니다',
  '조회된 자료가 없습니다',
  '까지 조회 가능합니다',
  '시작 기간이 종료기간 보다',
  '올바른 날짜를 입력해',
  '에러가 발생하였습니다',
];

// ────────────────────────────────────────────────────────────── args / env

function parseArgs(argv) {
  const out = {
    fromYear: null, // null = 사이트 제공 시작월(minBaseYm)의 연도부터
    toYear: null,   // null = 사이트 제공 종료월(maxBaseYm)의 연도까지
    outDir: path.join(HERE, 'medical-treatment'),
    headed: false,
    slow: 0,
    dryRun: false,
    force: false,
    retries: 2,
    timeout: 180_000,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--from-year': out.fromYear = Number(next()); break;
      case '--to-year': out.toYear = Number(next()); break;
      case '--out': out.outDir = path.resolve(next()); break;
      case '--headed': out.headed = true; break;
      case '--slow': out.slow = Number(next()); break;
      case '--dry-run': out.dryRun = true; break;
      case '--force': out.force = true; break;
      case '--retries': out.retries = Number(next()); break;
      case '--timeout': out.timeout = Number(next()); break;
      case '--help': case '-h':
        console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
        process.exit(0);
      default:
        throw new Error(`알 수 없는 옵션: ${a}`);
    }
  }
  return out;
}

function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

// ────────────────────────────────────────────────────────────── helpers

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const safe = s => s.replace(/[\/\\:*?"<>|]/g, '_').trim();

async function existingFile(dir, stem) {
  try {
    const names = await fsp.readdir(dir);
    return names.find(n => n === stem || n.startsWith(`${stem}.`)) ?? null;
  } catch {
    return null;
  }
}

function instrument(page) {
  const state = { dialogs: [], inflight: 0, lastActivity: Date.now(), chartResponses: 0 };

  page.on('dialog', async d => {
    state.dialogs.push(d.message());
    log('  [alert]', JSON.stringify(d.message()));
    try { await d.accept(); } catch { /* 이미 닫힘 */ }
  });

  const counts = url => url.startsWith(ORIGIN);
  page.on('request', r => { if (counts(r.url())) { state.inflight++; state.lastActivity = Date.now(); } });
  const done = r => {
    if (!counts(r.url())) return;
    state.inflight = Math.max(0, state.inflight - 1);
    state.lastActivity = Date.now();
  };
  page.on('requestfinished', done);
  page.on('requestfailed', done);
  page.on('response', r => {
    if (r.url().includes('/visualize/getTempleteData.do')) {
      state.chartResponses++;
      state.lastActivity = Date.now();
    }
  });

  state.reset = () => { state.dialogs = []; state.chartResponses = 0; state.lastActivity = Date.now(); };
  state.blocking = () => state.dialogs.filter(m => BLOCKING_ALERTS.some(b => m.includes(b)));
  return state;
}

async function waitNetworkQuiet(state, { quietMs = 2500, timeout = 120_000 } = {}) {
  // 차트 응답 수는 보조 신호다. 부족해도 오래 붙잡지 않고 경고 후 진행한다.
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (state.inflight === 0 && Date.now() - state.lastActivity >= quietMs) return true;
    await sleep(250);
  }
  return false;
}

/** 모달 오버레이(#overlay)를 확실히 내린다 — 팝업을 여러 번 여닫으면 투명 상태로 남아 클릭을 가로챈다. */
async function dismissOverlay(page) {
  await page.evaluate(() => {
    const $ = window.jQuery;
    if (!$) return;
    $('.modal').stop(true, true).hide().removeClass('on');
    $('#overlay').stop(true, true).hide();
  });
}

// ────────────────────────────────────────────────────────────── page actions

async function isLoggedIn(page) {
  return page.evaluate(() => {
    if (typeof window.loginChk === 'function') {
      const m = /if\s*\(\s*"([^"]*)"\s*==\s*""\s*\)/.exec(String(window.loginChk));
      if (m) return m[1] !== '';
    }
    return !!document.querySelector('a[href*="funLogOutDataLab"]');
  });
}

async function login(context, { id, pw, timeout, attempts = 3 }) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);
    const state = instrument(page);
    try {
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await page.fill('#mbrId', id);
      await page.fill('#mbrPw', pw);

      const resP = page.waitForResponse(r => r.url().includes('/datalab/portal/mbr/login.do'), { timeout });
      await page.click('input[value="로그인"]');
      const res = await resP;

      // funLogin() 은 성공 즉시 폼을 submit 해 페이지를 이동시킨다. 그 사이 본문을 못 읽는 경우가
      // 있으므로 파싱 실패를 실패로 단정하지 않고 실제 세션으로 확인한다.
      let rtnCd = null;
      let rtnMsg = '';
      try {
        const body = await res.json();
        rtnCd = body?.info?.rtnCd ?? null;
        rtnMsg = body?.info?.rtnMsg ?? '';
      } catch { /* 이동 중 */ }
      if (rtnCd && rtnCd !== 'S') throw new Error(`rtnCd=${rtnCd} ${rtnMsg}`.trim());

      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.loginChk === 'function');
      if (!(await isLoggedIn(page))) {
        throw new Error(rtnMsg || state.dialogs.join(' / ') || '세션이 만들어지지 않음');
      }

      await page.close();
      log(`로그인 성공: ${id}`);
      return;
    } catch (e) {
      lastErr = e;
      log(`로그인 시도 ${i}/${attempts} 실패: ${e.message.split('\n')[0]}`);
      await page.close().catch(() => {});
      if (i < attempts) await sleep(5_000 * i);
    }
  }
  throw new Error(`로그인 실패: ${lastErr?.message ?? '알 수 없음'}`);
}

async function openTargetPage(context, timeout) {
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  const state = instrument(page);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
  await waitNetworkQuiet(state, { quietMs: 1500, timeout: 60_000 });
  return { page, state };
}

/** "진료과목별 의료소비 추이" 탭으로 전환. 탭 핸들러는 실제로 탭이 바뀔 때만 funSrch() 를 호출한다. */
async function openTreatmentTab(page, state) {
  if ((await page.inputValue('#tabDiv')) !== TAB.index) {
    await dismissOverlay(page);
    await page.click(TAB.link);
    await page.waitForFunction(idx => document.querySelector('#tabDiv')?.value === idx, TAB.index);
  }
  await page.waitForSelector('#searchWrap', { state: 'visible' });
  await page.selectOption('#lookupDate', '1'); // 월간
  await waitNetworkQuiet(state, { quietMs: 1500, timeout: 120_000 });
}

/**
 * 기간 설정. onBlur="fnChgYear('4', …)" 가 돌아야 srchBgngYear/srchBgngMm 등 hidden 이 채워지고,
 * 그 hidden 들이 곧 다운로드 파라미터가 된다. 18개월 초과 시 자동보정이 시작월을 덮어쓰므로
 * 종료 → 시작 → 종료 순으로 넣는다.
 */
async function setMonthRange(page, from, to) {
  for (const [sel, v] of [['#monthEnd', to], ['#monthStart', from], ['#monthEnd', to]]) {
    await page.fill(sel, v);
    await page.locator(sel).blur();
    await sleep(250);
  }
  const got = [await page.inputValue('#monthStart'), await page.inputValue('#monthEnd')];
  if (got[0] !== from || got[1] !== to) {
    throw new Error(`기간 설정 실패: 요청 ${from}~${to}, 실제 ${got[0]}~${got[1]}`);
  }
}

/**
 * 조회 버튼(funSrch) → 8개 차트 로딩 완료까지 대기.
 *
 * 이 페이지에는 조회 결과 기간을 담는 hidden 이 없다. 대신 chart_init 이 차트별 조회
 * 파라미터를 window.chartRegParam 에 등록하고, "전체 다운로드"가 바로 그 값을 그대로
 * 재사용하므로, chartRegParam 이 요청한 국가/기간으로 갱신됐는지를 확인한다.
 */
async function runQuery(page, state, { from, to, timeout }) {
  // state.reset() 은 호출부에서 조회를 유발하는 동작(국가 선택 / 조회 클릭) 직전에 한다.
  // 국가 선택은 popSet_nat() 이 곧바로 funSrch() 를 부르므로 여기서 리셋하면 이미 온 응답이 지워진다.
  await dismissOverlay(page);
  await page.click('.search-filter .btn-wrap input[value="조회"]');

  await page.waitForFunction(
    ({ from, to, keys }) => {
      const reg = window.chartRegParam;
      if (!reg) return false;
      if (!keys.every(k => reg[k])) return false;
      const c = reg.chart_03_01;
      return c && c.BASE_YM1 === from && c.BASE_YM2 === to;
    },
    { from, to, keys: REQUIRED_CHART_KEYS },
    { timeout: 60_000 },
  ).catch(() => {
    const blocked = state.blocking();
    throw new Error(`조회가 반영되지 않았습니다${blocked.length ? `: ${blocked.join(' / ')}` : ' (chartRegParam 미갱신)'}`);
  });

  const blocked = state.blocking();
  if (blocked.length) throw new Error(`조회 차단: ${blocked.join(' / ')}`);

  const deadline = Date.now() + timeout;
  while (state.chartResponses < EXPECT_CHARTS && Date.now() < deadline) await sleep(300);
  if (state.chartResponses < EXPECT_CHARTS) {
    log(`  ! 차트 응답 ${state.chartResponses}/${EXPECT_CHARTS} (계속 진행)`);
  }

  await waitNetworkQuiet(state, { quietMs: 2500, timeout });
  await page.waitForFunction(
    () =>
      !document.querySelector('#loading')?.classList.contains('active') &&
      !document.querySelector('#loadingSpin')?.classList.contains('active'),
    undefined,
    { timeout: 60_000 },
  );

  const after = state.blocking();
  if (after.length) throw new Error(`조회 후 차단 alert: ${after.join(' / ')}`);
}

/** 상단 "전체 다운로드" (checkDn(9999)) → zip 저장 */
async function downloadAll(page, state, { dir, stem, timeout }) {
  state.reset();
  await fsp.mkdir(dir, { recursive: true });

  await dismissOverlay(page);
  const btn = page.locator('a[href="javascript:checkDn(9999);"]').first();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }).catch(e => {
      const blocked = state.blocking();
      throw new Error(`다운로드 실패${blocked.length ? `: ${blocked.join(' / ')}` : `: ${e.message}`}`);
    }),
    btn.click(),
  ]);

  const suggested = download.suggestedFilename();
  const ext = path.extname(suggested) || '.zip';
  const dest = path.join(dir, `${stem}${ext}`);
  await download.saveAs(dest);
  const size = (await fsp.stat(dest)).size;

  await page.waitForFunction(
    () => !document.querySelector('#loadingSpin')?.classList.contains('active'),
    undefined,
    { timeout: 60_000 },
  ).catch(() => {});
  await page.evaluate(() => { try { loadingStop(); loadingStopInfinity(); } catch {} });

  return { dest, suggested, size };
}

// ────────────────────────────────────────────────────────────── main

async function main() {
  const args = parseArgs(process.argv);
  loadDotEnv();

  const id = process.env.DATALAB_ID;
  const pw = process.env.DATALAB_PW;
  if (!args.dryRun && (!id || !pw)) {
    console.error(
      '다운로드는 데이터랩 로그인이 필요합니다.\n' +
      `  ${path.join(ROOT, '.env.local')} 에 DATALAB_ID / DATALAB_PW 를 넣어주세요.\n` +
      '  조회 동작만 확인하려면: node playwright/datalab-medical-treatment.mjs --dry-run',
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: !args.headed, slowMo: args.slow });
  const context = await browser.newContext({
    acceptDownloads: true,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1920, height: 1080 },
  });
  context.setDefaultTimeout(args.timeout);

  const manifestPath = path.join(args.outDir, 'manifest.jsonl');
  await fsp.mkdir(args.outDir, { recursive: true });
  const record = async row => fsp.appendFile(manifestPath, JSON.stringify(row) + '\n');

  const summary = { ok: 0, skipped: 0, failed: 0 };

  try {
    if (!args.dryRun) await login(context, { id, pw, timeout: args.timeout });

    const { page, state } = await openTargetPage(context, args.timeout);
    if (!args.dryRun && !(await isLoggedIn(page))) throw new Error('로그인 세션이 페이지에 반영되지 않았습니다.');

    const minBaseYm = await page.inputValue('#minBaseYm');
    const maxBaseYm = await page.inputValue('#maxBaseYm');
    log(`사이트 조회 가능 기간: ${minBaseYm} ~ ${maxBaseYm}`);

    const fromYear = args.fromYear ?? Number(minBaseYm.slice(0, 4));
    const toYear = args.toYear ?? Number(maxBaseYm.slice(0, 4));
    const years = [];
    for (let y = fromYear; y <= toYear; y++) years.push(y);

    await openTreatmentTab(page, state);
    log(`탭: ${TAB.name}`);

    log(`${years.length}개 연도 구간 = ${years.length}건`);

    /** 페이지를 다시 로드해 렌더러 누적을 초기화하고 탭/기준을 재설정한다. */
    let freshPage = true;
    const resetPage = async () => {
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
      await waitNetworkQuiet(state, { quietMs: 1200, timeout: 60_000 });
      if (!args.dryRun && !(await isLoggedIn(page))) {
        log('세션이 끊겼습니다 → 재로그인');
        await login(context, { id, pw, timeout: args.timeout });
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
        await waitNetworkQuiet(state, { quietMs: 1200, timeout: 60_000 });
      }
      await openTreatmentTab(page, state);
    };

    const dir = args.outDir;
    for (const year of years) {
      if (!freshPage) await resetPage();
      freshPage = false;

        let from = `${year}01`;
        let to = `${year}12`;
        if (from < minBaseYm) from = minBaseYm;
        if (to > maxBaseYm) to = maxBaseYm;
        const range = `${from}-${to}`;

        if (from > to) {
          log(`SKIP ${year}: 제공 기간(${minBaseYm}~${maxBaseYm}) 밖`);
          summary.skipped++;
          await record({ year, status: 'skipped', reason: `제공 기간 ${minBaseYm}~${maxBaseYm} 밖` });
          continue;
        }

        if (!args.force && !args.dryRun) {
          const found = await existingFile(dir, range);
          if (found) {
            summary.skipped++;
            log(`SKIP ${range} (이미 있음: ${found})`);
            continue;
          }
        }

        const label = range;
        for (let attempt = 1; attempt <= args.retries + 1; attempt++) {
          const lastAttempt = attempt === args.retries + 1;
          try {
            log(`▶ ${label}${attempt > 1 ? ` (재시도 ${attempt - 1}/${args.retries})` : ''}`);
            await setMonthRange(page, from, to);
            state.reset();
            await runQuery(page, state, { from, to, timeout: args.timeout });

            if (args.dryRun) {
              log(`  (dry-run) 조회 완료 · 차트응답 ${state.chartResponses}`);
              await record({ range, status: 'dry-run' });
              summary.ok++;
              break;
            }

            const r = await downloadAll(page, state, { dir, stem: range, timeout: args.timeout });
            log(`  ✓ ${path.relative(ROOT, r.dest)} (${(r.size / 1024).toFixed(1)} KB, 원본: ${r.suggested})`);
            await record({
              range, status: 'ok',
              file: path.relative(ROOT, r.dest), suggested: r.suggested, bytes: r.size,
            });
            summary.ok++;
            break;
          } catch (e) {
            if (lastAttempt) {
              summary.failed++;
              log(`  ✗ ${label}: ${e.message}`);
              await record({ range, status: 'failed', error: e.message });
            } else {
              log(`  … ${label}: ${e.message.split('\n')[0]}`);
            }
            try {
              await resetPage();
            } catch (e2) {
              log(`  !! 복구 실패, 중단: ${e2.message}`);
              throw e2;
            }
          }
        }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  log(`완료 — 성공 ${summary.ok} / 스킵 ${summary.skipped} / 실패 ${summary.failed}`);
  log(`로그: ${path.relative(ROOT, manifestPath)}`);
  if (summary.failed) process.exitCode = 1;
}

main().catch(e => {
  console.error('\n중단:', e.message);
  process.exitCode = 1;
});
