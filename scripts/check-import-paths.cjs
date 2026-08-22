const fs = require('fs')
const path = require('path')

function collectFiles(dir, exts, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'unpackage' || name === '.git') continue
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) collectFiles(full, exts, out)
    else if (exts.some((e) => name.endsWith(e))) out.push(full)
  }
  return out
}

const root = path.dirname(__dirname)
const files = collectFiles(root, ['.js', '.vue'])
let failures = 0

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file)
  const dir = path.dirname(file)

  for (const m of raw.matchAll(/(?:^|\n)\s*import\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g)) {
    const spec = m[1]
    const resolved = path.resolve(dir, spec)
    const candidates = [resolved]
    if (!path.extname(resolved)) {
      candidates.push(resolved + '.js', resolved + '.vue', path.join(resolved, 'index.js'))
    }
    if (!candidates.some((c) => fs.existsSync(c))) {
      failures++
      console.log('FAIL ' + rel + ' -> ' + spec)
    }
  }
  // @/ 别名 import
  for (const m of raw.matchAll(/(?:^|\n)\s*import\s+(?:[\s\S]*?from\s+)?['"]@\/([^'"]+)['"]/g)) {
    const spec = m[1]
    const resolved = path.join(root, spec)
    const candidates = [resolved]
    if (!path.extname(resolved)) {
      candidates.push(resolved + '.js', resolved + '.vue', path.join(resolved, 'index.js'))
    }
    if (!candidates.some((c) => fs.existsSync(c))) {
      failures++
      console.log('FAIL ' + rel + ' -> @/' + spec)
    }
  }
}

console.log(`\nChecked ${files.length} files, ${failures} broken imports.`)
