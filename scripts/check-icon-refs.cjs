const fs = require('fs')
const path = require('path')

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

const root = path.dirname(__dirname)
const iconSrc = fs.readFileSync(path.join(root, 'components/AppIcon/AppIcon.vue'), 'utf8')
const iconBody = iconSrc.match(/const ICONS = \{([\s\S]*?)\n\}/)[1]
const known = new Set([...iconBody.matchAll(/^\s*'?[a-zA-Z-]+'?:\s*\[/gm)].map((m) => m[0].trim().replace(/[':\s[]/g, '')))

const files = collectVueFiles(root)
let failures = 0
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const names = [...raw.matchAll(/AppIcon[^>]*name="([a-zA-Z-]+)"/g)].map((m) => m[1])
  const missing = [...new Set(names.filter((n) => !known.has(n)))]
  if (missing.length) {
    failures++
    console.log('FAIL ' + path.relative(root, file) + ' -> missing icons: ' + missing.join(', '))
  }
}
console.log(`Known icons (${known.size}): ` + [...known].join(', '))
console.log(`\nChecked ${files.length} files, ${failures} with missing icons.`)
