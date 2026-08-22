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
const files = collectVueFiles(root)
let failures = 0

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const rel = path.relative(root, file)

  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>/)
  if (!scriptMatch) continue
  const script = scriptMatch[1]

  // 模块级 function 声明 + import 的具名函数
  const moduleFns = new Set(
    [...script.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1])
  )
  for (const m of script.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    m[1].split(',').forEach((part) => {
      const name = part.trim().split(/\s+as\s+/).pop().trim()
      if (/^[A-Za-z_$][\w$]*$/.test(name)) moduleFns.add(name)
    })
  }
  // export default 内的成员（data/computed/methods 键 + 简写方法）
  const exportedBody = script.match(/export\s+default\s*\{([\s\S]*)\}\s*$/)
  const memberNames = new Set()
  if (exportedBody) {
    for (const m of exportedBody[1].matchAll(/^[ \t]*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm)) memberNames.add(m[1])
    for (const m of exportedBody[1].matchAll(/^[ \t]*([A-Za-z_$][\w$]*)\s*:/gm)) memberNames.add(m[1])
  }

  // 模板部分（到 </template> 为止的首个顶层块）
  const tplMatch = raw.match(/^<template>([\s\S]*)<\/template>\s*(?:<script>|<style|$)/)
  if (!tplMatch) continue
  const tpl = tplMatch[1]

  // 模板中调用的标识符：{{ fn( }} 或 :prop="fn("
  const called = new Set()
  for (const m of tpl.matchAll(/(?:\{\{|\="|:style=")[^"}]*?\b([A-Za-z_$][\w$]*)\s*\(/g)) called.add(m[1])

  const problems = [...called].filter((fn) => {
    if (!moduleFns.has(fn)) return false          // 只关心模块级函数误用
    if (memberNames.has(fn)) return false         // 已通过实例暴露则安全
    return true
  })

  if (problems.length) {
    failures++
    console.log('FAIL ' + rel + ' -> 模板调用了未暴露的模块级函数: ' + problems.join(', '))
  }
}
console.log(`\nChecked ${files.length} files, ${failures} with problems.`)
