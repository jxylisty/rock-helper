/**
 * 游戏阵容码导入（贴码 → 标准阵容配置）
 *
 * 阵容码是游戏官方的队伍分享体系（B~ 开头），通过 wegame.shallow.ink 的
 * tools/share-code/parse 接口解析（免费，key 于 rocom.shallow.ink 申请）。
 * 正式发布必须走自建转发（server/share-code-proxy/）隐藏 key；
 * 用户复制可能缺尾部填充，自动补齐重试。
 *
 * 解析出的字段映射：
 * - pet.id（官方 pet_id）→ 经 data/pet/pet_id_map.json 转图鉴 seq + 精确变体形态
 *   （地区形态如卡瓦重·雪山附近的种族值/速度与本体不同，必须按形态取值）
 * - ivs_detail 的属性 id（79生命/80物攻/81魔攻/82物防/83魔防/84速度）→ 高个体三项=10，其余 0
 * - personality 名字 → 经 data/config/nature_map.json 转 natureUp/natureDown
 * - bloodline / skills 原样带出（愿力属性依据 / 技能选择）
 */
import petIdMap from '../data/pet/pet_id_map.js'
import { petDetail } from '../data/pet/pet_detail.js'
import natureMap from '../data/config/nature_map.json'

// 自建转发地址（部署步骤见 server/share-code-proxy/README.md）。填了则客户端请求不带任何密钥，
// X-API-Key 由转发服务注入；留空则直连官方接口，key 会明文打进客户端包（仅限本地调试）。
const PARSE_PROXY_URL = ''
const PARSE_UPSTREAM_URL = 'https://wegame.shallow.ink/api/v1/games/rocom/tools/share-code/parse'
const DIRECT_API_KEY = 'sk-4e9bbbb2853055801b09976dd557ac74'
const IV_ATTR_KEYS = { 79: 'hp', 80: 'attack', 81: 'mattack', 82: 'defense', 83: 'mdefense', 84: 'speed' }
const TARGET_LEN = 223

/** 解析阵容码 → 标准阵容数组；抛错时 message 为用户可读文案 */
export async function parseTeamCode(rawCode) {
  const text = String(rawCode || '').trim()
  if (!text) throw new Error('请先粘贴阵容码')
  // 游戏导出格式为"文字说明 + B~码"混排，抽取 B~ 开头的码行
  const codeLine = text.split('\n').map((line) => line.trim()).find((line) => line.startsWith('B~'))
  const code = (codeLine || text).replace(/\s+/g, '')
  if (!code.startsWith('B~')) throw new Error('未找到阵容码：码应以 B~ 开头，请连同说明一起整段粘贴即可')

  const data = await requestParse(code)
  const teams = Array.isArray(data.teams) ? data.teams : []
  if (!teams.length) throw new Error('阵容码里没有精灵（可能是空码）')

  // 队伍魔法：优先 API 解码，空时回退读文字注释行"魔法：X"（部分码编码未含 magic）
  let magicName = data.magic?.name || ''
  if (!magicName) {
    const magicMatch = text.match(/魔法[:：]\s*(\S+)/)
    if (magicMatch) magicName = magicMatch[1]
  }

  const slots = []
  for (const member of teams) {
    if (!member || !member.pet) continue
    const mapped = petIdMap[String(member.pet.id)]
    if (!mapped) continue // 图鉴外精灵（新版本未收录）跳过
    const seq = mapped.seq

    // 变体精确定位：码里的 pet_id 精确到形态（如卡瓦重·雪山附近的样子），
    // 按 page_title = 名字（形态） 规则匹配 petDetail 变体，取该形态的种族值/立绘/属性
    let variant = (petDetail[String(seq)] || [])[0] || null
    let variantIndex = 0
    if (mapped.form && mapped.form !== '本来的样子') {
      const expected = `${mapped.name}（${mapped.form}）`
      const idx = (petDetail[String(seq)] || []).findIndex((v) => v.page_title === expected)
      if (idx >= 0) {
        variant = petDetail[String(seq)][idx]
        variantIndex = idx
      }
    }

    // 高个体三项 = 10，其余 0
    const ivs = { hp: 0, attack: 0, mattack: 0, defense: 0, mdefense: 0, speed: 0 }
    for (const detail of member.ivs_detail || []) {
      const key = IV_ATTR_KEYS[detail.id]
      if (key) ivs[key] = 10
    }

    const nature = natureMap[member.personality?.name] || null

    slots.push({
      seq,
      variantIndex,
      petName: variant ? variant.page_title : member.pet.name,
      race: variant ? variant.race : null,
      img: variant ? variant.img : '',
      types: variant ? [...(variant.type || [])] : [],
      ivs,
      natureUp: nature ? nature.up : '无',
      natureDown: nature ? nature.down : '无',
      personalityName: member.personality?.name || '',
      bloodline: member.bloodline?.name || '',
      skills: (member.skills || []).filter(Boolean).map((skill) => skill.name).filter(Boolean),
      slot: member.slot
    })
  }

  if (!slots.length) throw new Error('阵容码里的精灵暂未收录进图鉴')
  return {
    slots,
    magic: magicName
  }
}

/** 调解析接口；用户复制的码常缺尾部填充，按 2 字符步进自动补齐重试 */
async function requestParse(code) {
  let lastError = new Error('解析失败')
  for (let len = code.length; len <= TARGET_LEN + 32; len += 2) {
    const padded = len > code.length ? code + '~A'.repeat((len - code.length) / 2) : code
    const res = await new Promise((resolve) => {
      const useProxy = !!PARSE_PROXY_URL
      uni.request({
        url: useProxy ? PARSE_PROXY_URL : PARSE_UPSTREAM_URL,
        method: 'POST',
        header: useProxy
          ? { 'content-type': 'application/json' }
          : { 'X-API-Key': DIRECT_API_KEY, 'content-type': 'application/json' },
        data: { share_code: padded },
        success: resolve,
        fail: () => resolve({ statusCode: 0 })
      })
    })
    if (!res.statusCode) throw new Error('网络请求失败，请检查网络')
    if (res.statusCode === 200 && res.data && res.data.code === 0) {
      return res.data.data
    }
    const message = (res.data && res.data.message) || ''
    lastError = new Error(message || `解析失败(${res.statusCode})`)
    if (message !== '分享码长度不足') throw lastError // 非长度类错误直接抛出
  }
  throw new Error('阵容码不完整，请重新复制完整码')
}

export default { parseTeamCode }
