<template>
  <view>
    <view v-if="visible" class="mask" @click="$emit('close')"></view>
    <view class="drawer" :class="{ open: visible }">
      <scroll-view scroll-y class="drawer-scroll" :show-scrollbar="false">
        <view class="drawer-inner">
        <view class="profile">
          <view class="avatar">
            <AppIcon name="user" :size="20" color="#FFFFFF" :stroke-width="2.2" />
          </view>
          <view class="profile-info">
            <text class="name">测试用户</text>
            <text class="sub">本地离线助手</text>
          </view>
        </view>

        <view v-for="group in menuGroups" :key="group.label" class="menu-group">
          <view class="group-head">
            <view class="group-dot"></view>
            <text class="group-label">{{ group.label }}</text>
          </view>
          <view class="menu">
            <view
              v-for="item in group.items"
              :key="item.url"
              class="menu-item"
              hover-class="menu-item-active"
              @click="go(item)"
            >
              <view class="item-icon" :style="{ background: item.bg }">
                <AppIcon :name="item.icon" :size="16" :color="item.color" :stroke-width="2.2" />
              </view>
              <view class="item-text">
                <text class="menu-title">{{ item.title }}</text>
                <text class="menu-sub">{{ item.sub }}</text>
              </view>
              <AppIcon name="chevron-right" :size="14" color="#C9C4B2" :stroke-width="2.2" />
            </view>
          </view>
        </view>

        <view class="drawer-foot">
          <text class="foot-text">洛克王国助手 · 本地离线运行</text>
        </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import { goPage } from '@/utils/nav.js'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

export default {
  name: 'SideDrawer',
  components: { AppIcon },
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      menuGroups: [
        {
          label: '资料库',
          items: [
            { title: '图鉴', sub: '查看全部精灵', url: '/pages/catalog', icon: 'book', color: '#1E7A46', bg: '#E4F2E8' },
            { title: '孵蛋', sub: '蛋种预测', url: '/pages/egg', icon: 'egg', color: '#A97F35', bg: '#F6EEDB' },
            { title: '地图', sub: '本地瓦片地图', url: '/pages/map', icon: 'map', color: '#2C6FD1', bg: '#E7F1FE' },
            { title: '属性克制', sub: '克制倍率计算', url: '/pages/restriction', icon: 'shield', color: '#C64B38', bg: '#FBE9E4' }
          ]
        },
        {
          label: '训练工具',
          items: [
            { title: '技能查询', sub: '按技能找精灵', url: '/pages/skill-search', icon: 'zap', color: '#A97F35', bg: '#F6EEDB' },
            { title: '速度排行', sub: '按速度种族值查找', url: '/pages/speed-rank', icon: 'wind', color: '#2C6FD1', bg: '#E7F1FE' },
            { title: '阵容编辑', sub: '保存你的队伍', url: '/pages/team-editor', icon: 'users', color: '#1E7A46', bg: '#E4F2E8' },
            { title: '愿力冲击', sub: '血脉与克制建议', url: '/pages/bloodline-guide', icon: 'sparkles', color: '#A97F35', bg: '#F6EEDB' }
          ]
        }
      ]
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
  background: rgba(44, 58, 47, 0.45);
  z-index: 998;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 76vw;
  max-width: 640rpx;
  height: 100vh;
  background: #FAF6EC;
  border-right: 3rpx solid #C9A14E;
  border-radius: 0 32rpx 32rpx 0;
  transform: translateX(-105%);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0.24, 1);
  z-index: 999;
  color: #2C3A2F;
  box-shadow: 10rpx 0 30rpx rgba(44, 58, 47, 0.18);
}

.drawer.open {
  transform: translateX(0);
}

.drawer-scroll {
  height: 100vh;
}

.drawer-inner {
  padding: calc(24rpx + env(safe-area-inset-top)) 20rpx calc(24rpx + env(safe-area-inset-bottom));
}

.profile {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #E4F2E8;
  border: 1.5rpx solid #2F9E5F;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #1E7A46, #2F9E5F);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3rpx 0 rgba(30, 122, 70, 0.35);
}

.name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #1E7A46;
}

.sub {
  display: block;
  margin-top: 2rpx;
  font-size: 18rpx;
  color: #6B7A6E;
}

.menu-group {
  margin-top: 26rpx;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 8rpx;
  margin-bottom: 12rpx;
}

.group-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #C9A14E;
}

.group-label {
  font-size: 20rpx;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #A3AE9F;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: #FFFDF7;
  border: 1.5rpx solid #E3DCC8;
  box-shadow: 0 3rpx 0 rgba(44, 58, 47, 0.08);
  transition: transform 0.12s ease;
}

.menu-item-active {
  transform: translateY(2rpx);
  box-shadow: 0 1rpx 0 rgba(44, 58, 47, 0.08);
}

.item-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  min-width: 0;
}

.menu-title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #2C3A2F;
}

.menu-sub {
  display: block;
  margin-top: 2rpx;
  font-size: 18rpx;
  color: #6B7A6E;
}

.drawer-foot {
  margin-top: 30rpx;
  padding: 16rpx 8rpx 0;
  border-top: 1rpx dashed #E3DCC8;
}

.foot-text {
  font-size: 16rpx;
  color: #A3AE9F;
  letter-spacing: 0.06em;
}
</style>
