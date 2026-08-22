/**
 * 悬浮窗页面构建：把共享计算模块与悬浮窗源码打包为单文件 IIFE
 * 运行: npm run build:float
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const result = await build({
  entryPoints: [join(root, 'scripts/float-src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2018'],
  outfile: join(root, 'static/float/app.js'),
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'info'
})

console.log(`✅ 悬浮窗 JS 构建完成: static/float/app.js`)
if (result.errors && result.errors.length) process.exit(1)
