/**
 * 悬浮窗页面构建：把共享计算模块与悬浮窗源码打包为单文件 IIFE
 * 运行: npm run build:float
 *
 * 产物：
 * 1. static/float/app.js                     —— 浏览器预览用（index.html 通过 <script src> 引用）
 * 2. utils/floatWindowAsset.js               —— 真机用：index.html + app.js 内联后的完整 HTML 字符串，
 *    运行时经 WebView.loadDataWithBaseURL 注入，完全不依赖 _www/_doc 文件路径
 *    （标准基座模拟器上 _www 路径解析与目录 copyTo 均不可靠）
 */
import { build } from 'esbuild'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const result = await build({
  entryPoints: [join(root, 'scripts/float-src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2017'], // 用户模拟器 WebView 较老，尽量降低语法要求（无 async 依赖，es2017 稳妥）
  outfile: join(root, 'static/float/app.js'),
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'info'
})

console.log(`✅ 悬浮窗 JS 构建完成: static/float/app.js`)
if (result.errors && result.errors.length) process.exit(1)

// ---------- 生成内联 HTML 资产模块（真机加载用） ----------
const html = readFileSync(join(root, 'static/float/index.html'), 'utf8')
const js = readFileSync(join(root, 'static/float/app.js'), 'utf8')
// 防止内联 JS 中出现 </script> 提前闭合标签（\/ 在 JS 字符串/正则中均为合法转义）
const safeJs = js.replace(/<\/script/g, '<\\/script')
const scriptTag = '<script src="./app.js"></script>'
const inlineScript = '<script>window.__FLOAT_NATIVE__=1</script>\n<script>\n' + safeJs + '\n</script>'
const inlined = html.replace(scriptTag, () => inlineScript)
if (inlined === html) {
  console.error('❌ 未在 index.html 中找到 ' + scriptTag + '，请检查模板结构')
  process.exit(1)
}

const assetOut = join(root, 'utils/floatWindowAsset.js')
writeFileSync(assetOut, '// 本文件由 scripts/build-float.mjs 自动生成，勿手改\nexport const FLOAT_WINDOW_HTML = ' + JSON.stringify(inlined) + '\n', 'utf8')

const sizeKb = Math.round(statSync(assetOut).size / 1024)
console.log(`✅ 悬浮窗内联资产生成完成: utils/floatWindowAsset.js（约 ${sizeKb}KB，真机 loadDataWithBaseURL 注入）`)
