// 3-1 출입국관광통계조회
// 기간, 국가의 검색조건에 따라 관광출입국자수를 제공하는 기능

/*
3-1 출입국관광통계조회
기간, 국가의 검색조건에 따라 관광출입국자수를 제공하는 기능

http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsServicee/getEdrcntTourismStatsList

1. 요청 메시지
항목명(영문)	항목명(국문)	항목크기	항목구분	샘플데이터	항목설명
YM	년월	12	1	201201	년월
NAT_CD	국가코드	6	0	112 100한국
ED_CD	출/입국구분코드	2	0	D	D=국민해외관광객 E=방한외래관광객

2. 응답 메시지
resultCode	결과코드	4	1	0000	결과코드
resultMsg	결과메시지	50	1	OK	결과메시지
numOfRows	한페이지 결과 수	2	0	10	한 페이지 결과 수
pageNo	페이지 번호	5	0	1	페이지 번호
totalCount	전체 결과 수 	7	0	12334	전체 결과 수 
ed	출/입국 구분	14	1	방한외래관광객	출/입국 구분
edCd	출/입국 구분코드	2	1	E	D=국민해외관광객
E=방한외래관광객
natCd	국가코드	6	1	112	국가코드
natKorNm	국가	80	1	중국	국가
num	출/입국자 수	10	0	179508	출/입국자 수
rnum	결과값 연번	2	1	1	결과값 나열 순서
ym	년월	12	1	201206	년월


*/