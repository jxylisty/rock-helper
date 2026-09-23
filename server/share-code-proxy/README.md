# 阵容码解析转发服务（Cloudflare Worker）

客户端（小程序 / APP）只发送 `{ share_code }`，本服务注入 `X-API-Key` 后转发到
`wegame.shallow.ink`，**key 只存在服务端，不进客户端包**。

## 部署（约 5 分钟）

```bash
npm install -g wrangler
wrangler login                      # 浏览器授权 Cloudflare 账号
cd server/share-code-proxy
wrangler secret put API_KEY         # 粘贴 sk- 开头的 key，回车
wrangler deploy                     # 输出形如 https://rocom-share-code-proxy.<你的子域>.workers.dev
```

然后把 `https://<部署地址>/share-code/parse` 填进 `utils/shareCode.js` 的
`PARSE_PROXY_URL`，客户端即切换为走转发（不再携带任何密钥）。

## 建议用新 key

key 在 [rocom.shallow.ink](https://rocom.shallow.ink/)（洛克魔法书）自助申请，
反馈群 1097809141。建议申请一个**专用于转发服务**的 key：
泄露面只剩服务端，出问题随时吊销换新，不影响其它用途。

## 微信小程序合法域名的坑（必读）

小程序正式版要求 request 合法域名 **HTTPS + 已 ICP 备案**，而 `*.workers.dev`
无法备案，直接填会被后台拒绝。按情况选一条：

1. **有已备案域名**：把域名 DNS 托管到 Cloudflare，在 Worker 的
   Settings → Domains & Routes 绑定该域名（如 `api.你的域名.com`），
   小程序后台填这个域名。
2. **没有备案域名**：改用**微信云开发 / uniCloud 云函数**承载同样的转发逻辑
   （云函数调用不需要配合法域名），把 worker.js 里的转发逻辑搬过去即可，逻辑完全一致。
3. **只发 APP / 网页端**：无备案要求，workers.dev 地址直接可用。

## 防滥用

Worker 内置每 IP 每分钟 20 次的内存级限频。若要更硬的限制，在 Cloudflare
控制台对该域名加一条 WAF Rate Limiting 规则（免费版含 1 条）。
Cloudflare 免费额度 10 万请求/天，本接口调用量远用不完。
