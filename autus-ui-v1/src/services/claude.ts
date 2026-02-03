/**
 * AUTUS Claude AI Service
 * Decision assistance and auto-classification
 */

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Send message to Claude API
 */
export async function sendToClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!CLAUDE_API_KEY) {
    console.warn('Claude API key not configured');
    return '';
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Fast & cheap for classification
        max_tokens: 500,
        system: systemPrompt || AUTUS_SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();
    return data.content[0]?.text || '';
  } catch (error) {
    console.error('Claude API error:', error);
    return '';
  }
}

// ============================================
// AUTUS-specific prompts
// ============================================

const AUTUS_SYSTEM_PROMPT = `You are AUTUS AI, a decision-acceleration assistant for academy operations.

Your role:
1. Classify decisions by cost (LOW/MED/HIGH)
2. Assess reversibility (easy/hard)
3. Estimate blast radius (local/segment/global)
4. Recommend action (APPROVE/DENY/DEFER)

Rules:
- Money decisions (refund, discount) = always require approval
- Relation decisions (teacher change) = always require approval
- Liability decisions (safety, legal) = always require approval
- Be concise. No explanations unless asked.

Response format (JSON only):
{
  "cost": "LOW|MED|HIGH",
  "reversibility": "easy|hard",
  "blast_radius": "local|segment|global",
  "recommendation": "APPROVE|DENY|DEFER",
  "confidence": 0.0-1.0
}`;

/**
 * Auto-classify a decision
 */
export async function classifyDecision(summary: string): Promise<{
  cost: 'LOW' | 'MED' | 'HIGH';
  reversibility: 'easy' | 'hard';
  blast_radius: 'local' | 'segment' | 'global';
  recommendation: 'APPROVE' | 'DENY' | 'DEFER';
  confidence: number;
} | null> {
  const response = await sendToClaude([
    { role: 'user', content: `Classify this decision:\n\n"${summary}"` }
  ]);

  if (!response) return null;

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Get risk assessment for a decision
 */
export async function assessRisk(
  summary: string,
  context?: { consecutiveAbsences?: number; overdueDays?: number; amount?: number }
): Promise<{ score: number; factors: string[] } | null> {
  const contextStr = context 
    ? `\nContext: ${JSON.stringify(context)}` 
    : '';

  const response = await sendToClaude([
    { 
      role: 'user', 
      content: `Assess risk (0-100) for:\n"${summary}"${contextStr}\n\nRespond with JSON: {"score": number, "factors": ["factor1", "factor2"]}` 
    }
  ]);

  if (!response) return null;

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Generate action recommendation
 */
export async function getRecommendation(
  summary: string,
  history?: Array<{ action: string; outcome: string }>
): Promise<string> {
  const historyStr = history?.length 
    ? `\n\nPast similar decisions:\n${history.map(h => `- ${h.action}: ${h.outcome}`).join('\n')}` 
    : '';

  const response = await sendToClaude([
    { 
      role: 'user', 
      content: `Decision: "${summary}"${historyStr}\n\nRecommend: APPROVE, DENY, or DEFER? One word only.` 
    }
  ]);

  const action = response.trim().toUpperCase();
  if (['APPROVE', 'DENY', 'DEFER'].includes(action)) {
    return action;
  }
  return 'DEFER'; // Default to safe option
}

/**
 * Check if Claude API is configured
 */
export function isClaudeConfigured(): boolean {
  return !!CLAUDE_API_KEY && CLAUDE_API_KEY !== 'sk-ant-api03-xxxxx';
}
