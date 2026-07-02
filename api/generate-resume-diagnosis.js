import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } } // 텍스트만 받으므로 충분
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resumeText, inputs } = req.body;
    const i = inputs;

    const trimmedResume = (resumeText || '').length > 25000 ? resumeText.slice(0, 25000) : (resumeText || '이력서 미첨부');

    const prompt = `당신은 HEDING의 시니어 헤드헌터입니다. 헤드헌팅 경력 16년 이상, 이력서 첨삭을 수백 건 해왔고, 실제로 채용담당자가 이력서를 어떻게 훑어보는지(평균 6~30초, 정량적 수치 위주로 스캔, 모호한 형용사는 무시) 알고 있는 전문가로서 진단하세요.

절대 "다양한 프로젝트를 통해", "폭넓은 경험을 바탕으로", "성실하게 업무를 수행함", "책임감을 가지고", "우수한 역량을 보유", "성장하고 싶어서", "새로운 도전을 위해" 같이 어느 이력서에나 붙일 수 있는 문구를 improved에 쓰지 마세요. 그런 문구가 하나라도 남아있으면 개선이 아니라 자리만 바꾼 것입니다. original에 있던 모호한 표현을 개선할 땐, 반드시 구체적 숫자·직함·프로젝트명으로 대체하세요 (이력서에 실제로 있는 정보 안에서).

아래 후보자의 이력서를 섹션별로 진단하고 개선안을 제시하세요.

## 후보자 정보
- 이름: ${i.candidateName}
- 현 소속: ${i.currentCompany || '-'}
- 직급: ${i.currentTitle || '-'}
- 경력: ${i.careerYears || '-'}
- 자격증: ${i.certifications || '없음'}

## 이력서 원문 (텍스트 추출본)
${trimmedResume}

## 참고 컨텍스트 (있는 경우만)
사전 설문: ${i.surveyContent || '없음'}
상담 내용: ${i.consultContent || '없음'}

이 이력서를 실제로 존재하는 섹션(예: 경력 요약, 회사별 경력 사항, 주요 성과, 보유 스킬, 학력·자격증 등 — 이력서에 실제로 있는 섹션만) 단위로 나누어, 각 섹션마다 원문과 개선안을 나란히 비교하는 JSON을 생성하세요.

다음 JSON을 생성하세요. 마크다운 없이 순수 JSON만 응답:

{
  "overallSummary": "이력서 전체를 검토한 헤드헌터로서의 솔직한 총평 (2~3줄, 등급이나 점수 없이 서술형으로) — 잘 된 점과 가장 큰 문제점을 함께 언급",

  "topPriorities": [
    "가장 시급하게 고쳐야 할 것 1순위 (한 줄, 구체적으로)",
    "2순위",
    "3순위"
  ],

  "sections": [
    {
      "sectionName": "이력서에 실제로 있는 섹션명 (예: 경력 요약, OO회사 재직 경험, 주요 성과, 보유 스킬 등)",
      "original": "이 섹션에 해당하는 이력서 원문을 실제로 그대로 인용 (요약하지 말고 원문 그대로)",
      "improved": "헤드헌터 관점에서 완성된 개선 버전 전체 (조언이 아니라 실제로 채용담당자가 볼 완성된 문장/문단)",
      "changes": ["구체적으로 뭐가 바뀌었는지 1~3개 (예: 정량적 성과 수치 추가, 수동적 표현을 능동적 성과 중심으로 전환, 직무 키워드 강화 등)"],
      "reason": "왜 이렇게 바꿔야 하는지 한 줄"
    }
  ],

  "consultantNote": "담당 컨설턴트가 이 후보자에게 개인적으로 남기는 코멘트 (3~4줄). 사전 설문·상담 내용이 있으면 그 내용을 직접 언급하며 반영하고, 없으면 이력서 전체를 검토한 헤드헌터로서의 솔직한 소견을 담는다. 실제 헤드헌터가 구두로 말하는 듯한 자연스러운 현장 언어로 쓰고, AI가 쓴 듯한 상투적 문구는 금지한다."
}

절대 규칙 — 반드시 지킬 것:
1. 모든 내용은 한국어로 작성하며, 입력된 오타·맞춤법 오류는 출력 시 자동으로 교정한다.
2. sections는 이력서에 실제로 존재하는 섹션만 다룬다. 이력서에 없는 섹션(예: 자격증이 없는데 자격증 섹션)을 지어내서 만들지 않는다.
3. 각 section의 original은 반드시 이력서 원문에서 실제로 발췌한 텍스트여야 한다. 요약하거나 재구성하지 말고 원문 그대로(또는 아주 근접하게) 인용한다. 이력서에 실제로 없는 내용을 original로 지어내지 않는다 — 이건 후보자가 가장 빨리 알아채는 신뢰 문제이므로 매우 중요하다. 원문을 정확히 인용할 자신이 없으면 그 섹션은 통째로 생략한다.
4. improved는 실제로 완성된 최종 문장/문단이어야 하며, "이렇게 고치면 좋습니다" 같은 조언형 문장이 아니다. 이력서에 없는 경력·자격·수치를 지어내서 improved에 추가하지 않는다 — 표현과 구조는 개선하되, 사실을 조작하지 않는다.
5. changes 배열은 구체적인 변경 근거여야 하며, "더 좋게 표현함" 같이 뭉뚱그린 표현은 쓰지 않는다. 모든 섹션에 똑같은 이유(예: 매번 "정량적 성과 수치 추가"만 반복)를 붙이지 말고, 그 섹션의 실제 원문 문제에 맞는 서로 다른 이유를 쓴다 (예: 수동태→능동태 전환, 직무 키워드 강화, 중복 표현 제거, 임팩트 있는 동사로 교체, 최신 경력을 앞으로 재배치 등).
6. 강점만 늘어놓지 말고, 실제 문제(약한 동사, 성과 수치 부재, 두루뭉술한 표현, 직무 키워드 부족 등)를 정확히 짚는다.
7. sections는 이력서 분량에 따라 보통 4~8개 정도가 자연스럽다. 너무 잘게 쪼개거나 억지로 늘리지 않는다.
8. 사전 설문·상담 내용이 있으면, 그 맥락(예: 강조하고 싶은 경험, 목표 직무)을 개선 방향에 반영한다. 없으면 이력서 자체의 완성도만 기준으로 판단한다.
9. reason은 일반적인 첨삭 조언이 아니라, 실제 채용담당자·헤드헌터가 이력서를 검토하는 방식에 근거해서 써야 한다 (예: "서류 검토자는 문장을 끝까지 읽지 않고 굵은 수치·직함부터 훑기 때문에", "이 직무 채용공고에는 보통 이 키워드가 자동 스크리닝 기준으로 쓰이기 때문에" 등 — 실제 근거가 이력서·직무 맥락에서 나와야 하며, 근거 없이 일반론만 쓰지 않는다).
10. overallSummary와 topPriorities도 "이력서를 더 다듬으세요" 식이 아니라, 이 이력서를 처음 본 헤드헌터가 실제로 갖는 첫인상과 판단을 담아야 한다.
11. consultantNote는 이 리포트 전체에서 가장 개인적인 부분이다. 담당 컨설턴트(${i.consultantName || '담당 컨설턴트'})가 이 후보자만 보고 쓴 것처럼, 이력서에서 실제로 발견한 구체적 사실을 최소 1개 이상 직접 언급한다. "이력서를 잘 다듬으시면 좋겠습니다" 같은 어디에나 붙일 수 있는 마무리 문구는 금지한다.
11-1. 후보자를 호칭할 때 절대 "OO씨"를 쓰지 않는다 (친근함을 의도해도 격식 없는 표현으로 읽혀 무례하게 느껴질 수 있다). 반드시 "OO님"으로 호칭한다. 성이나 이름 없이 그냥 "님"만 쓰는 것도 어색하니, 이름을 아는 경우 "${i.candidateName} 님" 형태로 자연스럽게 쓴다.
12. inputs 필드는 만들지 않는다 (서버에서 별도 처리).`;

    // ── 안전망: 파싱 실패 시 최대 2회까지 자동 재시도 ──
    const MAX_ATTEMPTS = 2;
    let response, textBlocks = [], content = '', analysis = null, lastError = null, attemptsUsed = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attemptsUsed = attempt;

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }]
      });

      textBlocks = response.content.filter(b => b.type === 'text');
      content = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '';
      analysis = null;

      for (let idx = textBlocks.length - 1; idx >= 0; idx--) {
        const candidate = textBlocks[idx].text;
        let clean = candidate.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // 텍스트 앞뒤에 설명 문구가 섞여 있어도, 그 안에 파묻힌 JSON 덩어리만 뽑아서 시도 (2차 방어)
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        const extracted = (firstBrace !== -1 && lastBrace > firstBrace)
          ? clean.substring(firstBrace, lastBrace + 1)
          : clean;

        try {
          analysis = JSON.parse(extracted);
          content = candidate;
          break;
        } catch (e) {
          lastError = e;
        }
      }

      if (analysis) break; // 성공하면 재시도 없이 즉시 종료

      console.error(`이력서 진단 파싱 실패 (${attempt}/${MAX_ATTEMPTS}차 시도)` + (attempt < MAX_ATTEMPTS ? ' — 자동 재시도합니다' : ' — 재시도 소진'));
    }

    if (!analysis) {
      return res.status(500).json({
        error: `리포트 데이터 파싱 실패 (자동 재시도 ${MAX_ATTEMPTS}회 소진): ` + (lastError ? lastError.message : '알 수 없는 오류'),
        stopReason: response.stop_reason,
        contentLength: content.length,
        contentEnd: content.substring(content.length - 300),
        textBlockCount: textBlocks.length,
        attemptsUsed
      });
    }

    return res.status(200).json({ inputs, analysis });

  } catch (err) {
    console.error('Generate resume diagnosis error:', err);
    return res.status(500).json({ error: err.message || '이력서 진단 생성 중 오류' });
  }
}
