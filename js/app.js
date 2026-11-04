import { TREE, LEAVES, ACTION_LABEL, leafTitle } from './tree.js';
import { classifyAll, replyDraft, normalizeProfile } from './classifier.js';
import { PERSONAS, personaById } from './sample.js';
import { PROVIDERS, fetchMails, handleOutlookRedirect, hasToken, disconnect, redirectUri } from './providers.js';

// ───────── 저장소 (이 브라우저의 localStorage)
const KEY = 'malkkeum.';
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch {} },
};

const state = {
  cfg: { provider: 'demo', persona: 'sales', googleClientId: '', msClientId: '', msTenant: 'common', maxMails: 50, ...store.get('cfg', {}) },
  profile: null,
  overrides: {},
  mails: [],
  account: '',
  loading: false,
  error: '',
  filter: 'all',
  q: '',
};

// 프로필과 고친 분류 규칙은 샘플 계정마다, 실제 연결 계정은 따로 저장한다
const scope = () => (state.cfg.provider === 'demo' ? `demo.${personaById(state.cfg.persona).id}` : 'real');
const defaultProfile = () => ({ ...personaById(state.cfg.persona).profile });
function loadScoped() {
  state.profile = store.get(`profile.${scope()}`, defaultProfile());
  state.overrides = store.get(`overrides.${scope()}`, {});
}
const saveProfile = () => store.set(`profile.${scope()}`, state.profile);
const saveOverrides = () => store.set(`overrides.${scope()}`, state.overrides);
loadScoped();

const ROUTES = {
  summary: '요약 대시보드',
  inbox: '분류함',
  digest: '숨긴 메일 요약',
  profile: '업무 프로필',
  connect: '메일 연동 설정',
};

const GROUPS = [
  ['mine', '내 담당 업무'],
  ['aware', '업무 파악용'],
  ['team', '팀 전체 참조'],
  ['promo', '홍보'],
  ['study', '스터디'],
  ['wrong', '오발송'],
];

// "이건 중요해요"를 누르면 옮길, 사람 판단 쪽 형제 리프
const HUMAN_SIBLING = {
  aware_skip: 'aware_backup',
  mine_later_other: 'mine_later_me',
  team_unrelated: 'team_related',
  promo_in_skip: 'promo_in_like',
  promo_out_skip: 'promo_out_like',
  study_job_other: 'study_job_mine',
  wrong_quiet_title: 'mine_later_me',
};

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ───────── 분류 결과 헬퍼
function bucketOf(leafId) {
  const l = LEAVES[leafId];
  if (!l?.auto) return 'human';
  return l.action; // pin | later | archive | reply
}
function badge(leafId) {
  const b = bucketOf(leafId);
  const map = {
    pin: ['b-pin', '상단 고정'],
    human: ['b-human', '확인 필요'],
    later: ['b-later', '후순위'],
    archive: ['b-archive', '자동 보관'],
    reply: ['b-reply', '회신 초안'],
  };
  const [cls, txt] = map[b];
  return `<span class="badge ${cls}">${txt}</span>`;
}
const classified = () => classifyAll(state.mails, state.profile, state.overrides)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

function counts(list) {
  const c = { all: list.length, pin: 0, human: 0, later: 0, archive: 0, reply: 0, wrong: 0, leaf: {} };
  for (const m of list) {
    c[bucketOf(m.result.leaf)]++;
    if (m.result.leaf.startsWith('wrong_')) c.wrong++;
    c.leaf[m.result.leaf] = (c.leaf[m.result.leaf] || 0) + 1;
  }
  return c;
}

function fmtTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : `${d.getMonth() + 1}/${d.getDate()}`;
}

// ───────── 메일 행
function mailRow(m, opts = {}) {
  const r = m.result;
  const optgroups = renderLeafOptions(r.leaf);
  const canReply = r.leaf.startsWith('wrong_notify');
  return `
  <article class="mrow ${opts.noFix ? 'compact' : ''}" data-id="${esc(m.id)}">
    <div class="mtime">${fmtTime(m.date)}</div>
    <div>
      <div class="mfrom">${esc(m.from?.name || m.from?.email)}${m.from?.name ? ` <span style="color:var(--ink-3);font-weight:500">&lt;${esc(m.from.email)}&gt;</span>` : ''}</div>
      <div class="msubj">${esc(m.subject)}</div>
      <div class="msnip">${esc(m.body)}</div>
      <details class="mwhy"><summary>분류 근거 보기</summary><ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
    </div>
    <div class="mside">
      <div class="mtools">${badge(r.leaf)}</div>
      <div class="leafname">${esc(leafTitle(r.leaf))}</div>
      <div class="mtools">
        ${canReply ? `<button class="btn sm" data-act="reply" data-id="${esc(m.id)}">회신 초안</button>` : ''}
        ${m.link ? `<a class="btn sm ghost" href="${esc(m.link)}" target="_blank" rel="noopener">원문</a>` : ''}
        ${opts.noFix ? '' : `<select class="fix" data-act="fix" data-id="${esc(m.id)}" aria-label="분류 수정">${optgroups}</select>`}
      </div>
    </div>
  </article>`;
}

function renderLeafOptions(current) {
  const out = [];
  (function walk(node, path) {
    if (!node.children) return;
    const leaves = node.children.filter((c) => !c.children);
    if (leaves.length) {
      out.push(`<optgroup label="${esc(path.concat(node.label).slice(-2).join(' › '))}">${leaves.map((l) =>
        `<option value="${l.id}" ${l.id === current ? 'selected' : ''}>${esc(l.label)}${l.auto ? ` (${ACTION_LABEL[l.action]})` : ''}</option>`).join('')}</optgroup>`);
    }
    node.children.filter((c) => c.children).forEach((c) => walk(c, node.id === 'root' ? [] : path.concat(node.label)));
  })(TREE, []);
  return out.join('');
}

// ───────── 화면들
function viewSummary() {
  const list = classified();
  const c = counts(list);
  const autoDone = c.later + c.archive + c.reply;
  const saved = Math.round((autoDone * 30) / 60);
  const pinned = list.filter((m) => bucketOf(m.result.leaf) === 'pin');
  const human = list.filter((m) => bucketOf(m.result.leaf) === 'human');
  const wrong = list.filter((m) => m.result.leaf.startsWith('wrong_notify'));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  const bars = GROUPS.map(([g, label]) => {
    const items = list.filter((m) => m.result.leaf.startsWith(g + '_'));
    const a = items.filter((m) => LEAVES[m.result.leaf].auto).length;
    const h = items.length - a;
    const w = (n) => (c.all ? (n / c.all) * 100 : 0);
    return `<div class="bar-row"><span>${label}</span><div class="bar"><i class="h" style="width:${w(h)}%"></i><i class="a" style="width:${w(a)}%"></i></div><b>${items.length}</b></div>`;
  }).join('');

  return `
  <div class="head">
    <div>
      <div class="eyebrow">${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
      <h1>오늘의 받은편지함</h1>
      <p>${c.all ? `받은 메일 ${c.all}건 중 <b>${autoDone}건</b>을 자동으로 정리했어요. 직접 볼 메일은 ${c.pin + c.human}건이에요.` : '아직 불러온 메일이 없어요.'}</p>
    </div>
    <div class="btns">
      ${perm === 'default' ? '<button class="btn" data-act="notify">브라우저 알림 켜기</button>' : ''}
      <button class="btn primary" data-act="reload" ${state.loading ? 'disabled' : ''}>${state.loading ? '불러오는 중…' : '메일 다시 불러오기'}</button>
    </div>
  </div>
  ${noticeBlock()}
  <div class="kpis">
    <div class="card kpi"><small>받은 메일</small><b>${c.all}<span>건</span></b><p>${state.cfg.provider === 'demo' ? '최근 30시간 · 샘플' : `최근 ${esc(state.cfg.maxMails || 50)}건 기준`}</p></div>
    <div class="card kpi accent"><small>지금 처리할 메일</small><b>${c.pin}<span>건</span></b><p>급하고 내가 해야 할 일</p></div>
    <div class="card kpi"><small>직접 확인 필요</small><b>${c.human}<span>건</span></b><p>사람 판단이 필요한 메일</p></div>
    <div class="card kpi"><small>자동 정리</small><b>${autoDone}<span>건</span></b><p>보관 ${c.archive} · 후순위 ${c.later} · 회신 ${c.reply}</p></div>
    <div class="card kpi"><small>아낀 시간 (추정)</small><b>${saved}<span>분</span></b><p>메일당 30초 가정</p></div>
  </div>
  <div class="grid2">
    <div class="stack">
      <section class="card">
        <div class="card-h"><h2>지금 처리할 메일</h2><a class="btn sm ghost" href="#inbox" data-filter="pin">모두 보기</a></div>
        <div class="card-b mlist">${pinned.length ? pinned.map((m) => mailRow(m, { noFix: true })).join('') : '<div class="empty">급하게 처리할 메일이 없어요.</div>'}</div>
      </section>
      <section class="card">
        <div class="card-h"><h2>직접 확인이 필요한 메일</h2><a class="btn sm ghost" href="#inbox" data-filter="human">모두 보기</a></div>
        <div class="card-b mlist">${human.length ? human.slice(0, 4).map((m) => mailRow(m, { noFix: true })).join('') : '<div class="empty">확인할 메일이 없어요.</div>'}</div>
      </section>
    </div>
    <div class="stack">
      <section class="card">
        <div class="card-h"><h2>분류 현황</h2><small>메일 종류별</small></div>
        <div class="card-b">
          <div class="bars">${bars}</div>
          <div class="legend"><span><i style="background:var(--blue)"></i>직접 확인</span><span><i style="background:var(--sky)"></i>자동 처리</span></div>
        </div>
      </section>
      <section class="card">
        <div class="card-h"><h2>오발송 의심</h2><small>알려야 하는 메일</small></div>
        <div class="card-b mlist">${wrong.length ? wrong.map((m) => mailRow(m, { noFix: true })).join('') : '<div class="empty">오발송으로 보이는 메일이 없어요.</div>'}</div>
      </section>
      <a class="card card-b" href="#digest" style="text-decoration:none;display:block">
        <div class="eyebrow">숨긴 메일 요약</div>
        <b style="font-size:16px">오늘 숨긴 메일 ${c.archive + c.later}건</b>
        <p style="margin:4px 0 0;color:var(--ink-2)">잘못 숨겨진 메일이 없는지 한 번만 훑어보세요 →</p>
      </a>
    </div>
  </div>`;
}

function noticeBlock() {
  if (state.error) return `<div class="note warn" style="margin-bottom:16px"><b>불러오지 못했어요.</b> ${esc(state.error)} <a href="#connect">연동 설정 확인</a></div>`;
  if (state.cfg.provider !== 'demo' && !state.mails.length && !state.loading) {
    return `<div class="note" style="margin-bottom:16px"><b>${esc(PROVIDERS[state.cfg.provider].label)}</b> 로그인이 필요해요. 위의 "메일 다시 불러오기"를 누르면 로그인 창이 열려요.</div>`;
  }
  if (state.cfg.provider === 'demo') return `<div class="note" style="margin-bottom:16px">지금은 샘플 계정 <b>${esc(personaById(state.cfg.persona).label)}</b>의 메일로 동작 중이에요. 다른 샘플 계정은 왼쪽 위 워크스페이스 버튼에서 바꿀 수 있고, 실제 메일함은 <a href="#connect">메일 연동 설정</a>에서 연결하세요.</div>`;
  return '';
}

function inboxListHtml(list) {
  const f = state.filter;
  const q = state.q.trim().toLowerCase();
  const shown = list.filter((m) => {
    const b = bucketOf(m.result.leaf);
    const okF = f === 'all' || (f === 'wrong' ? m.result.leaf.startsWith('wrong_') : b === f);
    const okQ = !q || `${m.subject} ${m.body} ${m.from?.name} ${m.from?.email}`.toLowerCase().includes(q);
    return okF && okQ;
  });
  return shown.length ? shown.map((m) => mailRow(m)).join('') : '<div class="empty">조건에 맞는 메일이 없어요.</div>';
}

function viewInbox() {
  const list = classified();
  const c = counts(list);
  const f = state.filter;
  const chip = (id, label) => `<button class="fchip ${f === id ? 'on' : ''}" data-act="filter" data-f="${id}">${label}<span>${c[id]}</span></button>`;
  return `
  <div class="head">
    <div><div class="eyebrow">F1 · F3 · F4</div><h1>분류함</h1><p>모든 메일을 종류와 긴급도에 따라 분류했어요. 분류가 틀리면 오른쪽에서 바로 고치세요. 같은 발신자의 다음 메일부터 반영돼요.</p></div>
    <button class="btn primary" data-act="reload" ${state.loading ? 'disabled' : ''}>${state.loading ? '불러오는 중…' : '다시 불러오기'}</button>
  </div>
  ${noticeBlock()}
  <div class="toolbar">
    <div class="chips">${chip('all', '전체')}${chip('pin', '상단 고정')}${chip('human', '확인 필요')}${chip('later', '후순위')}${chip('archive', '자동 보관')}${chip('wrong', '오발송')}</div>
    <input class="search" type="search" placeholder="제목·본문·발신자 검색" value="${esc(state.q)}" data-act="search" aria-label="메일 검색">
  </div>
  <section class="card"><div class="card-b mlist" id="inbox-list">${inboxListHtml(list)}</div></section>`;
}

function viewDigest() {
  const list = classified().filter((m) => ['archive', 'later'].includes(bucketOf(m.result.leaf)));
  const byLeaf = {};
  list.forEach((m) => (byLeaf[m.result.leaf] ||= []).push(m));
  const rules = Object.entries(state.overrides);
  const groups = Object.entries(byLeaf).map(([leaf, ms]) => `
    <div class="group-h">${badge(leaf)} ${esc(leafTitle(leaf))} <span style="color:var(--ink-3);font-weight:500">${ms.length}건</span></div>
    <div class="mlist">${ms.map((m) => `
      <article class="mrow">
        <div class="mtime">${fmtTime(m.date)}</div>
        <div><div class="mfrom">${esc(m.from?.name || m.from?.email)}</div><div class="msubj">${esc(m.subject)}</div><div class="msnip">${esc(m.result.reasons.join(' · '))}</div></div>
        <div class="mside"><button class="btn sm" data-act="rescue" data-id="${esc(m.id)}">이건 중요해요</button></div>
      </article>`).join('')}</div>`).join('');
  return `
  <div class="head">
    <div><div class="eyebrow">F5 · 안전장치</div><h1>오늘 숨긴 메일 ${list.length}건</h1><p>자동 보관·후순위로 보낸 메일이에요. 잘못 숨겨진 메일은 "이건 중요해요"로 되돌리면, 같은 발신자는 다음부터 확인 필요로 분류돼요.</p></div>
  </div>
  <div class="grid2">
    <section class="card"><div class="card-b">${groups || '<div class="empty">숨긴 메일이 없어요.</div>'}</div></section>
    <section class="card">
      <div class="card-h"><h2>내가 고친 분류 규칙</h2><small>${rules.length}개</small></div>
      <div class="card-b rules">${rules.length ? rules.map(([email, leaf]) => `
        <div class="rule"><span><span class="mono">${esc(email)}</span> → ${esc(leafTitle(leaf))}</span><button class="btn sm ghost" data-act="unrule" data-email="${esc(email)}">삭제</button></div>`).join('') : '<div class="empty">아직 고친 분류가 없어요. 분류함에서 분류를 바꾸면 여기에 쌓여요.</div>'}</div>
    </section>
  </div>`;
}

const PROFILE_FIELDS = [
  ['sect', '나'],
  ['myName', '이름', '본문에 이 이름이 있으면 "내가 해야 할 일"로 봐요.', 'input'],
  ['myEmail', '메일 주소', '받는 사람(To)·참조(CC) 판별 기준이에요.', 'input'],
  ['myDept', '소속 팀', '제목의 [OO팀] 태그가 이 팀이 아니면 오발송 후보예요.', 'input'],
  ['teamAddresses', '팀 전체 메일 주소', '쉼표로 구분. 이 주소로 받은 메일은 "팀 전체 참조"로 분류해요.', 'input'],
  ['sect', '업무'],
  ['workKeywords', '담당 업무 키워드', '프로젝트명, 거래처, 자주 쓰는 업무 용어. 쉼표로 구분.', 'textarea'],
  ['jobKeywords', '직무 키워드', '내 직무 스터디인지 판별할 때 써요.', 'textarea'],
  ['backupFor', '내가 백업하는 담당자', '이 사람 업무 메일은 참조로 와도 "백업할 일"로 남겨요.', 'input'],
  ['interests', '관심 주제', '홍보 메일 중 이 주제는 숨기지 않아요.', 'input'],
  ['sect', '발신자 규칙'],
  ['promoSenders', '홍보·뉴스레터 발신자', '주소 전체나 일부(예: news@). 쉼표로 구분.', 'textarea'],
  ['studySenders', '스터디·리포트 발신자', '주소 전체나 일부. 쉼표로 구분.', 'textarea'],
];

function viewProfile() {
  const p = normalizeProfile(state.profile);
  const fields = PROFILE_FIELDS.map(([k, label, help, kind]) => {
    if (k === 'sect') return `<div class="sect">${label}</div>`;
    const v = Array.isArray(p[k]) ? p[k].join(', ') : p[k];
    const input = kind === 'textarea'
      ? `<textarea id="f-${k}" name="${k}">${esc(v)}</textarea>`
      : `<input id="f-${k}" name="${k}" value="${esc(v)}" ${k === 'myEmail' ? 'type="email" autocomplete="email"' : ''}>`;
    const full = kind === 'textarea' ? 'full' : '';
    return `<div class="field ${full}"><label for="f-${k}">${label}</label>${input}<small>${help}</small><span class="err" id="e-${k}"></span></div>`;
  }).join('');
  return `
  <div class="head"><div><div class="eyebrow">F2</div><h1>업무 프로필</h1><p>분류 규칙이 이 정보로 동작해요. 이 브라우저에만 저장되고 외부로 보내지 않아요.</p></div></div>
  <section class="card"><form class="card-b" id="profile-form" novalidate>
    <div class="form">${fields}</div>
    <div class="btns" style="margin-top:20px">
      <button class="btn primary" type="submit">저장하고 다시 분류</button>
      <button class="btn" type="button" data-act="sample-profile">기본 프로필로 되돌리기</button>
    </div>
  </form></section>`;
}

function viewConnect() {
  const cfg = state.cfg;
  const radio = (id) => `<label><input type="radio" name="provider" value="${id}" ${cfg.provider === id ? 'checked' : ''}><b>${PROVIDERS[id].label}</b><small>권한: ${PROVIDERS[id].scope}</small></label>`;
  const uri = redirectUri();
  return `
  <div class="head"><div><div class="eyebrow">MANAGE</div><h1>메일 연동 설정</h1><p>메일은 <b>읽기 전용</b>으로만 가져와요. 발송·삭제 기능은 없고, 토큰은 탭을 닫으면 사라져요.</p></div></div>
  <form class="stack" id="connect-form" novalidate>
    <section class="card"><div class="card-h"><h2>메일 서비스</h2>${state.account && cfg.provider !== 'demo' ? `<span class="chip live">${esc(state.account)} 연결됨</span>` : ''}</div>
      <div class="card-b"><div class="prov">${radio('demo')}${radio('gmail')}${radio('outlook')}</div></div></section>

    <section class="card"><div class="card-h"><h2>앱 등록 정보</h2><small>클라이언트 ID는 비밀값이 아니에요</small></div>
      <div class="card-b form">
        <div class="field full"><label>리디렉션 URI / 승인된 출처</label><div class="btns"><span class="mono" id="redir">${esc(uri)}</span><button class="btn sm" type="button" data-act="copy-uri">복사</button></div><small>Google에는 <code>${esc(location.origin)}</code>를 "승인된 JavaScript 원본"에, Microsoft에는 위 주소를 "단일 페이지 애플리케이션(SPA)" 리디렉션 URI로 등록하세요.</small></div>
        <div class="field"><label for="f-g">Google OAuth 클라이언트 ID</label><input id="f-g" name="googleClientId" value="${esc(cfg.googleClientId)}" placeholder="0000-xxxx.apps.googleusercontent.com"><span class="err" id="e-googleClientId"></span></div>
        <div class="field"><label for="f-m">Microsoft 애플리케이션(클라이언트) ID</label><input id="f-m" name="msClientId" value="${esc(cfg.msClientId)}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"><span class="err" id="e-msClientId"></span></div>
        <div class="field"><label for="f-t">Microsoft 테넌트</label><input id="f-t" name="msTenant" value="${esc(cfg.msTenant || 'common')}"><small>회사 계정만 쓰면 회사 테넌트 ID, 아니면 common</small></div>
        <div class="field"><label for="f-n">불러올 메일 수</label><input id="f-n" name="maxMails" type="number" min="10" max="100" value="${esc(cfg.maxMails || 50)}"><span class="err" id="e-maxMails"></span></div>
      </div></section>

    <div class="btns">
      <button class="btn primary" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? '연결 중…' : '저장하고 메일 불러오기'}</button>
      <button class="btn" type="button" data-act="disconnect">연결 해제</button>
    </div>
    ${state.error ? `<div class="note warn"><b>오류:</b> ${esc(state.error)}</div>` : ''}

    <div class="grid2">
      <section class="card"><div class="card-h"><h2>Gmail 연결 방법</h2></div><div class="card-b"><ol class="steps">
        <li>Google Cloud Console에서 프로젝트를 만들고 <b>Gmail API</b>를 사용 설정해요.</li>
        <li>OAuth 동의 화면을 "외부·테스트"로 만들고, 내 계정을 테스트 사용자로 추가해요.</li>
        <li>사용자 인증 정보 → OAuth 클라이언트 ID → <b>웹 애플리케이션</b>을 만들어요.</li>
        <li>승인된 JavaScript 원본에 <code>${esc(location.origin)}</code>를 넣어요.</li>
        <li>범위는 <code>gmail.readonly</code> 하나만 써요. 발급된 클라이언트 ID를 위에 붙여 넣어요.</li>
      </ol></div></section>
      <section class="card"><div class="card-h"><h2>Outlook 연결 방법</h2></div><div class="card-b"><ol class="steps">
        <li>Microsoft Entra 관리 센터 → 앱 등록 → 새 등록을 눌러요.</li>
        <li>플랫폼을 <b>단일 페이지 애플리케이션(SPA)</b>으로, 리디렉션 URI에 위 주소를 넣어요.</li>
        <li>API 권한에 Microsoft Graph의 <code>Mail.Read</code>, <code>User.Read</code>(위임됨)를 추가해요.</li>
        <li>애플리케이션(클라이언트) ID를 위에 붙여 넣어요. 회사 계정은 관리자 동의가 필요할 수 있어요.</li>
      </ol></div></section>
    </div>
  </form>`;
}

// ───────── 렌더 / 라우팅
function route() {
  const r = (location.hash || '#summary').slice(1).split('?')[0];
  return ROUTES[r] ? r : 'summary';
}

function render() {
  const r = route();
  const views = { summary: viewSummary, inbox: viewInbox, digest: viewDigest, profile: viewProfile, connect: viewConnect };
  $('#view').innerHTML = views[r]();
  $('#crumb-here').textContent = ROUTES[r];
  document.title = `${ROUTES[r]} — 말끔`;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.route === r));
  const c = counts(classified());
  $('#nav-inbox').textContent = c.all ? String(c.pin + c.human) : '';
  $('#nav-digest').textContent = c.all ? String(c.archive + c.later) : '';
  const p = normalizeProfile(state.profile);
  const initial = (p.myName || '나').slice(0, 1);
  $('#me-avatar').textContent = initial;
  $('#top-avatar').textContent = initial;
  $('#me-name').textContent = p.myName || '이름 미설정';
  $('#me-account').textContent = state.cfg.provider === 'demo' ? `샘플 계정 · ${p.myEmail}` : (state.account || '로그인 필요');
  const demo = state.cfg.provider === 'demo';
  const persona = personaById(state.cfg.persona);
  $('#ws-mark').textContent = demo ? persona.profile.myName.slice(0, 1) : 'M';
  $('#ws-name').textContent = demo ? persona.label : '내 메일함';
  $('#ws-sub').textContent = demo ? `${persona.profile.myName} · 샘플 계정` : (state.account || PROVIDERS[state.cfg.provider].label);
  $('#ws-menu').innerHTML = `<p class="ws-cap">샘플 계정</p>${PERSONAS.map((x) => `
    <button class="ws-item ${demo && x.id === persona.id ? 'on' : ''}" type="button" role="menuitem" data-act="persona" data-p="${x.id}">
      <span class="ws-mark">${esc(x.profile.myName.slice(0, 1))}</span>
      <span class="ws-item-text"><b>${esc(x.label)}</b><small>${esc(x.profile.myName)} · ${esc(x.profile.myEmail)}</small></span>
      ${demo && x.id === persona.id ? '<i aria-hidden="true">✓</i>' : ''}
    </button>`).join('')}
    <p class="ws-cap">실제 메일함</p>
    <a class="ws-item ${demo ? '' : 'on'}" href="#connect" role="menuitem" data-act="ws-close"><span class="ws-mark">M</span><span class="ws-item-text"><b>Gmail · Outlook 연결</b><small>${demo ? '메일 연동 설정으로 이동' : esc(state.account || '로그인 필요')}</small></span></a>`;
  const chip = $('#source-chip');
  chip.textContent = state.cfg.provider === 'demo' ? '데모 데이터' : `${PROVIDERS[state.cfg.provider].label}${state.account ? ' 연결됨' : ''}`;
  chip.classList.toggle('live', state.cfg.provider !== 'demo' && !!state.account);
  $('#foot-status').textContent = state.cfg.provider === 'demo' ? '샘플 데이터 · 이 브라우저에 저장' : '읽기 전용 연결 · 설정은 이 브라우저에 저장';
}

function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${err ? 'err' : ''}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = 'toast'), 2600);
}

// ───────── 데이터 불러오기
async function load({ interactive = false } = {}) {
  if (state.cfg.provider !== 'demo' && !interactive && !hasToken(state.cfg.provider)) {
    state.mails = []; state.account = ''; render(); return;
  }
  state.loading = true; state.error = ''; render();
  try {
    const { account, mails } = await fetchMails(state.cfg);
    state.account = account;
    state.mails = mails;
    const p = normalizeProfile(state.profile);
    if (state.cfg.provider !== 'demo' && account && (!p.myEmail || PERSONAS.some((x) => x.profile.myEmail === p.myEmail))) {
      state.profile = { ...state.profile, myEmail: account };
      saveProfile();
      toast('메일 주소를 연결한 계정으로 바꿨어요. 업무 프로필도 채워 주세요.');
    }
    notifyPinned();
  } catch (e) {
    state.error = e.message || String(e);
  } finally {
    state.loading = false;
    render();
  }
}

function notifyPinned() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let seen;
  try { seen = new Set(JSON.parse(sessionStorage.getItem(KEY + 'notified') || '[]')); } catch { seen = new Set(); }
  const fresh = classified().filter((m) => bucketOf(m.result.leaf) === 'pin' && !seen.has(m.id));
  if (!fresh.length) return;
  new Notification(`지금 처리할 메일 ${fresh.length}건`, { body: fresh.map((m) => m.subject).slice(0, 3).join('\n') });
  fresh.forEach((m) => seen.add(m.id));
  try { sessionStorage.setItem(KEY + 'notified', JSON.stringify([...seen])); } catch {}
}

// ───────── 회신 초안 모달 (발송은 사용자가 메일 앱에서 직접)
function openReply(id) {
  const m = state.mails.find((x) => x.id === id);
  if (!m) return;
  const d = replyDraft(m, state.profile);
  const box = $('#modal-box');
  box.innerHTML = `
    <h2>오발송 회신 초안</h2>
    <p style="margin:0;color:var(--ink-2)">받는 사람 <span class="mono">${esc(d.to)}</span> · 제목 <b>${esc(d.subject)}</b></p>
    <div class="field"><label for="draft">내용 (수정 가능)</label><textarea id="draft">${esc(d.body)}</textarea></div>
    <div class="note">말끔은 메일을 보내지 않아요. 복사하거나 메일 앱에서 열어 직접 보내세요.</div>
    <div class="btns">
      <button class="btn primary" type="button" data-m="copy">복사</button>
      <a class="btn" id="mailto" href="#">메일 앱에서 열기</a>
      <button class="btn ghost" value="close">닫기</button>
    </div>`;
  const sync = () => { $('#mailto').href = `mailto:${encodeURIComponent(d.to)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent($('#draft').value)}`; };
  sync();
  $('#draft').addEventListener('input', sync);
  box.querySelector('[data-m="copy"]').onclick = async () => {
    try { await navigator.clipboard.writeText($('#draft').value); toast('초안을 복사했어요.'); } catch { toast('복사하지 못했어요. 직접 선택해 복사해 주세요.', true); }
  };
  $('#modal').showModal();
}

// ───────── 이벤트
function setOverride(id, leaf) {
  const m = state.mails.find((x) => x.id === id);
  if (!m?.from?.email) return;
  state.overrides = { ...state.overrides, [m.from.email.toLowerCase()]: leaf };
  saveOverrides();
  toast(`${m.from.name || m.from.email} 메일은 이제 "${leafTitle(leaf)}"로 분류해요.`);
  render();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act], [data-filter]');
  if (!t) return;
  if (t.dataset.filter) { state.filter = t.dataset.filter; return; } // 링크 이동은 그대로
  const act = t.dataset.act;
  if (act === 'reload') load({ interactive: true });
  else if (act === 'filter') { state.filter = t.dataset.f; render(); }
  else if (act === 'reply') openReply(t.dataset.id);
  else if (act === 'rescue') {
    const m = classified().find((x) => x.id === t.dataset.id);
    if (m) setOverride(m.id, HUMAN_SIBLING[m.result.leaf] || 'mine_later_me');
  } else if (act === 'unrule') {
    const o = { ...state.overrides }; delete o[t.dataset.email];
    state.overrides = o; saveOverrides(); render();
  } else if (act === 'sample-profile') {
    state.profile = defaultProfile(); saveProfile(); render(); toast('샘플 계정의 기본 프로필로 되돌렸어요.');
  } else if (act === 'notify') {
    Notification.requestPermission().then((p) => { if (p === 'granted') { toast('알림을 켰어요.'); notifyPinned(); } render(); });
  } else if (act === 'copy-uri') {
    navigator.clipboard.writeText($('#redir').textContent).then(() => toast('주소를 복사했어요.'), () => toast('복사하지 못했어요.', true));
  } else if (act === 'persona') {
    toggleWs(false);
    disconnect(); state.account = ''; state.mails = []; state.error = ''; state.filter = 'all'; state.q = '';
    state.cfg = { ...state.cfg, provider: 'demo', persona: t.dataset.p }; store.set('cfg', state.cfg);
    loadScoped();
    toast(`샘플 계정 "${personaById(t.dataset.p).label}"으로 바꿨어요.`); load();
  } else if (act === 'ws-close') {
    toggleWs(false);
  } else if (act === 'disconnect') {
    disconnect(); state.account = ''; state.mails = []; state.error = '';
    state.cfg = { ...state.cfg, provider: 'demo' }; store.set('cfg', state.cfg);
    loadScoped();
    toast('연결을 해제하고 샘플 계정으로 돌아왔어요.'); load();
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches('select.fix')) setOverride(t.dataset.id, t.value);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.act === 'search' && !e.isComposing) {
    state.q = t.value;
    $('#inbox-list').innerHTML = inboxListHtml(classified());
  }
  const err = t.name && document.getElementById(`e-${t.name}`);
  if (err) err.textContent = '';
});

document.addEventListener('compositionend', (e) => {
  if (e.target.dataset?.act === 'search') {
    state.q = e.target.value;
    $('#inbox-list').innerHTML = inboxListHtml(classified());
  }
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.id === 'profile-form') {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    const errs = {};
    if (!data.myName.trim()) errs.myName = '이름을 입력해 주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.myEmail.trim())) errs.myEmail = '메일 주소 형식을 확인해 주세요.';
    if (showErrors(errs)) return;
    state.profile = normalizeProfile(data);
    saveProfile();
    toast('저장했어요. 새 프로필로 다시 분류했어요.');
    render();
  }
  if (f.id === 'connect-form') {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    const errs = {};
    if (data.provider === 'gmail' && !data.googleClientId.trim()) errs.googleClientId = 'Gmail을 쓰려면 클라이언트 ID가 필요해요.';
    if (data.provider === 'outlook' && !data.msClientId.trim()) errs.msClientId = 'Outlook을 쓰려면 클라이언트 ID가 필요해요.';
    const n = Number(data.maxMails);
    if (!(n >= 10 && n <= 100)) errs.maxMails = '10~100 사이로 입력해 주세요.';
    if (showErrors(errs)) return;
    const changed = data.provider !== state.cfg.provider;
    if (changed) { state.mails = []; state.account = ''; }
    state.cfg = { ...state.cfg, provider: data.provider, googleClientId: data.googleClientId.trim(), msClientId: data.msClientId.trim(), msTenant: data.msTenant.trim() || 'common', maxMails: n };
    store.set('cfg', state.cfg);
    if (changed) loadScoped();
    load({ interactive: true });
  }
});

function showErrors(errs) {
  document.querySelectorAll('.err').forEach((x) => (x.textContent = ''));
  const keys = Object.keys(errs);
  keys.forEach((k) => { const el = document.getElementById(`e-${k}`); if (el) el.textContent = errs[k]; });
  if (keys.length) document.querySelector(`[name="${keys[0]}"]`)?.focus();
  return keys.length > 0;
}

// 모바일 사이드바
const side = $('#side'), scrim = $('#scrim');
const closeSide = () => { side.classList.remove('open'); scrim.classList.remove('open'); };
$('#burger').onclick = () => { side.classList.add('open'); scrim.classList.add('open'); };
scrim.onclick = closeSide;
side.addEventListener('click', (e) => { if (e.target.closest('a')) closeSide(); });

// 워크스페이스(샘플 계정) 메뉴
const wsBtn = $('#ws'), wsMenu = $('#ws-menu');
function toggleWs(open = wsMenu.hidden) {
  wsMenu.hidden = !open;
  wsBtn.setAttribute('aria-expanded', String(open));
}
wsBtn.onclick = (e) => { e.stopPropagation(); toggleWs(); };
document.addEventListener('click', (e) => { if (!wsMenu.hidden && !e.target.closest('.ws-wrap')) toggleWs(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !wsMenu.hidden) { toggleWs(false); wsBtn.focus(); } });

$('#foot-close').onclick = () => { $('#foot').classList.add('hide'); store.set('footHidden', true); };
if (store.get('footHidden', false)) $('#foot').classList.add('hide');

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// ───────── 시작
(async function start() {
  render();
  if (state.cfg.provider === 'outlook') {
    try { await handleOutlookRedirect(state.cfg); } catch (e) { state.error = e.message; }
  }
  load();
})();
