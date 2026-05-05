<template>
  <view class="page">
    <AppHeader title="世界地图" subtitle="本地矩形瓦片缩放" leftAction="back">
      <template #right>
        <view class="header-actions">
          <view class="header-btn" @click="zoomOut">-</view>
          <view class="header-btn" @click="zoomIn">+</view>
          <view class="header-btn" @click="centerMap">居中</view>
        </view>
      </template>
    </AppHeader>

    <view class="stats-row">
      <text>级别：z{{ currentLevel }}</text>
      <text>缩放：{{ scale.toFixed(2) }}x</text>
      <text>瓦片：{{ visibleTiles.length }}</text>
    </view>

    <view
      class="map-shell"
    >
      <view
        class="map-viewport"
        @touchstart="onTouchStart"
        @touchmove.stop.prevent="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @wheel.prevent="onWheel"
      >
        <view class="map-stage" :style="stageStyle">
          <view
            v-for="tile in visibleTiles"
            :key="tile.key"
            class="tile"
            :style="tile.style"
          >
            <image class="tile-img" :src="tile.src" mode="scaleToFill" />
          </view>
        </view>

        <view class="zoom-badge">
          <text>{{ currentLevelLabel }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import mapRectPyramid from '@/data/map_rect_pyramid.json'

export default {
  components: {
    AppHeader
  },
  data() {
    return {
      pyramid: mapRectPyramid,
      viewportWidth: 0,
      viewportHeight: 0,
      scale: 0.12,
      minScale: 0.015,
      maxScale: 2.2,
      offsetX: 0,
      offsetY: 0,
      bufferWorldPx: 512,
      gesture: {
        mode: '',
        startOffsetX: 0,
        startOffsetY: 0,
        startScale: 1,
        startDistance: 0,
        anchorWorldX: 0,
        anchorWorldY: 0,
        startTouchX: 0,
        startTouchY: 0,
        mouseDown: false
      }
    }
  },
  computed: {
    worldWidth() {
      return this.pyramid.worldWidth
    },
    worldHeight() {
      return this.pyramid.worldHeight
    },
    currentLevel() {
      if (this.scale < 0.08 && this.pyramid.levels['5']) return 5
      if (this.scale < 0.18 && this.pyramid.levels['6']) return 6
      if (this.scale < 0.5 && this.pyramid.levels['7']) return 7
      return 8
    },
    currentLevelData() {
      return this.pyramid.levels[String(this.currentLevel)] || this.pyramid.levels['8']
    },
    currentLevelLabel() {
      return `z${this.currentLevel} / ${this.currentLevelData.worldTileSize}px`
    },
    stageStyle() {
      return {
        width: this.worldWidth + 'px',
        height: this.worldHeight + 'px',
        transform: `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`,
        transformOrigin: '0 0'
      }
    },
    visibleTiles() {
      const level = this.currentLevelData
      if (!level) return []

      const worldLeft = (-this.offsetX / this.scale) - this.bufferWorldPx
      const worldTop = (-this.offsetY / this.scale) - this.bufferWorldPx
      const worldRight = worldLeft + this.viewportWidth / this.scale + this.bufferWorldPx * 2
      const worldBottom = worldTop + this.viewportHeight / this.scale + this.bufferWorldPx * 2

      const tileWorldSize = level.worldTileSize
      const startCol = Math.max(0, Math.floor(worldLeft / tileWorldSize))
      const endCol = Math.min(level.cols - 1, Math.floor(worldRight / tileWorldSize))
      const startRow = Math.max(0, Math.floor(worldTop / tileWorldSize))
      const endRow = Math.min(level.rows - 1, Math.floor(worldBottom / tileWorldSize))

      const tiles = []
      for (let row = startRow; row <= endRow; row += 1) {
        for (let col = startCol; col <= endCol; col += 1) {
          tiles.push({
            key: `${this.currentLevel}_${col}_${row}`,
            src: `/static/${level.dir}/tile-${col}_${row}.png`,
            style: {
              left: col * tileWorldSize + 'px',
              top: row * tileWorldSize + 'px',
              width: tileWorldSize + 'px',
              height: tileWorldSize + 'px'
            }
          })
        }
      }
      return tiles
    }
  },
  onReady() {
    this.updateViewportSize()
  },
  onShow() {
    this.updateViewportSize()
  },
  methods: {
    updateViewportSize() {
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('.map-viewport').boundingClientRect((rect) => {
          if (!rect) return
          this.viewportWidth = Math.max(1, rect.width || 0)
          this.viewportHeight = Math.max(1, rect.height || 0)
          this.centerMap(true)
        }).exec()
      })
    },
    clampTransform() {
      const scaledWidth = this.worldWidth * this.scale
      const scaledHeight = this.worldHeight * this.scale

      if (scaledWidth <= this.viewportWidth) {
        this.offsetX = (this.viewportWidth - scaledWidth) / 2
      } else {
        const minX = this.viewportWidth - scaledWidth
        this.offsetX = Math.min(0, Math.max(minX, this.offsetX))
      }

      if (scaledHeight <= this.viewportHeight) {
        this.offsetY = (this.viewportHeight - scaledHeight) / 2
      } else {
        const minY = this.viewportHeight - scaledHeight
        this.offsetY = Math.min(0, Math.max(minY, this.offsetY))
      }
    },
    centerMap(fitWhole = false) {
      const fitScale = Math.min(
        this.viewportWidth / this.worldWidth,
        this.viewportHeight / this.worldHeight
      )
      if (fitWhole) {
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, fitScale))
      }
      this.offsetX = (this.viewportWidth - this.worldWidth * this.scale) / 2
      this.offsetY = (this.viewportHeight - this.worldHeight * this.scale) / 2
      this.clampTransform()
    },
    zoomBy(multiplier) {
      const centerX = this.viewportWidth / 2
      const centerY = this.viewportHeight / 2
      const worldX = (centerX - this.offsetX) / this.scale
      const worldY = (centerY - this.offsetY) / this.scale
      const nextScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * multiplier))
      this.scale = nextScale
      this.offsetX = centerX - worldX * this.scale
      this.offsetY = centerY - worldY * this.scale
      this.clampTransform()
    },
    zoomIn() {
      this.zoomBy(1.25)
    },
    zoomOut() {
      this.zoomBy(0.8)
    },
    getDistance(a, b) {
      const pointA = this.getTouchPoint(a)
      const pointB = this.getTouchPoint(b)
      const dx = pointA.x - pointB.x
      const dy = pointA.y - pointB.y
      return Math.sqrt(dx * dx + dy * dy)
    },
    getMidpoint(a, b) {
      const pointA = this.getTouchPoint(a)
      const pointB = this.getTouchPoint(b)
      return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
      }
    },
    getTouchPoint(touch) {
      return {
        x: touch.pageX ?? touch.clientX ?? touch.x ?? 0,
        y: touch.pageY ?? touch.clientY ?? touch.y ?? 0
      }
    },
    getPointerPoint(event) {
      return {
        x: event.pageX ?? event.clientX ?? event.x ?? 0,
        y: event.pageY ?? event.clientY ?? event.y ?? 0
      }
    },
    onTouchStart(e) {
      const touches = e.touches || []
      if (touches.length >= 2) {
        const mid = this.getMidpoint(touches[0], touches[1])
        this.gesture.mode = 'pinch'
        this.gesture.startScale = this.scale
        this.gesture.startDistance = this.getDistance(touches[0], touches[1])
        this.gesture.anchorWorldX = (mid.x - this.offsetX) / this.scale
        this.gesture.anchorWorldY = (mid.y - this.offsetY) / this.scale
      } else if (touches.length === 1) {
        const point = this.getTouchPoint(touches[0])
        this.gesture.mode = 'pan'
        this.gesture.startTouchX = point.x
        this.gesture.startTouchY = point.y
        this.gesture.startOffsetX = this.offsetX
        this.gesture.startOffsetY = this.offsetY
      }
    },
    onTouchMove(e) {
      const touches = e.touches || []
      if (touches.length >= 2) {
        const distance = this.getDistance(touches[0], touches[1])
        if (!this.gesture.startDistance) return
        const mid = this.getMidpoint(touches[0], touches[1])
        const nextScale = Math.max(
          this.minScale,
          Math.min(this.maxScale, this.gesture.startScale * (distance / this.gesture.startDistance))
        )
        this.scale = nextScale
        this.offsetX = mid.x - this.gesture.anchorWorldX * this.scale
        this.offsetY = mid.y - this.gesture.anchorWorldY * this.scale
        this.clampTransform()
        return
      }

      if (touches.length === 1 && this.gesture.mode === 'pan') {
        const point = this.getTouchPoint(touches[0])
        const dx = point.x - this.gesture.startTouchX
        const dy = point.y - this.gesture.startTouchY
        this.offsetX = this.gesture.startOffsetX + dx
        this.offsetY = this.gesture.startOffsetY + dy
        this.clampTransform()
      }
    },
    onTouchEnd() {
      this.gesture.mode = ''
      this.gesture.startDistance = 0
    },
    onMouseDown(e) {
      const point = this.getPointerPoint(e)
      this.gesture.mode = 'mouse-pan'
      this.gesture.mouseDown = true
      this.gesture.startTouchX = point.x
      this.gesture.startTouchY = point.y
      this.gesture.startOffsetX = this.offsetX
      this.gesture.startOffsetY = this.offsetY
    },
    onMouseMove(e) {
      if (!this.gesture.mouseDown || this.gesture.mode !== 'mouse-pan') return
      const point = this.getPointerPoint(e)
      const dx = point.x - this.gesture.startTouchX
      const dy = point.y - this.gesture.startTouchY
      this.offsetX = this.gesture.startOffsetX + dx
      this.offsetY = this.gesture.startOffsetY + dy
      this.clampTransform()
    },
    onMouseUp() {
      this.gesture.mouseDown = false
      if (this.gesture.mode === 'mouse-pan') {
        this.gesture.mode = ''
      }
    },
    onWheel(e) {
      const point = this.getPointerPoint(e)
      const worldX = (point.x - this.offsetX) / this.scale
      const worldY = (point.y - this.offsetY) / this.scale
      const delta = e.deltaY > 0 ? 0.88 : 1.12
      const nextScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta))
      this.scale = nextScale
      this.offsetX = point.x - worldX * this.scale
      this.offsetY = point.y - worldY * this.scale
      this.clampTransform()
    }
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f7f9fc 0%, #edf3fb 100%);
  overflow: hidden;
}

.header-actions {
  display: flex;
  gap: 12rpx;
}

.header-btn {
  min-width: 72rpx;
  height: 60rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 22rpx;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 14rpx 24rpx;
  font-size: 22rpx;
  color: #6b7590;
}

.map-shell {
  flex: 1;
  min-height: 0;
}

.map-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background:
    radial-gradient(circle at top, rgba(85, 136, 212, 0.12), transparent 40%),
    linear-gradient(180deg, #fbfcfe 0%, #eef4fb 100%);
}

.map-viewport:active {
  cursor: grabbing;
}

.map-stage {
  position: absolute;
  left: 0;
  top: 0;
  will-change: transform;
}

.tile {
  position: absolute;
  overflow: hidden;
}

.tile-img {
  width: 100%;
  height: 100%;
  display: block;
}

.zoom-badge {
  position: absolute;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom) + 24rpx);
  padding: 12rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(18, 34, 61, 0.78);
  color: #fff;
  font-size: 22rpx;
}
</style>
