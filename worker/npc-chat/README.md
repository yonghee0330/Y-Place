# Y-Place NPC 대화 서버 (Cloudflare Worker)

브라우저 → 이 Worker → Claude API. API 키는 Worker 비밀값에만 두고, 대화 내용은 저장·기록하지 않는다.

- 받는 곳: `POST /chat` `{ npc, messages: [{ role, content }], context? }` → `{ reply }`
  - `context`(선택): 지금 방·접속자 수·날씨·시간대·내 닉네임·앉은 자리·읽는 책 제목·책 펼친 사람 목록. 닉네임·공개 제목만. 형식이 틀려도 대화는 되고 맥락만 무시한다.
- 막는 것: 허용 주소(`ALLOWED_ORIGINS`) 밖의 요청, 한 번에 12턴·한 마디 300자·합계 3000자 초과, 같은 IP 10분 20회 초과(인스턴스별 대략치)
- 모델: `NPC_MODEL`(기본 `claude-haiku-5-5`), 생각 노력 `NPC_EFFORT`(기본 `high`). 2026-11-17 운영자 결정으로 Opus 5.5 → Haiku 5.5. Haiku에는 서버 측 대체 모델이 없어, 다른 모델로 바꿀 때만 `fallbacks: "default"`를 켭니다.
- NPC 성격·공간 지식: `src/personas.ts` (클라이언트는 NPC id만 보냄). NPC 6명: `barista`·`researcher`(로비), `bookseller`(책방 실험실), `curator`(서재), `host`(작은 모임방, 모임 기획자), `docent`(전시실). 새 NPC는 이 파일과 `src/avatar/talkNpc.ts`·`src/net/npcChat.ts`·`src/ui/npcChatSheet.ts`에 함께 추가한다.

## 처음 설정(운영자가 직접)

1. Cloudflare 무료 계정을 만든다.
2. Anthropic Console에서 이 용도 전용 API 키를 만들고, **월 사용 한도(spend limit)** 를 정해 둔다.
3. 이 폴더에서:
   ```bash
   npm install
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # 키는 터미널에만 붙여 넣는다
   npx wrangler deploy                          # https://y-place-npc-chat.<계정>.workers.dev
   ```
4. GitHub 저장소 Settings → Secrets and variables → Actions → **Variables**에 `VITE_NPC_CHAT_URL` = 위 주소(끝에 `/chat` 없이)를 넣고, Actions에서 배포를 다시 돌린다.

키나 주소를 코드·README·대화에 적지 않는다.

## 무료 한도·비용 (확인일 2026-11-17)

- Cloudflare Workers Free: 하루 10만 요청, 요청당 CPU 10ms, Claude 응답을 기다리는 시간은 CPU에 안 들어감. 출처: https://developers.cloudflare.com/workers/platform/limits/
- Claude API는 유료(종량제). Haiku 5.5 입력 $0.10 / 출력 $0.50 (100만 토큰당, 2026-11 가격표). 대화 한 번(입력 약 1.5천 + 출력·생각 약 300토큰)에 약 $0.0003으로 추정(실측 전). 참고: Opus 5.5는 $4/$20으로 약 40배, Sonnet 5.5는 $2/$10.

## 시험

```bash
npm run typecheck
npx wrangler dev   # 키 없이 띄우면 /chat 은 503 not_configured
```
프런트 쪽 시험은 저장소 루트의 `node scripts/capture-npc-chat.mjs local`(AI 없이) 또는 인자 없이(설정된 서버로).
