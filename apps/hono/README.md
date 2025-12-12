# MikuNews Backend (Hono)

基于 Hono 框架的 MikuNews 后端服务，部署在 Cloudflare Workers 上。

## 安装和运行

```bash
npm install
npm run dev
```

## 部署

```bash
npm run deploy
```

## 类型生成

[根据 Worker 配置生成/同步类型](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```

在实例化 `Hono` 时传递 `CloudflareBindings` 作为泛型：

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 环境变量配置

在 Cloudflare Workers 的设置中配置以下环境变量：

### Telegram Bot 配置

- `TELEGRAM_BOT_TOKEN` (必需): Telegram Bot Token
- `TELEGRAM_REVIEWER_ID` (必需): 审核者的 Telegram 用户 ID
- `TELEGRAM_WEBHOOK_SECRET` (可选): Webhook 安全密钥
- `ARTICLES_DIR` (可选): 本地文章目录路径（已弃用，现使用 GitHub）

### GitHub 集成配置

- `GITHUB_TOKEN` (必需): GitHub Personal Access Token，需要 `repo` 权限
- `GITHUB_OWNER` (必需): GitHub 仓库所有者（用户名或组织名）
- `GITHUB_REPO` (必需): GitHub 仓库名称
- `GITHUB_BRANCH` (可选): 目标分支，默认为 `articles-buffer`
- `GITHUB_ARTICLES_PATH` (可选): 文章存储路径，默认为 `articles`

### Cloudflare KV 配置

- `PENDING_SUBMISSIONS` (必需): 用于暂存待审核投稿的 KV Namespace，需要在 `wrangler.jsonc` 的 `kv_namespaces` 中绑定真实的 `id`/`preview_id`

### 配置示例

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_REVIEWER_ID=123456789
TELEGRAM_WEBHOOK_SECRET=your-secret-key
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-username
GITHUB_REPO=MikuNews
GITHUB_BRANCH=articles-buffer
GITHUB_ARTICLES_PATH=articles
```

## API 接口

### 健康检查

- `GET /health` - 健康检查接口

### 文章投稿

- `POST /submit` - 提交新文章投稿

### Telegram Webhook

- `POST /telegram/webhook` - Telegram Bot Webhook 接口

### 文章管理 (CRUD)

- `GET /articles` - 获取所有文章列表
- `GET /articles/:filename` - 获取单个文章内容
- `POST /articles` - 创建新文章
- `PUT /articles/:filename` - 更新文章
- `DELETE /articles/:filename` - 删除文章

## 功能说明

### GitHub 集成

系统会将审核通过的文章自动推送到指定的 GitHub 仓库的 `articles-buffer` 分支下的 `articles` 文件夹中。每个文章以 Markdown 文件形式存储，文件名格式为 `YYYY-MM-DD-slug.md`。

### Telegram Bot 工作流

1. 用户通过 `/submit` 接口提交文章
2. 系统发送通知到审核者的 Telegram
3. 审核者点击"发布"或"拒绝"按钮
4. 如果发布，文章会被推送到 GitHub 仓库的 `articles-buffer` 分支

### 文章 CRUD API

通过 REST API 可以直接管理 GitHub 仓库中的文章文件，实现增删查改功能。所有操作都会创建相应的 Git commit。
