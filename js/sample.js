// 데모용 프로필과 샘플 메일. expected 는 로직 트리 리프별 대표 사례 검증용.
export const SAMPLE_PROFILE = {
  myName: '김신입',
  myEmail: 'sinip@hanbit.co.kr',
  myDept: '영업기획팀',
  teamAddresses: ['sales-all@hanbit.co.kr'],
  workKeywords: ['A사', '월간 실적', '견적', '단가표'],
  jobKeywords: ['영업', '실적 분석', '고객 관리'],
  interests: ['엑셀', '데이터 분석'],
  backupFor: ['박선임'],
  promoSenders: ['club@hanbit.co.kr', 'news@hanbit.co.kr'],
  studySenders: ['study@hanbit.co.kr'],
};

const ME = { name: '김신입', email: 'sinip@hanbit.co.kr' };
const TEAM = { name: '영업기획팀 전체', email: 'sales-all@hanbit.co.kr' };
const ALL = { name: '전 직원', email: 'all@hanbit.co.kr' };
const p = (name, email) => ({ name, email });

const RAW = [
  { expected: 'mine_urgent_me', min: 12, from: p('이과장', 'lee@hanbit.co.kr'), to: [ME], cc: [],
    subject: '[급] A사 견적서 오늘까지 회신 부탁드립니다', body: '김신입님, A사 견적 수정본을 오늘까지 회신 부탁드립니다.\n단가 조건은 지난주와 같습니다.' },
  { expected: 'mine_urgent_other', min: 25, from: p('최팀장', 'choi@hanbit.co.kr'), to: [ME, p('이대리', 'ld@hanbit.co.kr'), p('정사원', 'js@hanbit.co.kr')], cc: [],
    subject: 'B사 납품 일정 확인 – 오늘 중 회신 필요', body: '영업기획팀 여러분, B사 납품 일정을 오늘 중 확인 부탁드립니다.' },
  { expected: 'mine_later_me', min: 40, from: p('최팀장', 'choi@hanbit.co.kr'), to: [ME], cc: [],
    subject: '월간 실적 자료 다음 주 공유 요청', body: '김신입님, 다음 주 회의 전까지 월간 실적 자료 공유 부탁드립니다.' },
  { expected: 'mine_later_other', min: 55, from: p('총무 담당', 'ga@hanbit.co.kr'), to: [ME, p('정주임', 'jj@hanbit.co.kr'), p('한사원', 'hs@hanbit.co.kr'), p('오사원', 'os@hanbit.co.kr')], cc: [],
    subject: '사무용품 수요 취합 안내', body: '다음 주 금요일까지 필요하신 분은 사내 시스템에서 신청해 주세요.' },
  { expected: 'team_related', min: 70, from: p('최팀장', 'choi@hanbit.co.kr'), to: [TEAM], cc: [],
    subject: '[공지] 단가표 개정 안내', body: '팀원 여러분, 다음 달부터 적용되는 단가표를 첨부합니다.\nA사 담당자는 반영 바랍니다.' },
  { expected: 'team_unrelated', min: 85, from: p('시설관리', 'facility@hanbit.co.kr'), to: [TEAM], cc: [],
    subject: '물류센터 주차장 공사 안내', body: '팀원 여러분, 이번 주 물류센터 주차장 공사가 진행됩니다.' },
  { expected: 'team_unrelated', min: 95, from: p('구매 담당', 'buy@hanbit.co.kr'), to: [TEAM], cc: [],
    subject: '협력사 미팅 결과 공유 (구매)', body: '팀원 여러분, 지난주 협력사 미팅 결과를 공유드립니다.' },
  { expected: 'aware_backup', min: 110, from: p('C사 담당자', 'kim@csa.com'), to: [p('박선임', 'park@hanbit.co.kr')], cc: [ME],
    subject: 'C사 계약 갱신 건', body: '박선임님, C사 계약 갱신 관련 서류를 보내드립니다.' },
  { expected: 'aware_skip', min: 125, from: p('인사 담당', 'hr@hanbit.co.kr'), to: [p('홍과장', 'hong@hanbit.co.kr')], cc: [ME, p('이대리', 'ld@hanbit.co.kr')],
    subject: '하반기 교육 일정 조율', body: '홍과장님, 다음 달 교육 일정 조율 부탁드립니다.' },
  { expected: 'aware_skip', min: 140, from: p('IT 지원', 'it@hanbit.co.kr'), to: [p('윤책임', 'yoon@hanbit.co.kr')], cc: [ME],
    subject: '서버 점검 일정 공유', body: '윤책임님, 이번 주 토요일 서버 점검 일정입니다.' },
  { expected: 'promo_in_like', min: 150, from: p('사내 동호회', 'club@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '사내 동호회 엑셀 마스터반 모집', body: '퇴근 후 함께 엑셀 실력을 키워요. 사내 시스템에서 신청해 주세요.' },
  { expected: 'promo_in_skip', min: 165, from: p('사내 뉴스레터', 'news@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '[사내 뉴스레터] 11월 사내 소식', body: '이번 달 창립기념 행사 소식을 전합니다.' },
  { expected: 'promo_out_like', min: 180, from: p('DataTool', 'marketing@datatool.com'), to: [ME], cc: [],
    subject: '[광고] 데이터 분석 무료 웨비나 초대', body: '고객님, 안녕하세요. 실무 데이터 분석 웨비나에 초대합니다.' },
  { expected: 'promo_out_skip', min: 195, from: p('쇼핑몰', 'deals@shopmall.com'), to: [ME], cc: [],
    subject: '(광고) 연말 최대 70% 할인 프로모션', body: '안녕하세요. 연말 특가를 확인해 보세요.' },
  { expected: 'promo_out_skip', min: 205, from: p('호텔 예약', 'promo@stayhotel.com'), to: [ME], cc: [],
    subject: '(광고) 주말 객실 특가 이벤트', body: '안녕하세요. 이번 주말 특가 객실을 안내드립니다.' },
  { expected: 'study_job_mine', min: 220, from: p('직무 스터디', 'study@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '[직무 스터디] 영업 실적 분석 실습 3주차', body: '이번 주는 고객 관리 사례를 다룹니다.' },
  { expected: 'study_job_other', min: 235, from: p('직무 스터디', 'study@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '[직무 스터디] 회계 결산 기초 2주차', body: '감가상각 개념을 정리합니다.' },
  { expected: 'study_ind_in', min: 250, from: p('전략 담당', 'strategy@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '주간 산업 동향 리포트', body: '이번 주 반도체 시장 주요 이슈를 정리했습니다.' },
  { expected: 'study_ind_out', min: 265, from: p('Market Insight', 'report@marketinsight.com'), to: [ME], cc: [],
    subject: '[Weekly] 글로벌 유통 시장 이슈 브리핑', body: '구독자님, 이번 주 브리핑을 보내드립니다.' },
  { expected: 'study_lang', min: 280, from: p('직무 스터디', 'study@hanbit.co.kr'), to: [ALL], cc: [],
    subject: '[어학] 비즈니스 영어 회화 11월반', body: '11월반 수업 자료를 공유합니다.' },
  { expected: 'wrong_notify_title', min: 295, from: p('재무 담당', 'fin@hanbit.co.kr'), to: [ME], cc: [],
    subject: '[재무팀] 3분기 비용 정산 자료 오늘까지 제출 바랍니다', body: '안녕하세요, 첨부한 양식으로 제출 부탁드립니다.' },
  { expected: 'wrong_notify_body', min: 310, from: p('D사 담당자', 'lim@dsa.com'), to: [ME], cc: [],
    subject: '요청하신 자료 보내드립니다', body: '김영수님, 요청하신 계약서 초안 검토 부탁드립니다.' },
  { expected: 'wrong_quiet_title', min: 325, from: p('생산 담당', 'prod@hanbit.co.kr'), to: [ME], cc: [],
    subject: '[생산2팀] 라인 점검 결과 공유', body: '점검 결과 이상 없습니다.' },
  { expected: 'wrong_quiet_body', min: 340, from: p('동기 모임', 'friend@hanbit.co.kr'), to: [ME], cc: [],
    subject: '주말 잘 보내세요', body: '이지은님, 지난번 사진 보내드려요.' },
];

// now 기준으로 min 분 전에 받은 메일로 만든다
export function sampleMails(now = new Date()) {
  return RAW.map((m, i) => ({
    id: `demo-${i + 1}`,
    ...m,
    date: new Date(now.getTime() - m.min * 60000).toISOString(),
  }));
}
