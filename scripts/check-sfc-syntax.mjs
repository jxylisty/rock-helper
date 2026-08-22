import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parse, compileTemplate, compileScript } from '@vue/compiler-sfc'

function collectVueFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'unpackage' || name.startsWith('.')) continue
    const full = join(dir, name)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      collectVueFiles(full, acc)
    } else if (name.endsWith('.vue')) {
      acc.push(full)
    }
  }
  return acc
}

const files = [
  ...collectVueFiles('components'),
  ...collectVueFiles('pages'),
  'App.vue'
].map((file) => file.replace(/\\/g, '/'))

let failed = false

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const { descriptor, errors } = parse(source, { filename: file })

  if (errors.length) {
    failed = true
    console.log(`[FAIL] ${file} - parse errors:`)
    errors.forEach((e) => console.log('   ', e.message))
    continue
  }

  const issues = []

  if (descriptor.template) {
    const tpl = compileTemplate({
      source: descriptor.template.content,
      filename: file,
      id: file
    })
    tpl.errors.forEach((e) => issues.push(`template: ${e.message || e}`))
  }

  if (descriptor.script || descriptor.scriptSetup) {
    try {
      compileScript(descriptor, { id: file })
    } catch (e) {
      issues.push(`script: ${e.message}`)
    }
  }

  if (issues.length) {
    failed = true
    console.log(`[FAIL] ${file}`)
    issues.forEach((i) => console.log('   ', i))
  } else {
    console.log(`[OK]   ${file}`)
  }
}

process.exit(failed ? 1 : 0)
