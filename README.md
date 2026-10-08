# LiveBetter

《高性价比人生指南》自用离线 PWA：滑卡决定做不做——做一次的进清单，要重复的设为打卡。数据全在本机 IndexedDB，飞行模式可用。

## 开发

- `npm install`
- `npm run dev` — 本地开发
- `npm test` — 全部测试
- `npm run build:content` — 重新从上游拉取 book/*.md 生成 src/data/entries.json（需网络与 git；内容更新后执行并提交）
- `npm run build && npm run preview` — 生产构建预览

## 部署（GitHub Pages）

1. 在 GitHub 建公开仓库（如 `yourname/livebetter`），把本仓库推上去。
2. `npm run deploy`（gh-pages 把 dist/ 推到 gh-pages 分支）。
3. 仓库 Settings → Pages → Source 选 `gh-pages` 分支。
4. 手机 Chrome 打开 `https://yourname.github.io/livebetter/` → 「添加到主屏幕」。
5. 真机验证：开飞行模式打开 App，全部功能可用。

## 数据与备份

决策/打卡/收藏存浏览器 IndexedDB；「设置 → 导出备份」得到 JSON，换机或清数据前先导出，「导入备份」恢复。打卡记录是不可变历史（见 docs/adr/0002）。

## 内容来源与许可

条目内容来自 [eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)（CC-BY-4.0，解析时 commit 记录于 entries.json 的 version 字段）。本项目代码 MIT。
