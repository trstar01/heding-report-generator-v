# HEDING 이직 진단 리포트 생성기

## 파일 구조
```
heding-report-app/
├── public/
│   └── index.html          # 메인 앱 (UI 전체)
├── api/
│   ├── parse-resume.js     # PDF 이력서 파싱 API
│   └── generate-report.js  # 리포트 생성 API
├── vercel.json             # Vercel 배포 설정
├── package.json
└── README.md
```

## Vercel 배포 방법

### 1단계 — GitHub 업로드
1. GitHub에서 새 레포지토리 생성 (예: `heding-report-generator`)
2. 이 폴더 전체를 업로드

### 2단계 — Vercel 연결
1. https://vercel.com 접속 → 로그인
2. **"New Project"** 클릭
3. GitHub 레포지토리 선택
4. **"Deploy"** 클릭

### 3단계 — API 키 환경변수 등록 ⭐ 중요
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings → Environment Variables**
3. 추가:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-...` (새로 발급받은 키)
   - **Environment:** Production, Preview, Development 모두 체크
4. **Save** 클릭
5. **Deployments → 최신 배포 → Redeploy** (환경변수 반영)

### 4단계 — 접속 확인
배포 완료 후 Vercel이 제공하는 URL로 접속
예: `https://heding-report-generator.vercel.app`

## 사용 방법

1. **이력서 업로드** — PDF 이력서를 드래그 또는 클릭으로 업로드
2. **자동 추출** — AI가 후보자 정보를 자동으로 채워줌 (수동 수정 가능)
3. **상담 내용 입력** — 유선 상담 후 핵심 내용 자유 입력
4. **담당 컨설턴트** — 이름/직급 입력 (기본값: 오시나 부대표)
5. **리포트 생성** — 버튼 클릭 후 30~60초 대기
6. **PDF 저장** — 브라우저 인쇄(Ctrl+P) → PDF로 저장

## 주요 기능

- ✅ PDF 이력서 자동 파싱 (Claude AI)
- ✅ 후보자 정보 자동 추출 및 수동 수정
- ✅ 상담 내용 입력 → 리포트 전반 자동 반영
- ✅ 오타 자동 교정
- ✅ 발행 년월 자동 업데이트
- ✅ 담당 컨설턴트 이름/직급 반영
- ✅ 8페이지 구성 자동 생성
- ✅ HEDING 브랜드 디자인 (네이비/골드)

## 비용
- 이력서 1건 분석: 약 $0.02~0.05 (약 30~70원)
- 리포트 생성: 약 $0.05~0.10 (약 70~140원)
- **월 50건 처리 시 약 $5~7.5 (약 7,000~10,000원)**

## 문의
HEDING 오시나 부대표
