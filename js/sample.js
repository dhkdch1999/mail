// 데모용 샘플 계정(페르소나)과 계정별 받은편지함.
// 모든 메일에 expected(로직 트리 리프)를 달아 분류기 테스트에 쓴다.
import { SALES_EXTRA } from './sample-sales-extra.js';

const p = (name, email) => ({ name, email });
const DOMAIN = 'hanbit.co.kr';
const ALL = p('전 직원', `all@${DOMAIN}`);

const COMMON_SENDERS = {
  promoSenders: [`club@${DOMAIN}`, `news@${DOMAIN}`],
  studySenders: [`study@${DOMAIN}`],
};

const CLUB = p('사내 동호회', `club@${DOMAIN}`);
const NEWS = p('사내 뉴스레터', `news@${DOMAIN}`);
const STUDY = p('직무 스터디', `study@${DOMAIN}`);
const STRATEGY = p('전략 담당', `strategy@${DOMAIN}`);

// ───────── 계정 공통 메일 (어느 계정의 키워드와도 겹치지 않게 작성)
const SHARED = {
  mine_later_other: {
    from: [p('총무 담당', `ga@${DOMAIN}`), p('IT 지원', `it@${DOMAIN}`), p('인사 담당', `hr@${DOMAIN}`)],
    to: (me) => [me, p('정주임', `jj@${DOMAIN}`), p('한사원', `hs@${DOMAIN}`), p('오사원', `os@${DOMAIN}`)],
    items: [
      ['사무용품 수요 취합 안내', '다음 주 금요일까지 필요하신 분은 사내 시스템에서 신청해 주세요.'],
      ['보안 교육 이수 안내', '이번 달 말까지 온라인 보안 교육을 이수해 주세요.'],
      ['사내 메신저 새 버전 안내', '새 버전이 나왔습니다. 시간 날 때 업데이트해 주세요.'],
      ['연말 회식 장소 설문', '편하실 때 설문에 응답해 주세요.'],
      ['개인 사물함 정리 요청', '이번 달 안에 개인 사물함을 정리해 주세요.'],
    ],
  },
  team_unrelated: {
    from: [p('시설관리', `facility@${DOMAIN}`), p('구매 담당', `buy@${DOMAIN}`), p('전산 담당', `infra@${DOMAIN}`), p('총무 담당', `ga@${DOMAIN}`), p('품질 담당', `qa@${DOMAIN}`)],
    toTeam: true,
    items: [
      ['물류센터 주차장 공사 안내', '팀원 여러분, 이번 주 물류센터 주차장 공사가 진행됩니다.'],
      ['협력사 미팅 결과 공유 (구매)', '지난주 협력사 미팅 결과를 공유드립니다.'],
      ['전산 시스템 정기 점검 안내', '토요일 새벽 전산 시스템 점검이 있습니다.'],
      ['회의실 예약 규칙 변경', '다음 주부터 회의실은 2시간 단위로 예약됩니다.'],
      ['법인 차량 운행 일지 작성 안내', '법인 차량 이용 후 운행 일지를 남겨 주세요.'],
      ['B팀 출장 일정 공유', '다음 주 B팀 출장 일정입니다. 참고 바랍니다.'],
      ['복합기 교체 안내', '3층 복합기가 새 기종으로 교체됩니다.'],
      ['사내 카페 운영 시간 변경', '사내 카페가 다음 주부터 8시에 문을 엽니다.'],
      ['품질 개선 활동 결과', '품질 개선 활동 결과를 공유드립니다.'],
      ['건강검진 일정 안내', '올해 건강검진 일정을 확인해 주세요.'],
    ],
  },
  aware_skip: {
    from: [p('인사 담당', `hr@${DOMAIN}`), p('IT 지원', `it@${DOMAIN}`), p('마케팅 담당', `mkt@${DOMAIN}`), p('구매 담당', `buy@${DOMAIN}`)],
    cc: (me) => [me, p('이대리', `ld@${DOMAIN}`)],
    items: [
      ['하반기 교육 일정 조율', '홍과장님, 다음 달 교육 일정 조율 부탁드립니다.', p('홍과장', `hong@${DOMAIN}`)],
      ['서버 점검 일정 공유', '윤책임님, 이번 주 토요일 서버 점검 일정입니다.', p('윤책임', `yoon@${DOMAIN}`)],
      ['마케팅 캠페인 시안 검토', '한대리님, 캠페인 시안 1차본입니다.', p('한대리', `han@${DOMAIN}`)],
      ['인사 평가 일정 안내', '팀장님, 상반기 평가 일정을 안내드립니다.', p('서팀장', `seo@${DOMAIN}`)],
      ['비품 구매 품의', '정과장님, 비품 구매 품의 올립니다.', p('정과장', `jung@${DOMAIN}`)],
      ['신규 입사자 PC 세팅', 'IT 담당님, 신규 입사자 PC 세팅 부탁드립니다.', p('IT 담당', `it@${DOMAIN}`)],
      ['E사 클레임 처리 경과', '오대리님, E사 클레임 처리 경과 공유드립니다.', p('오대리', `oh@${DOMAIN}`)],
      ['워크숍 숙소 예약 확인', '최대리님, 워크숍 숙소 예약 확인 부탁드립니다.', p('최대리', `choid@${DOMAIN}`)],
    ],
  },
  promo_in_skip: {
    from: [NEWS, CLUB],
    toAll: true,
    items: [
      ['[사내 뉴스레터] 11월 사내 소식', '이번 달 창립기념 행사 소식을 전합니다.'],
      ['사내 동호회 등산 모임 안내', '이번 주 토요일 북한산 등산 모임이 있어요.'],
      ['사내 동호회 볼링 대회 이벤트', '볼링 대회 참가자를 모집합니다.'],
      ['[사내 뉴스레터] 임직원 봉사활동 후기', '지난달 봉사활동 후기를 전합니다.'],
      ['사내 동호회 사진반 전시회 이벤트', '로비에서 사진반 전시회가 열립니다.'],
    ],
  },
  promo_out_skip: {
    from: [p('쇼핑몰', 'deals@shopmall.com'), p('호텔 예약', 'promo@stayhotel.com'), p('카드플러스', 'event@cardplus.com'), p('플라이에어', 'sale@flyair.com'), p('헬스케어', 'news@healthcare.com')],
    items: [
      ['(광고) 연말 최대 70% 할인 프로모션', '안녕하세요. 연말 특가를 확인해 보세요.'],
      ['(광고) 주말 객실 특가 이벤트', '안녕하세요. 이번 주말 특가 객실을 안내드립니다.'],
      ['[광고] 신규 카드 발급 이벤트', '안녕하세요. 신규 발급 고객께 캐시백을 드립니다.'],
      ['(광고) 항공권 얼리버드 할인', '안녕하세요. 내년 상반기 항공권을 미리 예약하세요.'],
      ['[광고] 건강검진 패키지 프로모션', '안녕하세요. 직장인 건강검진 패키지를 소개합니다.'],
      ['(광고) 사무용 의자 할인 이벤트', '안녕하세요. 사무용 의자 특가 행사를 안내합니다.'],
      ['[광고] 와인 클럽 신규 회원 혜택 이벤트', '회원님, 신규 가입 혜택을 확인하세요.'],
      ['(광고) 골프 레슨 첫 달 할인', '안녕하세요. 첫 달 레슨비를 할인해 드립니다.'],
      ['[광고] 렌터카 겨울 시즌 할인', '안녕하세요. 겨울 시즌 렌터카 할인 소식입니다.'],
      ['(광고) 원두 정기 배송 프로모션', '안녕하세요. 원두 정기 배송을 시작해 보세요.'],
    ],
  },
  study_ind_in: {
    from: [STRATEGY],
    toAll: true,
    items: [
      ['주간 산업 동향 리포트', '이번 주 반도체 시장 주요 이슈를 정리했습니다.'],
      ['사내 이슈 브리핑 47호', '이번 주 사내 주요 이슈를 정리했습니다.'],
    ],
  },
  study_ind_out: {
    from: [p('Market Insight', 'report@marketinsight.com'), p('트렌드랩', 'letter@trendlab.com')],
    items: [
      ['[Weekly] 글로벌 유통 시장 이슈 브리핑', '구독자님, 이번 주 브리핑을 보내드립니다.'],
      ['월간 소비 트렌드 리포트', '구독자님, 이번 달 소비 트렌드 리포트입니다.'],
    ],
  },
  study_lang: {
    from: [STUDY],
    toAll: true,
    items: [
      ['[어학] 비즈니스 영어 회화 11월반', '11월반 수업 자료를 공유합니다.'],
      ['[어학] 중국어 기초 회화 모집', '초급 중국어 회화반을 엽니다.'],
    ],
  },
};

// ───────── 계정 정의
const DEFS = [
  {
    id: 'sales',
    label: '영업기획팀 신입',
    extra: SALES_EXTRA,
    profile: {
      myName: '김신입', myEmail: `sinip@${DOMAIN}`, myDept: '영업기획팀',
      teamAddresses: [`sales-all@${DOMAIN}`],
      workKeywords: ['A사', '월간 실적', '견적', '단가표'],
      jobKeywords: ['영업', '실적 분석', '고객 관리'],
      interests: ['엑셀', '데이터 분석', '영어'],
      backupFor: ['박선임'],
      ...COMMON_SENDERS,
    },
    teamName: '영업기획팀 전체',
    boss: p('최팀장', `choi@${DOMAIN}`),
    peers: [p('이대리', `ld@${DOMAIN}`), p('정사원', `js@${DOMAIN}`)],
    backup: p('박선임', `park@${DOMAIN}`),
    leaves: {
      mine_urgent_me: { from: [p('이과장', `lee@${DOMAIN}`), p('최팀장', `choi@${DOMAIN}`), p('A사 구매 담당', 'buyer@asa.com')], items: [
        ['[급] A사 견적서 오늘까지 회신 부탁드립니다', '김신입님, A사 견적 수정본을 오늘까지 회신 부탁드립니다.\n단가 조건은 지난주와 같습니다.'],
        ['긴급: 월간 실적 보고 숫자 확인 요청', '김신입님, 임원 보고 전에 월간 실적 숫자를 급히 확인 부탁드립니다.'],
        ['견적 단가 수정본 금일 중 회신 바랍니다', '김신입님, 어제 보내주신 견적 단가 수정본을 금일 중 회신 바랍니다.'],
      ] },
      mine_urgent_other: { items: [
        ['B사 납품 일정 확인 – 오늘 중 회신 필요', '팀원 여러분, A사·B사 납품 일정을 오늘 중 확인 부탁드립니다.'],
        ['[급] 고객사 미팅 자료 취합', '내일 오전 미팅 전까지 각자 견적 현황을 공유 부탁드립니다.'],
        ['단가표 오류 긴급 수정 요청', '이번 주 공유된 단가표에 오류가 있어 긴급 수정이 필요합니다. 가능한 분 확인 부탁드립니다.'],
      ] },
      mine_later_me: { items: [
        ['월간 실적 자료 다음 주 공유 요청', '김신입님, 다음 주 회의 전까지 월간 실적 자료 공유 부탁드립니다.'],
        ['A사 방문 보고서 작성', '김신입님, 지난번 A사 방문 내용을 보고서로 정리 부탁드립니다.'],
        ['고객 관리 시트 업데이트', '김신입님, 여유 있을 때 고객 관리 시트를 최신으로 업데이트 부탁드려요.'],
        ['신규 견적 양식 검토', '김신입님, 새 견적 양식 초안입니다. 다음 주까지 의견 주세요.'],
      ] },
      team_related: { items: [
        ['[공지] 단가표 개정 안내', '팀원 여러분, 다음 달부터 적용되는 단가표를 첨부합니다.\nA사 담당자는 반영 바랍니다.'],
        ['A사 연간 계약 진행 현황', '팀원 여러분, A사 연간 계약 진행 현황을 공유합니다.'],
        ['월간 실적 마감 일정 공유', '팀원 여러분, 이번 달 월간 실적 마감 일정입니다.'],
        ['신규 고객 관리 프로세스 안내', '팀원 여러분, 고객 관리 프로세스가 일부 바뀝니다.'],
      ] },
      aware_backup: { from: [p('C사 담당자', 'kim@csa.com'), p('D사 담당자', 'yu@dsa.com'), p('정산 담당', `settle@${DOMAIN}`)], items: [
        ['C사 계약 갱신 건', '박선임님, C사 계약 갱신 관련 서류를 보내드립니다.'],
        ['D사 미팅 일정 조율', '박선임님, 다음 주 D사 미팅 가능한 시간을 알려주세요.'],
        ['박선임 담당 거래처 정산 내역', '박선임님, 이번 달 정산 내역 확인 부탁드립니다.'],
      ] },
      promo_in_like: { from: [CLUB, NEWS], items: [
        ['사내 동호회 엑셀 마스터반 모집', '퇴근 후 함께 엑셀 실력을 키워요. 사내 시스템에서 신청해 주세요.'],
        ['[사내 뉴스레터] 데이터 분석 우수 사례 소개', '이번 호에서는 데이터 분석 우수 사례를 소개합니다.'],
      ] },
      promo_out_like: { from: [p('DataTool', 'marketing@datatool.com'), p('러닝허브', 'edu@learnhub.com')], items: [
        ['[광고] 데이터 분석 무료 웨비나 초대', '고객님, 안녕하세요. 실무 데이터 분석 웨비나에 초대합니다.'],
        ['(광고) 엑셀 자동화 온라인 강의 할인', '안녕하세요. 엑셀 자동화 강의를 할인가로 만나보세요.'],
      ] },
      study_job_mine: { items: [
        ['[직무 스터디] 영업 실적 분석 실습 3주차', '이번 주는 고객 관리 사례를 다룹니다.'],
        ['[직무 스터디] 영업 협상 스킬 강좌', '고객 관리 실전 사례를 함께 봅니다.'],
      ] },
      study_job_other: { items: [
        ['[직무 스터디] 회계 결산 기초 2주차', '감가상각 개념을 정리합니다.'],
        ['[직무 스터디] 파이썬 기초 강좌', '변수와 반복문을 다룹니다.'],
        ['[직무 스터디] 디자인 씽킹 학습 모임', '사용자 인터뷰 방법을 배웁니다.'],
      ] },
      wrong_notify_title: { from: [p('재무 담당', `fin@${DOMAIN}`)], items: [['[재무팀] 3분기 비용 정산 자료 오늘까지 제출 바랍니다', '안녕하세요, 첨부한 양식으로 제출 부탁드립니다.']] },
      wrong_notify_body: { from: [p('F사 담당자', 'lim@fsa.com')], items: [['요청하신 자료 보내드립니다', '김영수님, 요청하신 계약서 초안 검토 부탁드립니다.']] },
      wrong_quiet_title: { from: [p('생산 담당', `prod@${DOMAIN}`)], items: [['[생산2팀] 라인 점검 결과 공유', '점검 결과 이상 없습니다.']] },
      wrong_quiet_body: { from: [p('동기 모임', `friend@${DOMAIN}`)], items: [['주말 잘 보내세요', '이지은님, 지난번 사진 보내드려요.']] },
    },
  },
  {
    id: 'finance',
    label: '재무팀 대리',
    profile: {
      myName: '정하늘', myEmail: `haneul@${DOMAIN}`, myDept: '재무팀',
      teamAddresses: [`finance-all@${DOMAIN}`],
      workKeywords: ['결산', '비용 정산', '세금계산서', '법인카드'],
      jobKeywords: ['회계', '세무', '재무 분석'],
      interests: ['엑셀', '자격증', '중국어'],
      backupFor: ['최과장'],
      ...COMMON_SENDERS,
    },
    teamName: '재무팀 전체',
    boss: p('강팀장', `kang@${DOMAIN}`),
    peers: [p('문대리', `moon@${DOMAIN}`), p('송사원', `song@${DOMAIN}`)],
    backup: p('최과장', `choik@${DOMAIN}`),
    leaves: {
      mine_urgent_me: { items: [
        ['[급] 3분기 결산 자료 오늘까지 제출 부탁드립니다', '정하늘님, 3분기 결산 자료를 오늘까지 부탁드립니다.'],
        ['긴급: 세금계산서 발행 오류 확인', '정하늘님, 거래처 세금계산서 발행 오류를 급히 확인 부탁드립니다.'],
        ['법인카드 한도 증액 금일 처리 요청', '정하늘님, 출장팀 법인카드 한도 증액을 금일 중 처리 부탁드립니다.'],
      ] },
      mine_urgent_other: { items: [
        ['비용 정산 누락 건 오늘 중 확인 필요', '재무팀 여러분, 이번 달 비용 정산 누락 건을 오늘 중 확인 부탁드립니다.'],
        ['[급] 감사 대응 자료 취합', '내일 오전까지 결산 증빙을 공유 부탁드립니다.'],
        ['긴급 지급 요청 건 확인', '법인카드 결제 대금 지급 요청이 들어왔습니다. 가능한 분 확인 부탁드립니다.'],
      ] },
      mine_later_me: { items: [
        ['월 결산 체크리스트 업데이트', '정하늘님, 다음 주까지 월 결산 체크리스트 업데이트 부탁드립니다.'],
        ['법인카드 사용 규정 개정안 검토', '정하늘님, 개정안 초안입니다. 의견 주세요.'],
        ['세금계산서 보관 방식 정리', '정하늘님, 보관 방식을 문서로 정리 부탁드려요.'],
        ['비용 정산 시스템 개선 의견 요청', '정하늘님, 시스템 개선 의견을 모으고 있어요.'],
      ] },
      team_related: { items: [
        ['[공지] 연말 결산 일정 안내', '팀원 여러분, 연말 결산 일정을 공유합니다.'],
        ['세금계산서 양식 변경 안내', '팀원 여러분, 다음 달부터 새 양식을 씁니다.'],
        ['법인카드 회수 일정', '팀원 여러분, 분실 카드 회수 일정입니다.'],
        ['재무 분석 보고서 템플릿 공유', '팀원 여러분, 보고서 템플릿을 공유합니다.'],
      ] },
      aware_backup: { from: [p('F사 담당자', 'ko@fsa.com'), p('감사법인', 'audit@trustcpa.com'), p('자금 담당', `fund@${DOMAIN}`)], items: [
        ['F사 대금 지급 일정', '최과장님, F사 대금 지급 일정 공유드립니다.'],
        ['최과장 담당 감사 자료 요청', '최과장님, 외부 감사 자료 요청 드립니다.'],
        ['자금 집행 계획 확인', '최과장님, 다음 달 자금 집행 계획입니다.'],
      ] },
      promo_in_like: { from: [CLUB, NEWS], items: [
        ['사내 동호회 엑셀 마스터반 모집', '퇴근 후 함께 엑셀 실력을 키워요. 사내 시스템에서 신청해 주세요.'],
        ['[사내 뉴스레터] 직원 자격증 취득 지원 안내', '올해 자격증 취득 지원 제도를 소개합니다.'],
      ] },
      promo_out_like: { from: [p('러닝허브', 'edu@learnhub.com'), p('합격스쿨', 'ad@passschool.com')], items: [
        ['(광고) 엑셀 자동화 온라인 강의 할인', '안녕하세요. 엑셀 자동화 강의를 할인가로 만나보세요.'],
        ['[광고] 회계 자격증 단기 합격반 할인', '안녕하세요. 자격증 단기 합격반을 소개합니다.'],
      ] },
      study_job_mine: { items: [
        ['[직무 스터디] 회계 결산 기초 2주차', '감가상각 개념을 정리합니다.'],
        ['[직무 스터디] 세무 신고 실무 강좌', '부가세 신고 흐름을 다룹니다.'],
      ] },
      study_job_other: { items: [
        ['[직무 스터디] 영업 협상 스킬 강좌', '고객 응대 실전 사례를 함께 봅니다.'],
        ['[직무 스터디] 파이썬 기초 강좌', '변수와 반복문을 다룹니다.'],
        ['[직무 스터디] 디자인 씽킹 학습 모임', '사용자 인터뷰 방법을 배웁니다.'],
      ] },
      wrong_notify_title: { from: [p('A사 구매 담당', 'buyer@asa.com')], items: [['[영업기획팀] A사 견적서 오늘까지 회신 바랍니다', '안녕하세요, 첨부한 견적서 검토 부탁드립니다.']] },
      wrong_notify_body: { from: [p('G사 담당자', 'cha@gsa.com')], items: [['요청하신 계약서 보내드립니다', '박민수님, 요청하신 계약서 초안 검토 부탁드립니다.']] },
      wrong_quiet_title: { from: [p('개발 담당', `devlead@${DOMAIN}`)], items: [['[개발팀] 스프린트 회고 공유', '이번 스프린트 회고 내용입니다.']] },
      wrong_quiet_body: { from: [p('동기 모임', `friend@${DOMAIN}`)], items: [['점심 맛집 공유', '김지훈님, 지난번 말한 맛집이에요.']] },
    },
  },
  {
    id: 'dev',
    label: '개발팀 주니어',
    profile: {
      myName: '이준호', myEmail: `junho@${DOMAIN}`, myDept: '개발팀',
      teamAddresses: [`dev-all@${DOMAIN}`],
      workKeywords: ['결제 모듈', '배포', '장애', '결제 API'],
      jobKeywords: ['개발', '백엔드', '클라우드'],
      interests: ['인공지능', '해커톤', '영어'],
      backupFor: ['김책임'],
      ...COMMON_SENDERS,
    },
    teamName: '개발팀 전체',
    boss: p('한팀장', `hanlead@${DOMAIN}`),
    peers: [p('유선임', `yu@${DOMAIN}`), p('배사원', `bae@${DOMAIN}`)],
    backup: p('김책임', `kimc@${DOMAIN}`),
    leaves: {
      mine_urgent_me: { from: [p('한팀장', `hanlead@${DOMAIN}`), p('운영 담당', `ops@${DOMAIN}`)], items: [
        ['[급] 결제 모듈 장애 대응 요청', '이준호님, 결제 모듈 장애가 발생했습니다. 즉시 확인 부탁드립니다.'],
        ['긴급: 오늘 배포 롤백 여부 결정', '이준호님, 오늘 배포 건 롤백 여부를 급히 결정해야 합니다.'],
        ['결제 API 응답 지연 금일 중 확인', '이준호님, 결제 API 응답 지연 원인을 금일 중 확인 부탁드립니다.'],
      ] },
      mine_urgent_other: { items: [
        ['[급] 모니터링 알람 확인 요청', '개발팀 여러분, 장애 알람이 반복됩니다. 가능한 분 확인 부탁드립니다.'],
        ['오늘 배포 전 코드 리뷰 필요', '오늘 중 리뷰 가능한 분 부탁드립니다. 배포 일정이 밀리고 있어요.'],
        ['긴급 보안 패치 적용', '백엔드 서버에 보안 패치를 즉시 적용해야 합니다.'],
      ] },
      mine_later_me: { items: [
        ['결제 모듈 리팩터링 계획 검토', '이준호님, 다음 분기 리팩터링 계획 검토 부탁드립니다.'],
        ['신규 입사자 온보딩 문서 작성', '이준호님, 개발 환경 설정 문서를 정리 부탁드려요.'],
        ['배포 자동화 개선 아이디어', '이준호님, 배포 자동화 개선 아이디어를 모아 주세요.'],
        ['코드 컨벤션 문서 업데이트', '이준호님, 여유 있을 때 문서 업데이트 부탁드립니다.'],
      ] },
      team_related: { items: [
        ['[공지] 정기 배포 일정 변경', '팀원 여러분, 정기 배포 일정이 화요일로 바뀝니다.'],
        ['장애 회고 문서 공유', '팀원 여러분, 지난주 장애 회고 문서입니다.'],
        ['결제 API 버전 업그레이드 안내', '팀원 여러분, 다음 달 결제 API 버전이 올라갑니다.'],
        ['클라우드 비용 절감 방안', '팀원 여러분, 클라우드 비용 절감 방안을 공유합니다.'],
      ] },
      aware_backup: { from: [p('G사 담당자', 'park@gsa.com'), p('인프라 담당', `infra@${DOMAIN}`), p('외주사 담당', 'pm@outsource.com')], items: [
        ['G사 연동 일정 협의', '김책임님, G사 연동 일정 협의 요청드립니다.'],
        ['김책임 담당 인프라 점검 결과', '김책임님, 이번 달 인프라 점검 결과입니다.'],
        ['외주 산출물 검수 요청', '김책임님, 산출물 검수 요청드립니다.'],
      ] },
      promo_in_like: { from: [CLUB, NEWS], items: [
        ['사내 동호회 인공지능 모임 모집', '퇴근 후 함께 인공지능 논문을 읽어요.'],
        ['[사내 뉴스레터] 사내 해커톤 참가자 모집', '올해 사내 해커톤 참가자를 모집합니다.'],
      ] },
      promo_out_like: { from: [p('AI Summit', 'invite@aisummit.com'), p('해커스페이스', 'ad@hackspace.com')], items: [
        ['[광고] 인공지능 실무 웨비나 초대', '고객님, 안녕하세요. 인공지능 실무 웨비나에 초대합니다.'],
        ['(광고) 해커톤 운영 도구 할인 이벤트', '안녕하세요. 팀 해커톤 운영 도구를 할인해 드립니다.'],
      ] },
      study_job_mine: { items: [
        ['[직무 스터디] 백엔드 성능 튜닝 2주차', '캐시 전략을 다룹니다.'],
        ['[직무 스터디] 클라우드 입문 강좌', '기본 서비스 구성을 배웁니다.'],
      ] },
      study_job_other: { items: [
        ['[직무 스터디] 회계 결산 기초 2주차', '감가상각 개념을 정리합니다.'],
        ['[직무 스터디] 영업 협상 스킬 강좌', '고객 응대 실전 사례를 함께 봅니다.'],
        ['[직무 스터디] 디자인 씽킹 학습 모임', '사용자 인터뷰 방법을 배웁니다.'],
      ] },
      wrong_notify_title: { from: [p('재무 담당', `fin@${DOMAIN}`)], items: [['[재무팀] 법인카드 사용 내역 오늘까지 제출 바랍니다', '안녕하세요, 첨부 양식으로 제출 부탁드립니다.']] },
      wrong_notify_body: { from: [p('디자인 에이전시', 'studio@designco.com')], items: [['요청하신 디자인 시안 보내드립니다', '최유진님, 요청하신 시안 검토 부탁드립니다.']] },
      wrong_quiet_title: { from: [p('영업 담당', `lee@${DOMAIN}`)], items: [['[영업기획팀] 월간 실적 공유', '이번 달 실적 공유드립니다.']] },
      wrong_quiet_body: { from: [p('동기 모임', `friend@${DOMAIN}`)], items: [['주말 등산 사진', '박도윤님, 지난번 사진 보내드려요.']] },
    },
  },
];

// 시드 고정 셔플 (계정마다 같은 순서)
function shuffle(arr, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildRaw(def) {
  const me = p(def.profile.myName, def.profile.myEmail);
  const team = p(def.teamName, def.profile.teamAddresses[0]);
  const out = [];
  const entries = [...Object.entries({ ...SHARED, ...def.leaves }), ...(def.extra || [])];
  for (const [leaf, spec] of entries) {
    spec.items.forEach(([subject, body, toOverride], i) => {
      const froms = spec.from || [def.boss];
      const from = froms[i % froms.length];
      let to;
      if (toOverride) to = [toOverride];
      else if (spec.toTeam || leaf === 'team_related') to = [team];
      else if (spec.toAll || leaf.startsWith('study_job') || leaf === 'promo_in_like') to = [ALL];
      else if (leaf === 'aware_backup') to = [def.backup];
      else if (leaf === 'mine_urgent_other') to = [me, ...def.peers];
      else if (spec.to) to = spec.to(me);
      else to = [me];
      const cc = spec.cc ? spec.cc(me) : leaf === 'aware_backup' ? [me] : [];
      let expected = leaf;
      if (leaf === 'study_lang') {
        const like = def.profile.interests.some((k) => `${subject} ${body}`.includes(k));
        expected = like ? 'study_lang_like' : 'study_lang_skip';
      }
      out.push({ expected, from: leaf.startsWith('study_job') && !spec.from ? STUDY : from, to, cc, subject, body });
    });
  }
  // 섞되, 급한 메일은 최근에 받은 쪽(앞쪽)에 흩어 둔다
  const isUrgent = (m) => m.expected.startsWith('mine_urgent');
  const result = shuffle(out.filter((m) => !isUrgent(m)), def.id.length * 7919 + 17);
  shuffle(out.filter(isUrgent), 31).forEach((m, j) => result.splice(j * 3 + 1, 0, m));
  return result;
}

export const PERSONAS = DEFS.map((d) => ({ id: d.id, label: d.label, profile: d.profile }));
export const SAMPLE_PROFILE = DEFS[0].profile;

export function personaById(id) {
  return PERSONAS.find((x) => x.id === id) || PERSONAS[0];
}

// now 기준으로 약 24분 간격으로 받은 메일로 만든다 (74통 ≈ 30시간, 280통 ≈ 5일)
export function sampleMails(now = new Date(), personaId = 'sales') {
  const def = DEFS.find((d) => d.id === personaId) || DEFS[0];
  return buildRaw(def).map((m, i) => ({
    id: `${def.id}-${i + 1}`,
    ...m,
    date: new Date(now.getTime() - (6 + i * 24 + ((i * 37) % 11)) * 60000).toISOString(),
  }));
}
