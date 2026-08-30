// 资源加载策略:全走官方 API 完整 URL(数据里直接存 https://wegame.shallow.ink/...),运行时 RemoteImage 首次下载后缓存本地,不再依赖打包的本地镜像目录。此处不再配置旧测试 CDN(rock-helper.pages.dev)。
export const PRIMARY_ASSET_BASE = ''

export const FALLBACK_ASSET_BASES = [
]
