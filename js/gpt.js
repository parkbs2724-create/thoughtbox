import { getSettings } from './storage.js';

const API_URL = 'https://api.openai.com/v1/chat/completions';

export async function analyzeThought(newThought, existingThoughts) {
  const settings = getSettings();
  
  if (!settings.apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const context = settings.context || '청년후계농 창업 준비';
  
  const systemPrompt = `당신은 사용자의 아이디어와 생각을 정리하고 연결해주는 'ThoughtBox'의 AI 어시스턴트입니다.
사용자의 현재 컨텍스트는 '${context}'입니다. 

임무:
1. 새로 추가된 생각에 대해 통찰력 있고 실질적인 피드백을 제공하세요. (2~3문장)
2. 기존 생각들과의 연관성을 분석하고 0.0에서 1.0 사이의 연결 강도(strength)를 평가하세요. (0.7 이상만 포함)
3. 기존 생각들과의 연결 고리가 약하거나 새로운 관점이 필요하다면, 두 생각을 이어줄 수 있는 창의적이고 실행 가능한 '브릿지 아이디어(Bridge Idea)'를 1개 제안하세요.

응답 형식 (반드시 JSON 형식을 지키세요):
{
  "feedback": "AI 피드백 텍스트...",
  "connections": [
    { "targetId": "기존생각ID", "strength": 0.85, "reason": "연결 이유..." }
  ],
  "bridgeIdeas": [
    { "idea": "브릿지 아이디어 내용...", "connectsFrom": "새로운생각ID", "connectsTo": "기존생각ID", "reason": "제안 이유..." }
  ]
}

주의사항:
- 항상 자연스러운 한국어로 답변하세요.
- 격려하면서도 분석적인 태도를 유지하세요.
- 농업 창업 등 실무적인 관점에서의 현실적인 조언이나 통찰을 포함하면 좋습니다.
- 명백한 연결뿐만 아니라 겉보기에 무관해 보이는 생각들 사이의 숨겨진 연결성을 찾아내세요.`;

  const recentThoughts = existingThoughts.slice(0, 50).map(t => ({
    id: t.id,
    content: t.content,
    category: t.category
  }));

  const userMessage = `새로운 생각:
ID: ${newThought.id}
카테고리: ${newThought.category}
내용: ${newThought.content}

기존 생각 목록:
${JSON.stringify(recentThoughts, null, 2)}`;

  return await callGPT(systemPrompt, userMessage);
}

export async function suggestBridgeIdea(thoughtA, thoughtB) {
  const settings = getSettings();
  
  if (!settings.apiKey) {
    throw new Error('API_KEY_MISSING');
  }
  
  const context = settings.context || '청년후계농 창업 준비';
  
  const systemPrompt = `당신은 사용자의 생각을 연결해주는 창의적인 AI입니다. 현재 사용자의 관심사는 '${context}'입니다.
두 개의 서로 다른 생각이 주어집니다. 이 두 생각을 하나로 묶어 새로운 통찰이나 실행 가능한 아이디어를 창출하는 '브릿지 아이디어'를 딱 1개 제안해주세요.

응답 형식 (JSON):
{
  "idea": "두 생각을 잇는 창의적인 브릿지 아이디어...",
  "reason": "왜 이 아이디어가 두 생각을 잘 연결하는지에 대한 설명..."
}`;

  const userMessage = `생각 A: [${thoughtA.category}] ${thoughtA.content}
생각 B: [${thoughtB.category}] ${thoughtB.content}`;

  return await callGPT(systemPrompt, userMessage);
}

async function callGPT(systemPrompt, userMessage) {
  const settings = getSettings();
  
  if (!settings.apiKey) {
    throw new Error('API_KEY_MISSING');
  }
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
