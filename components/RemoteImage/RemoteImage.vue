<template>
  <view class="remote-image-wrap" :class="wrapperClass" :style="wrapperStyle">
    <image
      v-if="displaySrc && !showFailureHint && !showCompactFallback"
      class="remote-image-el"
      :src="displaySrc"
      :mode="mode"
      @error="onImageError"
      @load="onImageLoad"
    />
    <view v-else-if="showCompactFallback" class="compact-fallback" />
    <view v-else-if="showFailureHint" class="image-fallback" :class="{ compact: compactHint }">
      <text class="fallback-title">{{ fallbackTitle }}</text>
      <text class="fallback-reason">{{ failureReason }}</text>
      <text v-if="debugPathLabel" class="fallback-path">{{ debugPathLabel }}</text>
    </view>
  </view>
</template>

<script>
import { getAssetCandidateUrls, isLocalStaticAsset, resolveAssetPath } from '@/utils/asset-path.js'
// #ifdef APP-PLUS
import { ensureCachedRemoteImage, readImageCacheMap, isPackagedImage } from '@/utils/image-cache.js'
// #endif

export default {
  name: 'RemoteImage',
  options: {
    virtualHost: true
  },
  props: {
    src: { type: String, default: '' },
    mode: { type: String, default: 'aspectFit' },
    compact: { type: Boolean, default: false }
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
      return this.$attrs ? this.$attrs.class : ''
    },
    wrapperStyle() {
      return this.$attrs ? this.$attrs.style : ''
    },
    fallbackTitle() {
      return '图片未显示'
    },
    compactHint() {
      if (this.compact) return true
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
        return '图片地址为空'
      }
      if (isLocalStaticAsset(this.originalSource)) {
        return '远程资源站加载失败，本地 static 图片也未命中'
      }
      if (/^https?:\/\//i.test(this.originalSource)) {
        return '远程图片地址请求失败，请检查网络或资源是否存在'
      }
      return '图片资源不可用'
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
    refreshSource() {
      const nextRequestId = this.requestId + 1
      this.requestId = nextRequestId
      this.failed = false
      this.lastFailedSrc = ''

      const originalSource = String(this.src || '').trim()
      if (!originalSource) {
        this.candidates = []
        this.candidateIndex = 0
        this.displaySrc = ''
        return
      }

      this.candidates = getAssetCandidateUrls(originalSource)
      this.candidateIndex = 0

      let initialSrc = this.candidates[0] || resolveAssetPath(originalSource)

      // #ifdef APP-PLUS
      if (initialSrc && /^https?:\/\//i.test(initialSrc)) {
        try {
          const cacheMap = readImageCacheMap()
          if (cacheMap && cacheMap[initialSrc]) {
            initialSrc = cacheMap[initialSrc]
          }
        } catch (e) {}
      }
      // #endif

      this.displaySrc = initialSrc || ''
      if (!initialSrc) {
        this.failed = true
        return
      }

      // #ifdef APP-PLUS
      this.triggerAppBackgroundCache(initialSrc, nextRequestId)
      // #endif
    },
    // #ifdef APP-PLUS
    async triggerAppBackgroundCache(targetUrl, currentReqId) {
      if (!targetUrl || !/^https?:\/\//i.test(targetUrl) || isPackagedImage(targetUrl)) return
      try {
        const cached = await ensureCachedRemoteImage(targetUrl, targetUrl)
        if (cached && this.requestId === currentReqId && this.displaySrc === targetUrl) {
          this.displaySrc = cached
        }
      } catch (e) {}
    },
    // #endif
    onImageLoad(event) {
      this.failed = false
      this.lastFailedSrc = ''
      this.$emit('load', event)
    },
    onImageError(event) {
      if (!this.displaySrc || this.displaySrc === this.lastFailedSrc) return
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
:host {
  display: inline-block;
  width: 100%;
  height: 100%;
}

.remote-image-wrap {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  box-sizing: border-box;
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
