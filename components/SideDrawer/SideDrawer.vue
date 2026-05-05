<template>
  <view>
    <view v-if="visible" class="mask" @click="$emit('close')"></view>
    <view class="drawer" :class="{ open: visible }">
      <view class="profile">
        <RemoteImage class="avatar" :src="logoSrc" mode="aspectFit" />
        <view class="profile-info">
          <text class="name">测试用户</text>
          <text class="sub">本地离线助手</text>
        </view>
      </view>
      <view class="menu">
        <view v-for="item in menuItems" :key="item.url" class="menu-item" @click="go(item)">
          <text class="menu-title">{{ item.title }}</text>
          <text class="menu-sub">{{ item.sub }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { goPage } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

export default {
  name: 'SideDrawer',
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      menuItems: [
        { title: '图鉴', sub: '查看全部精灵', url: '/pages/catalog/catalog' },
        { title: '孵蛋', sub: '蛋种预测', url: '/pages/egg/egg' },
        { title: '地图', sub: '本地瓦片地图', url: '/pages/map/map' },
        { title: '属性克制', sub: '克制倍率计算', url: '/pages/restriction/restriction' },
        { title: '技能查询', sub: '按技能找精灵', url: '/pages/skill-search/skill-search' },
        { title: '速度排行', sub: '按速度种族值查找', url: '/pages/speed-rank/speed-rank' },
        { title: '阵容编辑', sub: '保存你的队伍', url: '/pages/team-editor/team-editor' }
      ]
    }
  },
  computed: {
    logoSrc() {
      return resolveAssetPath('/static/logo.png')
    }
  },
  methods: {
    go(item) {
      this.$emit('close')
      goPage(item.url, 'navigateTo')
    }
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 16, 32, 0.5);
  z-index: 998;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 76vw;
  max-width: 640rpx;
  height: 100vh;
  padding: calc(24rpx + env(safe-area-inset-top)) 20rpx 24rpx;
  background: linear-gradient(180deg, #111b31 0%, #1b2747 100%);
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  z-index: 999;
  color: #fff;
  box-shadow: 18rpx 0 40rpx rgba(0, 0, 0, 0.2);
}

.drawer.open {
  transform: translateX(0);
}

.profile {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.08);
}

.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.12);
}

.name {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
}

.sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
}

.menu {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.menu-item {
  padding: 18rpx 18rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.06);
}
</style>
