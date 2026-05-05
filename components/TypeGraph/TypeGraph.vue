<template>
  <view class="graph-shell" :class="[`mode-${mode}`]" @click.self="handleBlankClick">
    <canvas
      class="graph-canvas"
      :canvas-id="canvasId"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
    ></canvas>

    <view class="node-layer" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
      <view
        v-for="node in layout.nodes"
        :key="node.key"
        class="graph-node"
        :class="{ active: isActiveNode(node.key), dim: selectedType1 && !isRelatedNode(node.key) }"
        :style="nodeStyle(node)"
        @click.stop="handleNodeClick(node.key)"
      >
        <TypeBadge :label="node.label" :color="node.color || resolveTypeColor(node.key)" />
      </view>

      <view
        v-if="mode === 'defense' && layout.center"
        class="center-node"
        :style="centerStyle"
        @click.stop="handleCenterClick"
      >
        <text class="center-title">{{ centerTitle }}</text>
        <text class="center-sub">合成防御节点</text>
      </view>
    </view>
  </view>
</template>

<script>
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pets.js'
import { normalizeAttr } from '@/data/game_math.js'
import { getDefenseGraphEdges, getSingleTypeEdges, getCircularLayout, getDefenseLayout, getTypeList } from '@/utils/typeGraph.js'

const typeColorMap = petTypes.reduce((acc, item) => {
  acc[item.key] = item.color
  return acc
}, {})

export default {
  name: 'TypeGraph',
  components: {
    TypeBadge
  },
  props: {
    mode: {
      type: String,
      default: 'overview'
    },
    selectedType1: {
      type: String,
      default: ''
    },
    selectedType2: {
      type: String,
      default: ''
    },
    typeList: {
      type: Array,
      default: () => []
    },
    relationTable: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      canvasId: `type-graph-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      canvasWidth: 320,
      canvasHeight: 320,
      layout: {
        nodes: [],
        center: null
      },
      edges: []
    }
  },
  computed: {
    resolvedTypes() {
      const list = this.typeList && this.typeList.length ? this.typeList : getTypeList(this.relationTable)
      return list
    },
    centerTitle() {
      const type1 = this.selectedType1 || ''
      const type2 = this.selectedType2 || ''
      if (type1 && type2) return `${type1} / ${type2}`
      return type1 || '属性中心'
    },
    centerStyle() {
      const center = this.layout.center || { x: this.canvasWidth / 2, y: this.canvasHeight / 2, radius: 44 }
      return {
        left: `${center.x}px`,
        top: `${center.y}px`,
        width: `${Math.max(132, center.radius * 2.8)}px`,
        height: `${Math.max(78, center.radius * 1.8)}px`
      }
    }
  },
  watch: {
    mode: 'refresh',
    selectedType1: 'refresh',
    selectedType2: 'refresh',
    typeList: {
      deep: true,
      handler() {
        this.refresh()
      }
    },
    relationTable: {
      deep: true,
      handler() {
        this.refresh()
      }
    }
  },
  mounted() {
    this.measureAndRefresh()
  },
  methods: {
    refresh() {
      this.$nextTick(() => {
        this.measureAndRefresh()
      })
    },
    measureAndRefresh() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query
          .select('.graph-shell')
          .boundingClientRect((rect) => {
            const width = Math.max(260, Math.floor(rect?.width || 320))
            const height = Math.max(260, Math.floor(rect?.height || 320))
            this.canvasWidth = width
            this.canvasHeight = height
            this.rebuildLayout()
          })
          .exec()
      })
    },
    rebuildLayout() {
      const width = this.canvasWidth
      const height = this.canvasHeight
      if (this.mode === 'defense') {
        const edges = this.selectedType1 ? getDefenseGraphEdges(this.selectedType1, this.selectedType2, this.relationTable) : []
        const activeTypes = Array.from(new Set(edges.map((edge) => edge.from)))
        const layout = getDefenseLayout(activeTypes, null, width, height)
        this.edges = edges
        this.layout = layout
      } else {
        const layout = getCircularLayout(this.resolvedTypes, width, height)
        const edges = this.selectedType1 ? getSingleTypeEdges(this.selectedType1, this.relationTable) : []
        this.edges = edges
        this.layout = {
          nodes: layout.nodes,
          center: layout.center,
          nodeSize: layout.nodeSize,
          radius: layout.radius
        }
      }
      this.drawCanvas()
    },
    drawCanvas() {
      const ctx = uni.createCanvasContext(this.canvasId, this)
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      ctx.setLineCap('round')
      ctx.setLineJoin('round')

      const nodeMap = new Map()
      ;(this.layout.nodes || []).forEach((node) => {
        nodeMap.set(node.key, node)
      })

      if (this.mode === 'overview' && !this.selectedType1) {
        ctx.draw()
        return
      }

      if (this.mode === 'defense' && !this.edges.length) {
        ctx.draw()
        return
      }

      this.edges.forEach((edge) => {
        if (this.mode === 'overview') {
          this.drawOverviewEdge(ctx, edge, nodeMap)
        } else {
          this.drawDefenseEdge(ctx, edge, nodeMap)
        }
      })

      ctx.draw()
    },
    drawOverviewEdge(ctx, edge, nodeMap) {
      const from = nodeMap.get(edge.from)
      const to = nodeMap.get(edge.to)
      if (!from || !to) return

      const color = edge.colorType === 'strong' ? '#f15c5c' : '#4e86ff'
      const curve = edge.direction === 'double' ? 0 : this.computeCurve(from, to)
      if (edge.direction === 'double') {
        this.drawDoubleArrow(ctx, from, to, {
          color,
          lineWidth: edge.lineWidth,
          label: edge.label
        })
      } else {
        this.drawArrow(ctx, from, to, {
          color,
          lineWidth: edge.lineWidth,
          label: edge.label,
          curve
        })
      }
    },
    drawDefenseEdge(ctx, edge, nodeMap) {
      const from = nodeMap.get(edge.from)
      const center = this.layout.center
      if (!from || !center) return
      const color = edge.colorType === 'strong' ? '#f15c5c' : '#4e86ff'
      this.drawArrow(ctx, from, center, {
        color,
        lineWidth: edge.lineWidth,
        label: edge.label,
        curve: this.computeCurve(from, center) * 0.5
      })
    },
    computeCurve(from, to) {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      if (distance < 80) return 0
      return ((from.x + from.y) % 2 === 0 ? 1 : -1) * Math.min(22, distance * 0.08)
    },
    shortenLine(from, to, fromRadius, toRadius) {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const startRatio = fromRadius / dist
      const endRatio = toRadius / dist
      return {
        start: {
          x: from.x + dx * startRatio,
          y: from.y + dy * startRatio
        },
        end: {
          x: to.x - dx * endRatio,
          y: to.y - dy * endRatio
        }
      }
    },
    drawArrow(ctx, from, to, options = {}) {
      const color = options.color || '#f15c5c'
      const lineWidth = options.lineWidth || 4
      const curve = options.curve || 0
      const shortened = this.shortenLine(from, to, from.radius || 34, to.radius || 34)
      const sx = shortened.start.x
      const sy = shortened.start.y
      const ex = shortened.end.x
      const ey = shortened.end.y
      const mx = (sx + ex) / 2
      const my = (sy + ey) / 2
      const dx = ex - sx
      const dy = ey - sy
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      const offsetX = (-dy / distance) * curve
      const offsetY = (dx / distance) * curve
      const cx = mx + offsetX
      const cy = my + offsetY
      const angle = Math.atan2(ey - sy, ex - sx)

      ctx.beginPath()
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(lineWidth)
      ctx.moveTo(sx, sy)
      if (curve) {
        ctx.quadraticCurveTo(cx, cy, ex, ey)
      } else {
        ctx.lineTo(ex, ey)
      }
      ctx.stroke()
      this.drawArrowHead(ctx, ex, ey, angle, color)
      if (options.label) {
        this.drawLabel(ctx, options.label, cx || mx, cy || my, { color })
      }
    },
    drawDoubleArrow(ctx, from, to, options = {}) {
      const color = options.color || '#f15c5c'
      const lineWidth = options.lineWidth || 5
      const shortened = this.shortenLine(from, to, from.radius || 34, to.radius || 34)
      const sx = shortened.start.x
      const sy = shortened.start.y
      const ex = shortened.end.x
      const ey = shortened.end.y
      const mx = (sx + ex) / 2
      const my = (sy + ey) / 2
      const angle = Math.atan2(ey - sy, ex - sx)

      ctx.beginPath()
      ctx.setStrokeStyle(color)
      ctx.setLineWidth(lineWidth)
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      this.drawArrowHead(ctx, ex, ey, angle, color)
      this.drawArrowHead(ctx, sx, sy, angle + Math.PI, color)
      if (options.label) {
        this.drawLabel(ctx, options.label, mx, my, { color })
      }
    },
    drawArrowHead(ctx, x, y, angle, color) {
      const size = 8
      ctx.save()
      ctx.setFillStyle(color)
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size, -size * 0.6)
      ctx.lineTo(-size, size * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    },
    drawLabel(ctx, text, x, y, options = {}) {
      const label = String(text || '')
      const fontSize = 11
      const paddingX = 8
      const paddingY = 4
      const width = Math.max(24, label.length * fontSize * 0.66 + paddingX * 2)
      const height = 22
      const left = x - width / 2
      const top = y - height / 2
      const color = options.color || '#f15c5c'

      ctx.save()
      ctx.setFillStyle(color)
      ctx.setStrokeStyle(color)
      ctx.beginPath()
      ctx.moveTo(left + 8, top)
      ctx.lineTo(left + width - 8, top)
      ctx.quadraticCurveTo(left + width, top, left + width, top + 8)
      ctx.lineTo(left + width, top + height - 8)
      ctx.quadraticCurveTo(left + width, top + height, left + width - 8, top + height)
      ctx.lineTo(left + 8, top + height)
      ctx.quadraticCurveTo(left, top + height, left, top + height - 8)
      ctx.lineTo(left, top + 8)
      ctx.quadraticCurveTo(left, top, left + 8, top)
      ctx.closePath()
      ctx.fill()
      ctx.setFillStyle('#fff')
      ctx.setFontSize(fontSize)
      ctx.fillText(label, x - (label.length * fontSize * 0.33), y + 4)
      ctx.restore()
    },
    nodeStyle(node) {
      const size = Math.max(76, node.radius * 2 + 8)
      return {
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`
      }
    },
    isActiveNode(key) {
      if (this.mode === 'overview') {
        return this.selectedType1 === key
      }
      return this.selectedType1 === key || this.selectedType2 === key
    },
    isRelatedNode(key) {
      if (!this.selectedType1) return true
      if (this.mode === 'overview') {
        return key === this.selectedType1 || (this.edges || []).some((edge) => edge.from === key || edge.to === key)
      }
      return (this.edges || []).some((edge) => edge.from === key)
    },
    resolveTypeColor(type) {
      return typeColorMap[normalizeAttr(type)] || '#5b7cf5'
    },
    handleNodeClick(key) {
      this.$emit('selectType', key)
    },
    handleCenterClick() {
      this.$emit('selectType', this.selectedType1)
    },
    handleBlankClick() {
      this.$emit('clearSelect')
    }
  }
}
</script>

<style scoped>
.graph-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.graph-shell.mode-overview {
  background: radial-gradient(circle at top, rgba(91, 124, 245, 0.12), rgba(13, 23, 53, 0.06));
}

.graph-shell.mode-defense {
  background: radial-gradient(circle at top, rgba(91, 124, 245, 0.12), rgba(29, 39, 72, 0.04));
}

.graph-canvas,
.node-layer {
  position: absolute;
  left: 0;
  top: 0;
}

.graph-canvas {
  z-index: 1;
  pointer-events: none;
}

.node-layer {
  z-index: 2;
}

.graph-node {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  transition: transform 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}

.graph-node.active {
  z-index: 3;
  filter: drop-shadow(0 0 16px rgba(255, 185, 76, 0.35));
}

.graph-node.dim {
  opacity: 0.32;
}

.center-node {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(91, 124, 245, 0.2);
  box-shadow: 0 16rpx 34rpx rgba(31, 47, 87, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 16rpx;
}

.center-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #1c2748;
  text-align: center;
}

.center-sub {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #6b7590;
}
</style>
