# Autional 身份验证器

**域名**：[authenticator.autional.cn](https://authenticator.autional.cn)
**技术栈**：Vite + React 19 + TypeScript + Tailwind CSS
**仓库**：[github.com/autional-cn/authenticator](https://github.com/autional-cn/authenticator)

基于 TOTP 与通行密钥的两步验证。

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:13108
pnpm build    # 构建产物：apps/authenticator-app/dist/
pnpm test     # Vitest 单元测试
```

## 部署

推送至 `main` 分支后由 Vercel 自动部署。
