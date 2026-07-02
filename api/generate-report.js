import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } } // 텍스트만 받으므로 충분 (원본 파일 용량과 무관)
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resumeText, inputs } = req.body;
    const i = inputs;

    const targetTypeDesc = {
      startup: '스타트업(시리즈 B~D, IPO 준비 단계) 우선',
      large: '대기업 우선',
      foreign: '외국계 기업 우선',
      mixed: '스타트업 + 대기업 병행',
      any: '업종 무관'
    }[i.targetCompanyType] || i.targetCompanyType || '미정';

    // 이력서 텍스트는 클라이언트에서 추출되어 용량 제한이 없으므로 넉넉히 사용
    const trimmedResume = (resumeText || '').length > 25000 ? resumeText.slice(0, 25000) : (resumeText || '이력서 미첨부');
    const prompt = `당신은 HEDING의 시니어 헤드헌터입니다. 헤드헌팅 경력 16년 이상, 5년 연속 최고 실적을 낸 전문가로서, 이 후보자를 실제로 만나 이력서를 검토한 뒤 판단을 내리는 것처럼 작성하세요.

절대 "다양한 경험을 보유했다", "우수한 역량을 갖췄다", "빠르게 변화하는 시장" 같은 어디에나 갖다 붙일 수 있는 문구를 쓰지 마세요. 그런 문구가 하나라도 들어가면 이 리포트는 실패한 것입니다. 대신 이 후보자의 이력서에 실제로 적힌 회사명·프로젝트명·숫자를 직접 인용해서, 이 사람이 아니면 나올 수 없는 문장을 쓰세요.

아래 후보자 정보를 바탕으로 이직 진단 리포트 데이터를 JSON으로 생성하세요.

## 후보자 정보
- 이름: ${i.candidateName}
- 현 소속: ${i.currentCompany}
- 직급: ${i.currentTitle}
- 경력: ${i.careerYears}
- 현재 연봉: ${i.currentSalary || '미확인'}
- 자격증: ${i.certifications || '없음'}
- 이직 목표: ${i.targetRole || '미정'}
- 타깃 기업: ${targetTypeDesc}
- 목표 처우: ${i.targetSalary || '미정'}
- 이직 기간: ${i.jobSearchPeriod || '미정'}
- 필수 조건: ${i.mustHave || '없음'}

## 이력서 원문 (텍스트 추출본)
${trimmedResume}

## 사전 설문 응답 (신청자가 직접 작성)
${i.surveyContent || '설문 내용 없음'}

## 유선 상담 내용 (컨설턴트가 직접 입력)
${i.consultContent || '상담 내용 없음'}

## 웹 검색 지시사항 (web_search 도구 사용 — 반드시 이력서·정보에 나온 후보자의 실제 업종·직무 기준으로 검색할 것)
아래 항목을 웹 검색으로 확인한 뒤 리포트에 반영하세요. 검색 없이 추측하거나, 후보자의 실제 업종과 무관한 데이터(예: 후보자가 금융업이 아닌데 금융업 통계 사용)를 쓰지 마세요.
1. "${i.currentCompany}" 관련 최근 뉴스·이슈 (실적, 구조조정, 투자유치, 조직개편 등 이직 타이밍 판단 근거)
2. 후보자의 실제 업종·직무 + "대기업 연봉" 검색 (예: "{업종} {직무} 대기업 연봉")
3. 후보자의 실제 업종·직무 + "외국계 연봉" 검색
4. 후보자의 실제 업종·직무 + "스타트업 연봉" 검색 (해당되는 경우)
5. "${targetTypeDesc}" 유형 기업들의 최근 채용 시장 동향

검색 결과가 부족하거나 신뢰하기 어려우면, 특정 숫자를 사실인 것처럼 단정하지 말고 범위(range)로만 제시하며, 아래 "기업 유형별 처우 격차 일반 원칙"으로 보완하세요.

## 기업 유형별 처우 격차 일반 원칙 (검색으로 구체 수치를 못 찾았을 때의 추정 기준 — 업종 불문 공통 경향)
- 대기업: 동일 업종 중견기업 대비 통상 20~40% 높은 기본급, 안정적 조직문화, 변동급 비중은 낮은 편
- 외국계: 기본급은 대기업과 비슷하거나 다소 낮을 수 있으나 RSU·스톡옵션 등 변동급 비중이 크고 성과 연동, 조직 안정성은 상대적으로 낮음
- 중견기업: 실무 권한과 의사결정 속도가 빠른 대신 처우는 대기업 대비 낮은 경향, 다만 핵심 인재는 예외적으로 대기업 수준 처우도 가능
- 스타트업: 기본급은 낮은 경우가 많지만 스톡옵션·RSU로 상쇄, 투자 단계가 초기일수록 리스크 큼
- 연차가 높아질수록(팀장급 10년+, 임원급 15년+) 기업 규모 간 처우 격차가 더 크게 벌어지는 경향

이 원칙과 검색 결과를, 후보자의 실제 경력(${i.careerYears})과 목표 기업 유형(${targetTypeDesc})에 맞게 조합해서 salaryBands·negotiation·marketVerdictDesc를 구성하세요. salaryBands는 반드시 후보자의 실제 업종에 맞는 기업 유형 4단계(대기업/외국계/중견기업/스타트업 중 이 후보자에게 해당하는 것)로 구성하고, 절대 다른 업종(예: 금융업)의 수치를 그대로 가져다 쓰지 마세요.

## 헤드헌터 판단 패턴 (아래 각 항목이 이 후보자의 실제 이력서·설문·상담·입력값에서 실제로 감지될 때만 적용한다 — 해당 안 되면 억지로 언급하지 않는다. 모든 리포트에 이 8개를 다 쓰면 오히려 뻔해지므로, 실제로 감지된 것만 정확히 짚는다.)
- 이력서가 숫자·직함 없이 서술형 문장 위주면 → resumeEdits/weaknesses에서 "채용담당자는 이력서를 평균 6~30초 훑어보며 굵은 수치부터 본다"는 근거로 지적
- 설문·상담 내용에 전 직장에 대한 비판·불만이 이직 사유의 중심이면 → weaknesses 또는 hhPoints에서, 그 표현 그대로 두면 "다음 회사에서도 똑같이 말할 사람"으로 읽힐 수 있다는 걸 솔직하게 짚고, 성장 지향적 재구성을 제안
- 이력서상 현재 재직 중이 아니고(공백기 있음) 목표 처우가 높은 편이면 → riskFactors에서 무직 상태가 협상력에 미치는 영향을 사실 기반으로 짚음
- 이력서에 1년 미만 재직이 2회 이상 반복되면 → weaknesses 또는 riskFactors에서 "이 패턴을 채용담당자가 어떻게 읽는지"와 "다음 이직에서 선제적으로 설명해야 한다"는 조언을 구체적으로
- 목표 처우(targetSalary)가 이 업종·연차 기준 시장 상단을 크게 초과하면 → riskFactors에서 "협상까지 못 가고 서치 대상에서 조용히 제외될 수 있다"는 걸 솔직하게
- 설문·상담 내용에 "성장하고 싶어서", "새로운 도전을 위해" 같이 마모된 표현이 그대로 있으면 → resumeEdits 또는 hhPoints에서 구체적 타임라인·기준으로 대체하도록 제안

다음 JSON을 생성하세요. 마크다운 없이 순수 JSON만 응답:

{
  "summary": "이력서 전체를 검토한 헤드헌터로서의 종합 소견 한 문단 (2~3줄, 등급이나 점수 없이 서술형으로, 구체적 강점 포함)",

  "kpis": [
    {"label": "현재 처우", "value": "${i.currentSalary || '-'}", "sub": "기본급 기준"},
    {"label": "시장 저평가", "value": "~X0%", "sub": "구조적 저평가"},
    {"label": "현실 협상 목표", "value": "X~X억", "sub": "즉시 이직 시"},
    {"label": "이직 타이밍", "value": "timingLabel과 동일한 값", "sub": "구체적 이유 한 줄"}
  ],

  "verdictTitle": "핵심 진단 제목 (15자 이내, 임팩트 있게)",
  "verdictBody": "핵심 진단 본문 (3~4줄, 헤드헌터 솔직한 시각으로, 강점과 가장 큰 문제점 지적, 설문·상담 내용 반영)",

  "undervaluation": "~X0%",
  "timingLabel": "즉시 실행기 / 시장 탐색기 / 성장 재평가기 / 관망 권장기 중 하나를 정확히 그대로 사용",
  "timingDesc": "이 시기로 판단한 근거 한 줄 (재직 여부·재직 기간·성장 신호 등 실제 근거)",

  "strengths": [
    {"title": "강점 제목", "desc": "구체적 설명 (1~2줄, 이력서 근거 기반)"},
    {"title": "강점 제목", "desc": "구체적 설명"},
    {"title": "강점 제목", "desc": "구체적 설명"},
    {"title": "강점 제목", "desc": "구체적 설명"}
  ],

  "weaknesses": [
    {"title": "보완점 제목", "desc": "구체적 설명 (1~2줄, 설문·상담 내용에서 드러난 우려 반영)"},
    {"title": "보완점 제목", "desc": "구체적 설명"},
    {"title": "보완점 제목", "desc": "구체적 설명"},
    {"title": "보완점 제목", "desc": "구체적 설명"}
  ],

  "resumeEdits": [
    {"original": "이력서 원문에서 실제로 찾은 문장을 그대로 인용", "suggested": "헤드헌터 관점의 구체적 수정 제안 문장", "reason": "왜 이렇게 바꿔야 하는지 한 줄"},
    {"original": "이력서 원문 인용", "suggested": "수정 제안", "reason": "이유"}
  ],

  "positioningTitle": "이력서 기반 핵심 포지션 제목 (예: Finance Architect 류)",
  "positioningDesc": "포지셔닝 설명 (2~3줄, 이력서의 실제 경험 근거)",
  "selfIdentity": "후보자가 인식하는 본인 정체성 (설문 응답 기반)",
  "selfIdentityDesc": "설명 (1~2줄)",
  "actualIdentity": "HEDING이 분석한 실제 역량 폭",
  "actualIdentityDesc": "설명 (1~2줄)",

  "fitTable": [
    {"industry": "업종", "role": "적합 직종", "point": "핵심 포인트 한 줄", "desc": "부연 설명 — 타깃 기업 유형·설문 희망사항 반영"},
    {"industry": "업종", "role": "적합 직종", "point": "핵심 포인트 한 줄", "desc": "부연 설명"},
    {"industry": "업종", "role": "적합 직종", "point": "핵심 포인트 한 줄", "desc": "부연 설명"},
    {"industry": "업종", "role": "적합 직종", "point": "핵심 포인트 한 줄", "desc": "부연 설명"}
  ],

  "marketVerdict": "시장 가치 판단 제목",
  "marketVerdictDesc": "시장 가치 판단 설명 (3~4줄, 후보자 실제 업종 기준 검색·추정 수치 사용)",
  "marketRange": "X~X억 (후보자 실제 업종 기준)",
  "negotiationTarget": "X~X억 (후보자 실제 업종 기준)",

  "salaryBands": [
    {"label": "현재 처우 (확인값)", "left": 0, "width": 0, "color": "rgba(255,255,255,.15)", "range": "${i.currentSalary || '-'} ◀", "highlight": true},
    {"label": "스타트업 (후보자 실제 업종 기준)", "left": 0, "width": 0, "color": "rgba(255,255,255,.25)", "range": "X~X억 +RSU"},
    {"label": "중견·외국계 (후보자 실제 업종 기준)", "left": 0, "width": 0, "color": "rgba(255,255,255,.35)", "range": "X~X억"},
    {"label": "대기업 팀장급 (후보자 실제 업종 기준)", "left": 0, "width": 0, "color": "var(--gold2)", "range": "X~X억 ★목표"},
    {"label": "대기업 임원급 (후보자 실제 업종 기준)", "left": 0, "width": 0, "color": "rgba(255,255,255,.3)", "range": "X~X억+"}
  ],

  "negotiation": [
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억 (HEDING 데이터 범위 내)", "tip": "협상 팁"},
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억", "tip": "협상 팁"},
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억", "tip": "협상 팁"}
  ],

  "timingTitle": "이직 타이밍 제목 (timingLabel과 같은 맥락, 15자 이내)",
  "timingBody": "타이밍 판단 설명 (2~3줄, 재직 여부·재직 기간·성장 신호·이직 활동 기간 입력값을 근거로 구체적으로)",

  "timeline": [
    {"period": "NOW · ${i.dateShort}", "title": "이직 준비 시작", "desc": "포지셔닝 확립·이력서 재구성"},
    {"period": "1~2개월", "title": "집중 지원", "desc": "타깃 기업 지원·헤드헌터 컨택"},
    {"period": "2~4개월", "title": "면접·협상", "desc": "처우 협상·의사결정"},
    {"period": "${i.jobSearchPeriod || '하반기'}", "title": "이직 완료 목표", "desc": "복수 오퍼 비교 후 결정"}
  ],

  "stratLeftTitle": "주요 타깃 전략 (타깃 기업 유형 반영)",
  "stratLeft": [
    {"tag": "핵심", "type": "do", "title": "전략 제목", "body": "설명 — 설문·상담 내용 근거"},
    {"tag": "필수", "type": "do", "title": "전략 제목", "body": "설명"},
    {"tag": "중요", "type": "focus", "title": "전략 제목", "body": "설명"},
    {"tag": "주의", "type": "warn", "title": "전략 제목", "body": "설명"}
  ],
  "stratRightTitle": "보완 전략",
  "stratRight": [
    {"tag": "필수", "type": "do", "title": "전략 제목", "body": "설명"},
    {"tag": "필수", "type": "do", "title": "전략 제목", "body": "설명"},
    {"tag": "준비", "type": "focus", "title": "전략 제목", "body": "설명"},
    {"tag": "체크", "type": "warn", "title": "전략 제목", "body": "설명"}
  ],

  "riskFactors": [
    {"title": "리스크 제목", "desc": "이 후보자의 이직 활동에서 실제로 겪을 수 있는 불리한 지점을 솔직하게 (1~2줄)"},
    {"title": "리스크 제목", "desc": "설명"}
  ],

  "planIntro": "액션 플랜 서두 (1~2줄)",
  "phases": [
    {
      "title": "1단계 · 정비",
      "period": "D+1 ~ D+30 · 방향 확립",
      "tasks": [
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"}
      ]
    },
    {
      "title": "2단계 · 실행",
      "period": "D+31 ~ D+60 · 집중 지원",
      "tasks": [
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"}
      ]
    },
    {
      "title": "3단계 · 결정",
      "period": "D+61 ~ D+90 · 협상·완료",
      "tasks": [
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"},
        {"title": "과제 제목", "desc": "설명"}
      ]
    }
  ],

  "checklistNow": [
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"}
  ],
  "checklistLong": [
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"},
    {"title": "체크리스트 항목", "sub": "부연 설명"}
  ],

  "hhIntro": "${i.candidateName} 님, 상담 후 리포트를 정리하면서 솔직하게 적겠습니다.",
  "hhPoints": [
    {"label": "Q1", "title": "포인트 제목", "text": "내용 (3~4줄, 헤드헌터 솔직한 언어로, 설문·상담 내용 직접 인용/반영)"},
    {"label": "Q2", "title": "포인트 제목", "text": "내용"},
    {"label": "Q3", "title": "포인트 제목", "text": "내용"},
    {"label": "Q4", "title": "포인트 제목", "text": "내용"}
  ],
  "hhFinal": "마지막 코멘트 (2~3줄, 격려와 함께 핵심 액션 강조)",

  "consultSummary": [
    {"num": "①", "title": "상담 포인트 제목", "desc": "상담 내용 요약"},
    {"num": "②", "title": "상담 포인트 제목", "desc": "상담 내용 요약"},
    {"num": "③", "title": "상담 포인트 제목", "desc": "상담 내용 요약"}
  ],

  "inputs": {}
}

절대 규칙 — 반드시 지킬 것:
1. 모든 내용은 한국어로 작성하며, 입력된 오타·맞춤법 오류는 출력 시 자동으로 교정한다.
2. 연봉 수치는 반드시 후보자의 실제 업종·직무를 기준으로 웹 검색해서 확인하거나, 위 "기업 유형별 처우 격차 일반 원칙"으로 합리적으로 추정한다. 후보자와 무관한 다른 업종의 수치를 그대로 가져다 쓰지 않는다. 확인 안 된 특정 회사의 정확한 연봉을 사실처럼 단정하지 않는다 (확인 불가 데이터 생성 금지).
3. 이력서 원문에 없는 경력·자격·프로젝트를 추측해서 서술하지 않는다. 이력서에 명시된 사실만 근거로 사용한다.
4. 사전 설문 응답과 유선 상담 내용은 리포트 전반(특히 verdictBody, weaknesses, positioningDesc, fitTable, negotiation, timeline, stratLeft/stratRight, hhPoints, consultSummary)에 구체적으로 녹여낸다. 단순히 한 곳에 인용하고 끝내지 말고, 상담 내용이 실제로 판단에 영향을 준 것처럼 여러 항목에 걸쳐 반영한다. 예를 들어 상담에서 특정 업종에 대한 선호나 우려가 나왔다면 fitTable·stratLeft/stratRight의 우선순위에도 반영하고, 일정 관련 언급이 있었다면 timeline에도 반영한다.
5. 설문/상담 내용이 비어있으면 해당 반영 없이 이력서 기반으로만 작성하고, 없는 내용을 지어내지 않는다.
5-1. 상담 내용이 이력서·설문·②③④ 입력값(희망 직무·타깃 기업 유형·목표 처우 등)과 서로 다르거나 상충되는 경우, 상담 내용을 우선한다 (상담이 가장 최근에 후보자 본인과 직접 나눈 대화이므로). 이때 침묵 속에 그냥 상담 내용으로 덮어쓰지 말고, verdictBody나 positioningDesc 중 한 곳에서 "상담 과정에서 (초기 입력값)에서 (상담 내용)로 방향이 조정되었다"는 식으로 그 변화 자체를 자연스럽게 짚어준다. 이렇게 하면 헤드헌터가 실제로 상담 내용을 반영해 판단한 것처럼 읽힌다.
6. 헤드헌터 코멘트(hhPoints, hhFinal)는 실제 헤드헌터가 구두로 말하는 듯한 자연스러운 현장 언어로 작성한다 (AI가 쓴 듯한 상투적 문구 금지).
7. consultSummary는 상담 내용이 있을 때만 작성하고, 없으면 빈 배열 []로 둔다.
8. inputs 필드는 그대로 {} 로 남겨두세요 (서버에서 채움).
9. verdictBody, positioningDesc, fitTable[].desc, hhPoints[].text 중 최소 3곳 이상에서, 이력서에 실제로 등장하는 회사명·프로젝트명·수치·자격증명을 직접 인용해서 근거로 사용한다. "다양한 프로젝트를 통해", "폭넓은 경험을 바탕으로" 같이 구체적 근거 없이 뭉뚱그린 표현은 사용하지 않는다.
10. fitTable과 negotiation에서 업종을 언급할 때, 후보자의 실제 업종에 맞게 시장에서 통용되는 구체적 지칭을 사용한다 (예: 회계업이면 "4대 회계법인", IT/플랫폼이면 "네카라쿠배급", 제조업이면 "국내 대기업 제조사", 유통·이커머스면 "주요 이커머스 플랫폼사", 헬스케어면 "국내 상위 제약·바이오사" 등 — 반드시 후보자의 실제 업종에 해당하는 지칭만 선택한다). 단, 확인 불가능한 특정 기업명을 임의로 지어내지는 않는다.
10-1. salaryBands, negotiation의 label, hhPoints, verdictBody 등 리포트 어디에도, 후보자가 실제로 금융업(은행·증권·보험·자산운용 등) 종사자이거나 금융업으로 이직을 희망하는 경우가 아니라면 "금융지주", "금융기관", "금융사", "은행", "증권사" 같은 금융업 특정 단어를 절대 사용하지 않는다. 대기업 처우 기준을 예시로 들 때는 업종 특정 없이 "국내 대기업" 또는 후보자의 실제 업종명으로만 표현한다.
11. verdictBody와 hhFinal에서는 "~할 수도 있습니다", "~로 보입니다" 같은 모호한 헤지 표현을 최소화하고, 헤드헌터로서 분명한 의견(추천/비추천, 우선순위)을 제시한다. 근거 없는 단정은 금지하되, 판단은 명확히 한다.
12. 웹 검색으로 실제 확인된 내용이 있으면 verdictBody 또는 timingDesc 중 한 곳에 자연스럽게 반영해 이직 타이밍 판단의 근거로 활용한다. 검색 결과가 없거나 애매하면 이 내용은 절대 언급하지 않는다. 검색된 내용을 길게 인용하지 말고, 사실관계만 한두 문장으로 요약해서 반영한다.
13. 매우 중요: 웹 검색을 몇 번 하든, 검색 결과가 충분하든 부족하든 상관없이, 당신의 마지막 응답은 반드시 순수 JSON 객체 하나여야 한다. "검색 결과를 충분히 찾지 못해서" 같은 설명이나 사과, 코멘트를 절대 텍스트로 남기지 않는다. 검색이 부족하면 그냥 "기업 유형별 처우 격차 일반 원칙"과 이력서·설문·상담 내용만으로 합리적으로 채워서, 어떤 경우에도 완전한 JSON을 응답한다. 마크다운 코드블록도 쓰지 않는다.
14. resumeEdits는 반드시 위에 주어진 "이력서 원문"에 실제로 등장하는 문장이나 구절을 original에 그대로(또는 아주 근접하게) 인용해야 한다. 이력서에 없는 문장을 지어내서 인용하지 않는다. 이력서가 너무 짧거나 고칠 만한 부분이 뚜렷하지 않으면 1개만 작성해도 되고, 억지로 지어내지 않는다. suggested는 실제로 그 문장을 대체할 수 있는 구체적인 문장이어야 하며, "더 좋게 써보세요" 같은 방향 제시가 아니라 완성된 대안 문장이어야 한다.
15. riskFactors는 이 후보자에게 실제로 해당하는 구체적 리스크만 작성한다 (예: 특정 자격 미보유로 특정 티어 지원 제한, 이 직무·연차 조합은 공고 자체가 적어 기간이 길어질 수 있음, 목표 처우가 시장 평균보다 높아 눈높이 조정이 필요할 수 있음 등). 모든 리포트에 붙일 수 있는 뻔한 경고("이직은 신중해야 합니다" 등)는 쓰지 않는다. 근거 없이 겁을 주기 위한 과장도 하지 않는다 — 사실 기반으로 담담하게 짚는다.
16. 매우 중요 — salaryBands의 left와 width는 눈대중이 아니라 실제로 계산해야 한다. 절차: (1) 5개 band의 range에 들어갈 실제 금액(억원)들을 먼저 정한다. (2) 그 중 가장 낮은 금액을 SCALE_MIN, 가장 높은 금액에 10~20% 여유를 더한 값을 SCALE_MAX로 정한다. (3) 각 band의 left = (해당 band의 하한값 - SCALE_MIN) / (SCALE_MAX - SCALE_MIN) * 100, width = (해당 band의 상한값 - 하한값) / (SCALE_MAX - SCALE_MIN) * 100 로 계산해서 정수로 반올림한다. (4) "현재 처우"가 단일 확정값이면 width는 3~5 정도의 얇은 마커로 표시한다. 이 계산을 생략하고 임의의 숫자를 넣지 않는다 — 금액 크기와 막대 길이가 실제로 비례하지 않으면 이 그래프는 없는 것보다 나쁘다.
17. 매우 중요 — timingLabel은 절대 항상 "즉시 실행기"로 단정하지 않는다. 반드시 아래 절차로 판단한다:
   (1) 이력서 원문의 날짜 정보를 근거로 "현재 재직 여부"와 "현재 회사 재직 기간"을 먼저 추론한다. 이력서 마지막 경력이 종료일 없이 "현재", "재직중" 등으로 표시되어 있거나 최신 날짜면 재직 중으로 본다. 최근 경력에 명확한 종료일이 있고 그 이후 공백이 있으면 구직 중으로 본다.
   (2) 재직 중이 아니면(구직 중) → "즉시 실행기".
   (3) 재직 중이면 재직 기간과 이력서·설문·상담에 나타난 신호를 종합해서 아래 중 하나를 고른다:
       - 재직 기간이 길고(대략 3년 이상) 승진 정체·역할 정체 등 성장 둔화 신호가 있으면 → "즉시 실행기"
       - 재직 기간이 애매하거나(1~3년) 뚜렷한 신호가 부족하면 → "시장 탐색기"
       - 재직 기간이 짧고(1년 미만) 최근 승진·입사 등으로 아직 회사 내 성장 여지가 남아 보이면 → "성장 재평가기"
       - 재직 기간이 매우 짧거나(6개월 미만) 이직을 반복한 이력이 있어 한 곳에 정착이 필요해 보이면 → "관망 권장기"
   (4) 위 기준은 참고 원칙이며, 이력서·설문·상담 내용에 이와 다른 명확한 근거가 있으면 그걸 우선한다. timingDesc·timingBody에는 반드시 재직 여부·재직 기간 등 실제로 판단에 쓴 근거를 구체적으로 밝힌다 (예: "현재 재직 8개월차로 아직 온보딩 초기 단계").`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
      messages: [{ role: 'user', content: prompt }]
    });

    // 웹 검색 도구 사용 시 응답에 text 블록이 여러 개 섞여 올 수 있고,
    // 그중 일부는 JSON이 아닌 설명 텍스트일 수 있으므로,
    // 뒤에서부터 순회하며 실제로 JSON으로 파싱되는 블록을 찾는다 (방어 로직)
    const textBlocks = response.content.filter(b => b.type === 'text');
    let content = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '';
    let analysis = null;
    let lastError = null;

    for (let idx = textBlocks.length - 1; idx >= 0; idx--) {
      const candidate = textBlocks[idx].text;
      const clean = candidate.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try {
        analysis = JSON.parse(clean);
        content = candidate;
        break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!analysis) {
      return res.status(500).json({
        error: '리포트 데이터 파싱 실패: ' + (lastError ? lastError.message : '알 수 없는 오류'),
        stopReason: response.stop_reason,
        contentLength: content.length,
        contentEnd: content.substring(content.length - 300),
        textBlockCount: textBlocks.length
      });
    }

    // ── 방법론 정보는 AI에게 맡기지 않고 서버가 실제 데이터로 직접 계산 (신뢰도 확보) ──
    analysis.methodology = {
      hasSurvey: !!(i.surveyContent && i.surveyContent.trim()),
      hasConsult: !!(i.consultContent && i.consultContent.trim()),
      searchCount: (response.usage && response.usage.server_tool_use && response.usage.server_tool_use.web_search_requests) || 0
    };

    return res.status(200).json({ inputs, analysis });

  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message || '리포트 생성 중 오류' });
  }
}
