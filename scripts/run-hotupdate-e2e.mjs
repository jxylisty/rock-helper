// 数据热更新端到端模拟（Node 直跑，不依赖小程序运行时）
// 模拟：manifest 拉取 → 版本比对 → 文件下载校验 → storage 合并 → 覆盖层读取
// 用法: node scripts/run-hotupdate-e2e.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const root = process.cwd()
const hotDir = path.join(root, 'crawler_official_api', 'output', 'generated', 'hotupdate')

let passed = 0
let failed = 0
function check(cond, label) {
  if (cond) { passed += 1; console.log('  ok ' + label) } else { failed += 1; console.error('  FAIL ' + label) }
}

// 1) 起一个本地静态服务器模拟托管点
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0]
  const file = path.join(hotDir, urlPath.replace(/^\//, ''))
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(fs.readFileSync(file))
  } else {
    res.writeHead(404)
    res.end('not found')
  }
})

// 2) 模拟 uni.* storage/request（与小程序 API 同形）
const storage = {}
globalThis.uni = {
  getStorageSync: (k) => storage[k],
  setStorageSync: (k, v) => { storage[k] = v },
  request: (opt) => {
    const url = new URL(opt.url)
    const req = http.get({ host: url.hostname, port: url.port, path: url.pathname }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => opt.success({ statusCode: res.statusCode, data }))
    })
    req.on('error', () => opt.fail({ errMsg: 'request:fail' }))
  }
}

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port

// 3) 加载 dataHotUpdate（注入测试 manifest 地址）
const manifestUrl = `http://127.0.0.1:${port}/manifest.json`
const src = fs.readFileSync(path.join(root, 'utils', 'dataHotUpdate.js'), 'utf8')
let cjs = src
  .replace(/export\s+const\s+HOTUPDATE_MANIFEST_URL\s*=\s*''/, `export const HOTUPDATE_MANIFEST_URL = '${manifestUrl}'`)
  .replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =')
  .replace(/export\s+async\s+function\s+(\w+)/g, 'module.exports.$1 = async function $1')
  .replace(/export\s+function\s+(\w+)/g, 'const $1 = function $1')
  .replace(/export\s+default\s+\{([\s\S]*?)\}/, 'module.exports.default = module.exports')
cjs = cjs + `
;['HOTUPDATE_MANIFEST_URL','HOTUPDATE_FALLBACK_URLS','checkDataUpdate','getData','getHotData','getInstalledDataVersion','getHotMeta'].forEach((n) => { try { module.exports[n] = eval(n) } catch (e) {} })
`
fs.writeFileSync(path.join(root, 'scripts', '.hotupdate-test.cjs'), cjs)
const { checkDataUpdate, getInstalledDataVersion, getHotData, getHotMeta } = require(path.join(root, 'scripts', '.hotupdate-test.cjs'))

console.log('== 数据热更新端到端模拟 ==')
// 首次：版本 0 → 远程版本
const r1 = await checkDataUpdate()
check(r1.status === 'updated', `首次更新成功（${r1.status}, version=${r1.version}）`)
check(r1.files && r1.files.length === 5, `下载 5 个数据文件（实际 ${r1.files.length}）`)
check(getInstalledDataVersion() > 0, '版本号已写入 storage')
const hotDetail = getHotData('petDetail')
check(Boolean(hotDetail && hotDetail['1']), '覆盖层可读取 petDetail 热更数据（含 seq 1）')
const meta = getHotMeta()
check(Boolean(meta && meta.updatedAt), `meta 记录更新时间（${meta && meta.updatedAt}）`)

// 二次：版本一致 → up-to-date 不重复下载
const r2 = await checkDataUpdate()
check(r2.status === 'up-to-date', `二次检查判定 up-to-date（${r2.status}）`)

// 白名单校验：manifest 塞未知键应被拒
const manifest = JSON.parse(fs.readFileSync(path.join(hotDir, 'manifest.json'), 'utf8'))
manifest.files.evilCode = { url: './manifest.json' }
manifest.version = Number(manifest.version) + 1
fs.writeFileSync(path.join(hotDir, 'manifest.json'), JSON.stringify(manifest))
const r3 = await checkDataUpdate()
check(r3.status === 'updated' && !getHotData('evilCode'), '白名单拦截未知数据键（evilCode 未写入 storage）')
// 还原 manifest
delete manifest.files.evilCode
fs.writeFileSync(path.join(hotDir, 'manifest.json'), JSON.stringify(manifest, null, 1))

server.close()

console.log(`\n结果: ${passed} 通过, ${failed} 失败`)
process.exit(failed ? 1 : 0)
