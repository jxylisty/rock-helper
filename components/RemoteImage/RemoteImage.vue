<template>
  <view class="remote-image-wrap" :class="wrapperClass" :style="wrapperStyle">
    <image
      v-if="!showFailureHint && !showCompactFallback"
      class="remote-image-el"
      v-bind="imageAttrs"
      :src="displaySrc"
      :mode="mode"
      @error="onImageError"
      @load="onImageLoad"
    />
    <view v-else-if="showCompactFallback" class="compact-fallback" />
    <view v-else class="image-fallback" :class="{ compact: compactHint }">
      <text class="fallback-title">{{ fallbackTitle }}</text>
      <text class="fallback-reason">{{ failureReason }}</text>
      <text v-if="debugPathLabel" class="fallback-path">{{ debugPathLabel }}</text>
    </view>
  </view>
</template>

<script>
import { getAssetCandidateUrls, isLocalStaticAsset, resolveAssetPath } from '@/utils/asset-path.js'
import { ensureCachedRemoteImage, isPackagedImage } from '@/utils/image-cache.js'

export default {
  name: 'RemoteImage',
  inheritAttrs: false,
  props: {
    src: { type: String, default: '' },
    mode: { type: String, default: 'aspectFit' }
  },
  emits: ['error', 'load'],
  data() {
    return {
      displaySrc: '',
      requestId: 0,
      candidates: [],
      candidateIndex: 0,
      failed: false,
      lastFailedSrc: ''
    }
  },
  computed: {
    wrapperClass() {
      return this.$attrs.class
    },
    wrapperStyle() {
      return this.$attrs.style
    },
    imageAttrs() {
      const attrs = { ...this.$attrs }
      delete attrs.class
      delete attrs.style
      return attrs
    },
    fallbackTitle() {
      return '\u56fe\u7247\u672a\u663e\u793a'
    },
    compactHint() {
      const value = String(this.wrapperClass || '')
      return /icon|badge|type-icon|skill-icon/i.test(value)
    },
    originalSource() {
      return String(this.src || '').trim()
    },
    showFailureHint() {
      return this.failed && !this.displaySrc && !this.compactHint
    },
    showCompactFallback() {
      return this.failed && !this.displaySrc && this.compactHint
    },
    debugPathLabel() {
      if (!this.originalSource) return ''
      return this.originalSource.length > 48 ? `${this.originalSource.slice(0, 48)}...` : this.originalSource
    },
    failureReason() {
      if (!this.originalSource) {
        return '\u56fe\u7247\u5730\u5740\u4e3a\u7a7a'
      }
      if (isLocalStaticAsset(this.originalSource)) {
        return '\u8fdc\u7a0b\u8d44\u6e90\u7ad9\u52a0\u8f7d\u5931\u8d25\uff0c\u672c\u5730 static \u56fe\u7247\u4e5f\u672a\u547d\u4e2d'
      }
      if (/^https?:\/\//i.test(this.originalSource)) {
        return '\u8fdc\u7a0b\u56fe\u7247\u5730\u5740\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u6216\u8d44\u6e90\u662f\u5426\u5b58\u5728'
      }
      return '\u56fe\u7247\u8d44\u6e90\u4e0d\u53ef\u7528'
    }
  },
  watch: {
    src: {
      immediate: true,
      handler() {
        this.refreshSource()
      }
    }
  },
  methods: {
    async loadCachedCandidate(candidateUrl) {
      if (!candidateUrl) return ''
      if (isPackagedImage(candidateUrl)) return ''
      try {
        const cached = await ensureCachedRemoteImage(candidateUrl, candidateUrl)
        return cached || ''
      } catch (error) {
        // Cache failure must never break rendering: fall back to direct remote URL
        return ''
      }
    },
    async refreshSource() {
      const nextRequestId = this.requestId + 1
      this.requestId = nextRequestId
      this.failed = false
      this.lastFailedSrc = ''

      const originalSource = String(this.src || '').trim()
      this.candidates = getAssetCandidateUrls(originalSource)
      this.candidateIndex = 0

      // 优先尝试远程资源本地化缓存：首次下载后存本地，避免重复请求 CDN
      for (let i = 0; i < this.candidates.length; i++) {
        const candidate = this.candidates[i]
        const isRemote = /^https?:\/\//i.test(candidate)
        if (!isRemote) continue
        if (nextRequestId !== this.requestId) return
        const cached = await this.loadCachedCandidate(candidate)
        if (nextRequestId !== this.requestId) return
        if (cached) {
          this.candidateIndex = i
          this.displaySrc = cached
          this.$emit('load', {})
          return
        }
      }

      const resolved = this.candidates[0] || resolveAssetPath(originalSource)
      this.displaySrc = resolved || ''
      if (!resolved) {
        this.failed = true
        return
      }
    },
    onImageLoad(event) {
      this.failed = false
      this.lastFailedSrc = ''
      this.$emit('load', event)
    },
    async onImageError(event) {
      this.lastFailedSrc = this.displaySrc
      if (this.candidateIndex + 1 < this.candidates.length) {
        this.candidateIndex += 1
        const nextSrc = this.candidates[this.candidateIndex]
        this.displaySrc = nextSrc
        return
      }

      this.displaySrc = ''
      this.failed = true
      this.$emit('error', event)
    }
  }
}
</script>

<style scoped>
.remote-image-wrap {
  display: block;
  flex-shrink: 0;
}

.remote-image-el {
  width: 100%;
  height: 100%;
  display: block;
}

.image-fallback {
  width: 100%;
  height: 100%;
  min-height: 88rpx;
  border-radius: 12rpx;
  background: linear-gradient(180deg, #fff4f1 0%, #ffe8e0 100%);
  border: 1rpx dashed rgba(208, 89, 50, 0.3);
  padding: 12rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
}

.compact-fallback {
  width: 100%;
  height: 100%;
  min-width: 24rpx;
  min-height: 24rpx;
  border-radius: 8rpx;
  background: linear-gradient(180deg, #f2f5fb 0%, #e1e8f5 100%);
  border: 1rpx solid rgba(91, 124, 245, 0.18);
  box-sizing: border-box;
}

.image-fallback.compact {
  padding: 6rpx;
  min-height: 40rpx;
}

.fallback-title {
  font-size: 20rpx;
  line-height: 1.2;
  color: #a64929;
  font-weight: 700;
}

.image-fallback.compact .fallback-title {
  font-size: 16rpx;
}

.fallback-reason,
.fallback-path {
  font-size: 18rpx;
  line-height: 1.35;
  color: #8f5a49;
  word-break: break-all;
}

.image-fallback.compact .fallback-reason,
.image-fallback.compact .fallback-path {
  font-size: 14rpx;
}
</style>
