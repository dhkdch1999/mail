// 메일 연동: 데모 / Gmail API / Microsoft Graph(Outlook). 모두 읽기 전용.
// 토큰은 sessionStorage 에만 두고(탭을 닫으면 사라짐), 메일 본문은 메모리에서만 다룬다.
import { sampleMails, personaById } from './sample.js?v=20261105-0924';

const SS = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  del: (k) => { try { sessionStorage.removeItem(k); } catch {} },
};

export const PROVIDERS = {
  demo: { label: '데모 데이터', scope: '없음 (샘플 메일)' },
  gmail: { label: 'Gmail', scope: 'gmail.readonly (읽기 전용)' },
  outlook: { label: 'Outlook (Microsoft 365)', scope: 'Mail.Read, User.Read (읽기 전용)' },
};

export function redirectUri() {
  return location.origin + location.pathname;
}

// "홍길동 <a@b.com>, c@d.com" → [{name,email}]
function parseAddrList(v) {
  if (!v) return [];
  return v.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((s) => {
    const m = s.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
    if (m) return { name: m[1].trim(), email: m[2].trim() };
    return { name: '', email: s.trim() };
  }).filter((a) => a.email);
}

// ───────── Gmail (Google Identity Services 토큰 방식)
let gsiLoaded;
function loadGsi() {
  gsiLoaded ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = res; s.onerror = () => rej(new Error('Google 로그인 스크립트를 불러오지 못했어요'));
    document.head.appendChild(s);
  });
  return gsiLoaded;
}

async function gmailToken(clientId) {
  const cached = JSON.parse(SS.get('gmail_token') || 'null');
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
  await loadGsi();
  return new Promise((res, rej) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      callback: (r) => {
        if (r.error) return rej(new Error(`Google 인증 실패: ${r.error}`));
        SS.set('gmail_token', JSON.stringify({ token: r.access_token, exp: Date.now() + r.expires_in * 1000 }));
        res(r.access_token);
      },
      error_callback: (e) => rej(new Error(`Google 인증 창이 닫혔어요 (${e.type || 'error'})`)),
    });
    client.requestAccessToken();
  });
}

async function gmailFetch(clientId, max) {
  const token = await gmailToken(clientId);
  const api = (path) => fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (r) => { if (!r.ok) throw new Error(`Gmail API 오류 ${r.status}`); return r.json(); });
  const me = await api('profile');
  const list = await api(`messages?maxResults=${max}&labelIds=INBOX`);
  const heads = ['From', 'To', 'Cc', 'Subject', 'Date'].map((h) => `metadataHeaders=${h}`).join('&');
  const msgs = await Promise.all((list.messages || []).map((m) => api(`messages/${m.id}?format=metadata&${heads}`)));
  const mails = msgs.map((m) => {
    const h = Object.fromEntries((m.payload?.headers || []).map((x) => [x.name.toLowerCase(), x.value]));
    return {
      id: m.id,
      from: parseAddrList(h.from)[0] || { name: '', email: '' },
      to: parseAddrList(h.to),
      cc: parseAddrList(h.cc),
      subject: h.subject || '(제목 없음)',
      body: decodeEntities(m.snippet || ''),
      date: new Date(Number(m.internalDate)).toISOString(),
      link: `https://mail.google.com/mail/u/0/#inbox/${m.id}`,
    };
  });
  return { account: me.emailAddress, mails };
}

function decodeEntities(s) {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

// ───────── Outlook (Microsoft identity platform, Authorization Code + PKCE)
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomStr = (n = 48) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const MS_SCOPE = 'openid profile offline_access User.Read Mail.Read';
const msBase = (tenant) => `https://login.microsoftonline.com/${tenant || 'common'}/oauth2/v2.0`;

async function outlookLogin(clientId, tenant) {
  const verifier = randomStr();
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomStr(16);
  SS.set('ms_pkce', JSON.stringify({ verifier, state }));
  const q = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: redirectUri(), response_mode: 'query',
    scope: MS_SCOPE, code_challenge: challenge, code_challenge_method: 'S256', state, prompt: 'select_account',
  });
  location.assign(`${msBase(tenant)}/authorize?${q}`);
  return new Promise(() => {}); // 페이지가 이동한다
}

// 로그인 후 돌아왔을 때 ?code= 를 토큰으로 교환. 처리했으면 true
export async function handleOutlookRedirect(cfg) {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (!code && !err) return false;
  history.replaceState(null, '', redirectUri() + (location.hash || '#connect'));
  if (err) throw new Error(`Microsoft 인증 실패: ${err}`);
  const pkce = JSON.parse(SS.get('ms_pkce') || 'null');
  SS.del('ms_pkce');
  if (!pkce || pkce.state !== url.searchParams.get('state')) throw new Error('로그인 상태 값이 맞지 않아요. 다시 연결해 주세요.');
  const r = await fetch(`${msBase(cfg.msTenant)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.msClientId, grant_type: 'authorization_code', code,
      redirect_uri: redirectUri(), code_verifier: pkce.verifier, scope: MS_SCOPE,
    }),
  });
  const t = await r.json();
  if (!r.ok) throw new Error(`토큰 교환 실패: ${t.error_description || t.error || r.status}`);
  SS.set('ms_token', JSON.stringify({ token: t.access_token, exp: Date.now() + t.expires_in * 1000 }));
  return true;
}

async function outlookFetch(cfg, max) {
  const cached = JSON.parse(SS.get('ms_token') || 'null');
  if (!cached || cached.exp < Date.now() + 60000) return outlookLogin(cfg.msClientId, cfg.msTenant);
  const api = (path) => fetch(`https://graph.microsoft.com/v1.0/${path}`, { headers: { Authorization: `Bearer ${cached.token}` } })
    .then(async (r) => {
      if (r.status === 401) { SS.del('ms_token'); throw new Error('Outlook 로그인이 만료됐어요. 다시 연결해 주세요.'); }
      if (!r.ok) throw new Error(`Graph API 오류 ${r.status}`);
      return r.json();
    });
  const me = await api('me?$select=mail,userPrincipalName');
  const sel = 'subject,from,toRecipients,ccRecipients,bodyPreview,receivedDateTime,webLink';
  const list = await api(`me/mailFolders/inbox/messages?$top=${max}&$select=${sel}&$orderby=receivedDateTime desc`);
  const addr = (r) => ({ name: r?.emailAddress?.name || '', email: r?.emailAddress?.address || '' });
  const mails = (list.value || []).map((m) => ({
    id: m.id,
    from: addr(m.from),
    to: (m.toRecipients || []).map(addr),
    cc: (m.ccRecipients || []).map(addr),
    subject: m.subject || '(제목 없음)',
    body: m.bodyPreview || '',
    date: m.receivedDateTime,
    link: m.webLink,
  }));
  return { account: me.mail || me.userPrincipalName, mails };
}

// ───────── 공통 진입점
export async function fetchMails(cfg) {
  const max = Number(cfg.maxMails) || 50;
  if (cfg.provider === 'gmail') {
    if (!cfg.googleClientId) throw new Error('Google OAuth 클라이언트 ID를 먼저 입력해 주세요.');
    return gmailFetch(cfg.googleClientId, max);
  }
  if (cfg.provider === 'outlook') {
    if (!cfg.msClientId) throw new Error('Microsoft 애플리케이션(클라이언트) ID를 먼저 입력해 주세요.');
    return outlookFetch(cfg, max);
  }
  const persona = personaById(cfg.persona);
  return { account: persona.profile.myEmail, mails: sampleMails(new Date(), persona.id) };
}

// 로그인 창 없이 바로 불러올 수 있는지(유효한 토큰이 있는지)
export function hasToken(provider) {
  const key = provider === 'gmail' ? 'gmail_token' : provider === 'outlook' ? 'ms_token' : null;
  if (!key) return true;
  const t = JSON.parse(SS.get(key) || 'null');
  return !!(t && t.exp > Date.now() + 60000);
}

export function disconnect() {
  const g = JSON.parse(SS.get('gmail_token') || 'null');
  if (g && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(g.token, () => {});
  SS.del('gmail_token'); SS.del('ms_token'); SS.del('ms_pkce');
}
