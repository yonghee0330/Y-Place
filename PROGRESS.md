# 용서점 진행 기록

## 1단계 — 정리·골격 (2026-11-06)
- 별도 저장소 생성, 원본과 계정·환경 설정 분리. shop/circle 두 방과 8/6명 정원.
- 행사 포스터, 영화 UI, 고양이, 기존 공간 레이아웃·빌더 제거. 기능별 typecheck 통과.
- typecheck/build 성공. Playwright 캡처 01-shop / 01-circle 직접 열어 확인. 콘솔 오류 0.
- 첫 모임방 고정 캡처의 벽 가림은 방 내부 좌표로 재촬영해 해결.
- 가구, 문 클릭 왕복·앉기 e2e, 모바일, 배포는 다음 단계에서 검증.

## 2단계 — 모임방
- roundTable 필드/applyLayout/콜라이더/빌더/조립 연결. 지름 1.3m 베벨 상판, 테이퍼 다리, 찻잔·화병·책.
- 72° 간격 5석과 각각의 클릭 상자, 바깥쪽 접근점. 실제 마우스 클릭→이동→착석 5/5 통과, 중앙 시선 내적 > .99.
- typecheck/build 통과, 02-circle 및 02-circle-seated 이미지를 직접 열어 확인. 콘솔 오류 0.
- 운영자 사진에 더 가까운 재질·벽 색조와 작은 책장 시야는 3단계 공통 디자인에서 다듬음.

## 3단계 — 용서점과 사진 기반 재질
- 합판 서가·철제 벽 선반·중앙 매대·계산대·스툴·벤치·창가 안락의자 2석·사이드 테이블 구현.
- 크림색 벽, 낮은 베벨 걸레받이, 판재 바닥, 주름 조명, 사진 간판과 동심원 패브릭의 절차 재구성.
- typecheck/build 성공. 03-shop/03-counter/03-circle을 직접 열어 진열·가구·간판 확인. 콘솔 오류 0.
- navigation.ts: 두 공간 총 10석의 접근점과 스폰·좌석 사이 모든 경로, 좌석당 단일 클릭 상자 통과.
- 서점 클릭 e2e에서 창가 2석·스툴은 확인. SwiftShader 시간 제한으로 벤치까지 한 번에 끝내는 검증은 4단계에서 계속.

## 4단계 — 연결·생활감
- 문 클릭 확인창을 통한 shop↔circle 왕복, 만석인 모임방에서 서점 복귀 통과.
- 서점 5석과 모임방 5석 모두 실제 클릭 착석 확인. BroadcastChannel 정원 8/6명, 초과 거절, 퇴장 후 재입장 검사 통과.
- 시작 화면 교체, 키 없는 예시 책 선택·직접 입력, 기본 합성 음악, 운영자 코드 환경변수 분리. 이전 포스터·설정·시작 이미지·위치 조회 제거.
- 420px 터치 에뮬레이션에서 시작→입장→앉기→책 선택→소리 켜기 통과. AudioContext running 확인. visualViewport 축소 시 시트 위치 및 입력 16px 확인.
- 벽 앞 카메라가 머리 안으로 파고드는 문제: 여유 방향 탐색과 시야 조정, 아주 가까울 때 내 아바타만 숨기는 처리. 디버그 카메라 변경 후 행렬을 즉시 갱신해 클릭 좌표 검사 경쟁 상태 수정.
- typecheck/build 통과. 04-shop/counter/circle, 모바일 시작·독서·시트 캡처 직접 확인. SwiftShader 캡처 콘솔 오류 0. e2e는 macOS Metal로 실행.
- 실제 iOS 키보드·스피커·외부 클라우드 연동은 미확인. 개인 계정 yonghee0330에 새 저장소 생성 완료, push/Pages 확인은 5단계.

## 5단계 — 마무리
- README에 실행·검사·선택 설정·배포 방법과 가정·미검증 범위 기록. 개인 계정 yonghee0330/yongseojeom 전용 저장소와 Pages Actions 설정 완료.
- 최종 typecheck/build, 좌석 경로 검사, 8/6명 정원 검사 통과. e2e 5/5 통과(58초), 총 10석 실제 클릭 착석·문 왕복 2회·420px 생활 흐름·만석 복귀 확인.
- 런타임/소스/서버/테스트/빌드 설정에서 이전 상표·URL·금지 문구 검색 결과 0건. 임시 스크립트는 저장소에 없음.
- 05-* 최종 스크린샷 직접 열어 확인, REVIEW 갱신. 실제 iOS·청음·외부 클라우드는 미확인으로 유지.
- 이 커밋을 main에 푸시하고 Pages Actions와 실제 공개 주소를 이어서 검증한다.

### 배포 인증 대기
- GitHub Pages 소스는 workflow로 설정했으나, 최초 `git push -u origin main`이 GitHub에서 거절됨: 현재 Personal Access Token에 `workflow` scope가 없어 `.github/workflows/deploy.yml` 업로드 불가.
- SSH 에이전트에도 등록된 인증이 없음. 개인 계정 Git 인증 갱신을 요청함. 공개 사이트와 Actions 성공은 아직 확인하지 못했으며 배포 완료로 보고하지 않음.
- 로컬 소스·5단계 커밋·최종 빌드·스크린샷은 준비 완료. 인증 갱신 후 main 푸시 → Actions 성공 → 공개 주소 입장 검사 순으로 재개한다.

### 2026-11-07 — 개인 GitHub Pages 공개 배포
- 기존 토큰에 `workflow` 권한이 없어 main 푸시는 다시 거절됨. 사용자가 배포 진행을 요청하여 빌드 결과만 별도 `pages` 브랜치에 푸시하고 Pages Source를 해당 브랜치로 전환.
- GitHub Pages 빌드 상태 `built`, https://yonghee0330.github.io/yongseojeom/ HTTP 200 확인.
- 공개 주소의 420px Chromium에서 시작→서점 입장→모임방 전환 통과, pageerror/console error 0.
- 소스 `main`은 로컬 커밋으로 남아 있으며 GitHub에는 아직 푸시되지 않음. Pages Actions 방식은 사용하지 못했고 현재 배포는 브랜치 기반이다.

### 2026-11-07 — Y-Place로 이름 변경
- 화면 제목·입장 버튼·상단 방 이름·문 이름판·벽 간판·운영자 표기·웹 앱 이름을 Y-Place로 변경.
- 카운터 앞 글씨판과 게시판의 모델·저장소·UI·클릭 동작 제거. 기존 책 선택·좌석·두 방 이동 유지.
- typecheck/build 및 e2e 5/5 통과. 06-y-place-entry/sign 화면을 직접 확인하고 콘솔 오류 0.

### 2026-11-10 — 소스 GitHub 백업
- 토큰에 `workflow` 권한이 생겨 로컬에만 있던 `main`(커밋 8개, `.github/workflows/deploy.yml` 포함)을 `origin/main`에 푸시. 푸시 전 main 전체 기록에서 비밀값 패턴 검색 0건.
- 18MB 팩(스크린샷 PNG)으로 첫 푸시가 HTTP 400으로 끊겨 `http.postBuffer`를 늘려 재시도해 성공.
- 푸시로 Actions "Deploy to GitHub Pages" 실행: build·deploy 성공. Pages 설정은 여전히 `pages` 브랜치(legacy) 방식이며 공개 주소 HTTP 200, 제목 Y-Place 확인.
- 배포 방식을 Actions 하나로 통일할지(Settings → Pages → Source)는 운영자 확인 대기.

### 2026-11-10 — 배포를 GitHub Actions로 통일
- 운영자 승인으로 Pages Source를 `pages` 브랜치(legacy)에서 GitHub Actions(workflow)로 전환.
- Actions 수동 실행(f4f8207) build·deploy 성공, github-pages 배포 상태 success.
- 공개 주소 Chromium 확인: 제목 Y-Place, 캔버스·입장 버튼 표시, pageerror/console error 0.
- `pages` 브랜치는 사이트에 쓰이지 않지만 삭제하지 않고 보존. README 배포 설명 갱신.

### 2026-11-10 — 저장소·폴더 이름을 Y-Place로 변경
- 운영자 요청으로 GitHub 저장소 `yonghee0330/yongseojeom` → `yonghee0330/Y-Place`, 로컬 폴더 `/Users/mac/코덱스-AI실험실/yongseojeom` → `/Users/mac/코덱스-AI실험실/Y-Place`.
- 공개 주소가 https://yonghee0330.github.io/Y-Place/ 로 바뀜. GitHub은 Pages 옛 주소(/yongseojeom/)를 연결해 주지 않음.
- README 링크와 경로 주석만 갱신. 내부 식별자(`yongseojeom.*` 저장 키, presence 채널, 테스트용 `__YONGSEOJEOM`)는 방문자 저장값 보존을 위해 유지.

### 2026-11-10 — 슬림 미니미 아바타
- 운영자 요청으로 아바타를 비북스-M(둥근 종 몸통, 0.9m)과 다른 "슬림하지만 작고 귀여운 미니미" 스타일로 교체: 키 약 1.1m, 약 3.5등신, 납작한 가는 몸통, 가는 팔다리, 동그란 손·신발.
- 팔꿈치·무릎 관절 추가(`foreL/R`, `shinL/R`). 걷기 무릎 굽힘, 앉으면 허벅지 수평·정강이 수직, 양손 책 들기, 잔을 입에 대기 포즈를 새 비율로 다시 맞춤. 잔은 팔 회전을 되돌려 늘 세워 둠.
- 운영자 앞치마·어깨끈·공구를 새 몸통 단면에 맞춰 다시 배치. 턱수염은 턱 면을 따르는 얇은 조각으로 변경.
- 이름표 높이(HEAD_TOP), 따라가기 카메라 높이, 읽기 모드 구도, 1인칭 숨김 기준(HEAD_Y)을 새 키에 맞춤.
- 캡처용 디버그 `setReading`·`debugLook`과 `scripts/capture-avatar.mjs` 추가.
- typecheck/build, 좌석 경로·정원 검사, e2e 5/5 통과. 07-avatar-* 캡처 직접 확인, 콘솔 오류 0.

### 2026-11-10 — 입장 직후 내 아바타가 숨겨지던 문제
- 입장 자리가 뒷벽에 붙어 카메라가 물러날 공간이 없었음. 서점 (0.1, 1.6)→(0.1, 1.05), 모임방 (-1.35, 1.45)→(-1.45, 0.95), (1.5, 1.5)→(1.45, 0.95).
- 디버그 `meVisible`과 `scripts/capture-entry.mjs`(두 방 × 데스크톱·모바일 입장 시점) 추가. 4개 화면 모두 아바타 보임, 콘솔 오류 0.
- typecheck/build, 좌석 경로·정원 검사, e2e 5/5 통과.

### 2026-11-14 — 라운지 재구성 + 1인 작업실 4개
- 운영자 요청: 개별 작업 공간 4개, 모임방은 미니 공간으로 유지, 홀은 쉬어 가는 공간(안마 의자 2개·커피 공간).
- `layout.ts`: SpaceId에 `work1`~`work4` 추가(정원 1). `shop`은 id를 유지한 채 라운지로 재배치. 새 필드 `massageChairs`·`coffeeBar`·`cafeTable`·`workDesk`, 포털 `signW`(나란한 문 간판 폭).
- 새 소품(모두 절차 생성): `props/massage.ts`(안마 의자), `props/coffee.ts`(커피 코너·메뉴판·카페 테이블), `props/workroom.ts`(서랍 책상·스탠드·노트북·메모판·선반, 방마다 시드로 변화). 재질 `massageShell/Leather/Dark`, `steel`, `beanJar`, `screen` 추가.
- 소파 등받이·안마 의자 등받이·커피 카운터·책상에 충돌 상자 추가. 작업실 입장 시 책상 의자에 자동 착석. 조명은 창 없는 방(모임방·작업실) 공통 분위기.
- 입장 자리를 뒷벽에서 1.2m 떼고 소파를 앞으로 당겨 데스크톱 입장 시 아바타가 보이게 함(처음엔 숨겨져서 수정).
- 검사: typecheck/build, `test:layout`(6개 공간 좌석 접근·경로), `test:presence`(정원 8·6·1), e2e 6/6(작업실 자동 착석·1명 제한·라운지 복귀 테스트 추가). 캡처 `09-*`·`10-entry-*` 직접 확인, 콘솔 오류 0.
- Supabase: 이 저장소는 Actions 시크릿이 없어 공개 사이트가 같은 브라우저 탭끼리만 보이는 Local 모드로 돈다. 비북스-M의 "경로 한 번 보내기" 동기화는 아직 옮기지 않았다(Supabase를 붙일 때 함께 옮길 것).

### 2026-11-14 — 개인 작업실 문 하나 + 작업실 집중 기능
- 라운지 문 4개 → **"개인 작업실" 문 하나**. 누르면 작업실 1~4를 고르는 창(`room-pick-sheet`). 방 주인이 정해지면 `resolveWorkRoom()`에서 바로 분기.
- 새 모듈 `src/work/`: `workStore.ts`(기록·목표·주차장·믹서 설정, localStorage), `workPanel.ts`(앉기 의식·타이머·휴식·회고·딴생각·소리·기록·집중 모드), `soundMixer.ts`(Web Audio 합성 5종 + 종소리), `deskFx.ts`(탁상시계 진행 링·집중 팻말·스탠드 불빛·먼지·머그잔 김).
- 시간대 조명(`lighting.ts` `setDayPhase`, `exterior.ts` `setSkyTint`), `?hour=`·`?worksec=` 테스트 파라미터.
- 내 자리 시점(타이머 시작 시 카메라가 책상으로), 모바일은 정면 위 시점.
- 검사: typecheck/build, test:layout 6공간, test:presence, e2e 8/8(문 선택·타이머 세션 기록 추가). 캡처 `11-*` 직접 확인, 콘솔 오류 0.
- 기획 프롬프트에서 뺀 것과 이유는 `DECISIONS.md`.

### 2026-11-17 — 이동·카메라를 부드럽게 (끊김 해소, 전방향 시점)
- 원인: ① 출발·정지 때 속도가 0↔1.25m/s로 한 프레임에 바뀜 ② 경로 모서리에서 방향이 꺾임 ③ 몸 회전이 순간적 ④ 카메라 중심이 아바타가 아닌 방 중앙 쪽(x·0.75, z·0.65)이라 돌리면 아바타가 화면에서 미끄러짐 ⑤ 벽에 막히면 카메라가 60~180° 휙 돌아감, 가구 가장자리를 지날 때 거리가 툭 줄어듦.
- `movement.ts`: 속도 벡터 + 가속(지수 감쇠)으로 출발·정지 0.3초, 목적지 앞 감속, 모서리 0.4m 앞에서 미리 돌기(시야선 확인), 축별 미끄러짐, 속도에 맞춘 몸 회전. 키보드도 같은 방식, 키를 떼면 짧게 감속.
- `animations.ts`·`crowd.ts`: 걸음 박자 = 이동 거리 ÷ 보폭(0.34m)으로 발 미끄러짐 줄임, 속도 측정값 거르기, 팔다리 폭이 속도를 따름, 돌 때 안쪽으로 살짝 기울기.
- `camera.ts`: 중심 = 아바타. 휙 돌던 처리 삭제 → 뒤가 막히면 그 자리에서 위로 올라가 내려다봄(최대 58°). 가구 가림 거리는 빠르게 당기고 천천히 물러나게 감쇠(벽만 즉시 제한). 상하 각도 6~74°로 넓힘. 드래그 관성, Q·E 키 시점 회전(`input.ts`, 설정 안내 문구).
- 측정(`scripts/probe-motion.mjs`, 헤드리스, 같은 경로·같은 드래그):

| 항목 | 이전 | 이후 |
|---|---|---|
| 출발 첫 프레임 속도 | 2.76~7.24 m/s | 0.23~0.51 m/s |
| 최대 가속도 | 90.9~363.5 m/s² | 1.4~2.2 m/s² |
| 몸 최대 회전 속도 | 31.8~83.4 rad/s | 1.8~2.2 rad/s |
| 카메라 360°×2 회전 중 30° 이상 튐 / 아바타 숨김 프레임 | 0 / 0 | 0 / 0 |

- 검사: typecheck/build, test:layout, test:presence, e2e 8/8. 캡처 `12-orbit-{shop,circle}-{0,90,180,270}`·`12-walk` 직접 확인, 8방향 모두 `meVisible() === true`, 콘솔 오류 0.
- `capture-avatar.mjs`의 착석 자리 `read-1`(라운지 재구성으로 없어짐) → `sofa-1`. 이 스크립트의 고정 카메라 좌표는 새 라운지 배치와 맞지 않아 걷기 컷이 빈 화면이 됨(남은 정리 거리).

### 2026-11-17 — NPC 대화(바리스타 모카·모임지기 소담)
- 범위 변경(운영자 승인): NPC와의 대화만 허용, 사람끼리 채팅은 계속 없음. `DECISIONS.md`·규칙 문서 4장에 기록.
- `src/avatar/talkNpc.ts`: 라운지 커피 코너 앞 바리스타, 모임방 서가 옆 모임지기. 3m 안에서는 방문자 쪽으로 돌아봄. 1.7m 안이면 "…와/과 이야기하기" 버튼, NPC를 누르면 앞까지 걸어가 대화 창을 엶. 2.6m 넘게 멀어지면 창이 닫힘. 'NPC 독자 표시' 설정과 별개로 기본 표시(`?talknpc=0`이면 숨김).
- `src/ui/npcChatSheet.ts`·`style.css`: 대화 창(말풍선, 답 쓰는 중 표시, 200자 입력, AI·저장 안 함·개인정보 안내). 데스크톱은 오른쪽에 붙여 NPC가 가운데 보이게. 대화를 열면 카메라가 내 어깨 너머로 NPC를 봄.
- `src/net/npcChat.ts`: Worker로 최근 12턴 전송, 20초 시간 제한. 주소가 없거나 실패·429면 키워드 안내 답(`?npcchat=local`로 강제).
- `worker/npc-chat/`: Cloudflare Worker + `@anthropic-ai/sdk` 1.8.0. `claude-opus-5-5`, effort low, 거절 대체 `fallbacks: "default"`, 시스템 지시 캐시. 허용 주소·길이·IP 횟수 제한. 대화 저장·로그 없음. 키는 `wrangler secret`, 프런트 주소는 Actions Variables `VITE_NPC_CHAT_URL`.
- 검사: 프런트 typecheck/build, Worker typecheck·`wrangler deploy --dry-run` 번들, `wrangler dev`로 다른 출처 403·사전 요청 204·키 없음 503. `scripts/capture-npc-chat.mjs local`: 두 방 × 데스크톱·모바일에서 멀리선 버튼 없음 → 다가가면 버튼 → 질문 → 답 → 멀어지면 버튼 사라짐, 콘솔 오류 0. 캡처 `13-npc-*` 직접 확인.
- **실제 Claude 답은 아직 시험하지 못함**: Worker 배포와 API 키 등록은 운영자가 해야 한다(`worker/npc-chat/README.md`). 그 전까지 공개 사이트는 안내 답으로 동작.
- 2026-11-17 추가: 운영자가 Worker 배포·키 등록(`y-place-npc-chat`, workers.dev). `wrangler.toml`에 `workers_dev = true`·`preview_urls = false` 명시. GitHub Variables `VITE_NPC_CHAT_URL` 등록 후 재배포. **공개 사이트에서 실제 Claude 답 확인**(바리스타, 6.8초, 콘솔 오류 0, 캡처 `13-npc-live-ai.png`). 다른 출처 요청은 403.

### 2026-11-17 — 메타공간 실험실로 공간 재구성
- 운영자 요청: 공간 성격을 실험실로, 책방·서재·모임·작업실·전시실을 나눠 시험할 수 있는 넓은 구조로. 결정 근거는 `DECISIONS.md`.
- `layout.ts`: 로비(`shop`) 5.5×4.5 → **10×7m**(창 2개, 안마 의자·소파·커피 코너·벤치 8석 유지, 문 5개: 뒷벽 책방 실험실·전시실, 오른쪽 벽 서재·작은 모임방·개인 작업실). 새 방 **책방 실험실**(7×5.5, 서가 5·매대 2·계산대·안락의자), **서재**(6×5, 서가 7·열람 테이블+의자 4·안락의자), **전시실**(7×5×3.2, 작품 8·받침대 3·벤치). 각 방 '로비' 문. 정원 로비 12·책방 8·서재 6·전시실 8.
- 새 소품 `props/gallery.ts`: 시드 추상화 3가지 화풍(색면·원·줄무늬), 나무 액자+매트, 황동 작품등, 제목 명판, 받침대 조형물(매듭·쌓은 구·고리). 작품 레이아웃 필드 `exhibits`·`pedestals`, 받침대·벤치 충돌 상자.
- 간판(`identity.ts`)을 방마다: 로비 "Y-Place / 메타공간 실험실", 책방 실험실·서재·전시실 각자 문구. 벽 그림·패브릭 위치를 넓은 로비에 맞춤. 바리스타 위치를 새 커피 코너 앞으로.
- NPC 안내 지식(`worker/npc-chat/src/personas.ts`)과 안내 답(`npcChat.ts`)을 새 방 위치로 갱신(전시·책방·서재·방 위치 질문 추가).
- 입장 자리: 서재가 앞벽 1m라 데스크톱에서 아바타가 숨겨짐 → 1.5m로. 전시실은 카메라가 바닥만 봄 → 앞벽 1.6m로.
- 검사: typecheck/build(사이트·Worker), test:layout 9개 방, test:presence(로비 12), e2e 9/9(로비 좌석 테스트를 자리마다 위에서 누르게, 문 왕복 테스트를 목적지 문을 찾게 고침, **새 방 왕복 테스트 추가**), NPC 대화 안내 답 4화면, `capture-lab.mjs` 다섯 방 × 데스크톱·모바일 입장 시 아바타 보임·콘솔 오류 0. 캡처 `14-lab-*` 직접 확인.

## 2026-11-17 NPC 답변 모델 변경
- Worker 기본 모델 `claude-haiku-5-5`, `NPC_EFFORT=high`, max_tokens 4096, Haiku일 때 fallbacks 끔. Worker 재배포(버전 a4678764).
- 실서버 확인: 바리스타에게 "전시실은 어디예요?" → "로비 뒷벽 오른쪽 문" 정확(2.1초), 음료 질문 2.4초. 이전 Opus 응답 3.8초.
