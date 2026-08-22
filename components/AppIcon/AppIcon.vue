<template>
  <view class="app-icon" :style="wrapStyle">
    <svg :width="size" :height="size" viewBox="0 0 24 24">
      <template v-for="(el, index) in renderElements" :key="index">
        <path v-if="el.tag === 'path'" v-bind="el.attrs" />
        <rect v-else-if="el.tag === 'rect'" v-bind="el.attrs" />
        <circle v-else-if="el.tag === 'circle'" v-bind="el.attrs" />
        <ellipse v-else v-bind="el.attrs" />
      </template>
    </svg>
  </view>
</template>

<script>
const ICONS = {
  menu: [
    { tag: 'rect', layer: 'p', attrs: { x: 4, y: 4.6, width: 16, height: 3.2, rx: 1.6 } },
    { tag: 'rect', layer: 's', attrs: { x: 4, y: 10.4, width: 16, height: 3.2, rx: 1.6 } },
    { tag: 'rect', layer: 'p', attrs: { x: 4, y: 16.2, width: 11, height: 3.2, rx: 1.6 } }
  ],
  'chevron-left': [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M14.8 5.2 8 12l6.8 6.8' } }
  ],
  'chevron-right': [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M9.2 5.2 16 12l-6.8 6.8' } }
  ],
  'chevron-down': [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M5.2 9.2 12 16l6.8-6.8' } }
  ],
  close: [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6' } }
  ],
  plus: [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M12 4.8v14.4M4.8 12h14.4' } }
  ],
  search: [
    { tag: 'circle', layer: 's', attrs: { cx: 10.8, cy: 10.8, r: 4 } },
    { tag: 'circle', layer: 'ps', sw: 2.6, attrs: { cx: 10.8, cy: 10.8, r: 6.4 } },
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M15.4 15.4 20 20' } }
  ],
  edit: [
    { tag: 'path', layer: 'p', attrs: { d: 'M20.7 6.1a2.55 2.55 0 0 0-3.6-3.6L5.5 14.1l-1.4 5.8 5.8-1.4L20.7 6.1z' } },
    { tag: 'path', layer: 'hs', sw: 1.8, attrs: { d: 'M5.5 14.1l4.4 4.4' } },
    { tag: 'path', layer: 'hs', sw: 1.6, attrs: { d: 'M16.3 5.3l2.4 2.4' } }
  ],
  copy: [
    { tag: 'rect', layer: 's', attrs: { x: 8.3, y: 3.5, width: 12.2, height: 12.2, rx: 2.6 } },
    { tag: 'rect', layer: 'p', attrs: { x: 3.5, y: 8.3, width: 12.2, height: 12.2, rx: 2.6 } },
    { tag: 'rect', layer: 'h', attrs: { x: 6.1, y: 11.4, width: 7, height: 1.7, rx: 0.85 } },
    { tag: 'rect', layer: 'h', attrs: { x: 6.1, y: 14.5, width: 5, height: 1.7, rx: 0.85 } }
  ],
  trash: [
    { tag: 'path', layer: 'ps', sw: 2.2, attrs: { d: 'M9.6 4.3v-1a2 2 0 0 1 2-2h.8a2 2 0 0 1 2 2v1' } },
    { tag: 'rect', layer: 'p', attrs: { x: 3.2, y: 4.4, width: 17.6, height: 2.7, rx: 1.35 } },
    { tag: 'path', layer: 'p', attrs: { d: 'M5.6 8h12.8l-.85 10.3a2.3 2.3 0 0 1-2.3 2.1H8.75a2.3 2.3 0 0 1-2.3-2.1L5.6 8z' } },
    { tag: 'rect', layer: 'h', attrs: { x: 9.1, y: 10.6, width: 1.8, height: 6, rx: 0.9 } },
    { tag: 'rect', layer: 'h', attrs: { x: 13.1, y: 10.6, width: 1.8, height: 6, rx: 0.9 } }
  ],
  home: [
    { tag: 'path', layer: 'p', attrs: { d: 'M12 2.6 2.8 9.4V20a1.6 1.6 0 0 0 1.6 1.6h15.2A1.6 1.6 0 0 0 21.2 20V9.4L12 2.6z' } },
    { tag: 'path', layer: 'h', attrs: { d: 'M9.7 21.6v-4.9a1.2 1.2 0 0 1 1.2-1.2h2.2a1.2 1.2 0 0 1 1.2 1.2v4.9z' } }
  ],
  book: [
    { tag: 'rect', layer: 'p', attrs: { x: 4.9, y: 2.3, width: 15, height: 19.4, rx: 2.6 } },
    { tag: 'path', layer: 'h', attrs: { d: 'M12.8 5.6q.44 1.96 2.4 2.4-.88.44-2.4 2.4-.44-1.96-2.4-2.4 1.52-.44 2.4-2.4z' } },
    { tag: 'rect', layer: 's', attrs: { x: 8, y: 15.3, width: 8.2, height: 1.5, rx: 0.75 } },
    { tag: 'rect', layer: 's', attrs: { x: 8, y: 17.8, width: 5.6, height: 1.5, rx: 0.75 } }
  ],
  egg: [
    { tag: 'path', layer: 'p', attrs: { d: 'M12 2.2C8.4 6 5.4 9.8 5.4 13.6a6.6 6.6 0 0 0 13.2 0C18.6 9.8 15.6 6 12 2.2z' } },
    { tag: 'ellipse', layer: 'h', attrs: { cx: 9.2, cy: 10, rx: 1.5, ry: 2.4, transform: 'rotate(-28 9.2 10)' } }
  ],
  map: [
    { tag: 'path', layer: 'p', attrs: { d: 'M3 6.6l5.5-2.5 7 2.7 5.5-2.4v13l-5.5 2.4-7-2.7L3 19.2V6.6z' } },
    { tag: 'path', layer: 'hs', sw: 1.6, attrs: { d: 'M8.5 4.2v13.2' } },
    { tag: 'path', layer: 'hs', sw: 1.6, attrs: { d: 'M15.5 6.9v13.2' } },
    { tag: 'circle', layer: 'h', attrs: { cx: 12, cy: 11.8, r: 1.4 } }
  ],
  shield: [
    { tag: 'path', layer: 'p', attrs: { d: 'M12 2.2l7.6 3v5.9c0 4.9-3.2 8.6-7.6 10.7-4.4-2.1-7.6-5.8-7.6-10.7V5.2l7.6-3z' } },
    { tag: 'path', layer: 'hs', sw: 2.2, attrs: { d: 'M8.7 11.9l2.2 2.2 4.3-4.3' } }
  ],
  zap: [
    { tag: 'path', layer: 'p', attrs: { d: 'M13.3 2.2 4.4 13.3h5.9l-1.5 8.5 8.9-11.1h-5.9l1.5-8.5z' } },
    { tag: 'path', layer: 'h', attrs: { d: 'M12.5 6 9.2 10.2h2.4l-1 5.4 3.8-4.8h-2.4l.5-4.8z' } }
  ],
  wind: [
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M3.5 8h11.2a2.9 2.9 0 1 0-2.9-2.9' } },
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M3.5 12.4h14.7a2.9 2.9 0 1 1-2.9 2.9' } },
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M3.5 16.8h7.4' } }
  ],
  block: [
    { tag: 'circle', layer: 'ps', sw: 2.8, attrs: { cx: 12, cy: 12, r: 8.4 } },
    { tag: 'path', layer: 'ps', sw: 2.8, attrs: { d: 'M6.2 17.8 17.8 6.2' } }
  ],
  users: [
    { tag: 'circle', layer: 's', attrs: { cx: 16.9, cy: 7.2, r: 2.7 } },
    { tag: 'path', layer: 's', attrs: { d: 'M21.8 21.4v-1.1a5.5 5.5 0 0 0-4.9-5.45 5.5 5.5 0 0 1 2.9 4.85v1.7z' } },
    { tag: 'circle', layer: 'p', attrs: { cx: 9.3, cy: 7.4, r: 3.5 } },
    { tag: 'path', layer: 'p', attrs: { d: 'M2.6 21.4v-1.2a6.7 6.7 0 0 1 13.4 0v1.2z' } }
  ],
  wand: [
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M4 20 14.5 9.5' } },
    { tag: 'path', layer: 'p', attrs: { d: 'M17.8 2.6q.6 2.8 3.4 3.4-2.8.6-3.4 3.4-.6-2.8-3.4-3.4 2.8-.6 3.4-3.4z' } },
    { tag: 'circle', layer: 's', attrs: { cx: 21, cy: 13.8, r: 1.2 } },
    { tag: 'circle', layer: 's', attrs: { cx: 13.2, cy: 3.8, r: 1 } }
  ],
  window: [
    { tag: 'rect', layer: 'p', attrs: { x: 2.8, y: 4.2, width: 15.8, height: 11.6, rx: 2.4 } },
    { tag: 'path', layer: 'h', attrs: { d: 'M9.3 7.9v4.4l3.9-2.2z' } },
    { tag: 'path', layer: 'ps', sw: 2.4, attrs: { d: 'M7.5 19.6h6.8' } },
    { tag: 'path', layer: 'ps', sw: 2.4, attrs: { d: 'M11.9 15.8v3.8' } }
  ],
  sparkles: [
    { tag: 'path', layer: 'p', attrs: { d: 'M12 2.8q1 4.6 5.6 5.6-4.6 1-5.6 5.6-1-4.6-5.6-5.6 4.6-1 5.6-5.6z' } },
    { tag: 'path', layer: 's', attrs: { d: 'M18.8 14.5q.4 1.8 2.2 2.2-1.8.4-2.2 2.2-.4-1.8-2.2-2.2 1.8-.4 2.2-2.2z' } },
    { tag: 'circle', layer: 's', attrs: { cx: 6, cy: 17.5, r: 1.3 } }
  ],
  star: [
    { tag: 'path', layer: 'p', attrs: { d: 'M12 2.4l2.29 6.24 6.65.26-5.23 4.1 1.82 6.4L12 15.7l-5.53 3.7 1.82-6.4-5.23-4.1 6.65-.26z' } },
    { tag: 'circle', layer: 'h', attrs: { cx: 9.6, cy: 8.2, r: 1.2 } }
  ],
  user: [
    { tag: 'circle', layer: 'p', attrs: { cx: 12, cy: 7.5, r: 4 } },
    { tag: 'path', layer: 'p', attrs: { d: 'M4.6 21.4v-1.6a7.4 7.4 0 0 1 14.8 0v1.6z' } }
  ],
  info: [
    { tag: 'circle', layer: 'p', attrs: { cx: 12, cy: 12, r: 9.4 } },
    { tag: 'circle', layer: 'h', attrs: { cx: 12, cy: 7.5, r: 1.25 } },
    { tag: 'rect', layer: 'h', attrs: { x: 11, y: 10.8, width: 2, height: 5.6, rx: 1 } }
  ],
  check: [
    { tag: 'path', layer: 'ps', sw: 3.4, attrs: { d: 'M4.5 12.8l4.8 4.7L19.5 6.7' } }
  ],
  'arrow-right': [
    { tag: 'path', layer: 'ps', sw: 2.8, attrs: { d: 'M4.5 12h14.5' } },
    { tag: 'path', layer: 'ps', sw: 2.8, attrs: { d: 'M13.5 6.5 19 12l-5.5 5.5' } }
  ],
  swap: [
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M4.4 8.6h13.2' } },
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M14.4 5.4l3.2 3.2-3.2 3.2' } },
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M19.6 15.4H6.4' } },
    { tag: 'path', layer: 'ps', sw: 2.7, attrs: { d: 'M9.6 12.2l-3.2 3.2 3.2 3.2' } }
  ],
  swords: [
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M4.6 4.6 15.2 15.2' } },
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M19.4 4.6 8.8 15.2' } },
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M13.2 17.2 17.2 13.2' } },
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M6.8 13.2 10.8 17.2' } },
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M15.2 15.2 17.6 17.6' } },
    { tag: 'path', layer: 'ps', sw: 2.6, attrs: { d: 'M8.8 15.2 6.4 17.6' } }
  ],
  'zoom-in': [
    { tag: 'circle', layer: 's', attrs: { cx: 10.6, cy: 10.6, r: 5.2 } },
    { tag: 'circle', layer: 'ps', sw: 2.6, attrs: { cx: 10.6, cy: 10.6, r: 6.6 } },
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M15.5 15.5 20.2 20.2' } },
    { tag: 'path', layer: 'ps', sw: 2.4, attrs: { d: 'M10.6 7.9v5.4M7.9 10.6h5.4' } }
  ],
  'zoom-out': [
    { tag: 'circle', layer: 's', attrs: { cx: 10.6, cy: 10.6, r: 5.2 } },
    { tag: 'circle', layer: 'ps', sw: 2.6, attrs: { cx: 10.6, cy: 10.6, r: 6.6 } },
    { tag: 'path', layer: 'ps', sw: 3, attrs: { d: 'M15.5 15.5 20.2 20.2' } },
    { tag: 'path', layer: 'ps', sw: 2.4, attrs: { d: 'M7.9 10.6h5.4' } }
  ],
  crosshair: [
    { tag: 'circle', layer: 's', attrs: { cx: 12, cy: 12, r: 5.6 } },
    { tag: 'circle', layer: 'ps', sw: 2.4, attrs: { cx: 12, cy: 12, r: 7.4 } },
    { tag: 'circle', layer: 'p', attrs: { cx: 12, cy: 12, r: 2 } },
    { tag: 'path', layer: 'ps', sw: 2.4, attrs: { d: 'M12 2.4v3.2M12 18.4v3.2M2.4 12h3.2M18.4 12h3.2' } }
  ],
  ruler: [
    { tag: 'rect', layer: 'p', attrs: { x: 8.2, y: 2.6, width: 7.6, height: 18.8, rx: 1.8 } },
    { tag: 'path', layer: 'hs', sw: 1.8, attrs: { d: 'M8.2 6.6h2.8M8.2 10.4h4.4M8.2 14.2h2.8M8.2 18h4.4' } }
  ],
  scale: [
    { tag: 'circle', layer: 'ps', sw: 2.2, attrs: { cx: 12, cy: 4.4, r: 1.9 } },
    { tag: 'path', layer: 'p', attrs: { d: 'M8.9 6.3h6.2l3.1 11.1a1.9 1.9 0 0 1-1.9 2.4H7.7a1.9 1.9 0 0 1-1.9-2.4z' } },
    { tag: 'circle', layer: 'h', attrs: { cx: 12, cy: 13.8, r: 2.5 } },
    { tag: 'path', layer: 'hs', sw: 1.5, attrs: { d: 'M12 11.3v2.5' } }
  ]
}

export default {
  name: 'AppIcon',
  props: {
    name: { type: String, default: 'info' },
    size: { type: Number, default: 20 },
    color: { type: String, default: '#2C3A2F' },
    strokeWidth: { type: Number, default: 2.6 }
  },
  computed: {
    renderElements() {
      const defs = ICONS[this.name] || ICONS.info
      return defs.map((el) => {
        const attrs = { ...el.attrs }
        switch (el.layer) {
          case 'p':
            attrs.fill = this.color
            break
          case 'ps':
            attrs.fill = 'none'
            attrs.stroke = this.color
            attrs['stroke-width'] = el.sw || this.strokeWidth
            attrs['stroke-linecap'] = 'round'
            attrs['stroke-linejoin'] = 'round'
            break
          case 's':
            attrs.fill = this.color
            attrs['fill-opacity'] = 0.35
            break
          case 'h':
            attrs.fill = '#FFFFFF'
            attrs['fill-opacity'] = 0.92
            break
          case 'hs':
            attrs.fill = 'none'
            attrs.stroke = '#FFFFFF'
            attrs['stroke-width'] = el.sw || 2
            attrs['stroke-linecap'] = 'round'
            attrs['stroke-linejoin'] = 'round'
            break
        }
        return { tag: el.tag, attrs }
      })
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
}
</style>
