/*
 3-4 방한외래관광객평균체재일조회

 월별, 국적의 검색 조건에 따라 방한외래관광객 평균체재일수를 제공하는 기능

http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getForeignTuristAvrgList

1. 요청 메시지
항목명(영문)	항목명(국문)	항목크기	항목구분	샘플데이터	항목설명

YM	년월	6	1	201209	년월

NAT_CD	국가코드	3	0	583


2. 응답 메시지
항목명(영문)	항목명(국문)	항목크기	항목구분	샘플데이터	항목설명
resultCode	결과코드	4	1	0000	결과코드
resultMsg	결과메시지	50	1	OK	결과메시지
numOfRows	한페이지 결과 수	2	0	10	한 페이지 결과 수
pageNo	페이지 번호	5	0	1	페이지 번호
totalCount	전체 결과 수 	7	0	12334	전체 결과 수 
natCd	국가코드	3	1	583	국가코드
natKorNm	국적	40	1	탄자니아	국적
rnum	결과값 연번	2	1	1	결과값 나열 순서
sojAvg	평균체재일	3	0	8.3	평균체재일
sojTot	평균체재일수	5	0	50	평균체재일수
ym	년월	6	1	201210	년월

 */