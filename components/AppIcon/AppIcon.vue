<template>
  <image class="app-icon" :style="wrapStyle" :src="iconSrc" mode="aspectFit" />
</template>

<script>
/**
 * 图标体系：Lucide 线性风格（ISC 授权，24×24 viewBox，统一 stroke 圆头线帽）
 * 全部图标为单一描边层，无填充/高光混搭——与专业图标库观感一致。
 */
const ICONS = {
  menu: [
    { tag: 'path', attrs: { d: 'M4 6h16M4 12h16M4 18h16' } }
  ],
  'chevron-left': [
    { tag: 'path', attrs: { d: 'm15 18-6-6 6-6' } }
  ],
  'chevron-right': [
    { tag: 'path', attrs: { d: 'm9 18 6-6-6-6' } }
  ],
  'chevron-down': [
    { tag: 'path', attrs: { d: 'm6 9 6 6 6-6' } }
  ],
  'chevron-up': [
    { tag: 'path', attrs: { d: 'm18 15-6-6-6 6' } }
  ],
  close: [
    { tag: 'path', attrs: { d: 'M18 6 6 18M6.4 6.4l11.2 11.2' } }
  ],
  plus: [
    { tag: 'path', attrs: { d: 'M5 12h14M12 5v14' } }
  ],
  search: [
    { tag: 'circle', attrs: { cx: 11, cy: 11, r: 8 } },
    { tag: 'path', attrs: { d: 'm21 21-4.3-4.3' } }
  ],
  edit: [
    { tag: 'path', attrs: { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' } },
    { tag: 'path', attrs: { d: 'm15 5 4 4' } }
  ],
  copy: [
    { tag: 'rect', attrs: { x: 8, y: 8, width: 14, height: 14, rx: 2 } },
    { tag: 'path', attrs: { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' } }
  ],
  trash: [
    { tag: 'path', attrs: { d: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6' } }
  ],
  home: [
    { tag: 'path', attrs: { d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' } },
    { tag: 'path', attrs: { d: 'M9 22V12h6v10' } }
  ],
  book: [
    { tag: 'path', attrs: { d: 'M12 7v14' } },
    { tag: 'path', attrs: { d: 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z' } }
  ],
  egg: [
    { tag: 'path', attrs: { d: 'M12 2.6C8.6 6.2 6 10.4 6 14a6 6 0 0 0 12 0c0-3.6-2.6-7.8-6-11.4z' } },
    { tag: 'path', attrs: { d: 'M9.2 8.2c-1.1 1.6-1.8 3.4-2 5' } }
  ],
  map: [
    { tag: 'path', attrs: { d: 'M14.1 5.6a2 2 0 0 0 1.8 0l3.7-1.8A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.7 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0zM15 5.8v15M9 3.2v15' } }
  ],
  shield: [
    { tag: 'path', attrs: { d: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z' } }
  ],
  zap: [
    { tag: 'path', attrs: { d: 'M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.5L12.1 9a1 1 0 0 0 .9 1.5h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.5l1.9-6.5a1 1 0 0 0-1-1.5z' } }
  ],
  wind: [
    { tag: 'path', attrs: { d: 'M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2' } }
  ],
  block: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: 'path', attrs: { d: 'm4.9 4.9 14.2 14.2' } }
  ],
  users: [
    { tag: 'path', attrs: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', attrs: { cx: 9, cy: 7, r: 4 } },
    { tag: 'path', attrs: { d: 'M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' } }
  ],
  wand: [
    { tag: 'path', attrs: { d: 'm21.6 3.6-1.3-1.3a1.2 1.2 0 0 0-1.7 0L2.4 18.6a1.2 1.2 0 0 0 0 1.7l1.3 1.3a1.2 1.2 0 0 0 1.7 0L21.6 5.4a1.2 1.2 0 0 0 0-1.8' } },
    { tag: 'path', attrs: { d: 'm14 7 3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9' } }
  ],
  window: [
    { tag: 'rect', attrs: { x: 2, y: 3, width: 20, height: 14, rx: 2 } },
    { tag: 'path', attrs: { d: 'M10 7.8a.75.75 0 0 1 1.1-.7l3.7 2.3a.75.75 0 0 1 0 1.3l-3.7 2.2a.75.75 0 0 1-1.1-.6zM12 17v4M8 21h8' } }
  ],
  sparkles: [
    { tag: 'path', attrs: { d: 'M9.9 15.5a2 2 0 0 0-1.4-1.4L2.4 12.5a.5.5 0 0 1 0-1L8.5 10a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0L14.1 8.5a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0zM20 3v4M22 5h-4M4 17v2M5 18H3' } }
  ],
  star: [
    { tag: 'path', attrs: { d: 'M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2.1 2.1 0 0 0 1.6 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.7 3.6a2.1 2.1 0 0 0-.6 1.9l.9 5.1a.5.5 0 0 1-.8.6l-4.6-2.4a2.1 2.1 0 0 0-2 0l-4.6 2.4a.5.5 0 0 1-.8-.6l.9-5.1a2.1 2.1 0 0 0-.6-1.9L2.2 9.8a.5.5 0 0 1 .3-.9l5.2-.8a2.1 2.1 0 0 0 1.6-1.1z' } }
  ],
  user: [
    { tag: 'path', attrs: { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' } },
    { tag: 'circle', attrs: { cx: 12, cy: 7, r: 4 } }
  ],
  info: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: 'path', attrs: { d: 'M12 16v-4M12 8h.01' } }
  ],
  check: [
    { tag: 'path', attrs: { d: 'M20 6 9 17l-5-5' } }
  ],
  'arrow-right': [
    { tag: 'path', attrs: { d: 'M5 12h14M12 5l7 7-7 7' } }
  ],
  swap: [
    { tag: 'path', attrs: { d: 'M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4' } }
  ],
  swords: [
    { tag: 'path', attrs: { d: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2' } }
  ],
  'zoom-in': [
    { tag: 'circle', attrs: { cx: 11, cy: 11, r: 8 } },
    { tag: 'path', attrs: { d: 'm21 21-4.3-4.3M11 8v6M8 11h6' } }
  ],
  'zoom-out': [
    { tag: 'circle', attrs: { cx: 11, cy: 11, r: 8 } },
    { tag: 'path', attrs: { d: 'm21 21-4.3-4.3M8 11h6' } }
  ],
  crosshair: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: 'path', attrs: { d: 'M22 12h-4M6 12H2M12 6V2M12 22v-4' } }
  ],
  ruler: [
    { tag: 'path', attrs: { d: 'M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.3 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0zM7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M17.5 13.5l2 2M6.5 12.5l2 2' } }
  ],
  download: [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' } }
  ],
  scale: [
    { tag: 'path', attrs: { d: 'm16 16 3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM2 16l3-8 3 8c-.9.7-1.9 1-3 1s-2.1-.3-3-1zM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2' } }
  ]
}

function buildSvgString(defs, color, strokeWidth) {
  const common = 'fill="none" stroke="LINE" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"'
  const body = defs
    .map((el) => {
      const attrs = Object.keys(el.attrs)
        .map((key) => `${key}="${el.attrs[key]}"`)
        .join(' ')
      const style = common.replace('LINE', color).replace('SW', strokeWidth)
      return `<${el.tag} ${style} ${attrs}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`
}

const uriCache = new Map()

export default {
  name: 'AppIcon',
  props: {
    name: { type: String, default: 'info' },
    size: { type: Number, default: 20 },
    color: { type: String, default: '#2C3A2F' },
    strokeWidth: { type: Number, default: 2 }
  },
  computed: {
    iconSrc() {
      const cacheKey = `${this.name}|${this.color}|${this.strokeWidth}`
      const cached = uriCache.get(cacheKey)
      if (cached) return cached

      const defs = ICONS[this.name] || ICONS.info
      const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        buildSvgString(defs, this.color, this.strokeWidth)
      )}`
      uriCache.set(cacheKey, uri)
      return uri
    },
    wrapStyle() {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`
      }
    }
  }
}
</script>

<style scoped>
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  line-height: 0;
}
</style>
