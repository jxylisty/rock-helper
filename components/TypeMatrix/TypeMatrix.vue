<template>
  <view class="tm-shell">
    <view class="tm-legend">
      <view class="tm-legend-chip up">
        <text class="tm-legend-t">克制 2x / 3x</text>
      </view>
      <view class="tm-legend-chip down">
        <text class="tm-legend-t">抵抗 ½x / ¼x</text>
      </view>
      <view class="tm-legend-chip plain">
        <text class="tm-legend-t plain-t">空白 = 1x</text>
      </view>
      <view class="tm-legend-dir">
        <text class="tm-legend-t dir-t">行 = 攻击方 · 列 = 防守方</text>
      </view>
    </view>

    <scroll-view
      class="tm-scroll"
      scroll-x
      scroll-y
      :show-scrollbar="false"
      :scroll-into-view="scrollTarget"
      scroll-with-animation
    >
      <view class="tm-grid">
        <view class="tm-row tm-headrow">
          <view class="tm-cell tm-corner">
            <text class="tm-corner-t">守→</text>
            <text class="tm-corner-t">攻↓</text>
          </view>
          <view
            v-for="t in types"
            :id="`col-${t.key}`"
            :key="`h-${t.key}`"
            class="tm-cell tm-colhead"
            :class="{ sel: isColSel(t.key) }"
            :style="{ background: t.color }"
            hover-class="tm-press"
            @click="tapCol(t.key)"
          >
            <text class="tm-head-t">{{ t.key }}</text>
          </view>
        </view>

        <view v-for="row in matrix" :key="row.key" class="tm-row">
          <view
            class="tm-cell tm-rowhead"
            :class="{ sel: isRowSel(row.key) }"
            :style="{ background: row.color }"
            hover-class="tm-press"
            @click="tapRow(row.key)"
          >
            <text class="tm-head-t">{{ row.key }}</text>
          </view>
          <view
            v-for="cell in row.cells"
            :key="`${row.key}-${cell.key}`"
            class="tm-cell tm-val"
            :class="[cell.cls, { dim: isDim(row.key, cell.key), cross: isCross(row, cell) }]"
            hover-class="tm-press"
            @click="tapCell(row.key, cell.key)"
          >
            <text v-if="cell.label" class="tm-val-t">{{ cell.label }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="tm-hint">
      <AppIcon name="info" :size="10" color="#A97F35" />
      <text class="tm-hint-t">{{ hintText }}</text>
    </view>
  </view>
</template>

<script>
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { getAttrMultiplier, normalizeAttr } from '@/data/config/game_math.js'

function valueLabel(value) {
  if (value === 3) return '3'
  if (value === 2) return '2'
  if (value === 1 / 2) return '½'
  if (value === 1 / 4) return '¼'
  return ''
}

export default {
  name: 'TypeMatrix',
  components: { AppIcon },
  props: {
    mode: { type: String, default: 'overview' },
    selectedType1: { type: String, default: '' },
    selectedType2: { type: String, default: '' },
    typeList: { type: Array, default: () => [] },
    relationTable: { type: Object, default: null }
  },
  data() {
    return {
      overviewRow: '',
      overviewCol: ''
    }
  },
  computed: {
    types() {
      return (this.typeList || [])
        .map((item) => ({
          key: normalizeAttr(item.key || item.label),
          label: item.label || item.key,
          color: item.color || '#5b7cf5'
        }))
        .filter((item) => item.key)
    },
    matrix() {
      return this.types.map((row) => ({
        key: row.key,
        label: row.label,
        color: row.color,
        cells: this.types.map((col) => {
          const value = getAttrMultiplier(row.key, [col.key])
          return {
            key: col.key,
            value,
            label: valueLabel(value),
            cls: value > 1 ? 'up' : value < 1 ? 'down' : ''
          }
        })
      }))
    },
    activeRows() {
      if (this.mode === 'defense') return []
      return this.overviewRow ? [this.overviewRow] : []
    },
    activeCols() {
      if (this.mode === 'defense') {
        return [this.selectedType1, this.selectedType2]
          .map(normalizeAttr)
          .filter(Boolean)
      }
      return this.overviewCol ? [this.overviewCol] : []
    },
    hasFocus() {
      return this.activeRows.length > 0 || this.activeCols.length > 0
    },
    scrollTarget() {
      if (this.mode === 'defense' && this.selectedType1) {
        return `col-${normalizeAttr(this.selectedType1)}`
      }
      return ''
    },
    hintText() {
      if (this.mode === 'defense') {
        return '高亮列为你选择的防守属性：红格属性打你 2x/3x，蓝格属性打你 ½x/¼x'
      }
      return '点击行/列表头高亮该属性，点击格子查看单条克制关系，再次点击取消'
    }
  },
  watch: {
    mode(value) {
      if (value === 'overview') {
        this.overviewRow = normalizeAttr(this.selectedType1) || ''
        this.overviewCol = this.overviewRow
      }
    },
    selectedType1(value) {
      if (this.mode === 'overview') {
        this.overviewRow = normalizeAttr(value) || ''
        this.overviewCol = this.overviewRow
      }
    }
  },
  mounted() {
    if (this.mode === 'overview' && this.selectedType1) {
      this.overviewRow = normalizeAttr(this.selectedType1)
      this.overviewCol = this.overviewRow
    }
  },
  methods: {
    isRowSel(key) {
      return this.activeRows.includes(key)
    },
    isColSel(key) {
      return this.activeCols.includes(key)
    },
    isDim(rowKey, colKey) {
      if (!this.hasFocus) return false
      return !this.activeRows.includes(rowKey) && !this.activeCols.includes(colKey)
    },
    isCross(row, cell) {
      return this.activeRows.includes(row.key) && this.activeCols.includes(cell.key)
    },
    tapRow(key) {
      if (this.mode === 'overview' && this.overviewRow === key && !this.overviewCol) {
        this.overviewRow = ''
        this.$emit('clearSelect')
        return
      }
      this.overviewRow = key
      this.$emit('selectType', key)
    },
    tapCol(key) {
      if (this.mode === 'overview' && this.overviewCol === key && !this.overviewRow) {
        this.overviewCol = ''
        this.$emit('clearSelect')
        return
      }
      this.overviewCol = key
      this.$emit('selectType', key)
    },
    tapCell(rowKey, colKey) {
      this.overviewRow = rowKey
      this.overviewCol = colKey
    }
  }
}
</script>

<style scoped>
.tm-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
}

.tm-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.tm-legend-chip {
  height: 19px;
  padding: 0 8px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
}

.tm-legend-chip.up {
  background: #C64B38;
}

.tm-legend-chip.down {
  background: #2C6FD1;
}

.tm-legend-chip.plain {
  background: #F2EBDA;
  border: 1px dashed #CFC7AE;
}

.tm-legend-t {
  font-size: 9.5px;
  font-weight: 700;
  color: #FFF5EC;
  white-space: nowrap;
}

.tm-legend-t.plain-t {
  color: #6B7A6E;
}

.tm-legend-dir {
  margin-left: auto;
}

.tm-legend-t.dir-t {
  font-size: 9.5px;
  font-weight: 700;
  color: #8A6A2C;
}

.tm-scroll {
  flex: 1;
  min-height: 0;
  border: 1.5px solid #E3DCC8;
  border-radius: 12px;
  background: #FFFDF7;
}

.tm-grid {
  width: max-content;
  padding: 6px;
}

.tm-row {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
}

.tm-row:last-child {
  margin-bottom: 0;
}

.tm-headrow {
  position: sticky;
  top: 0;
  z-index: 3;
  padding-bottom: 3px;
  background: #FFFDF7;
}

.tm-cell {
  width: 23px;
  height: 23px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tm-corner {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 4;
  width: 25px;
  flex-direction: column;
  gap: 1px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  box-sizing: border-box;
}

.tm-corner-t {
  font-size: 7.5px;
  font-weight: 700;
  color: #8A6A2C;
  line-height: 1;
  white-space: nowrap;
}

.tm-colhead,
.tm-rowhead {
  position: sticky;
  box-shadow: 0 1.5px 0 rgba(44, 58, 47, 0.22);
  transition: transform 0.12s ease;
}

.tm-colhead {
  top: 0;
}

.tm-rowhead {
  left: 0;
  z-index: 2;
  width: 25px;
}

.tm-head-t {
  font-size: 9px;
  font-weight: 800;
  color: #FFFFFF;
  white-space: nowrap;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.tm-colhead.sel,
.tm-rowhead.sel {
  outline: 2px solid #A97F35;
  outline-offset: 1px;
  z-index: 5;
}

.tm-val {
  background: rgba(44, 58, 47, 0.045);
  transition: opacity 0.15s ease, transform 0.12s ease;
}

.tm-val.up {
  background: #C64B38;
}

.tm-val.down {
  background: #2C6FD1;
}

.tm-val.dim {
  opacity: 0.3;
}

.tm-val.cross {
  outline: 2px solid #A97F35;
  outline-offset: 0;
}

.tm-val-t {
  font-size: 9.5px;
  font-weight: 800;
  color: #FFF5EC;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.tm-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 7px 9px;
  border-radius: 10px;
  background: rgba(201, 161, 78, 0.12);
  border: 1px dashed #C9A14E;
}

.tm-hint-t {
  flex: 1;
  font-size: 10px;
  color: #A97F35;
  font-weight: 700;
  line-height: 1.5;
}

.tm-press {
  transform: scale(0.9);
  opacity: 0.85;
}
</style>
