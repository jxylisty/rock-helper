const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const os = require('os')

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

const files = collectVueFiles(path.dirname(__dirname))
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-check-'))
let failures = 0

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const rel = path.relative(__dirname, file)

  const problems = []

  const tOpen = (raw.match(/<template[\s>]/g) || []).length
  const tClose = (raw.match(/<\/template>/g) || []).length
  if (tOpen !== tClose) problems.push(`template tags unbalanced: ${tOpen}/${tClose}`)

  const sOpen = (raw.match(/<script>/g) || []).length
  const sClose = (raw.match(/<\/script>/g) || []).length
  if (sOpen !== sClose) problems.push(`script tags unbalanced: ${sOpen}/${sClose}`)

  const yOpen = (raw.match(/<style[^>]*>/g) || []).length
  const yClose = (raw.match(/<\/style>/g) || []).length
  if (yOpen !== yClose) problems.push(`style tags unbalanced: ${yOpen}/${yClose}`)

  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>/)
  if (scriptMatch) {
    let code = scriptMatch[1]
    code = code.replace(/^\s*export\s+default\s*/m, 'const __comp = ')
    const tmpFile = path.join(tmpDir, rel.replace(/[\\/:]/g, '_') + '.mjs')
    fs.writeFileSync(tmpFile, code)
    try {
      execFileSync('node', ['--check', tmpFile], { stdio: 'pipe' })
    } catch (err) {
      problems.push('script syntax error: ' + String(err.stderr).trim().split('\n').slice(0, 4).join(' | '))
    }
  } else if (!raw.includes('<script')) {
    problems.push('no script block')
  }

  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (styleMatch) {
    const css = styleMatch[1]
    const open = (css.match(/\{/g) || []).length
    const close = (css.match(/\}/g) || []).length
    if (open !== close) problems.push(`style braces unbalanced: ${open}/${close}`)
  }

  if (problems.length) {
    failures++
    console.log('FAIL ' + rel)
    problems.forEach((p) => console.log('  - ' + p))
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true })
console.log(`\nChecked ${files.length} vue files, ${failures} with problems.`)
