import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '60mb' } } // 이력서+포트폴리오 원본 파일(각 base64, 최대 20MB)이 동시에 첨부될 수 있음을 감안
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resumeText, resumeFileBase64, resumeFileMediaType, portfolioText, portfolioFileBase64, portfolioFileMediaType, inputs } = req.body;
    const useVisionForResume = !!(resumeFileBase64 && resumeFileMediaType);
    const useVisionForPortfolio = !!(portfolioFileBase64 && portfolioFileMediaType);
    const i = inputs;

    const trimmedResume = (resumeText || '').length > 20000 ? resumeText.slice(0, 20000) : (resumeText || '이력서 미첨부');
    const trimmedPortfolio = (portfolioText || '').length > 20000 ? portfolioText.slice(0, 20000) : (portfolioText || '포트폴리오 미첨부');

    const prompt = `당신은 HEDING의 시니어 헤드헌터입니다. 헤드헌팅 경력 16년 이상, AI 콘텐츠 제작(영상·이미지 등) 분야 취업 준비생을 다수 컨설팅한 경험이 있는 전문가로서, 이 교육생의 취업 준비 상태를 진단하고 실질적으로 도움이 되는 조언을 제시하세요.

이 사람은 "AI 영상 콘텐츠 제작·기획" 교육 과정을 이수했고, 특정 업종에 국한되지 않고 AI 툴로 콘텐츠(이미지·영상 등)를 제작하는 다양한 기업에 지원하려는 취업준비생입니다. 이력서상의 정규직 경력이 부족할 수 있으나, 교육 기간·대학교 실습 경험도 정당한 실무 경험으로 취급하세요. 신입/커리어 전환자 특성을 감안해서, 시니어 경력직 대상 리포트와는 다른 톤(더 실질적이고, 지원 전략 중심)으로 작성하세요.

절대 "다양한 프로젝트를 통해", "성실하게 임했습니다", "열심히 하겠습니다" 같이 어느 지원자에게나 붙일 수 있는 문구를 쓰지 마세요. 이 사람의 실제 이력서·포트폴리오·설문 내용에서 나온 구체적 사실만 근거로 삼으세요.

## 후보자 정보
- 이름: ${i.candidateName}
- 현재 취업/이직 준비 상황: ${i.jobSearchStatus || '-'}
- 기존 전공 또는 이전 경력: ${i.priorBackground || '-'}
- 목표 취업 포지션: ${i.targetPositions || '-'}
- 주로 다룰 수 있는 AI 툴: ${i.aiTools || '-'}
- 최근 지원 기업 및 전형 단계: ${i.recentApplications || '없음'}
- 불합격 사유 (자체 분석/피드백): ${i.rejectionReasons || '없음'}
- 관심 있거나 지원 예정인 기업: ${i.interestedCompanies || '-'}
- 최근 직장 연봉: ${i.recentSalary || '없음 (신입 또는 첫 취업 준비)'}
- 희망 연봉: ${i.desiredSalary || '-'}
- 포트폴리오 웹 링크: ${i.portfolioLink || '없음'}
- 기타 요청사항: ${i.otherRequests || '없음'}

${useVisionForResume
  ? '## 이력서\n이 메시지에 이력서 PDF 파일이 첨부되어 있습니다. 텍스트 추출이 되지 않는 이미지·디자인 위주 이력서이므로, 첨부된 파일을 직접 보고 분석하세요. 텍스트를 그대로 인용하는 대신, 실제로 본 내용을 구체적으로 서술하세요.'
  : `## 이력서 원문\n${trimmedResume}`}

${useVisionForPortfolio
  ? '## 포트폴리오\n이 메시지에 포트폴리오 PDF 파일이 첨부되어 있습니다. 텍스트 추출이 되지 않는 이미지·디자인 위주의 파일이므로, 첨부된 파일을 직접 보고(페이지의 이미지, 레이아웃, 프로젝트 스크린샷 등) 분석하세요. 문서 내 텍스트를 그대로 인용하는 대신, "N페이지의 OO 프로젝트에서는..." 처럼 실제로 본 내용을 구체적으로 서술하세요. 영상 링크가 있어도 실제 영상을 재생해서 볼 수는 없으니, 페이지에 보이는 썸네일·설명·구성만으로 판단하세요.'
  : `## 포트폴리오 원문 (텍스트 추출본)\n${trimmedPortfolio}`}

다음 JSON을 생성하세요. 마크다운 없이 순수 JSON만 응답:

{
  "summary": "이 지원자의 취업 준비 상태에 대한 헤드헌터로서의 솔직한 종합 소견 (2~3줄, 등급이나 점수 없이 서술형). 목표 포지션·AI 툴 대비 현재 준비 상태를 구체적으로 언급한다.",

  "portfolioStrengths": [
    {"title": "강점 제목", "desc": "포트폴리오에서 실제로 발견한 구체적 강점 (1~2줄)"}
  ],
  "portfolioImprovements": [
    {"original": "텍스트 기반이면 원문 그대로 인용, 이미지 기반이면 어느 페이지·프로젝트에서 무엇을 봤는지 구체적으로 서술", "suggested": "구체적 개선 제안", "reason": "왜 이렇게 바꿔야 하는지, 채용담당자 관점에서"}
  ],

  "resumeEdits": [
    {"original": "이력서 원문에서 실제로 인용", "suggested": "개선 제안 (교육·실습 경험을 정당한 실무 경험으로 재구성)", "reason": "이유 한 줄"}
  ],

  "applicationStrategy": "목표 포지션(${i.targetPositions})과 보유 AI 툴(${i.aiTools})을 근거로 한 구체적 지원 전략 (2~3줄). 관심 기업이 있으면 그 기업 유형에 맞게 조언한다.",

  "rejectionFeedback": "불합격 사유가 입력되어 있으면, 그 사유에 대한 구체적이고 실행 가능한 대응 방안 (2~3줄). 입력이 없으면 빈 문자열로 둔다.",

  "salaryNote": "희망 연봉과 최근 연봉·시장 상황을 비교한 현실적 코멘트 (1~2줄). 신입이라 최근 연봉이 없으면 시장 진입 단계 기준으로 조언한다.",

  "actionPlan": [
    "지금 당장 할 수 있는 구체적 실행 항목 (3~5개, 순서대로)"
  ],

  "consultantNote": "담당 컨설턴트가 이 지원자에게 개인적으로 남기는 코멘트 (3~4줄). 이력서·포트폴리오에서 실제로 발견한 구체적 사실을 최소 1개 이상 언급하고, 기타 요청사항이 있으면 직접 답한다. 실제 헤드헌터가 구두로 말하는 듯한 자연스러운 현장 언어로 쓴다.",

  "inputs": {}
}

절대 규칙 — 반드시 지킬 것:
1. 모든 내용은 한국어로 작성하며, 입력된 오타·맞춤법 오류는 자동 교정한다.
2. resumeEdits의 original은, 이력서가 텍스트 기반이면 원문에서 실제로 발췌하고, 이미지 기반(첨부 파일 직접 분석)이면 실제로 확인한 내용을 구체적으로 서술한다. portfolioImprovements의 original도 같은 기준(텍스트면 발췌, 이미지면 서술)을 따른다. 어느 경우든 지어내지 않는다 — 확신이 없으면 해당 항목을 생략한다.
3. 후보자를 호칭할 때 절대 "OO씨"를 쓰지 않는다. 반드시 "${i.candidateName} 님"으로 호칭한다.
4. 등급이나 점수(A+, 85점 등)를 절대 매기지 않는다. summary는 서술형으로만 작성한다.
5. actionPlan은 이 사람의 실제 상황(목표 포지션, 보유 툴, 불합격 이력 등)에 맞는 구체적 항목이어야 하며, "포트폴리오를 보완하세요" 같은 뭉뚱그린 조언은 금지한다 — "OO 프로젝트에 클라이언트 요구사항 대비 결과물 지표(조회수·전환율 등)를 추가하세요"처럼 구체적으로 쓴다.
6. 포트폴리오가 미첨부 상태면 portfolioStrengths·portfolioImprovements는 빈 배열로 두고, 그 사실을 summary나 actionPlan에서 자연스럽게 언급한다.
7. consultantNote는 이 리포트에서 가장 개인적인 부분이다. "화이팅입니다" 같은 어디에나 붙일 수 있는 응원 문구로 끝내지 않는다.
8. inputs 필드는 만들지 않는다 (서버에서 별도 처리).`;

    // ── 안전망: 파싱 실패 시 최대 2회까지 자동 재시도 ──
    const MAX_ATTEMPTS = 2;
    let response, textBlocks = [], content = '', analysis = null, lastError = null, attemptsUsed = 0;

    // 이력서·포트폴리오 중 이미지 기반인 것이 있으면, 각각 문서 블록으로 첨부 (둘 다일 수도, 하나만일 수도 있음)
    const documentBlocks = [];
    if (useVisionForResume) {
      documentBlocks.push({ type: 'document', source: { type: 'base64', media_type: resumeFileMediaType, data: resumeFileBase64 } });
    }
    if (useVisionForPortfolio) {
      documentBlocks.push({ type: 'document', source: { type: 'base64', media_type: portfolioFileMediaType, data: portfolioFileBase64 } });
    }
    const requestContent = documentBlocks.length > 0
      ? [...documentBlocks, { type: 'text', text: prompt }]
      : prompt;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attemptsUsed = attempt;

      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: requestContent }]
      });

      textBlocks = response.content.filter(b => b.type === 'text');
      content = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : '';
      analysis = null;

      for (let idx = textBlocks.length - 1; idx >= 0; idx--) {
        const candidate = textBlocks[idx].text;
        let clean = candidate.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

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

      if (analysis) break;

      console.error(`취업컨설팅 파싱 실패 (${attempt}/${MAX_ATTEMPTS}차 시도)` + (attempt < MAX_ATTEMPTS ? ' — 자동 재시도합니다' : ' — 재시도 소진'));
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
    console.error('Generate employment consulting error:', err);
    return res.status(500).json({ error: err.message || '취업 컨설팅 리포트 생성 중 오류' });
  }
}
