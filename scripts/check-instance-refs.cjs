const fs = require('fs')
const path = require('path')

const root = path.dirname(__dirname)

function collectVueFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'unpackage' || name === '.git') continue
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) collectVueFiles(full, out)
    else if (name.endsWith('.vue')) out.push(full)
  }
  return out
}

const files = collectVueFiles(path.join(root, 'pages')).concat(collectVueFiles(path.join(root, 'components')))
let failures = 0

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file)
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>/)
  if (!scriptMatch) continue
  const script = scriptMatch[1]

  // 提取 export default { ... } 主体
  const start = script.search(/export\s+default\s*\{/)
  if (start === -1) continue
  const body = script.slice(start)

  // 实例上可访问的名字
  const defined = new Set()
  // vue 生命周期与内置属性
  ;['data', 'computed', 'methods', 'props', 'watch', 'components', 'created', 'mounted', 'onLoad', 'onShow',
    'onReady', 'onHide', 'onUnload', 'onPullDownRefresh', 'onReachBottom', 'onShareAppMessage', 'setup',
    '$nextTick', '$emit', '$refs', '$set', '$forceUpdate', '$options', '$el', '$parent', '$children', '$root',
    '$mp', '$page', '$scope', '$store', '$router', '$route', '$watch', '$on', '$off', '$once', '$destroy',
    '$set', '$delete', '$mount', '$data', '$props', '$attrs', '$listeners', '$slots', '$scopedSlots', '$vnode',
    '$createLoginModule', '$u', '$t', 'uni', 'wx', 'getApp', 'getCurrentPages', 'Vue'
  ].forEach((n) => defined.add(n))

  // 括号配平提取块内容：返回匹配的闭合大括号内的文本
  function extractBlock(text, openIdx) {
    let depth = 0
    for (let i = openIdx; i < text.length; i++) {
      const ch = text[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) return text.slice(openIdx + 1, i)
      }
    }
    return ''
  }
  // 提取某属性名（如 props:）后配平块的顶层键
  function topLevelKeys(block) {
    const keys = []
    let depth = 0, buf = ''
    for (let i = 0; i < block.length; i++) {
      const ch = block[i]
      if (ch === '{' || ch === '[' || ch === '(') depth++
      else if (ch === '}' || ch === ']' || ch === ')') depth--
      if (depth === 0 && ch === ',') {
        const t = buf.trim()
        const m = t.match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*[:=]/)
        const short = t.match(/^[A-Za-z_$][\w$]*$/) // shorthand property petList,
        if (m) keys.push(m[1])
        else if (short) keys.push(short[0])
        buf = ''
      } else buf += ch
    }
    const t = buf.trim()
    const m = t.match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*[:=]/)
    const short = t.match(/^[A-Za-z_$][\w$]*$/)
    if (m) keys.push(m[1])
    else if (short) keys.push(short[0])
    return keys
  }
  function extractSection(name) {
    const re = new RegExp(`\\b${name}\\s*:\\s*\\{`)
    const m = body.match(re)
    if (!m) return ''
    return extractBlock(body, body.indexOf(m[0]) + m[0].length - 1)
  }
  function extractArraySection(name) {
    const m = body.match(new RegExp(`\\b${name}\\s*:\\s*\\[`))
    if (!m) return ''
    return extractBlock(body, body.indexOf(m[0]) + m[0].length - 1)
  }

  // data() 返回对象的键（配平解析 return { ... }）
  const dataReturn = body.match(/data\s*\(\s*\)\s*\{[\s\S]*?return\s*\{/)
  if (dataReturn) {
    const openIdx = body.indexOf(dataReturn[0]) + dataReturn[0].length - 1
    topLevelKeys(extractBlock(body, openIdx)).forEach((k) => defined.add(k))
  }
  // computed / methods / watch / props 顶层键
  ;['computed', 'methods', 'watch', 'props'].forEach((sec) => {
    topLevelKeys(extractSection(sec)).forEach((k) => defined.add(k))
  })
  const propsArray = extractArraySection('props')
  if (propsArray) {
    for (const m of propsArray.matchAll(/['"]([A-Za-z_$][\w$]*)['"]/g)) defined.add(m[1])
  }
  // 深层 props（对象形式嵌套的 default 等）也补进顶层键
  // 直接成员方法（options API 顶层缩进的方法）
  for (const m of body.matchAll(/^[ \t]{2,4}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm)) defined.add(m[1])

  // import 的绑定（模块级标识符在 script 里可直接用）
  for (const m of script.matchAll(/import\s+(?:\{([^}]+)\}|([\w$]+))\s+from/g)) {
    if (m[1]) m[1].split(',').forEach((p) => { const n = p.trim().split(/\s+as\s+/).pop().trim(); if (/^[\w$]+$/.test(n)) defined.add(n) })
    if (m[2]) defined.add(m[2])
  }
  // 顶部 const/let/function 声明
  for (const m of script.matchAll(/^(?:const|let|var|function)[^=]*?([A-Za-z_$][\w$]*)\s*[=(]/gm)) defined.add(m[1])

  // this.xxx 引用
  const used = new Set()
  for (const m of body.matchAll(/this\.([A-Za-z_$][\w$]*)/g)) used.add(m[1])

  const missing = [...used].filter((n) => !defined.has(n))
  if (missing.length) {
    failures++
    console.log('FAIL ' + rel + ' -> this.xxx 未定义: ' + missing.join(', '))
  }
}

console.log(`\nChecked ${files.length} vue files, ${failures} with problems.`)
