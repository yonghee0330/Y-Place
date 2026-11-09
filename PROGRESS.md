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
