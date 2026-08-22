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

// easycom 组件（components/组件名/组件名.vue 自动注册）
const compDir = path.join(root, 'components')
const easycom = new Set()
if (fs.existsSync(compDir)) {
  for (const name of fs.readdirSync(compDir)) {
    if (fs.existsSync(path.join(compDir, name, name + '.vue'))) easycom.add(name)
  }
}

// uni-app 内置组件
const builtin = new Set([
  'view', 'text', 'image', 'button', 'input', 'textarea', 'scroll-view', 'swiper', 'swiper-item',
  'navigator', 'form', 'checkbox', 'radio', 'switch', 'slider', 'picker', 'picker-view', 'progress',
  'rich-text', 'canvas', 'video', 'map', 'web-view', 'movable-area', 'movable-view', 'cover-view',
  'cover-image', 'icon', 'label', 'checkbox-group', 'radio-group', 'template', 'block', 'component',
  'match-media', 'page-container', 'root-portal', 'nested-scroll-header', 'nested-scroll-body'
])

let failures = 0
const files = collectVueFiles(path.join(root, 'pages')).concat(collectVueFiles(path.join(root, 'components')))

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file)

  // 手动 import 的组件
  const imported = new Set()
  for (const m of raw.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (/\.vue$/.test(m[2])) imported.add(m[1])
  }
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>/)
  const regBody = scriptMatch ? scriptMatch[1].match(/components\s*:\s*\{([^}]*)\}/) : null
  const registered = new Set(imported)
  if (regBody) {
    for (const m of regBody[1].matchAll(/([A-Za-z_$][\w$]*)/g)) registered.add(m[1])
  }

  // 模板中使用的组件标签
  const tpl = raw.slice(0, scriptMatch ? raw.indexOf('<script>') : undefined)
  const usedTags = new Set()
  for (const m of tpl.matchAll(/<([A-Z][A-Za-z0-9-]*)/g)) usedTags.add(m[1])
  for (const m of tpl.matchAll(/<((?:app|pet|type|remote|damage|skill)[\w-]*)\b/gi)) {
    usedTags.add(m[1].replace(/(^|-)(\w)/g, (_, s, c) => (s ? '-' : '') + c.toUpperCase()))
  }

  const missing = [...usedTags].filter((tag) => {
    if (builtin.has(tag.toLowerCase())) return false
    const pascal = tag.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    return !registered.has(tag) && !registered.has(pascal) && !easycom.has(tag) && !easycom.has(pascal) && !easycom.has(tag.toLowerCase())
  })
  if (missing.length) {
    failures++
    console.log('FAIL ' + rel + ' -> 未注册组件: ' + missing.join(', '))
  }
}

// easycom 组件自身的依赖（引用其他组件也需注册或 easycom）
console.log('\neasycom 组件: ' + [...easycom].join(', '))
console.log(`\nChecked ${files.length} vue files, ${failures} with problems.`)
