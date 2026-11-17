// 닉네임: 입장할 때 직접 정한다. 비워 두면 편한 닉네임 하나를 추천해 쓴다.
// 실명·연락처를 받지 않으며 위치 조회도 하지 않는다. 이 브라우저(localStorage)에만 저장한다.

/** 닉네임 최대 글자 수(이름표가 넘치지 않게) */
export const NICKNAME_MAX = 12;

/** 추천·NPC 독자용 편한 닉네임 */
const CASUAL_NICKS = [
  '책벌레', '밑줄장인', '새벽독자', '느린산책', '커피한잔', '오후세시', '책갈피', '고양이손',
  '창가자리', '빗소리', '소설파', '시읽는밤', '연필깎이', '포스트잇', '반쯤읽음', '첫문장',
  '마지막장', '종이냄새', '조용한독자', '여행자', '산책러', '메모광', '꿈꾸는곰', '보리차',
  '라떼한잔', '귤껍질', '노을빛', '별헤는밤', '책등수집가', '한페이지', '두번째장', '낮잠러',
  '책탑쌓기', '도토리', '구름한점', '나뭇잎', '초록책상', '잉크방울', '오늘도읽음', '책방나들이',
] as const;

function pick<T>(list: readonly T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length) % list.length]!;
}

/** 편한 닉네임 하나 뽑기 */
export function randomNickname(rand: () => number = Math.random): string {
  return pick(CASUAL_NICKS, rand);
}

/** 입력한 닉네임 정리: 제어문자·꺾쇠 제거, 공백 하나로, 최대 글자 수. 비면 '' */
export function cleanNickname(raw: string): string {
  const s = raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...s].slice(0, NICKNAME_MAX).join('').trim();
}

/** 다른 사람과 겹칠 때 이 탭에서만 붙이는 번호. 예: "책벌레" → "책벌레 2" */
export function withSuffix(nick: string, rand: () => number = Math.random): string {
  const base = [...nick.replace(/ \d{1,2}$/, '')].slice(0, NICKNAME_MAX - 3).join('');
  return `${base} ${2 + Math.floor(rand() * 98)}`;
}
