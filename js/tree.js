// MECE 로직 트리 정의. auto=true 인 리프는 앱이 자동 처리(빨간색), false 는 사람 판단.
export const TREE = {
  id: 'root',
  label: '과도한 메일',
  children: [
    {
      id: 'normal', label: '정상 수신 메일', children: [
        {
          id: 'work', label: '업무 메일', children: [
            {
              id: 'aware', label: '업무 파악용 (내 담당 아님)', children: [
                { id: 'aware_backup', label: '담당자 부재 시 내가 백업할 일', auto: false },
                { id: 'aware_skip', label: '백업하지 않아도 되는 일', auto: true, action: 'archive' },
              ]
            },
            {
              id: 'mine', label: '내가 맡은 업무', children: [
                { id: 'mine_urgent_me', label: '급하고 내가 꼭 해야 할 일', auto: true, action: 'pin' },
                { id: 'mine_urgent_other', label: '급한데 남이 할 수도 있는 일', auto: false },
                { id: 'mine_later_me', label: '안 급한데 내가 꼭 해야 할 일', auto: false },
                { id: 'mine_later_other', label: '안 급하고 남이 할 수도 있는 일', auto: true, action: 'later' },
              ]
            },
            {
              id: 'team', label: '연관 팀 전체 참조', children: [
                { id: 'team_related', label: '나와 연관 있는 일', auto: false },
                { id: 'team_unrelated', label: '나와 연관 없는 일', auto: true, action: 'archive' },
              ]
            },
          ]
        },
        {
          id: 'nonwork', label: '비업무 메일', children: [
            {
              id: 'promo', label: '홍보 메일', children: [
                {
                  id: 'promo_in', label: '사내 홍보', children: [
                    { id: 'promo_in_like', label: '관심 있는 일', auto: false },
                    { id: 'promo_in_skip', label: '관심 없는 일', auto: true, action: 'archive' },
                  ]
                },
                {
                  id: 'promo_out', label: '외부 홍보', children: [
                    { id: 'promo_out_like', label: '관심 있는 일', auto: false },
                    { id: 'promo_out_skip', label: '관심 없는 일', auto: true, action: 'archive' },
                  ]
                },
              ]
            },
            {
              id: 'study', label: '스터디 메일', children: [
                {
                  id: 'study_job', label: '직무 관련', children: [
                    { id: 'study_job_mine', label: '내 직무 스터디', auto: false },
                    { id: 'study_job_other', label: '내 직무가 아닌 스터디', auto: true, action: 'archive' },
                  ]
                },
                {
                  id: 'study_ind', label: '산업 관련', children: [
                    { id: 'study_ind_in', label: '사내 이슈 리포트', auto: false },
                    { id: 'study_ind_out', label: '사외 이슈 리포트', auto: false },
                  ]
                },
                { id: 'study_lang', label: '언어 관련 (영어·중국어·일본어·독어·불어·기타)', auto: false },
              ]
            },
          ]
        },
      ]
    },
    {
      id: 'wrong', label: '오발송 메일', children: [
        {
          id: 'wrong_notify', label: '알려야 하는 메일', children: [
            { id: 'wrong_notify_body', label: '열어봐야 알 수 있음', auto: false },
            { id: 'wrong_notify_title', label: '제목만 봐도 알 수 있음', auto: true, action: 'reply' },
          ]
        },
        {
          id: 'wrong_quiet', label: '굳이 안 알려도 되는 메일', children: [
            { id: 'wrong_quiet_body', label: '열어봐야 알 수 있음', auto: false },
            { id: 'wrong_quiet_title', label: '제목만 봐도 알 수 있음', auto: true, action: 'archive' },
          ]
        },
      ]
    },
  ],
};

export const ACTION_LABEL = {
  pin: '상단 고정·알림',
  later: '후순위',
  archive: '자동 보관',
  reply: '회신 초안',
};

// 리프 id → { leaf, path:[라벨...] }
export const LEAVES = {};
(function walk(node, path) {
  const p = node.id === 'root' ? [] : [...path, node.label];
  if (!node.children) { LEAVES[node.id] = { ...node, path: p }; return; }
  node.children.forEach((c) => walk(c, p));
})(TREE, []);

export function leafTitle(id) {
  const l = LEAVES[id];
  if (!l) return id;
  const parent = l.path[l.path.length - 2];
  return parent ? `${parent} · ${l.label}` : l.label;
}
