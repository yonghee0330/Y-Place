# Y-Place

동네책방 사진에서 색감과 가구 배치를 참고해 만든 개인 3D 작업 공간입니다. Y-Place와 작은 모임방을 나무 문으로 오가며 앉아서 책을 고르고, 조용한 합성 음악을 켤 수 있습니다. 모든 가구와 질감은 three.js 코드로 생성합니다.

[Y-Place 열기](https://yonghee0330.github.io/Y-Place/) · [소스 저장소](https://github.com/yonghee0330/Y-Place)

## 실행과 검사

Node 22.12 이상에서 `npm ci` 후 `npm run dev`로 실행합니다. 배포 빌드는 `npm run typecheck && npm run build`, 로컬 확인은 `npm run preview`입니다.

- `npm run test:layout`: 두 방의 스폰·좌석 접근점·모든 좌석 간 경로와 개별 클릭 상자 검사.
- `npm run test:presence`: 서점 8명·모임방 6명 정원, 초과 거절 및 퇴장 후 재입장 검사.
- `npm run test:e2e`: Chromium에서 10석 실제 클릭 착석, 포털 왕복, 만석 복귀, 폭 420px의 시작·앉기·책 선택·소리 켜기 검사. Playwright Chromium 설치가 필요합니다.
- `npm run capture -- 05`: 실행 중인 preview의 두 방을 SwiftShader로 촬영해 `docs/screens/`에 저장합니다. e2e는 macOS에서 Metal, 다른 환경에서는 SwiftShader를 사용하며 정적 캡처는 SwiftShader를 사용합니다.

바닥을 누르면 걷고 의자를 누르면 앉습니다. 하단 버튼은 앉기·눈인사·음료·책·읽기 모드, 상단 버튼은 공간 이동·소리·설정입니다. 드래그로 둘러보고 휠 또는 핀치로 거리를 조절합니다. 소리는 기본 꺼짐이며 버튼을 누른 뒤에만 시작합니다.

## 설정과 데이터

`.env.example`을 참고해 필요한 값만 `.env.local`에 설정합니다. 기본 실행에는 서버나 키가 필요 없습니다. 접속자는 같은 브라우저의 탭끼리 BroadcastChannel로 공유됩니다. 게시판 기능은 제거했습니다.

책 선택은 예시 도서 목록 또는 직접 입력을 사용합니다. 실제 매장 재고가 아니며 책 본문을 제공하지 않습니다. 기본 표지는 코드로 만든 제목 카드입니다. 별도의 책 검색 API는 `VITE_API_BASE`, 음악은 `VITE_BGM_YOUTUBE_ID`로 선택 설정할 수 있습니다. 지정 음악이 없으면 Web Audio 합성 음악을 재생합니다.

운영자 입장은 `VITE_MANAGER_CODE`를 지정했을 때만 표시됩니다. 닉네임은 ‘Y-Place 운영자’입니다. 정적 사이트에 포함되는 외형 전환용 코드이므로 보안 인증이나 비밀 데이터 접근 수단으로 사용하면 안 됩니다. 예전 서비스의 코드나 클라우드 계정은 복사하지 않았습니다.

## 배포

GitHub 저장소의 Pages Source를 GitHub Actions로 설정합니다. `main` 푸시 시 `.github/workflows/deploy.yml`이 의존성 설치·타입 검사·빌드 후 Pages로 배포합니다. 선택 환경변수는 workflow에 명시된 Secrets/Variables로 설정합니다. 경로는 상대 경로이므로 `/yongseojeom/` 아래에서도 동작합니다.

## 남은 이슈 / 가정한 것

- 제공 사진의 합판·철제 선반·크림색 벽·빽빽한 서가·주름 전등갓·간판·동심원 패브릭을 참고했습니다. 실측 복원이 아니며 방 크기와 가구 배치는 가상 설계입니다.
- 서점 5.5×4.5m, 정원 8명, 좌석 5개. 모임방 4.2×4.2m, 정원 6명, 지름 1.3m 원탁과 좌석 5개를 기본값으로 가정했습니다.
- 간판과 입장 화면의 이름은 Y-Place입니다. 창가 안락의자·원탁·러그·식물 배치는 가정입니다.
- 고양이와 연출용 NPC는 기본적으로 없습니다. 책 선택은 유지하고 게시판과 위치 조회는 제거했습니다. 날씨는 부천의 고정 좌표를 사용합니다.
- 지정 BGM·운영자 코드·커스텀 도메인이 없어 합성 음악과 기본 Pages 주소를 사용합니다. 운영자 코드는 미설정 상태입니다.
- 실제 iPhone의 키보드·스피커, 저사양 휴대폰의 프레임률, 외부 Supabase·책 API·YouTube 연동은 검증하지 않았습니다. 모바일 검사는 Chromium 터치 에뮬레이션과 visualViewport 축소 이벤트를 사용했습니다.
- 새 패키지는 추가하지 않았습니다. 제공 사진과 이전 프로젝트 이력은 로컬 `docs/`에 보존하고 Git 공개 대상에서 제외했습니다. 런타임에는 사진 원본이 포함되지 않습니다.

검증 기록은 `PROGRESS.md`, 직접 확인한 화면은 `docs/screens/REVIEW.md`에 남깁니다.

2026-11-10부터 공개 사이트는 GitHub Actions로 배포합니다(Pages Source = GitHub Actions). `main`에 푸시하면 자동으로 갱신됩니다. 예전 임시 배포용 `pages` 브랜치는 더 이상 사이트에 쓰이지 않으며, 기록 보존을 위해 남겨 두었습니다.
