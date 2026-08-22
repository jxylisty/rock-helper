const fs = require('fs')
const path = require('path')

const root = path.dirname(__dirname)
const file = process.argv[2]
if (!file) {
  console.log('usage: node check-class-coverage.cjs <relative-file>')
  process.exit(1)
}
const full = path.join(root, file)
const raw = fs.readFileSync(full, 'utf8')

const tplMatch = raw.match(/<template>[\s\S]*<\/template>\s*<script>/)
const tpl = tplMatch ? tplMatch[0] : ''
const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/)
const css = styleMatch ? styleMatch[1] : ''

const used = new Set()
for (const m of tpl.matchAll(/class="([^"]+)"/g)) {
  m[1].split(/\s+/).forEach((c) => {
    if (c && !/^(press-down|touch-active|mono)$/.test(c)) used.add(c)
  })
}

const defined = new Set()
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1])

const missing = [...used].filter((c) => !defined.has(c))
if (missing.length) {
  console.log('MISSING STYLES: ' + missing.join(', '))
  process.exit(1)
}
console.log(`OK: all ${used.size} static classes have style rules (or are global/hover classes).`)
