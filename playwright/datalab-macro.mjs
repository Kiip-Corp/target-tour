/**
 * 한국관광 데이터랩 - 지역별 방문자/관광소비 일괄 다운로드 매크로
 *
 *   https://datalab.visitkorea.or.kr/datalab/portal/loc/getAreaVisitDataForm.do
 *
 * 조회 조건
 *   구분         : 외국인
 *   방문자 거주지 : --nation (기본 대만)
 *   방문지        : 광역시/도 전체 순회 (시/군/구는 선택하지 않음 = 시도 단위)
 *   기준         : 월간, yyyy01 ~ yyyy12 (--from-year ~ --to-year)
 *
 * 각 조합마다
 *   1. "방문자수" 탭 로딩 완료 후 "전체 다운로드"
 *   2. "관광소비" 탭 로딩 완료 후 "전체 다운로드"
 *
 * 다운로드는 로그인 필수. .env.local 의 DATALAB_ID / DATALAB_PW 를 사용한다.
 *
 * 사용법
 *   node playwright/datalab-macro.mjs                          # 전체 실행
 *   node playwright/datalab-macro.mjs --sido 서울특별시,제주특별자치도
 *   node playwright/datalab-macro.mjs --from-year 2024 --to-year 2024
 *   node playwright/datalab-macro.mjs --nation 일본
 *   node playwright/datalab-macro.mjs --dry-run                 # 조회만, 다운로드/로그인 없음
 *   node playwright/datalab-macro.mjs --headed --slow 150       # 눈으로 확인
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const ORIGIN = 'https://datalab.visitkorea.or.kr';
const TARGET_URL = `${ORIGIN}/datalab/portal/loc/getAreaVisitDataForm.do`;
const LOGIN_URL = `${ORIGIN}/datalab/portal/mbr/getMbrLoginForm.do`;

/** 탭 정의. expectCharts = 탭 조회 시 발생하는 getTempleteData.do 호출 수 */
const TABS = [
  { key: '방문자수', tabLi: '#tab1', link: '#tab1 > a', expectCharts: 2 },
  { key: '관광소비', tabLi: '#tab2', link: '#tab2on', expectCharts: 3 },
];

/**
 * 시도별 데이터 제공 기간 제약 (사이트 안내문 / common.js 의 validation_date 기준).
 *   12 전남광주통합특별시 : 2026.07.01 출범 → 202607 부터
 *   29 광주광역시 / 46 전라남도 : 위 개편으로 → 202606 까지
 * 여기에 없는 제약이 사이트에 걸려 있어도, 조회 후 실제 BASEYM 을 읽어 폴더명에 반영한다.
 */
const SIDO_MIN_YM = { 12: '202607' };
const SIDO_MAX_YM = { 29: '202606', 46: '202606' };

/** 조회를 막는(=재시도/스킵해야 하는) alert 문구 */
const BLOCKING_ALERTS = [
  '로그인 후 이용이 가능합니다',
  '상단의 조회 조건을 모두 선택하시면',
  '방문자 거주지와 방문지는 동일지역을',
  '조회된 자료가 없습니다',
  '까지 조회 가능합니다',
  '시작 기간이 종료기간 보다',
  '올바른 날짜를 입력해',
  '에러가 발생하였습니다',
];

// ────────────────────────────────────────────────────────────── args / env

function parseArgs(argv) {
  const out = {
    nation: '대만',
    fromYear: 2020,
    toYear: 2026,
    sido: null, // null = 전체
    outDir: path.join(HERE, 'downloads'),
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
      case '--nation': out.nation = next(); break;
      case '--from-year': out.fromYear = Number(next()); break;
      case '--to-year': out.toYear = Number(next()); break;
      case '--sido': out.sido = next().split(',').map(s => s.trim()).filter(Boolean); break;
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

/** .env.local / .env 를 얕게 파싱해서 process.env 에 없는 키만 채운다. */
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

function addMonths(ym, n) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(4, 6));
  const t = y * 12 + (m - 1) + n;
  return `${String(Math.floor(t / 12)).padStart(4, '0')}${String((t % 12) + 1).padStart(2, '0')}`;
}

/** 파일시스템에 안전한 이름으로 */
const safe = s => s.replace(/[\/\\:*?"<>|]/g, '_').trim();

/** dir 안에 `${stem}.*` 파일이 이미 있으면 그 이름을 반환 */
async function existingFile(dir, stem) {
  try {
    const names = await fsp.readdir(dir);
    return names.find(n => n === stem || n.startsWith(`${stem}.`)) ?? null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────── page instrumentation

/**
 * 페이지에 붙어서
 *  - alert/confirm 을 자동 수락하고 문구를 모아둔다
 *  - datalab 으로 나가는 요청 수(in-flight)와 차트 데이터 응답 수를 센다
 */
function instrument(page) {
  const state = { dialogs: [], inflight: 0, lastActivity: Date.now(), chartResponses: 0, errors: [] };

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
  page.on('pageerror', e => state.errors.push(String(e)));

  state.reset = () => { state.dialogs = []; state.chartResponses = 0; state.lastActivity = Date.now(); };
  state.blocking = () => state.dialogs.filter(m => BLOCKING_ALERTS.some(b => m.includes(b)));
  return state;
}

/** 네트워크가 quietMs 동안 조용해질 때까지 (또는 timeout) 대기 */
async function waitNetworkQuiet(state, { quietMs = 2500, timeout = 120_000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (state.inflight === 0 && Date.now() - state.lastActivity >= quietMs) return true;
    await sleep(250);
  }
  return false;
}

/**
 * 사이트의 모달 오버레이(#overlay)를 확실히 내린다.
 *
 * common.js 의 .modal-open 핸들러는 팝업을 열 때마다 close 핸들러와 body 클릭 핸들러를
 * 새로 바인딩하고, 닫을 때 $('#overlay').fadeOut() 을 쓴다. 팝업을 여러 번 여닫으면
 * fadeIn/fadeOut 애니메이션이 겹쳐 #overlay 가 `display:block; opacity:0` 상태로 남고,
 * z-index 999 짜리 투명 레이어가 이후 모든 클릭을 가로챈다.
 * 사이트의 popClose1()/popClose2() 가 하는 일과 동일하게 즉시 hide 시킨다.
 */
async function dismissOverlay(page) {
  await page.evaluate(() => {
    const $ = window.jQuery;
    if (!$) return;
    $('.modal').stop(true, true).hide().removeClass('on');
    $('#overlay').stop(true, true).hide();
  });
}

// ────────────────────────────────────────────────────────────── page actions

async function openTargetPage(context, timeout) {
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  const state = instrument(page);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
  await waitNetworkQuiet(state, { quietMs: 1500, timeout: 60_000 });
  return { page, state };
}

/**
 * 다운로드 게이트인 loginChk() 를 직접 본다.
 * 서버가 세션 아이디를 소스에 인라인하므로 비로그인 상태에서는 `if ("" == "")` 로 렌더된다.
 */
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

      // funLogin() 은 성공 즉시 FrmSearch 를 submit 해 페이지를 이동시킨다.
      // 그 사이 응답 본문을 못 읽는 경우가 있으므로 본문 파싱 실패를 로그인 실패로 단정하지 않고,
      // 실제 세션(loginChk 인라인 아이디)으로 확인한다.
      let rtnCd = null;
      let rtnMsg = '';
      try {
        const body = await res.json();
        rtnCd = body?.info?.rtnCd ?? null;
        rtnMsg = body?.info?.rtnMsg ?? '';
      } catch { /* 이동 중이라 본문을 못 읽음 */ }
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

/** 구분 = 외국인, 방문자 거주지 = nation */
async function selectForeignerAndNation(page, state, nation) {
  await page.selectOption('#touDivCd', '3');
  await page.waitForFunction(() => document.querySelectorAll('#srchNatCdList a').length > 0);
  await waitNetworkQuiet(state, { quietMs: 800, timeout: 60_000 });

  await dismissOverlay(page);
  await page.click('#area-select');
  await page.waitForSelector('#popup1', { state: 'visible' });
  const btn = page.locator('#srchNatCdList a', { hasText: new RegExp(`^${nation}$`) });
  if (!(await btn.count())) {
    const all = await page.$$eval('#srchNatCdList a', els => els.map(e => e.textContent.trim()));
    throw new Error(`방문자 거주지 "${nation}" 를 찾을 수 없습니다. 선택 가능: ${all.join(', ')}`);
  }
  await btn.first().click();
  await page.click('#popup1 .modal-foot a:has-text("확인")');
  await page.waitForSelector('#popup1', { state: 'hidden' });
  await dismissOverlay(page);

  const label = (await page.textContent('#area-select')).trim();
  const code = await page.inputValue('#SGG_CD');
  if (label !== nation) throw new Error(`방문자 거주지 선택 실패: ${label}`);
  log(`방문자 거주지: ${nation} (NAT_CD=${code})`);
  return code;
}

/** 방문지 = 시도 (시/군/구는 선택하지 않음) */
async function selectVisitSido(page, sido) {
  await dismissOverlay(page);
  await page.click('#area-select2');
  await page.waitForSelector('#popup2', { state: 'visible' });
  await page.locator(`#srchSidoCdList2 a[onclick*="'${sido.cd}'"]`).first().click();
  await page.waitForFunction(cd => document.querySelector('#TG_SGG_CD')?.value === cd, sido.cd);
  await page.click('#popup2 .modal-foot a:has-text("확인")');
  await page.waitForSelector('#popup2', { state: 'hidden' });
  await dismissOverlay(page);
  const label = (await page.textContent('#area-select2')).trim();
  if (label !== sido.nm) throw new Error(`방문지 선택 실패: expected ${sido.nm}, got ${label}`);
}

/** 기준 = 월간, 기간 = from~to. onBlur(fnChgYear) 가 반드시 돌아야 하므로 blur 를 강제한다. */
async function setMonthRange(page, from, to) {
  await page.selectOption('#srchAreaDate', '1');
  await page.waitForSelector('#dateMonth1', { state: 'visible' });

  // 종료 → 시작 순서로 넣으면 fnChgYear 의 "12개월 초과 자동보정" 이 시작월을 덮어쓰지 않는다.
  await page.fill('#monthEnd', to);
  await page.locator('#monthEnd').blur();
  await sleep(250);
  await page.fill('#monthStart', from);
  await page.locator('#monthStart').blur();
  await sleep(250);
  await page.fill('#monthEnd', to);
  await page.locator('#monthEnd').blur();
  await sleep(250);

  const got = [await page.inputValue('#monthStart'), await page.inputValue('#monthEnd')];
  if (got[0] !== from || got[1] !== to) {
    throw new Error(`기간 설정 실패: 요청 ${from}~${to}, 실제 ${got[0]}~${got[1]}`);
  }
}

/**
 * 탭을 활성화(=funSrch 재실행)하거나 조회 버튼을 눌러 조회하고, 로딩 완료까지 기다린다.
 * 탭 <a> 클릭 핸들러 끝에서 funSrch() 가 호출되므로 탭 클릭 = 조회다.
 */
async function runQuery(page, state, { tab, from, to, sidoNm, timeout }) {
  state.reset();

  // funSrch 가 실제로 돌았는지 확인하기 위해 결과 기간 hidden 을 비워둔다.
  await page.evaluate(() => {
    const $ = window.jQuery;
    $('#BASEYM1').val('');
    $('#BASEYM2').val('');
  });

  // 탭 <a> 클릭 핸들러는 (이미 활성 탭이어도) 마지막에 funSrch() 를 호출한다 → 조회 버튼과 등가.
  await dismissOverlay(page);
  await page.click(tab.link);

  // 1) funSrch 가 validation 을 통과했는지: BASEYM1/2 가 채워진다.
  await page.waitForFunction(
    () => !!document.querySelector('#BASEYM1')?.value && !!document.querySelector('#BASEYM2')?.value,
    undefined,
    { timeout: 20_000 },
  ).catch(() => {
    const blocked = state.blocking();
    throw new Error(`조회가 실행되지 않았습니다${blocked.length ? `: ${blocked.join(' / ')}` : ' (BASEYM 미갱신)'}`);
  });

  const blocked = state.blocking();
  if (blocked.length) throw new Error(`조회 차단: ${blocked.join(' / ')}`);

  // 사이트가 시도별 제약으로 기간을 자동 보정하는 경우가 있다 → 실제 조회된 기간을 쓴다.
  const actualFrom = await page.inputValue('#BASEYM1');
  const actualTo = await page.inputValue('#BASEYM2');
  if (actualFrom !== from || actualTo !== to) {
    log(`  ! 사이트가 기간을 보정: 요청 ${from}~${to} → 실제 ${actualFrom}~${actualTo}`);
  }

  // 2) 결과 영역 노출 + 해당 탭 패널 표시
  await page.waitForSelector('#printDiv', { state: 'visible', timeout: 30_000 });

  // 3) 차트 데이터 응답이 예상 개수만큼 도착
  const deadline = Date.now() + timeout;
  while (state.chartResponses < tab.expectCharts && Date.now() < deadline) await sleep(300);
  if (state.chartResponses < tab.expectCharts) {
    log(`  ! 차트 응답 ${state.chartResponses}/${tab.expectCharts} (계속 진행)`);
  }

  // 4) 네트워크 정지 + 로딩 오버레이 해제
  await waitNetworkQuiet(state, { quietMs: 2500, timeout });
  await page.waitForFunction(
    () =>
      !document.querySelector('#loading')?.classList.contains('active') &&
      !document.querySelector('#loadingSpin')?.classList.contains('active'),
    undefined,
    { timeout: 60_000 },
  );

  // 5) 조회 제목이 선택한 방문지를 반영하는지 확인
  const title = (await page.textContent('#searchTitle')).trim();
  if (!title.includes(sidoNm)) log(`  ! 제목 확인 실패: "${title}"`);

  const after = state.blocking();
  if (after.length) throw new Error(`조회 후 차단 alert: ${after.join(' / ')}`);

  return { from: actualFrom, to: actualTo, range: `${actualFrom}-${actualTo}` };
}

/** 상단 "전체 다운로드" (checkDn(9999)) → 파일 저장. 저장 경로 반환. */
async function downloadAll(page, state, { dir, stem, timeout }) {
  state.reset();
  await fsp.mkdir(dir, { recursive: true });

  await dismissOverlay(page);
  const btn = page.locator('#searchWrap a[href="javascript:checkDn(9999);"]').first();
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

  // 다운로드 중 사이트 로딩 오버레이 해제 대기
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
      `  ${path.join(ROOT, '.env.local')} 에 다음을 추가하세요:\n` +
      '    DATALAB_ID=your@email.com\n' +
      '    DATALAB_PW=yourpassword\n\n' +
      '  조회 동작만 확인하려면: node playwright/datalab-macro.mjs --dry-run',
    );
    process.exit(1);
  }

  const years = [];
  for (let y = args.fromYear; y <= args.toYear; y++) years.push(y);

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

    if (!args.dryRun && !(await isLoggedIn(page))) {
      throw new Error('로그인 세션이 페이지에 반영되지 않았습니다.');
    }

    // 조회 가능 기간
    const minBaseYm = await page.inputValue('#minBaseYm');
    const maxBaseYm = await page.inputValue('#maxBaseYm');
    log(`사이트 조회 가능 기간: ${minBaseYm} ~ ${maxBaseYm}`);

    await selectForeignerAndNation(page, state, args.nation);

    // 방문지 후보 (광역시/도)
    // popup2 의 시도 목록은 외국인 선택 시 getSrchSidoCdList2() 가 채운다.
    let sidos = await page.$$eval('#srchSidoCdList2 a', els =>
      els.map(a => {
        const m = /funChangeSido\('(\d+)','([^']+)'/.exec(a.getAttribute('onclick') || '');
        return m ? { cd: m[1], nm: m[2] } : null;
      }).filter(Boolean),
    );
    if (args.sido) {
      const want = new Set(args.sido);
      const missing = args.sido.filter(s => !sidos.some(x => x.nm === s));
      if (missing.length) throw new Error(`방문지 "${missing.join(', ')}" 없음. 가능: ${sidos.map(s => s.nm).join(', ')}`);
      sidos = sidos.filter(s => want.has(s.nm));
    }
    log(`방문지 ${sidos.length}개 × ${years.length}년 × 탭 ${TABS.length}개 = ${sidos.length * years.length * TABS.length}건`);

    /**
     * 페이지를 다시 로드해 조건을 재설정한다.
     * 한 페이지에서 수백 번 조회하면 amChart 인스턴스와 jQuery 핸들러가 계속 쌓여
     * 렌더러가 느려지고 아무 조작도 응답하지 않는 상태가 된다(page.textContent 타임아웃).
     * 시도가 바뀔 때마다(=14건마다) 새로 로드해 초기화한다.
     */
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
      await selectForeignerAndNation(page, state, args.nation);
    };

    for (const sido of sidos) {
      if (!freshPage) await resetPage();
      freshPage = false;
      for (const year of years) {
        // 요청 기간을 사이트/시도 제약과 교집합
        let from = `${year}01`;
        let to = `${year}12`;
        const lo = [minBaseYm, SIDO_MIN_YM[sido.cd]].filter(Boolean).sort().pop();
        const hi = [maxBaseYm, SIDO_MAX_YM[sido.cd]].filter(Boolean).sort().shift();
        if (from < lo) from = lo;
        if (to > hi) to = hi;
        const range = `${from}-${to}`;

        if (from > to) {
          log(`SKIP ${sido.nm} ${year}: 제공 기간(${lo}~${hi}) 밖`);
          summary.skipped += TABS.length;
          await record({ sido: sido.nm, year, status: 'skipped', reason: `제공 기간 ${lo}~${hi} 밖` });
          continue;
        }
        if (addMonths(from, 11) < to) {
          throw new Error(`기간이 12개월을 초과합니다: ${range}`);
        }

        const dir = path.join(args.outDir, safe(args.nation), safe(sido.nm), range);

        // 이 조합에서 필요한 탭만 남긴다 (resume)
        const todo = [];
        for (const tab of TABS) {
          const stem = safe(tab.key);
          const found = args.force ? null : await existingFile(dir, stem);
          if (found) {
            summary.skipped++;
            log(`SKIP ${sido.nm} ${range} ${tab.key} (이미 있음: ${found})`);
          } else {
            todo.push(tab);
          }
        }
        if (!todo.length && !args.dryRun) continue;

        await selectVisitSido(page, sido);
        await setMonthRange(page, from, to);

        for (const tab of (args.dryRun ? TABS : todo)) {
          const label = `${sido.nm} ${range} ${tab.key}`;
          for (let attempt = 1; attempt <= args.retries + 1; attempt++) {
          const lastAttempt = attempt === args.retries + 1;
          try {
            log(`▶ ${label}${attempt > 1 ? ` (재시도 ${attempt - 1}/${args.retries})` : ''}`);
            const actual = await runQuery(page, state, { tab, from, to, sidoNm: sido.nm, timeout: args.timeout });

            if (args.dryRun) {
              log(`  (dry-run) 조회 완료 · 기간 ${actual.range} · 차트응답 ${state.chartResponses}`);
              await record({ nation: args.nation, sido: sido.nm, range: actual.range, tab: tab.key, status: 'dry-run' });
              summary.ok++;
              break;
            }

            // 사이트가 기간을 보정했으면 실제 기간을 폴더명으로 쓰고, 이미 받은 파일이면 건너뛴다.
            const outDir = actual.range === range ? dir
              : path.join(args.outDir, safe(args.nation), safe(sido.nm), actual.range);
            if (!args.force && actual.range !== range && await existingFile(outDir, safe(tab.key))) {
              log(`  - 보정된 기간 ${actual.range} 파일이 이미 있어 건너뜀`);
              summary.skipped++;
              break;
            }

            const r = await downloadAll(page, state, { dir: outDir, stem: safe(tab.key), timeout: args.timeout });
            log(`  ✓ ${path.relative(ROOT, r.dest)} (${(r.size / 1024).toFixed(1)} KB, 원본: ${r.suggested})`);
            await record({
              nation: args.nation, sido: sido.nm, range: actual.range, requestedRange: range, tab: tab.key,
              status: 'ok', file: path.relative(ROOT, r.dest), suggested: r.suggested, bytes: r.size,
            });
            summary.ok++;
            break;
          } catch (e) {
            if (lastAttempt) {
              summary.failed++;
              log(`  ✗ ${label}: ${e.message}`);
              await record({ nation: args.nation, sido: sido.nm, range, tab: tab.key, status: 'failed', error: e.message });
            } else {
              log(`  … ${label}: ${e.message.split('\n')[0]}`);
            }
            // 실패 원인은 대개 서버 일시 오류거나 오래 돌린 탭의 렌더러 저하다.
            // 페이지가 로그인 폼으로 튕겨 있을 수도 있으므로 목록 페이지로 되돌리고 조건을 재설정한다.
            try {
              await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
              await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
              await waitNetworkQuiet(state, { quietMs: 1200, timeout: 60_000 });
              if (!args.dryRun && !(await isLoggedIn(page))) {
                log('  세션이 끊겼습니다 → 재로그인');
                await login(context, { id, pw, timeout: args.timeout });
                await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
                await page.waitForFunction(() => typeof window.funSrch === 'function' && window.jQuery);
                await waitNetworkQuiet(state, { quietMs: 1200, timeout: 60_000 });
                if (!(await isLoggedIn(page))) throw new Error('재로그인 후에도 세션이 반영되지 않음');
              }
              await selectForeignerAndNation(page, state, args.nation);
              await selectVisitSido(page, sido);
              await setMonthRange(page, from, to);
            } catch (e2) {
              log(`  !! 복구 실패, 중단: ${e2.message}`);
              throw e2;
            }
          }
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
