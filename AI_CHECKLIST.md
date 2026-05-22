# AI Development Checklist

> HLS Parse 项目开发 AI 辅助规则  
> 每次会话/变动自动执行，确保代码质量

---

## 1. 测试执行

### 每次变动后必须执行

```bash
# 全量测试 + 覆盖率
npm test
```

| 检查项 | 阈值 | 说明 |
|--------|------|------|
| Lines | ≥ 96% | 行覆盖率 |
| Statements | ≥ 94% | 语句覆盖率 |
| Branches | ≥ 92% | 分支覆盖率 |
| Functions | ≥ 95% | 函数覆盖率 |
| 测试全部通过 | 0 failed | 无失败用例 |

### 新增功能/修复 Bug 时

- [ ] 新增测试用例覆盖变更代码路径
- [ ] 覆盖正常路径和错误路径
- [ ] 测试涵盖边界条件（空值/极端值/非法输入）
- [ ] M3U8 规范相关：覆盖对应的 RFC 8216 章节要求

### 测试文件位置

- `__tests__/parse.test.ts` — 核心功能测试（225 用例）
- `__tests__/comprehensive.test.ts` — 规范全覆盖 + 真实场景（43 用例）

---

## 2. 代码格式化

### 规则

```bash
# 使用 Prettier 统一格式（如已配置）
npx prettier --write "src/**/*.ts" "__tests__/**/*.ts"
```

| 规则 | 配置 |
|------|------|
| 缩进 | 2 spaces |
| 引号 | 双引号 `"` |
| 分号 | 必须 |
| 行宽 | 100 |
| 尾逗号 | all |
| 换行符 | LF |

### TypeScript 规范

- [ ] 所有 public API 有 JSDoc 注释（中/英双语）
- [ ] 类型定义完整，禁用 `any`（除非必要）
- [ ] 导出函数/类型均在 `src/index.ts` 注册
- [ ] 无 `tsc --noEmit` 报错

---

## 3. 构建验证

```bash
# 构建检查
npm run build
```

- [ ] `dist/cjs/` — CommonJS 产物存在
- [ ] `dist/esm/` — ESM 产物存在
- [ ] `dist/browser/` — IIFE 浏览器产物存在
- [ ] `dist/**/*.d.ts` — 类型声明文件存在
- [ ] 无 Rollup 错误

---

## 4. 代码审查 Checklist

### 新增 Tag 支持

- [ ] 在 `getTagCategory()` 添加 tag 名称 + 中英双语注释
- [ ] 在 `parseTagParam()` 添加参数解析逻辑（如有参数）
- [ ] 在 Master/Media 解析函数添加对应的处理分支
- [ ] 在 `src/types.ts` 更新/新增类型定义
- [ ] 在 `src/index.ts` 导出新类型
- [ ] 添加解析成功的测试用例
- [ ] 添加错误/边界测试用例
- [ ] 更新 README.md 的 Supported Tags 表格

### 修改现有代码

- [ ] 不破坏现有 API 签名
- [ ] 向后兼容（无 breaking change 或版本号提升）
- [ ] 相关错误消息清晰可定位

### 注释规范

- [ ] 函数级：JSDoc `@param` / `@returns` / `@throws` / `@example`
- [ ] tag 级：`中文说明 / English description`
- [ ] 关键逻辑：行内注释解释"为什么"而非"是什么"

---

## 5. 资源文件更新

### 修改 src/ 后检查

- [ ] `README.md` API 文档同步更新
- [ ] `public/` demo 页面支持新功能展示
- [ ] `examples/basic.ts` 示例覆盖新功能

---

## 6. 发布前检查

```bash
# 1. 测试 + 覆盖率
npm test

# 2. 构建
npm run build

# 3. 检查产物完整性
ls -la dist/cjs/ dist/esm/ dist/browser/
find dist -name "*.d.ts" | wc -l  # 应 > 3

# 4. Demo 页面可用
# 确保 public/browser/hls-parse.umd.js 为最新构建
```

- [ ] `package.json` version 已更新
- [ ] `CHANGELOG.md` 记录变更
- [ ] Git tag 已创建

---

## 7. M3U8 规范覆盖矩阵

| RFC 章节 | 标签 | 解析 | 测试 | 注释 |
|----------|------|------|------|------|
| 4.3.1.1 | EXTM3U | ✅ | ✅ | ✅ |
| 4.3.1.2 | EXT-X-VERSION | ✅ | ✅ | ✅ |
| 4.3.2.1 | EXTINF | ✅ | ✅ | ✅ |
| 4.3.2.2 | EXT-X-BYTERANGE | ✅ | ✅ | ✅ |
| 4.3.2.3 | EXT-X-DISCONTINUITY | ✅ | ✅ | ✅ |
| 4.3.2.4 | EXT-X-KEY | ✅ | ✅ | ✅ |
| 4.3.2.5 | EXT-X-MAP | ✅ | ✅ | ✅ |
| 4.3.2.6 | EXT-X-PROGRAM-DATE-TIME | ✅ | ✅ | ✅ |
| 4.3.2.7 | EXT-X-DATERANGE | ✅ | ✅ | ✅ |
| 4.3.3.1 | EXT-X-TARGETDURATION | ✅ | ✅ | ✅ |
| 4.3.3.2 | EXT-X-MEDIA-SEQUENCE | ✅ | ✅ | ✅ |
| 4.3.3.3 | EXT-X-DISCONTINUITY-SEQUENCE | ✅ | ✅ | ✅ |
| 4.3.3.4 | EXT-X-ENDLIST | ✅ | ✅ | ✅ |
| 4.3.3.5 | EXT-X-PLAYLIST-TYPE | ✅ | ✅ | ✅ |
| 4.3.3.6 | EXT-X-I-FRAMES-ONLY | ✅ | ✅ | ✅ |
| 4.3.4.1 | EXT-X-MEDIA | ✅ | ✅ | ✅ |
| 4.3.4.2 | EXT-X-STREAM-INF | ✅ | ✅ | ✅ |
| 4.3.4.3 | EXT-X-I-FRAME-STREAM-INF | ✅ | ✅ | ✅ |
| 4.3.4.4 | EXT-X-SESSION-DATA | ✅ | ✅ | ✅ |
| 4.3.4.5 | EXT-X-SESSION-KEY | ✅ | ✅ | ✅ |
| 4.3.5.1 | EXT-X-INDEPENDENT-SEGMENTS | ✅ | ✅ | ✅ |
| 4.3.5.2 | EXT-X-START | ✅ | ✅ | ✅ |
| — | EXT-X-DEFINE | ✅ | ✅ | ✅ |
| — | EXT-X-CONTENT-STEERING | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-PART | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-PRELOAD-HINT | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-SERVER-CONTROL | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-PART-INF | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-RENDITION-REPORT | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-SKIP | ✅ | ✅ | ✅ |
| LL-HLS | EXT-X-PREFETCH | ✅ | ✅ | ✅ |
