// 규칙 기반 메일 분류기 (F1 수신 위치, F2 프로필, F3 긴급도·요청, F4 오발송)
// 순수 함수만 두어 브라우저와 Node 테스트에서 모두 쓴다.
import { LEAVES } from './tree.js';

export const DEFAULT_PROFILE = {
  myName: '',
  myEmail: '',
  myDept: '',
  teamAddresses: [],   // 팀 전체 메일링 주소
  workKeywords: [],    // 내 담당 업무·프로젝트·거래처
  jobKeywords: [],     // 내 직무 키워드
  interests: [],       // 관심 주제
  backupFor: [],       // 내가 백업하는 담당자 이름
  promoSenders: [],    // 홍보·뉴스레터 발신자
  studySenders: [],    // 스터디·리포트 발신자
};

const REQUEST_WORDS = ['부탁드립니다', '부탁드려요', '요청드립니다', '회신 바랍니다', '회신 부탁', '확인 부탁', '검토 부탁', '작성 부탁', '제출 바랍니다', '처리 부탁', '공유 부탁', 'please', 'asap'];
const URGENT_WORDS = ['긴급', '급히', '시급', '오늘까지', '오늘 중', '금일', '내일 오전', 'eod', 'asap', '즉시', '마감 임박', '[급]', '(급)'];
const PROMO_WORDS = ['[광고]', '(광고)', '홍보', '이벤트', '프로모션', '뉴스레터', '할인', '초대합니다', '웨비나', '세미나 안내', '참가 신청'];
const STUDY_WORDS = ['스터디', '강좌', '학습', '교육 자료', '리포트', '동향', '브리핑', '어학', '회화', '아티클'];
const INDUSTRY_WORDS = ['리포트', '동향', '이슈', '브리핑', '시장', '산업'];
const LANG_WORDS = ['영어', '중국어', '일본어', '독어', '독일어', '불어', '프랑스어', '스페인어', '베트남어', '어학', 'english', 'toeic', 'hsk', 'jlpt'];

const norm = (s) => (s || '').toString().toLowerCase();
const hasAny = (text, words) => words.find((w) => w && norm(text).includes(norm(w)));
const domainOf = (email) => norm(email).split('@')[1] || '';
const sameAddr = (a, b) => a && b && norm(a) === norm(b);

function list(v) {
  if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
  return (v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function normalizeProfile(p) {
  const out = { ...DEFAULT_PROFILE, ...p };
  for (const k of Object.keys(DEFAULT_PROFILE)) {
    if (Array.isArray(DEFAULT_PROFILE[k])) out[k] = list(out[k]);
  }
  return out;
}

// 메일 1건 분류 → { leaf, reasons[], signals{} }
export function classify(mail, rawProfile, overrides = {}) {
  const p = normalizeProfile(rawProfile);
  const text = `${mail.subject || ''}\n${mail.body || ''}`;
  const subject = mail.subject || '';
  const fromEmail = norm(mail.from?.email);
  const myDomain = domainOf(p.myEmail);
  const internal = myDomain && domainOf(fromEmail) === myDomain;
  const to = mail.to || [];
  const cc = mail.cc || [];
  const reasons = [];

  // F5에서 학습한 사용자 수정 규칙(발신자 기준)이 가장 우선
  const learned = overrides[fromEmail];
  if (learned && LEAVES[learned]) {
    return { leaf: learned, reasons: ['이전에 직접 고친 분류를 적용했어요 (같은 발신자)'], signals: {} };
  }

  // ── F1 수신 위치
  const inTo = to.some((r) => sameAddr(r.email, p.myEmail));
  const inCc = cc.some((r) => sameAddr(r.email, p.myEmail));
  const viaTeam = [...to, ...cc].some((r) => p.teamAddresses.some((t) => sameAddr(t, r.email)));
  const mentioned = p.myName && norm(text).includes(norm(p.myName));
  const workHit = hasAny(text, p.workKeywords);
  const jobHit = hasAny(text, p.jobKeywords);
  const interestHit = hasAny(text, p.interests);

  // ── F3 요청·긴급도
  const request = hasAny(text, REQUEST_WORDS);
  const urgent = hasAny(text, URGENT_WORDS) || deadlineSoon(text, mail.date);

  const signals = { inTo, inCc, viaTeam, mentioned: !!mentioned, workHit, request, urgent };

  // ── F4 오발송: 제목의 [OO팀]/[OO님] 태그가 나와 다르거나, 본문 인사말 이름이 나와 다를 때
  if (inTo && !mentioned && !workHit) {
    const titleTag = otherTargetInTitle(subject, p);
    const greet = greetingName(mail.body);
    const greetOther = greet && p.myName && !norm(greet).includes(norm(p.myName)) && !norm(p.myName).includes(norm(greet));
    if (titleTag || greetOther) {
      const byTitle = !!titleTag;
      const notify = !!request || !!urgent;
      reasons.push(byTitle ? `제목 태그 "${titleTag}"가 내 소속·이름과 달라요` : `본문 인사말이 "${greet}" 앞으로 되어 있어요`);
      reasons.push(notify ? '요청·마감이 있어 발신자에게 알려야 해요' : '요청이 없어 굳이 회신하지 않아도 돼요');
      const leaf = notify ? (byTitle ? 'wrong_notify_title' : 'wrong_notify_body') : (byTitle ? 'wrong_quiet_title' : 'wrong_quiet_body');
      return { leaf, reasons, signals };
    }
  }

  // ── 비업무: 홍보
  const promoSender = p.promoSenders.some((s) => fromEmail.includes(norm(s)));
  const promoWord = hasAny(subject, PROMO_WORDS);
  if ((promoSender || promoWord) && !request) {
    reasons.push(promoSender ? '홍보 발신자로 등록된 주소예요' : `제목에 홍보 표현 "${promoWord}"이 있어요`);
    reasons.push(interestHit ? `관심 주제 "${interestHit}"와 맞아요` : '등록한 관심 주제와 맞지 않아요');
    const side = internal ? 'promo_in' : 'promo_out';
    return { leaf: `${side}_${interestHit ? 'like' : 'skip'}`, reasons, signals };
  }

  // ── 비업무: 스터디
  const studySender = p.studySenders.some((s) => fromEmail.includes(norm(s)));
  const studyWord = hasAny(subject, STUDY_WORDS);
  if ((studySender || studyWord) && !request) {
    const lang = hasAny(subject, LANG_WORDS);
    if (lang) return { leaf: 'study_lang', reasons: [`언어 학습 메일이에요 ("${lang}")`], signals };
    const ind = hasAny(subject, INDUSTRY_WORDS);
    if (ind && !jobHit) {
      return { leaf: internal ? 'study_ind_in' : 'study_ind_out', reasons: [`산업 리포트예요 (${internal ? '사내' : '사외'} 발신)`], signals };
    }
    reasons.push(studySender ? '스터디 발신자로 등록된 주소예요' : `제목에 "${studyWord}"가 있어요`);
    reasons.push(jobHit ? `내 직무 키워드 "${jobHit}"와 맞아요` : '내 직무 키워드와 맞지 않아요');
    return { leaf: jobHit ? 'study_job_mine' : 'study_job_other', reasons, signals };
  }

  // ── 업무: 내가 받는 사람(To)에 있음 → 내 담당
  if (inTo) {
    const solo = to.length === 1;
    const mustMe = mentioned || solo;
    reasons.push(solo ? '받는 사람이 나 혼자예요' : mentioned ? '본문에 내 이름이 있어요' : `받는 사람이 ${to.length}명이에요`);
    if (urgent) reasons.push(`긴급·마감 표현 "${urgent}"`);
    else reasons.push('긴급·마감 표현이 없어요');
    if (request) reasons.push(`요청 표현 "${request}"`);
    let leaf;
    if (urgent) leaf = mustMe ? 'mine_urgent_me' : 'mine_urgent_other';
    else leaf = mustMe || (request && workHit) ? 'mine_later_me' : 'mine_later_other';
    return { leaf, reasons, signals };
  }

  // ── 업무: 팀 전체 주소로 받음
  if (viaTeam) {
    const related = mentioned || workHit || jobHit;
    reasons.push('팀 전체 주소로 받은 참조 메일이에요');
    reasons.push(related ? `내 업무 키워드 "${mentioned ? p.myName : workHit || jobHit}"가 있어요` : '내 이름·업무 키워드가 없어요');
    return { leaf: related ? 'team_related' : 'team_unrelated', reasons, signals };
  }

  // ── 업무: 참조(CC)로만 받음 → 업무 파악용
  const backupHit = p.backupFor.find((n) => norm(text).includes(norm(n)) || [mail.from, ...to].some((r) => norm(r?.name).includes(norm(n))));
  reasons.push(inCc ? '참조(CC)로만 받았어요' : '받는 사람·참조에 내 주소가 없어요');
  if (backupHit || mentioned || workHit) {
    reasons.push(backupHit ? `내가 백업하는 "${backupHit}" 님 업무예요` : '내 이름·업무 키워드가 있어요');
    return { leaf: 'aware_backup', reasons, signals };
  }
  reasons.push('내 이름·업무 키워드·백업 대상이 없어요');
  return { leaf: 'aware_skip', reasons, signals };
}

// 제목의 [재무팀], [홍길동님] 같은 대상 태그가 내 소속·이름이 아니면 그 태그를 돌려준다
function otherTargetInTitle(subject, p) {
  const tags = [...(subject || '').matchAll(/[\[(]([^\])]{1,15})[\])]/g)].map((m) => m[1].trim());
  for (const t of tags) {
    const isTarget = /(팀|부|실|센터|본부|님)$/.test(t);
    if (!isTarget) continue;
    const mine = (p.myDept && norm(t).includes(norm(p.myDept))) || (p.myName && norm(t).includes(norm(p.myName)));
    if (!mine) return t;
  }
  return null;
}

// 본문 첫 줄 "OOO님," / "OOO 매니저님" 인사말에서 이름 추출
function greetingName(body) {
  const first = (body || '').trim().split('\n')[0].slice(0, 40);
  const m = first.match(/^([가-힣A-Za-z]{2,10})\s?(님|매니저님|대리님|과장님|팀장님|선임님|책임님)/);
  if (!m) return null;
  if (['안녕하세요', '여러분', '모두', '팀원', '고객', '회원', '구독자', '담당자', '관계자'].includes(m[1])) return null;
  return m[1];
}

// "11/5까지", "11월 5일까지" 같은 마감이 메일 날짜 기준 1일 이내면 긴급
function deadlineSoon(text, dateStr) {
  const base = dateStr ? new Date(dateStr) : new Date();
  const re = /(\d{1,2})\s?[\/.월]\s?(\d{1,2})\s?일?\s?\(?[월화수목금토일]?\)?\s?(까지|마감)/g;
  let m;
  while ((m = re.exec(text))) {
    const d = new Date(base.getFullYear(), Number(m[1]) - 1, Number(m[2]), 23, 59);
    const diff = (d - base) / 86400000;
    if (diff >= -1 && diff <= 1.5) return `${m[1]}/${m[2]} 마감`;
  }
  return null;
}

export function classifyAll(mails, profile, overrides) {
  return mails.map((m) => ({ ...m, result: classify(m, profile, overrides) }));
}

// F4 회신 초안
export function replyDraft(mail, rawProfile) {
  const p = normalizeProfile(rawProfile);
  const sender = mail.from?.name || mail.from?.email || '담당자';
  const me = [p.myDept, p.myName].filter(Boolean).join(' ');
  return {
    to: mail.from?.email || '',
    subject: `RE: ${mail.subject || ''}`,
    body:
`${sender}님, 안녕하세요. ${me || ''}입니다.

보내주신 "${mail.subject || ''}" 메일이 제게 잘못 전달된 것 같아 회신드립니다.
저는 해당 업무 담당자가 아니라서, 수신자를 한 번 확인 부탁드립니다.

감사합니다.
${p.myName || ''}`.trim(),
  };
}
