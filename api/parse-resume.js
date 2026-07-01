import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } } // 텍스트만 받으므로 충분 (원본 파일 용량과 무관)
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resumeText, filename } = req.body;
    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ error: '이력서 텍스트가 비어있거나 너무 짧습니다.' });
    }

    // 너무 긴 경우 앞부분 위주로 사용 (핵심 정보는 보통 상단에 위치)
    const trimmedText = resumeText.length > 30000 ? resumeText.slice(0, 30000) : resumeText;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `아래는 이력서(${filename || '파일'})에서 추출한 텍스트입니다. 이 사람의 핵심 정보를 추출해주세요.
오타나 띄어쓰기 오류가 있으면 자동으로 교정해서 반영하세요.
정보가 명확하지 않으면 빈 문자열로 두고, 절대 추측해서 지어내지 마세요.

JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만:

{
  "name": "이름 (한글, 명시된 경우만)",
  "company": "현재(또는 가장 최근) 소속 회사명",
  "title": "현재 직급/직위",
  "career": "총 경력 (예: 8년 10개월 — 이력서에 명시된 값 또는 입사일~현재로 계산)",
  "salary": "연봉 정보 (이력서에 명시된 경우만, 없으면 빈 문자열)",
  "certifications": "보유 자격증 목록 (쉼표 구분)",
  "education": "최종 학력"
}

이력서 텍스트:
"""
${trimmedText}
"""`
      }]
    });

    const content = response.content[0].text;

    let extracted;
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(clean);
    } catch {
      extracted = {};
    }

    return res.status(200).json({ extracted });

  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: err.message || '이력서 정보 추출 중 오류가 발생했습니다' });
  }
}
