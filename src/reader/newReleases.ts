// 2026년 11월 3주차 매체 추천 신간. 운영자가 모은 목록(지어내지 않음).
// 새 주차가 오면 이 파일의 CURRENT_WEEK만 바꾸면 된다.

export interface NewReleaseSource {
  id: string;
  name: string;
  url?: string;
  note?: string;
}

export interface NewReleaseBook {
  id: string;
  title: string;
  author: string;
  translator?: string;
  publisher: string;
  price?: string;
  published?: string;
  blurb?: string;
  sources: string[];
  articleUrl?: string;
  /** 서가 받침대·NPC 짧은 안내에 올릴 대표 권 */
  featured?: boolean;
}

export interface NewReleaseWeek {
  id: string;
  label: string;
  range: string;
  sources: NewReleaseSource[];
  books: NewReleaseBook[];
}

export const CURRENT_WEEK: NewReleaseWeek = {
  id: '2026-W47',
  label: '2026년 11월 3주차 신간',
  range: '2026-11-10 ~ 2026-11-21',
  sources: [
  {
    "id": "cine21",
    "name": "씨네21",
    "url": "https://cine21.com/news/view/?mag_id=111269",
    "note": "이 추천하는 11월의 책 (2026-11-17)"
  },
  {
    "id": "sisain-1001",
    "name": "시사IN 1001호",
    "url": "https://www.sisain.co.kr/news/articleView.html?idxno=58822",
    "note": "새로 나온 책 (2026-11-18)"
  },
  {
    "id": "sisain-1000",
    "name": "시사IN 1000호",
    "url": "https://www.sisain.co.kr/news/articleView.html?idxno=58796",
    "note": "새로 나온 책 (2026-11-10)"
  },
  {
    "id": "khan-weekly",
    "name": "주간경향 1705호",
    "url": "https://weekly.khan.co.kr/article/202611210600061",
    "note": "신간 (2026-11-21)"
  },
  {
    "id": "munhwa",
    "name": "문화일보",
    "url": "https://www.munhwa.com/article/11632765",
    "note": "[이 책] 2026-11-20"
  },
  {
    "id": "hani-lit",
    "name": "한겨레(문학)",
    "url": "https://www.hani.co.kr/arti/culture/book/1288225.html",
    "note": "새 책 문학 2026-11-20"
  },
  {
    "id": "hani-nonfiction",
    "name": "한겨레(교양)",
    "url": "https://www.hani.co.kr/arti/culture/book/1288223.html",
    "note": "새 책 교양 2026-11-20"
  },
  {
    "id": "joongang",
    "name": "중앙일보",
    "url": "https://www.joongang.co.kr/article/25480596",
    "note": "[책꽂이] 중앙선데이 2026-11-20"
  },
  {
    "id": "aladin",
    "name": "알라딘 주간 편집회의",
    "note": "11월 MD 추천 회차"
  },
  {
    "id": "chosun",
    "name": "조선일보",
    "note": "[한줄읽기] 11/21 (통화 확인분)"
  },
  {
    "id": "donga",
    "name": "동아일보",
    "note": "[새로 나왔어요] 11/20~21 (통화 확인분)"
  },
  {
    "id": "mk",
    "name": "매일경제",
    "note": "[이주의 새책] 11/20 (통화 확인분)"
  },
  {
    "id": "hankyung",
    "name": "한국경제",
    "note": "[책마을] 11/20 (통화 확인분)"
  },
  {
    "id": "segye",
    "name": "세계일보",
    "note": "11/21 (통화 확인분)"
  }
],
  books: [
  {
    "id": "밤의-노트에-남은-슬픈-사람들",
    "featured": true,
    "title": "밤의 노트에 남은 슬픈 사람들",
    "author": "김소형",
    "publisher": "문학과지성사",
    "price": "13,000원",
    "published": "2026-10-16",
    "sources": [
      "cine21"
    ],
    "articleUrl": "https://cine21.com/news/view/?mag_id=111270",
    "blurb": "세 번째 시집. 트럭 와플, 참외 깎는 칼, 땡초김밥 같은 다정한 사물들 사이로 죽음과 무심한 사회가 슬쩍 고개를 내밉니다. \"저를 추모하고 싶다면 딸기와플이 좋겠어요\"라는 구절이 이 시집의 온도를 다 보여줍니다."
  },
  {
    "id": "레츠-비",
    "featured": true,
    "title": "레츠 비",
    "author": "이수진",
    "publisher": "문학동네",
    "price": "18,500원",
    "published": "2026-10",
    "sources": [
      "cine21"
    ],
    "articleUrl": "https://cine21.com/news/view/?mag_id=111271",
    "blurb": "신생아를 키우는 엄마 근규가 남편이 집을 비운 사이 젊은 여자 애인을 부릅니다. 밀회 스릴러로 시작해 근규의 내면으로 방향을 트는 퀴어 소설."
  },
  {
    "id": "일곱-개의-이름",
    "featured": true,
    "title": "일곱 개의 이름",
    "author": "차병직",
    "publisher": "창비",
    "price": "23,000원",
    "published": "2026-11",
    "sources": [
      "cine21"
    ],
    "articleUrl": "https://cine21.com/news/view/?mag_id=111272",
    "blurb": "국적은 다섯 개, 이름은 일곱 개. 무함마드 깐수로 12년간 남한에서 살아남은 정수일의 평전. 차병직 변호사가 20여 년 교류와 재판 자료로 따라갑니다."
  },
  {
    "id": "세상의-소란이-지워지고",
    "featured": true,
    "title": "세상의 소란이 지워지고",
    "author": "안동선",
    "publisher": "을유문화사",
    "sources": [
      "cine21",
      "joongang"
    ],
    "articleUrl": "https://cine21.com/news/view/?mag_id=111273",
    "blurb": "미술 에디터가 루이즈 부르주아, 애그니스 마틴 앞에서 자기 어머니와 자기 삶을 통과해 쓰는 책. 미술관에서 나와 다시 소란과 마주했을 때 세상이 달라져 있는 위로에 대하여."
  },
  {
    "id": "빨강의-자서전",
    "featured": true,
    "title": "빨강의 자서전",
    "author": "앤 카슨",
    "translator": "민승남",
    "publisher": "한겨레출판",
    "price": "15,000원",
    "published": "2024-11",
    "sources": [
      "cine21"
    ],
    "articleUrl": "https://cine21.com/news/view/?mag_id=111274",
    "blurb": "헤라클레스에게 죽임당하는 빨강 괴물 게리온을, 시인 스테시코로스의 남은 조각을 되살려 다시 씁니다. 노벨문학상 발표 뒤 재조명된 책."
  },
  {
    "id": "아이들이-왕",
    "featured": true,
    "title": "아이들이 왕",
    "author": "델핀 드 비강",
    "translator": "윤석헌",
    "publisher": "레모",
    "price": "19,800원",
    "published": "2026-10",
    "sources": [
      "sisain-1001"
    ],
    "blurb": "여섯 살 유튜브 스타 킴미의 실종으로 시작하는 소설. 놀이가 노동이 된 아이, 카메라가 어디에나 있는 세계."
  },
  {
    "id": "난독-일기",
    "featured": true,
    "title": "난독 일기",
    "author": "심윤경",
    "publisher": "문학동네",
    "price": "17,500원",
    "published": "2026-11",
    "sources": [
      "sisain-1001",
      "joongang"
    ],
    "blurb": "25년 차 소설가가 어느 날 활자가 흔들리기 시작해 난독증을 알게 된 기록. \"책이 가득한 책꽂이는 세상에서 가장 무서운 괴물이었다.\""
  },
  {
    "id": "인체-수리-매뉴얼",
    "featured": true,
    "title": "인체 수리 매뉴얼",
    "author": "메리 로치",
    "translator": "김명남",
    "publisher": "어크로스",
    "price": "23,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1001",
      "aladin"
    ],
    "blurb": "이마 피부로 코를 재건하던 고대 수술부터 돼지 장기 이식까지, 몸을 고쳐 쓰려는 인류의 집요한 시도를 좇습니다."
  },
  {
    "id": "시대의-딜레마,-한국의-스피커들",
    "featured": false,
    "title": "시대의 딜레마, 한국의 스피커들",
    "author": "지승호",
    "publisher": "인물과사상사",
    "price": "17,000원",
    "published": "2026-11",
    "sources": [
      "sisain-1001"
    ],
    "blurb": "유시민·김어준부터 전한길·고성국까지 여론을 움직인 8명의 대형 스피커로 공론장의 위기를 봅니다."
  },
  {
    "id": "노래는-돌아온다",
    "featured": false,
    "title": "노래는 돌아온다",
    "author": "문동만",
    "publisher": "창비",
    "price": "13,000원",
    "published": "2026-11",
    "sources": [
      "sisain-1001"
    ],
    "blurb": "신산한 삶의 풍경과 사회적 약자의 목소리를 그리는 시집. 고 김민기를 생각하며 쓴 표제작이 들어 있습니다."
  },
  {
    "id": "브라보,-나의-달리기",
    "featured": false,
    "title": "브라보, 나의 달리기",
    "author": "니컬러스 톰프슨",
    "translator": "홍은택",
    "publisher": "윌북",
    "price": "19,800원",
    "published": "2026-10-30",
    "sources": [
      "sisain-1001"
    ],
    "blurb": "『디 애틀랜틱』 CEO가 알코올의존증에 빠진 아버지와 달린 이야기."
  },
  {
    "id": "모두를-위한-정의로운-전환",
    "featured": false,
    "title": "모두를 위한 정의로운 전환",
    "author": "J. 미진 차",
    "translator": "김현우",
    "publisher": "레디앙",
    "price": "22,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "사무실에서",
    "featured": false,
    "title": "사무실에서",
    "author": "로베르트 발저",
    "translator": "안미현",
    "publisher": "미간행본",
    "price": "17,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "지역에서-부산스럽게-출판하기",
    "featured": false,
    "title": "지역에서 부산스럽게 출판하기",
    "author": "강수걸 외",
    "publisher": "산지니",
    "price": "22,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "유년의-추운-밤",
    "featured": false,
    "title": "유년의 추운 밤",
    "author": "테제르 외즐뤼",
    "translator": "이난아",
    "publisher": "민음사",
    "price": "12,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "허버트-사이먼과-사고의-재설계",
    "featured": false,
    "title": "허버트 사이먼과 사고의 재설계",
    "author": "배인철",
    "publisher": "해남",
    "price": "20,000원",
    "published": "2026-10",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "오늘의-기세",
    "featured": false,
    "title": "오늘의 기세",
    "author": "이현",
    "publisher": "창비",
    "price": "15,000원",
    "published": "2026-11",
    "sources": [
      "sisain-1000"
    ]
  },
  {
    "id": "옥희와-상열",
    "featured": true,
    "title": "옥희와 상열",
    "author": "임옥희",
    "publisher": "어웨이크",
    "price": "18,800원",
    "published": "2026-11-11",
    "sources": [
      "khan-weekly",
      "joongang",
      "aladin"
    ],
    "blurb": "일흔한 살 여성주의 이론가가 치매를 앓는 아흔 살 어머니와 살아가는 이야기. 엄마는 딸을 '언니'라 부르고, 딸은 엄마의 엄마가 됩니다."
  },
  {
    "id": "바이브",
    "featured": false,
    "title": "바이브",
    "author": "애덤 그랜트",
    "translator": "홍지수",
    "publisher": "한국경제신문",
    "price": "24,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "AI가 정보를 찍어내고 SNS 연결이 일상이 된 시대의 '진짜 연결'. 와튼스쿨 조직심리학자."
  },
  {
    "id": "우리에겐-서로가-필요하다",
    "featured": false,
    "title": "우리에겐 서로가 필요하다",
    "author": "김현",
    "publisher": "심심",
    "price": "19,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "컬럼비아대 정신의학과 교수가 최신 뇌과학으로 연결이 몸과 감정에 미치는 영향을 설명."
  },
  {
    "id": "녹아내리는-세계에서-우리는",
    "featured": false,
    "title": "녹아내리는 세계에서 우리는",
    "author": "엘리자베스 러시",
    "translator": "서제인",
    "publisher": "위즈덤하우스",
    "price": "32,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "남극 스웨이츠 빙하로 떠난 팔머호 50여 일 항해 기록. 퓰리처상 최종 후보."
  },
  {
    "id": "오염된-동반자",
    "featured": false,
    "title": "오염된 동반자",
    "author": "김지혜",
    "publisher": "마티",
    "price": "19,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "해양쓰레기를 골칫거리가 아닌 '동반자'로 불러들이는 사유."
  },
  {
    "id": "극단주의는-어떻게-일상에서-권력이-되는가",
    "featured": true,
    "title": "극단주의는 어떻게 일상에서 권력이 되는가",
    "author": "신진욱·토마스 그룸케",
    "publisher": "한겨레출판",
    "price": "20,000원",
    "sources": [
      "munhwa",
      "mk"
    ],
    "blurb": "한국과 독일의 극우 연구자 둘이 문화·정치·종교·교육으로 확산되는 극단주의를 짚음."
  },
  {
    "id": "인생의-마지막-순간에서",
    "featured": true,
    "title": "인생의 마지막 순간에서",
    "author": "샐리 티스데일",
    "translator": "박미경",
    "publisher": "상상스퀘어",
    "price": "22,000원",
    "sources": [
      "munhwa",
      "mk"
    ],
    "blurb": "십 년 넘게 임종을 지켜본 호스피스 간호사의 기록."
  },
  {
    "id": "아트-몬스터",
    "featured": true,
    "title": "아트 몬스터",
    "author": "로런 엘킨",
    "translator": "송섬별",
    "publisher": "반비",
    "price": "30,000원",
    "sources": [
      "munhwa",
      "hani-nonfiction",
      "hankyung"
    ],
    "blurb": "1970년대 미국 여성 예술가들이 임신·출산·월경·폐경 같은 몸의 경험을 쓰고 그린 역사."
  },
  {
    "id": "사람이-머무는-쪽으로",
    "featured": false,
    "title": "사람이 머무는 쪽으로",
    "author": "임상혁",
    "publisher": "아를",
    "price": "19,800원",
    "sources": [
      "munhwa"
    ],
    "blurb": "38년간 '노동자의 주치의'로 산 직업환경의학 전문의의 기록."
  },
  {
    "id": "21세기-정치와-한국-민주주의",
    "featured": false,
    "title": "21세기 정치와 한국 민주주의",
    "author": "이현출",
    "publisher": "박영사",
    "price": "33,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "좋은 정치란 무엇인가를 민주주의·정부·정당·선거·시민참여로 풀어냄."
  },
  {
    "id": "일본-재즈-킷사",
    "featured": false,
    "title": "일본 재즈 킷사",
    "author": "김소리",
    "publisher": "파이퍼프레스",
    "price": "21,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "도쿄·교토·오사카·고베·후쿠오카의 재즈 킷사와 음악 카페 기록."
  },
  {
    "id": "혀-깨물기",
    "featured": true,
    "title": "혀 깨물기",
    "author": "하퍼 리",
    "translator": "노승영",
    "publisher": "열린책들",
    "price": "17,800원",
    "sources": [
      "munhwa",
      "segye"
    ],
    "blurb": "『앵무새 죽이기』 탄생 100주년. 생전에 어디에도 실리지 못했던 초기 소설·에세이."
  },
  {
    "id": "달리와-달리",
    "featured": false,
    "title": "달리와 달리",
    "author": "원종국",
    "publisher": "문학과지성사",
    "price": "17,000원",
    "sources": [
      "munhwa"
    ],
    "blurb": "복제인간 '달리'와 유전병을 앓는 '유리'. 단편들을 하나의 연작으로 재구성한 SF."
  },
  {
    "id": "김범준의-과학-독서-클럽",
    "featured": false,
    "title": "김범준의 과학 독서 클럽",
    "author": "김범준",
    "publisher": "동아시아",
    "price": "18,000원",
    "sources": [
      "munhwa",
      "mk"
    ],
    "blurb": "물리학자가 10년 가까이 이어온 독서 클럽에서 고른 과학책과 토론 질문."
  },
  {
    "id": "로봇-시리즈",
    "featured": false,
    "title": "로봇 시리즈",
    "author": "아이작 아시모프",
    "translator": "강경아",
    "publisher": "황금가지",
    "price": "세트 80,000원",
    "sources": [
      "hani-lit"
    ],
    "blurb": "국내 첫 정식 완역. 『아이, 로봇』부터 『로봇과 제국』까지. 정보라·김보영·이영도 등의 에세이가 별책으로 붙었습니다."
  },
  {
    "id": "기소",
    "featured": false,
    "title": "기소",
    "author": "김현아",
    "publisher": "엘릭시르",
    "price": "18,000원",
    "sources": [
      "hani-lit"
    ],
    "blurb": "의대 교수의 첫 장편. 전직 검사가 청계산 자락에서 숨진 사건으로 시작하는 법정 미스터리."
  },
  {
    "id": "아이를-찾습니다",
    "featured": false,
    "title": "아이를 찾습니다",
    "author": "김영하",
    "publisher": "복복서가",
    "price": "20,000원",
    "sources": [
      "hani-lit"
    ],
    "blurb": "김영하 첫 소설을 그래픽 노블로. 복복서가 그래픽 노블 시리즈 1번."
  },
  {
    "id": "디-에센셜-은희경",
    "featured": false,
    "title": "디 에센셜 은희경",
    "author": "은희경",
    "publisher": "문학동네",
    "price": "19,000원",
    "sources": [
      "hani-lit"
    ],
    "blurb": "30년간 중단편 45편 중 작가가 직접 고른 7편과 산문."
  },
  {
    "id": "문무",
    "featured": false,
    "title": "문무",
    "author": "설아희",
    "publisher": "북레시피",
    "price": "각 권 20,000원",
    "sources": [
      "hani-lit"
    ],
    "blurb": "김유신에 가려진 김법민(문무왕)을 주인공으로 세운 역사소설 1·2·3."
  },
  {
    "id": "나의-삶은-너의-죽음에-기대어-있다",
    "featured": false,
    "title": "나의 삶은 너의 죽음에 기대어 있다",
    "author": "심아정",
    "publisher": "사계절",
    "price": "17,000원",
    "sources": [
      "hani-nonfiction"
    ]
  },
  {
    "id": "제노사이드의-기억",
    "featured": false,
    "title": "제노사이드의 기억",
    "author": "김봉규",
    "publisher": "눈빛",
    "price": "25,000원",
    "published": "2026-11-11",
    "sources": [
      "hani-nonfiction"
    ]
  },
  {
    "id": "고희동과-그의-시대",
    "featured": false,
    "title": "고희동과 그의 시대",
    "author": "이상돈",
    "publisher": "에디터",
    "price": "35,000원",
    "sources": [
      "hani-nonfiction",
      "joongang"
    ]
  },
  {
    "id": "곤",
    "featured": false,
    "title": "곤",
    "author": "수신지",
    "publisher": "귤프레스",
    "price": "22,000원",
    "published": "2026-11",
    "sources": [
      "hani-nonfiction"
    ],
    "blurb": "낙태죄가 합헌인 가상의 대한민국을 그린 근미래 SF 만화 합본과 위헌 결정 이후 인터뷰."
  },
  {
    "id": "영국적-상상력",
    "featured": false,
    "title": "영국적 상상력",
    "author": "피터 왓슨",
    "translator": "권은혜",
    "publisher": "책과함께",
    "price": "43,000원",
    "sources": [
      "joongang",
      "hani-nonfiction"
    ]
  },
  {
    "id": "저항의-알고리즘",
    "featured": false,
    "title": "저항의 알고리즘",
    "author": "티치아노 보니니·에밀리아노 트레레",
    "translator": "김상민",
    "publisher": "사월의책",
    "sources": [
      "joongang"
    ],
    "blurb": "플랫폼 권력에 맞서는 일상의 투쟁. 배달 노동자·콘텐트 창작자·팬덤·정치 활동가에 대한 현장 조사."
  },
  {
    "id": "조계와-그-경계-너머",
    "featured": true,
    "title": "조계와 그 경계 너머",
    "author": "박준형",
    "publisher": "푸른역사",
    "price": "35,000원",
    "sources": [
      "joongang"
    ]
  },
  {
    "id": "부수고-희망하고-다시-부수기",
    "featured": true,
    "title": "부수고 희망하고 다시 부수기",
    "author": "버트런드 러셀",
    "translator": "노윤기",
    "publisher": "흐름출판",
    "price": "22,000원",
    "sources": [
      "joongang",
      "chosun"
    ]
  },
  {
    "id": "한국-미술과-건축의-말과-글:-「공간」-다시-읽기",
    "featured": false,
    "title": "한국 미술과 건축의 말과 글: 「공간」 다시 읽기",
    "author": "신정훈·조현정",
    "publisher": "공간서가",
    "price": "32,000원",
    "sources": [
      "joongang"
    ]
  },
  {
    "id": "성공하는-기업의-숨겨진-전략,-표준",
    "featured": false,
    "title": "성공하는 기업의 숨겨진 전략, 표준",
    "author": "이희진·조성환·곽주영",
    "publisher": "커뮤니케이션북스",
    "price": "22,000원",
    "published": "2026-10",
    "sources": [
      "joongang"
    ]
  },
  {
    "id": "일본을-만든-동네들",
    "featured": true,
    "title": "일본을 만든 동네들",
    "author": "박희윤",
    "publisher": "북스톤",
    "price": "24,000원",
    "sources": [
      "joongang"
    ]
  },
  {
    "id": "알고리즘",
    "featured": false,
    "title": "알고리즘",
    "author": "존 맥닐",
    "translator": "조용빈",
    "publisher": "비즈니스북스",
    "price": "21,000원",
    "published": "2026-11",
    "sources": [
      "joongang",
      "chosun"
    ]
  },
  {
    "id": "같은-여자끼리",
    "featured": false,
    "title": "같은 여자끼리",
    "author": "청예",
    "publisher": "오리지널스",
    "published": "2026-11",
    "sources": [
      "aladin"
    ],
    "blurb": "여성 전용 공공임대 단지 '은청지구'가 위기에 처하며 벌어지는 소설."
  },
  {
    "id": "호모-픽투스,-상상하는-인간",
    "featured": false,
    "title": "호모 픽투스, 상상하는 인간",
    "author": "호르헤 볼피",
    "translator": "엄지영",
    "publisher": "엘리",
    "published": "2026-10",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "알케마이즈드-세트",
    "featured": false,
    "title": "알케마이즈드 세트",
    "author": "센린유",
    "translator": "이수현",
    "publisher": "반타",
    "published": "2026-10",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "파도-수영-교실",
    "featured": false,
    "title": "파도 수영 교실",
    "author": "신현경",
    "publisher": "북스그라운드",
    "price": "16,800원",
    "published": "2026-10",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "태풍의-이름을-잊은-것처럼",
    "featured": true,
    "title": "태풍의 이름을 잊은 것처럼",
    "author": "정세랑",
    "publisher": "문학동네",
    "price": "20,000원",
    "published": "2026-11",
    "sources": [
      "aladin"
    ],
    "blurb": "데뷔작부터 미발표 신작까지 16년을 모은 소설집. 작가가 \"지금껏 쓴 단편 중 가장 소중하다\"고 말한 표제작."
  },
  {
    "id": "시추에이티드",
    "featured": false,
    "title": "시추에이티드",
    "author": "앤절라 더크워스",
    "translator": "신솔잎",
    "publisher": "비즈니스북스",
    "price": "22,000원",
    "published": "2026-11",
    "sources": [
      "aladin"
    ],
    "blurb": "『그릿』 이후 10년. 의지·노력보다 '사람과 장소'가 성취를 만든다는 이야기."
  },
  {
    "id": "내가-크고-있는지-궁금해",
    "featured": false,
    "title": "내가 크고 있는지 궁금해",
    "author": "라피 글",
    "publisher": "웅진주니어",
    "price": "17,000원",
    "published": "2026-10",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "축복하는-요메쿠비",
    "featured": false,
    "title": "축복하는 요메쿠비",
    "author": "미쓰다 신조",
    "translator": "김은모",
    "publisher": "리드비",
    "published": "2026-10",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "일일-반출록",
    "featured": false,
    "title": "일일 반출록",
    "author": "성해나",
    "publisher": "무제",
    "sources": [
      "aladin"
    ]
  },
  {
    "id": "인스타-매거진-하는-마음",
    "featured": false,
    "title": "인스타 매거진 하는 마음",
    "author": "배동훈 외",
    "publisher": "세미콜론",
    "sources": [
      "chosun"
    ]
  },
  {
    "id": "지구의-비명",
    "featured": false,
    "title": "지구의 비명",
    "author": "천선란 외",
    "publisher": "은행나무",
    "sources": [
      "chosun"
    ]
  },
  {
    "id": "꼭두,-듣다",
    "featured": false,
    "title": "꼭두, 듣다",
    "author": "이주혜",
    "publisher": "현대문학",
    "price": "15,000원",
    "sources": [
      "donga"
    ]
  },
  {
    "id": "불순한-건축",
    "featured": false,
    "title": "불순한 건축",
    "author": "조진만",
    "publisher": "미래의창",
    "sources": [
      "donga"
    ]
  },
  {
    "id": "저-좋은-밤으로-순순히-들어가지-마세요",
    "featured": false,
    "title": "저 좋은 밤으로 순순히 들어가지 마세요",
    "author": "딜런 토머스",
    "publisher": "봄날의책",
    "price": "20,000원",
    "sources": [
      "mk"
    ]
  },
  {
    "id": "한반도-사피엔스",
    "featured": false,
    "title": "한반도 사피엔스",
    "author": "이진옥·박정재",
    "publisher": "김영사",
    "sources": [
      "segye"
    ]
  }
],
};

export function sourceName(id: string): string {
  return CURRENT_WEEK.sources.find((s) => s.id === id)?.name ?? id;
}

export function featuredBooks(week: NewReleaseWeek = CURRENT_WEEK): NewReleaseBook[] {
  const list = week.books.filter((b) => b.featured);
  return list.length ? list : week.books.slice(0, 6);
}

export function findNewRelease(title: string, week: NewReleaseWeek = CURRENT_WEEK): NewReleaseBook | undefined {
  const t = title.trim();
  return week.books.find((b) => b.title === t);
}

/** 기분·키워드로 2~3권 고른다. 매칭 없으면 대표 권. */
export function suggestNewReleases(query: string, n = 3, week: NewReleaseWeek = CURRENT_WEEK): NewReleaseBook[] {
  const q = query.replace(/\s+/g, '');
  const scored = week.books.map((b) => {
    const hay = [b.title, b.author, b.publisher, b.blurb ?? '', ...b.sources.map(sourceName)].join(' ');
    let score = 0;
    for (const key of ['시', '소설', '에세이', '과학', '정치', '미술', '엄마', '돌봄', '퀴어', '역사', 'SF', '그림', '전쟁', '죽음', '몸', '일본', '알고리즘', '플랫폼']) {
      if (q.includes(key) && hay.includes(key)) score += 3;
    }
    if (b.featured) score += 1;
    if (b.blurb) score += 1;
    if (b.sources.length > 1) score += 2;
    return { b, score };
  });
  scored.sort((a, c) => c.score - a.score || c.b.sources.length - a.b.sources.length);
  const top = scored.filter((x) => x.score > 0).slice(0, n).map((x) => x.b);
  if (top.length >= 2) return top;
  return featuredBooks(week).slice(0, n);
}

/** NPC·Worker에 붙일 짧은 목록(토큰 절약). */
export function compactNewReleasesForNpc(week: NewReleaseWeek = CURRENT_WEEK): string {
  const lines = [
    `[이번 주 신간 제안] ${week.label} (${week.range})`,
    '- 아래는 언론·서점 MD가 소개한 책이다. 없는 책을 지어내지 않는다. 본문은 제공하지 않는다.',
  ];
  for (const b of featuredBooks(week).slice(0, 8)) {
    const src = b.sources.map(sourceName).join('·');
    const one = (b.blurb ?? '').replace(/\s+/g, ' ').slice(0, 90);
    lines.push(`- 「${b.title}」 ${b.author} / ${b.publisher} (${src})${one ? ' — ' + one : ''}`);
  }
  lines.push(`- 전체 ${week.books.length}권은 공간의 "신간" 목록에서 볼 수 있다.`);
  return lines.join('\n');
}
