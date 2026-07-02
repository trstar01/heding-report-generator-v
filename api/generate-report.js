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
      large: '대기업 금융사 우선',
      foreign: '외국계 금융기관 우선',
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

## 웹 검색 지시사항 (web_search 도구 사용)
아래 두 가지를 반드시 웹 검색으로 확인한 뒤 리포트에 반영하세요. 검색 없이 추측으로 작성하지 마세요.
1. "${i.currentCompany}" 관련 최근 뉴스·이슈 (실적, 구조조정, 투자유치, 조직개편 등 이직 타이밍 판단에 참고될 만한 것)
2. "${targetTypeDesc}" 유형 기업들의 최근 채용 시장 동향 (채용 확대/축소, 최근 이 업계에서 화제가 된 이직 사례 등)
검색 결과가 없거나 관련성이 낮으면 억지로 반영하지 말고, 이력서·설문·상담 내용 기반으로만 작성하세요.

## HEDING 시장 데이터 (연봉 수치는 반드시 이 범위 내에서만 제시)
- 대기업 금융지주 팀장급: 1.5~2.0억
- 대기업 금융지주 임원급: 2.0~2.5억
- 외국계 금융기관: 0.9~1.5억 (RSU 가능)
- 중견기업 팀장급: 0.9~1.3억
- 스타트업: 0.8~1.2억 + RSU/스톡옵션

## 공개 통계 (출처가 명확한 것만 사용 가능)
- 회계사 직군 2024년 연봉 인상률: 11~14% (잡플래닛 127만건 고용보험 연동 데이터)
- 이직 시 희망 연봉 인상률 평균: 11.8% (잡코리아 1,088명 설문 2025)

다음 JSON을 생성하세요. 마크다운 없이 순수 JSON만 응답:

{
  "grade": "A+ 또는 A 또는 B+ 등 (후보자 경쟁력 기반)",
  "gradeSummary": "종합 경쟁력 한 문단 (2~3줄, 구체적 강점 포함)",

  "kpis": [
    {"label": "현재 처우", "value": "${i.currentSalary || '-'}", "sub": "기본급 기준"},
    {"label": "시장 저평가", "value": "~X0%", "sub": "구조적 저평가"},
    {"label": "현실 협상 목표", "value": "X~X억", "sub": "즉시 이직 시"},
    {"label": "이직 타이밍", "value": "지금", "sub": "구체적 이유 한 줄"}
  ],

  "verdictTitle": "핵심 진단 제목 (15자 이내, 임팩트 있게)",
  "verdictBody": "핵심 진단 본문 (3~4줄, 헤드헌터 솔직한 시각으로, 강점과 가장 큰 문제점 지적, 설문·상담 내용 반영)",

  "undervaluation": "~X0%",
  "timingLabel": "지금",
  "timingDesc": "이유 한 줄",

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
  "marketVerdictDesc": "시장 가치 판단 설명 (3~4줄, HEDING 시장 데이터 범위 내 수치만 사용)",
  "marketRange": "X~X억 (HEDING 데이터 범위 내)",
  "negotiationTarget": "X~X억 (HEDING 데이터 범위 내)",

  "salaryBands": [
    {"label": "현재 처우 (확인값)", "left": 0, "width": 22, "color": "rgba(255,255,255,.15)", "range": "${i.currentSalary || '-'} ◀", "highlight": true},
    {"label": "스타트업 CFO·재무총괄", "left": 8, "width": 24, "color": "rgba(255,255,255,.25)", "range": "0.8 – 1.2억 +RSU"},
    {"label": "중견·외국계 팀장급", "left": 12, "width": 32, "color": "rgba(255,255,255,.35)", "range": "0.9 – 1.5억"},
    {"label": "대기업 금융지주 팀장급", "left": 30, "width": 40, "color": "var(--gold2)", "range": "1.5 – 2.0억 ★목표"},
    {"label": "대기업 금융지주 임원급", "left": 50, "width": 50, "color": "rgba(255,255,255,.3)", "range": "2.0 – 2.5억+"}
  ],

  "negotiation": [
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억 (HEDING 데이터 범위 내)", "tip": "협상 팁"},
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억", "tip": "협상 팁"},
    {"position": "포지션명", "company": "대상 기업 유형", "level": "레벨", "range": "X~X억", "tip": "협상 팁"}
  ],

  "timingTitle": "이직 타이밍 제목",
  "timingBody": "타이밍 설명 (2~3줄, 이직 활동 기간 입력값 반영)",

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
2. 연봉·통계 수치는 위에 제공된 "HEDING 시장 데이터"와 "공개 통계"에 명시된 값과 범위 내에서만 사용한다. 그 외의 수치, 회사명, 통계는 절대 임의로 만들어내지 않는다 (확인 불가 데이터 생성 금지).
3. 이력서 원문에 없는 경력·자격·프로젝트를 추측해서 서술하지 않는다. 이력서에 명시된 사실만 근거로 사용한다.
4. 사전 설문 응답과 유선 상담 내용은 리포트 전반(특히 verdictBody, weaknesses, positioningDesc, fitTable, stratLeft/stratRight, hhPoints, consultSummary)에 구체적으로 녹여낸다. 설문·상담에서 나온 표현이나 우려사항을 직접 반영한다.
5. 설문/상담 내용이 비어있으면 해당 반영 없이 이력서 기반으로만 작성하고, 없는 내용을 지어내지 않는다.
6. 헤드헌터 코멘트(hhPoints, hhFinal)는 실제 헤드헌터가 구두로 말하는 듯한 자연스러운 현장 언어로 작성한다 (AI가 쓴 듯한 상투적 문구 금지).
7. consultSummary는 상담 내용이 있을 때만 작성하고, 없으면 빈 배열 []로 둔다.
8. inputs 필드는 그대로 {} 로 남겨두세요 (서버에서 채움).
9. verdictBody, positioningDesc, fitTable[].desc, hhPoints[].text 중 최소 3곳 이상에서, 이력서에 실제로 등장하는 회사명·프로젝트명·수치·자격증명을 직접 인용해서 근거로 사용한다. "다양한 프로젝트를 통해", "폭넓은 경험을 바탕으로" 같이 구체적 근거 없이 뭉뚱그린 표현은 사용하지 않는다.
10. fitTable과 negotiation에서 업종을 언급할 때, 가능하면 해당 업종 내 실제로 존재하는 한국 기업 유형(예: "4대 회계법인", "국내 3대 금융지주" 같이 시장에서 통용되는 구체적 지칭)을 사용한다. 단, 확인 불가능한 특정 기업명을 임의로 지어내지는 않는다.
11. verdictBody와 hhFinal에서는 "~할 수도 있습니다", "~로 보입니다" 같은 모호한 헤지 표현을 최소화하고, 헤드헌터로서 분명한 의견(추천/비추천, 우선순위)을 제시한다. 근거 없는 단정은 금지하되, 판단은 명확히 한다.
12. 웹 검색으로 실제 확인된 내용이 있으면 verdictBody 또는 timingDesc 중 한 곳에 자연스럽게 반영해 이직 타이밍 판단의 근거로 활용한다. 검색 결과가 없거나 애매하면 이 내용은 절대 언급하지 않는다. 검색된 내용을 길게 인용하지 말고, 사실관계만 한두 문장으로 요약해서 반영한다.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }]
    });

    // 웹 검색 도구 사용 시 응답에 text 블록이 여러 개 섞여 올 수 있으므로,
    // 마지막 text 블록(최종 JSON 응답)만 추출
    const textBlocks = response.content.filter(b => b.type === 'text');
    const content = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '';

    let analysis;
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({
        error: '리포트 데이터 파싱 실패: ' + e.message,
        stopReason: response.stop_reason,
        contentLength: content.length,
        contentEnd: content.substring(content.length - 300)
      });
    }

    return res.status(200).json({ inputs, analysis });

  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: err.message || '리포트 생성 중 오류' });
  }
}
