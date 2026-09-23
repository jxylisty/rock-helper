/**
 * 洛克阵容码解析转发服务（Cloudflare Worker）
 *
 * 客户端只 POST { share_code }，本服务注入 X-API-Key 后转发到 wegame.shallow.ink，
 * 上游响应原样透传（客户端的重试/错误文案逻辑无需改动）。
 * key 通过 `wrangler secret put API_KEY` 注入，不出现在任何客户端代码里。
 *
 * 只开放一个固定路径，非该路径一概 404，避免被当开放代理滥用。
 */

const UPSTREAM_URL = 'https://wegame.shallow.ink/api/v1/games/rocom/tools/share-code/parse'
const RATE_WINDOW_MS = 60_000
const RATE_MAX_PER_WINDOW = 20

// ip -> [请求时间戳]（隔离实例内存级，重启即清零；挡普通滥用足够，重防护可在 CF 控制台加 WAF 限频规则）
const rateHits = new Map()

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() })
    if (request.method !== 'POST') return json({ code: 405, message: 'method not allowed' }, 405)

    const { pathname } = new URL(request.url)
    if (pathname !== '/share-code/parse') return json({ code: 404, message: 'not found' }, 404)

    if (!env.API_KEY) return json({ code: 500, message: '服务端未配置 API_KEY' }, 500)

    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    if (!allowRequest(ip)) return json({ code: 429, message: '请求过于频繁，请稍后再试' }, 429)

    let shareCode = ''
    try {
      const body = await request.json()
      shareCode = String((body && body.share_code) || '').trim()
    } catch (e) {
      return json({ code: 400, message: '请求体不是合法 JSON' }, 400)
    }
    if (!shareCode.startsWith('B~') || shareCode.length > 4096) {
      return json({ code: 400, message: '无效的阵容码' }, 400)
    }

    const upstreamRes = await fetch(UPSTREAM_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-API-Key': env.API_KEY },
      body: JSON.stringify({ share_code: shareCode })
    })
    const text = await upstreamRes.text()
    return new Response(text, {
      status: upstreamRes.status,
      headers: { ...cors(), 'content-type': 'application/json; charset=utf-8' }
    })
  }
}

function allowRequest(ip) {
  const now = Date.now()
  const recent = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    rateHits.set(ip, recent)
    return false
  }
  recent.push(now)
  rateHits.set(ip, recent)
  return true
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors() }
  })
}
