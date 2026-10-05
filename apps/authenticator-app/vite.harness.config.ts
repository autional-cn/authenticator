import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve(__dirname, '../../../../.artifacts/authenticator-contrast');

/**
 * 产物布局归一 —— gate 契约（w6-design §4.4）以产物目录为静态 web root、path=/?theme=dark|light；
 * rollup 对 HTML 入口会保留「相对 root 的路径」（src/harness/index.html）⇒ 根级 index.html 缺失
 * 则闸门 404（static-server 对带扩展名请求不回退 SPA，见 ui scripts/lib/static-server.mjs）。
 * storybook-user 先例同构（其产物 index.html 亦在根级）。构建后把 HTML 搬回根级并清掉 src/。
 */
function flattenHarnessHtml(outDir: string): Plugin {
	return {
		name: 'harness-html-to-root',
		writeBundle() {
			const from = path.resolve(outDir, 'src/harness/index.html');
			const to = path.resolve(outDir, 'index.html');
			if (fs.existsSync(from)) {
				fs.renameSync(from, to);
				fs.rmSync(path.resolve(outDir, 'src'), { recursive: true, force: true });
			}
		},
	};
}

/**
 * W6 对比度取景框独立构建 — w6-design §4.3
 * root = 项目根（复用 tailwind/postcss/tsconfig 与 public/）；入口 = src/harness/index.html；
 * 产物 = D:\ws\autional-cn\.artifacts\authenticator-contrast（聚合根之下、非任何 git 仓）。
 * 不含 VitePWA（对比度闸门不得被 SW 污染）；生产 vite.config.ts 与本文件互不引用。
 */
export default defineConfig({
	root: __dirname,
	plugins: [react(), flattenHarnessHtml(OUT_DIR)],
	resolve: {
		extensions: ['.mjs', '.tsx', '.ts', '.jsx', '.js', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		outDir: OUT_DIR,
		emptyOutDir: true,
		sourcemap: false,
		rollupOptions: {
			input: path.resolve(__dirname, 'src/harness/index.html'),
		},
	},
});
