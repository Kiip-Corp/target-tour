# 데이터랩 지역별 방문자/관광소비 다운로드 매크로

[한국관광 데이터랩 > 지역별 방문자수/관광소비](https://datalab.visitkorea.or.kr/datalab/portal/loc/getAreaVisitDataForm.do)
페이지를 Playwright로 조작해 CSV 묶음(zip)을 일괄 다운로드한다.

## 조회 조건

| 항목 | 값 |
| --- | --- |
| 구분 | 외국인 |
| 방문자 거주지 | `--nation` (기본 `대만`) |
| 방문지 | 광역시/도 18개 전부 순회 (시/군/구는 선택하지 않음 = 시도 단위) |
| 기준 | 월간, `yyyy01 ~ yyyy12` (`--from-year` ~ `--to-year`, 기본 2020~2026) |

조합마다 하단 탭을 순서대로 돌며 로딩 완료 후 상단 **전체 다운로드**를 누른다.

1. `방문자수` 탭 — 전국 방문현황 히트맵 + 방문 추이
2. `관광소비` 탭 — 전국 관광소비 현황 + 관광소비 추이 + 관광소비 업종별 구분

## 준비

```bash
npm i -D playwright          # 이미 설치되어 있음
npx playwright install chromium
```

다운로드는 **데이터랩 로그인이 필수**다(비로그인 시 "로그인 후 이용이 가능합니다" 알림 후
로그인 페이지로 튕긴다). 저장소 루트 `.env.local`에 계정을 넣는다.

```
DATALAB_ID=your@email.com
DATALAB_PW=yourpassword
```

## 실행

```bash
node playwright/datalab-macro.mjs                              # 전체 (18 시도 × 7년 × 2탭)
node playwright/datalab-macro.mjs --dry-run                     # 로그인/다운로드 없이 조회만 검증
node playwright/datalab-macro.mjs --sido 서울특별시,제주특별자치도
node playwright/datalab-macro.mjs --from-year 2024 --to-year 2024
node playwright/datalab-macro.mjs --nation 일본
node playwright/datalab-macro.mjs --headed --slow 150            # 눈으로 확인
node playwright/datalab-macro.mjs --force                        # 이미 받은 파일도 다시 받기
```

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `--nation <이름>` | `대만` | 방문자 거주지(국가) |
| `--from-year` / `--to-year` | `2020` / `2026` | 연도 범위 |
| `--sido a,b,c` | 전체 | 방문지 광역시/도 |
| `--out <경로>` | `playwright/downloads` | 저장 위치 |
| `--dry-run` | off | 조회까지만. 로그인·다운로드 안 함 |
| `--force` | off | 기존 파일 무시하고 재다운로드 |
| `--headed`, `--slow <ms>` | off | 브라우저 표시 / 동작 지연 |
| `--timeout <ms>` | `180000` | 단계별 타임아웃 |

## 결과

```
playwright/downloads/
  manifest.jsonl                       # 건별 성공/스킵/실패 로그
  대만/
    서울특별시/
      202001-202012/
        방문자수.zip
        관광소비.zip
      202101-202112/
        ...
```

이미 받은 파일이 있으면 건너뛰므로, 중간에 끊겨도 같은 명령을 다시 돌리면 이어서 받는다.

선택 가능한 국가(24): 대만, 독일, 러시아, 말레이시아, 멕시코, 몽골, 미국, 베트남,
사우디아라비아, 싱가포르, 아랍에미리트, 영국, 인도, 인도네시아, 일본, 중국, 카자흐스탄,
캐나다, 태국, 튀르키예, 프랑스, 필리핀, 호주, 홍콩

## 앱에서 쓰는 CSV로 합치기

`playwright/downloads/` 는 `.gitignore` 대상이라 정적 빌드 시점에는 존재하지 않는다.
받은 zip을 국가 × 시도 × 월 tidy CSV 두 개로 합쳐 `data/` 에 넣고, 이쪽을 커밋한다.

```
node playwright/extract-datalab.mjs

data/7국가지역월간/
  방문_월별.csv        # 방문자 거주지,방문지,기준년월,전체 외국인 방문자 수,거주지 방문자 수 비율(%)
  관광소비_월별.csv    # 방문자 거주지,방문지,기준년월,거주지 관광소비 비율(%),전체 관광소비액(천원)
```

`/marketingBoard` 가 이 두 파일을 읽는다. 국가별 절대값은 데이터랩이 주지 않아
`전체 외국인 값 × 해당 국가 비율(%)` 로 추정한다 — 연 단위로 합산하면 데이터랩의 연간
지역분포(히트맵·관광소비 현황) 비율과 소수점 첫째 자리까지 일치해서, 연간 파일은 따로 뽑지 않는다.

## 사이트 쪽 함정 (스크립트가 처리하는 것들)

- **로딩 완료 판정** — 지도 차트(`#chart_01`)는 렌더가 끝나도 `loading` 클래스를 떼지 않아
  클래스로는 판정할 수 없다. 대신 `funSrch()`가 채우는 `#BASEYM1/2` hidden, 차트 데이터
  엔드포인트(`/visualize/getTempleteData.do`) 응답 수, 네트워크 정지, 로딩 오버레이
  (`#loading` / `#loadingSpin`) 해제를 함께 본다.
- **투명 오버레이** — `common.js`의 모달 핸들러가 팝업을 열 때마다 close 핸들러를 새로
  바인딩하고 `#overlay`를 `fadeIn/fadeOut`으로 처리한다. 팝업을 여러 번 여닫으면
  `display:block; opacity:0` 상태로 남아 `z-index:999` 투명 레이어가 이후 모든 클릭을
  가로챈다. 팝업 전후로 사이트의 `popClose*()`와 동일하게 즉시 `hide()` 시킨다.
- **탭 클릭 = 조회** — 탭 `<a>` 핸들러 마지막에서 `funSrch()`를 호출한다(이미 활성 탭이어도
  동일). 따라서 탭 전환만으로 해당 탭 데이터가 다시 조회되고, 조회 버튼을 따로 누를 필요가 없다.
- **기간 입력** — `onBlur="fnChgYear('4', …)"`가 돌아야 `srchBgngYear/Mm` 등 hidden이 채워진다.
  값만 넣지 않고 blur를 강제하며, 12개월 초과 자동보정이 시작월을 덮어쓰지 않도록
  종료 → 시작 → 종료 순으로 넣는다.
- **시도별 제공 기간** — 전남광주통합특별시(12)는 202607부터, 광주광역시(29)·전라남도(46)는
  202606까지만 제공된다. 요청 기간을 미리 잘라내고, 그래도 사이트가 기간을 보정하면
  조회 후 실제 `#BASEYM1/2`를 읽어 그 값으로 폴더명을 만든다.
- **다운로드 방식** — `checkDn(9999)` → `loginChk()` → `getCsvFileInfoCard()`가
  `/visualize/getCsvData.do`에 fetch한 뒤 blob을 `a[download].click()`으로 내려준다.
  Playwright의 `download` 이벤트로 잡아 `saveAs`로 저장한다.
