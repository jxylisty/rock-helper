<script>
export default {
  onLaunch() {
    console.log('洛克王国助手启动')
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style>
:root {
  --app-bg: linear-gradient(180deg, #f7f9fc 0%, #eef3fb 100%);
  --card-bg: #ffffff;
  --card-soft: #f7f9fe;
  --text-main: #1c2748;
  --text-sub: #6b7590;
  --accent: #5b7cf5;
  --accent-2: #38bdf8;
  --warn: #e65f38;
  --resist: #2f62dd;
  --radius: 24rpx;
  --shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

page {
  background: var(--app-bg);
  min-height: 100vh;
  color: var(--text-main);
}

view,
text {
  box-sizing: border-box;
}

image {
  display: block;
}

::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>
