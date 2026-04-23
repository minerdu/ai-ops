# AI-Ops 部署说明

## 当前状态

- 页面与 API 可正常 `next build`
- 已配置 `basePath=/ops`
- 生产镜像使用 Next.js `standalone`
- 默认监听 `3000`

## 部署方式

本项目建议与 `ai-fran-app` 同机部署：

- `AI-Ops` 映射 `3000 -> 3000`
- `AI-Fran` 映射 `3001 -> 3000`
- Nginx 统一代理 `/ops/` 和 `/fran/`

## 1. 准备环境变量

```bash
cp .env.production.example .env.production
```

至少确认：

- `DATABASE_URL`
- `NEXT_PUBLIC_BASE_URL`
- `OPENAI_API_KEY`（如果要启用真实模型）

默认使用 SQLite 持久化文件：

```text
file:/app/data/dev.db
```

该文件会通过 `docker-compose.prod.yml` 的命名卷持久化。

## 2. 启动容器

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

容器首次启动会：

1. 初始化 `/app/data/dev.db`
2. 执行 `prisma db push --skip-generate`
3. 启动 Next.js 生产服务

## 3. 反向代理

如果已经使用 `ai-fran-app/scripts/nginx-setup.sh`，其中 `/ops/ -> 127.0.0.1:3000` 已经包含，无需重复配置。

## 4. 验证

```bash
docker compose -f docker-compose.prod.yml ps
docker logs ai-ops-app --tail 100
```

检查：

- `http://<server-ip>/ops/`
- `http://<server-ip>/ops/api/tasks`
