// Y-Place NPC 대화 서버. 브라우저 → 이 Worker → Claude API.
// API 키는 Worker 비밀값(ANTHROPIC_API_KEY)에만 있고, 대화 내용은 저장·기록하지 않는다.
import Anthropic from '@anthropic-ai/sdk';
import { PERSONAS, isNpcId } from './personas';

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGINS: string;
  NPC_MODEL?: string;
}

/** 한 번에 받는 대화 길이 제한(비용·남용 방지) */
const MAX_TURNS = 12;
const MAX_CHARS = 300;
const MAX_TOTAL = 3000;
/** 같은 IP에서 10분에 20번까지(워커 인스턴스별 대략치) */
const RATE = { windowMs: 10 * 60_000, max: 20 };
const hits = new Map<string, { n: number; reset: number }>();

function cors(origin: string | null, env: Env): Record<string, string> | null {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + RATE.windowMs });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > RATE.max;
}

/** 클라이언트가 보낸 대화를 검사해 SDK 형식으로 만든다. 문제가 있으면 null. */
function readMessages(raw: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TURNS) return null;
  let total = 0;
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (!text) return null;
    total += text.length;
    out.push({ role, content: text });
  }
  if (total > MAX_TOTAL || out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  return out;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = cors(req.headers.get('Origin'), env);
    if (!headers) return new Response('forbidden', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/chat') return json({ error: 'not_found' }, 404, headers);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'not_configured' }, 503, headers);

    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (limited(ip)) return json({ error: 'rate_limited' }, 429, headers);

    let body: { npc?: unknown; messages?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad_request' }, 400, headers);
    }
    if (!isNpcId(body.npc)) return json({ error: 'bad_request' }, 400, headers);
    const messages = readMessages(body.messages);
    if (!messages) return json({ error: 'bad_request' }, 400, headers);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 25_000 });
    try {
      const res = await client.beta.messages.create({
        model: env.NPC_MODEL || 'claude-opus-5-5',
        // 짧은 대사만 쓰므로 일부러 작게(생각 토큰 포함)
        max_tokens: 2048,
        // 가벼운 대화: 생각은 짧게
        output_config: { effort: 'low' },
        // 안전 분류기가 거절하면 서버가 알맞은 모델로 다시 답한다
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: PERSONAS[body.npc].system, cache_control: { type: 'ephemeral' } }],
        messages,
      });
      if (res.stop_reason === 'refusal') {
        return json({ reply: '음, 그 이야기는 제가 답하기 어려워요. 다른 걸 물어봐 주실래요?' }, 200, headers);
      }
      const reply = res.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      if (!reply) return json({ error: 'empty' }, 502, headers);
      return json({ reply: reply.slice(0, 800) }, 200, headers);
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429, headers);
      if (e instanceof Anthropic.APIError) return json({ error: 'upstream', status: e.status }, 502, headers);
      return json({ error: 'upstream' }, 502, headers);
    }
  },
};
