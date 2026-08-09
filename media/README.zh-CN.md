# @skax/hls-parse

[![Version](https://img.shields.io/badge/version-0.0.1–beta.11-blue)](https://www.npmjs.com/package/@skax/hls-parse)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![RFC 8216](https://img.shields.io/badge/RFC-8216-orange)](https://datatracker.ietf.org/doc/html/rfc8216)

> 一个健壮的 M3U8 / HLS 播放列表解析器，全面兼容 [RFC 8216](https://datatracker.ietf.org/doc/html/rfc8216)（HTTP Live Streaming），使用 TypeScript 编写。

🌐 [English](./README.md)

## 特性

- ✅ **完整 RFC 8216 兼容** — 支持所有标准 HLS 标签和属性
- ✅ **Master 播放列表** — 解析 `EXT-X-STREAM-INF`、`EXT-X-I-FRAME-STREAM-INF`、`EXT-X-MEDIA` 等
- ✅ **Media 播放列表** — 解析分片、加密密钥、字节范围、不连续标记等
- ✅ **LL-HLS（低延迟 HLS）** — 完整支持 `EXT-X-PART`、`EXT-X-PRELOAD-HINT`、`EXT-X-SERVER-CONTROL`、`EXT-X-SKIP`、`EXT-X-RENDITION-REPORT`、`EXT-X-PREFETCH` 等
- ✅ **相对 URL 解析** — 基于基准 URL 自动将所有相对 URI 解析为绝对地址
- ✅ **协议版本自动检测** — 根据使用的特性自动检测所需协议版本
- ✅ **严格校验** — 强制执行 RFC 8216 规则与约束
- ✅ **TypeScript 优先** — 完整的类型定义，覆盖所有解析结构
- ✅ **SCTE-35 支持** — 解析拼接标记、`EXT-X-CUE-OUT`、`EXT-X-CUE-IN`、`EXT-X-DATERANGE` 及 SCTE-35 属性
- ✅ **厂商扩展支持** — 支持 `EXT-X-CUE`、`EXT-OATCLS-SCTE35`、`EXT-X-ASSET`、`EXT-X-SCTE35`

## 安装

```bash
# npm
npm install @skax/hls-parse

# pnpm
pnpm add @skax/hls-parse

# yarn
yarn add @skax/hls-parse
```

## 在线演示

[https://freeshineit.github.io/hls-parse/media/](https://freeshineit.github.io/hls-parse/media/)

## 快速开始

```typescript
import { parser } from "@skax/hls-parse";

// 解析 Media 播放列表
const playlist = parser(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`);

console.log(playlist.segments.length); // 2
console.log(playlist.segments[0].duration); // 9.009

// 解析 Master 播放列表
const master = parser(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1920x1080
high.m3u8`);

console.log(master.variants[0].bandwidth); // 1280000
```

## URL 解析

```typescript
import { parser } from "@skax/hls-parse";

const playlist = parser(m3u8Content, {
  uri: "https://example.com/hls/main.m3u8",
});

// 所有相对 URI 都会被解析为绝对 URL
console.log(playlist.segments[0].uri); // https://example.com/hls/segment1.ts
```

## API 参考

### `parser(text: string, options?: ParserOptions): Playlist`

将 M3U8 播放列表字符串解析为结构化对象。

| 参数                       | 类型                              | 描述                                |
| -------------------------- | --------------------------------- | ----------------------------------- |
| `text`                     | `string`                          | 原始 M3U8 播放列表内容              |
| `options.uri`              | `string`                          | （可选）用于解析相对 URL 的基准 URI |
| `options.customTagParsers` | `Record<string, CustomTagParser>` | （可选）自定义标签解析器            |

**返回值：** `MasterPlaylist | MediaPlaylist`

**抛出：** 如果播放列表违反 RFC 8216 语法规则，抛出 `InvalidPlaylistError`。

### 类型判别

使用 `isMasterPlaylist` 属性或类型守卫函数来区分播放列表类型：

```typescript
import { parser, isMasterPlaylist, isMediaPlaylist } from "@skax/hls-parse";

const pl = parser(m3u8Content);

// 方式一：通过属性判断
if (pl.isMasterPlaylist) {
  console.log("Master:", pl.variants.length);
} else {
  console.log("Media:", pl.segments.length);
}

// 方式二：通过类型守卫
if (isMasterPlaylist(pl)) {
  // 此处 pl 类型被缩窄为 MasterPlaylist
  pl.variants.forEach((v) => console.log(v.bandwidth));
}
```

### 绝对地址

```ts
resolveUrl(base: string | undefined, relative: string): string
```

将相对 URI 基于基准 URI 解析为绝对地址。

### InvalidPlaylistError

解析到无效播放列表时抛出的错误类，继承自 `Error`。

## 类型定义

### Playlist

`MasterPlaylist` 和 `MediaPlaylist` 的联合类型。

### MasterPlaylist

| 属性                   | 类型                          | 描述               |
| ---------------------- | ----------------------------- | ------------------ |
| `isMasterPlaylist`     | `true`                        | 类型判别器         |
| `version?`             | `number`                      | 协议版本           |
| `source?`              | `string`                      | 原始播放列表文本   |
| `variants`             | `Variant[]`                   | 变体流列表         |
| `sessionDataList`      | `SessionData[]`               | 会话数据           |
| `sessionKeyList`       | `Key[]`                       | 会话密钥           |
| `independentSegments?` | `boolean`                     | 分片是否可独立解码 |
| `start?`               | `StartData`                   | 首选起始位置       |
| `contentSteering?`     | `ContentSteering`             | 内容导航配置       |
| `defines?`             | `Record<string, AttrValue>[]` | 变量定义           |
| `customTags?`          | `Record<string, unknown[]>`   | 自定义/未知标签    |

### MediaPlaylist

| 属性                         | 类型                          | 描述                       |
| ---------------------------- | ----------------------------- | -------------------------- |
| `isMasterPlaylist`           | `false`                       | 类型判别器                 |
| `version?`                   | `number`                      | 协议版本                   |
| `source?`                    | `string`                      | 原始播放列表文本           |
| `targetDuration?`            | `number`                      | 最大分片时长（秒）         |
| `mediaSequenceBase?`         | `number`                      | 基础媒体序列号             |
| `discontinuitySequenceBase?` | `number`                      | 基础不连续序列号           |
| `endlist?`                   | `boolean`                     | 播放列表是否已完结         |
| `playlistType?`              | `string`                      | `"EVENT"` 或 `"VOD"`       |
| `isIFrame?`                  | `boolean`                     | 是否仅包含 I 帧            |
| `segments`                   | `Segment[]`                   | 媒体分片列表               |
| `prefetchSegments`           | `PrefetchSegment[]`           | 预取分片（LL-HLS）         |
| `renditionReports`           | `RenditionReport[]`           | 呈现报告（LL-HLS）         |
| `dateRanges`                 | `DateRange[]`                 | 日期范围                   |
| `lowLatencyCompatibility?`   | `LowLatencyCompatibility`     | LL-HLS 服务器控制参数      |
| `partTargetDuration?`        | `number`                      | 部分分片目标时长（LL-HLS） |
| `skip?`                      | `number`                      | 跳过的分片数（LL-HLS）     |
| `defines?`                   | `Record<string, AttrValue>[]` | 变量定义                   |
| `customTags?`                | `Record<string, unknown[]>`   | 自定义/未知标签            |

### Segment（媒体分片）

| 属性                    | 类型                                 | 描述               |
| ----------------------- | ------------------------------------ | ------------------ |
| `uri`                   | `string`                             | 媒体分片 URI       |
| `duration?`             | `number`                             | 时长（秒）         |
| `title?`                | `string`                             | 可选标题           |
| `byterange?`            | `Byterange`                          | 字节范围           |
| `mediaSequenceNumber`   | `number`                             | 媒体序列号         |
| `discontinuitySequence` | `number`                             | 不连续序列号       |
| `discontinuity?`        | `boolean`                            | 是否为不连续标记   |
| `gap?`                  | `boolean`                            | 是否为间隙分片     |
| `key?`                  | `Key \| null`                        | 加密密钥           |
| `map?`                  | `MediaInitializationSection \| null` | 媒体初始化段       |
| `programDateTime?`      | `Date`                               | 节目日期/时间      |
| `deviceTime?`           | `string`                             | 设备时间戳         |
| `dateRange?`            | `DateRange`                          | 日期范围元数据     |
| `markers?`              | `SpliceInfo[]`                       | 拼接/标记信息      |
| `parts?`                | `PartialSegment[]`                   | 部分分片（LL-HLS） |

### PartialSegment（部分分片，LL-HLS）

| 属性           | 类型        | 描述             |
| -------------- | ----------- | ---------------- |
| `hint?`        | `boolean`   | 是否为预加载提示 |
| `uri`          | `string`    | 部分分片 URI     |
| `byterange?`   | `Byterange` | 字节范围         |
| `duration?`    | `number`    | 时长（秒）       |
| `independent?` | `boolean`   | 是否可独立解码   |
| `gap?`         | `boolean`   | 是否为间隙       |

### Rendition（替代呈现）

| 属性               | 类型      | 描述               |
| ------------------ | --------- | ------------------ |
| `type`             | `string`  | 媒体类型           |
| `uri?`             | `string`  | 媒体播放列表 URI   |
| `groupId`          | `string`  | 呈现组 ID          |
| `language?`        | `string`  | 主要语言           |
| `assocLanguage?`   | `string`  | 关联语言           |
| `name`             | `string`  | 可读名称           |
| `isDefault?`       | `boolean` | 是否为默认呈现     |
| `autoselect?`      | `boolean` | 是否可自动选择     |
| `forced?`          | `boolean` | 是否强制（仅字幕） |
| `instreamId?`      | `string`  | 流内 ID            |
| `characteristics?` | `string`  | 统一类型标识符     |
| `channels?`        | `string`  | 音频声道参数       |

### Variant（变体流）

| 属性                | 类型           | 描述                     |
| ------------------- | -------------- | ------------------------ |
| `uri`               | `string`       | 媒体播放列表 URI         |
| `bandwidth`         | `number`       | 峰值比特率               |
| `averageBandwidth?` | `number`       | 平均比特率               |
| `score?`            | `number`       | 变体优先级分数（LL-HLS） |
| `codecs?`           | `string`       | 编解码器标识符           |
| `resolution?`       | `Resolution`   | 显示分辨率               |
| `frameRate?`        | `number`       | 最大帧率                 |
| `hdcpLevel?`        | `string`       | HDCP 级别                |
| `allowedCpc?`       | `AllowedCpc[]` | 允许的内容保护配置       |
| `videoRange?`       | `string`       | 视频范围                 |
| `audio?`            | `Rendition[]`  | 音频呈现                 |
| `video?`            | `Rendition[]`  | 视频呈现                 |
| `subtitles?`        | `Rendition[]`  | 字幕呈现                 |
| `closedCaptions?`   | `Rendition[]`  | 隐藏字幕呈现             |

### Key（加密密钥）

| 属性             | 类型         | 描述           |
| ---------------- | ------------ | -------------- |
| `method`         | `string`     | 加密方法       |
| `uri?`           | `string`     | 密钥文件 URI   |
| `iv?`            | `Uint8Array` | 初始化向量     |
| `format?`        | `string`     | 密钥格式标识符 |
| `formatVersion?` | `string`     | 密钥格式版本   |

### DateRange（日期范围）

| 属性               | 类型                        | 描述                              |
| ------------------ | --------------------------- | --------------------------------- |
| `id`               | `string`                    | 唯一标识符                        |
| `classId?`         | `string`                    | CLASS 分组名称                    |
| `start`            | `Date`                      | 起始日期/时间                     |
| `cue?`             | `string`                    | CUE 信息                          |
| `end?`             | `Date`                      | 结束日期/时间                     |
| `duration?`        | `number`                    | 时长（秒）                        |
| `plannedDuration?` | `number`                    | 预期时长                          |
| `endOnNext?`       | `boolean`                   | 是否在下个同 CLASS 范围开始时结束 |
| `attributes?`      | `Record<string, AttrValue>` | 自定义属性                        |

### LowLatencyCompatibility（LL-HLS 兼容性参数）

| 属性             | 类型      | 描述                   |
| ---------------- | --------- | ---------------------- |
| `canBlockReload` | `boolean` | 是否支持阻塞重载       |
| `canSkipUntil?`  | `number`  | 最大可跳过时长（秒）   |
| `holdBack?`      | `number`  | 最小保持时长（秒）     |
| `partHoldBack?`  | `number`  | 最小部分保持时长（秒） |

## 支持的标签

### 基础标签

| 标签                      | 描述     |
| ------------------------- | -------- |
| `#EXTM3U`                 | 文件头   |
| `#EXT-X-VERSION`          | 协议版本 |
| `#EXT-X-CONTENT-STEERING` | 内容导航 |

### 媒体分片标签

| 标签                            | 描述                 |
| ------------------------------- | -------------------- |
| `#EXTINF`                       | 分片时长与标题       |
| `#EXT-X-BYTERANGE`              | 字节范围             |
| `#EXT-X-DISCONTINUITY`          | 不连续标记           |
| `#EXT-X-PREFETCH-DISCONTINUITY` | LL-HLS 预取不连续    |
| `#EXT-X-KEY`                    | 加密密钥             |
| `#EXT-X-MAP`                    | 媒体初始化段         |
| `#EXT-X-PROGRAM-DATE-TIME`      | 绝对日期/时间        |
| `#EXT-X-DATERANGE`              | 日期范围元数据       |
| `#EXT-X-CUE-OUT`                | 广告插入标记（出点） |
| `#EXT-X-CUE-IN`                 | 广告插入标记（入点） |
| `#EXT-X-CUE-OUT-CONT`           | 持续广告标记         |
| `#EXT-X-CUE`                    | 通用提示标记         |
| `#EXT-X-GAP`                    | 间隙分片             |
| `#EXT-X-PART`                   | 部分分片（LL-HLS）   |
| `#EXT-X-PRELOAD-HINT`           | 预加载提示（LL-HLS） |

### 媒体播放列表标签

| 标签                            | 描述                          |
| ------------------------------- | ----------------------------- |
| `#EXT-X-TARGETDURATION`         | 最大分片时长                  |
| `#EXT-X-MEDIA-SEQUENCE`         | 媒体序列号                    |
| `#EXT-X-DISCONTINUITY-SEQUENCE` | 不连续序列号                  |
| `#EXT-X-ENDLIST`                | 播放列表结束                  |
| `#EXT-X-PLAYLIST-TYPE`          | 播放列表类型（`EVENT`/`VOD`） |
| `#EXT-X-I-FRAMES-ONLY`          | 仅 I 帧播放列表               |
| `#EXT-X-SERVER-CONTROL`         | LL-HLS 服务器控制             |
| `#EXT-X-PART-INF`               | LL-HLS 部分分片参数           |
| `#EXT-X-PREFETCH`               | 预取分片（LL-HLS）            |
| `#EXT-X-RENDITION-REPORT`       | 呈现报告（LL-HLS）            |
| `#EXT-X-SKIP`                   | 跳过分片（LL-HLS）            |

### Master 播放列表标签

| 标签                        | 描述         |
| --------------------------- | ------------ |
| `#EXT-X-MEDIA`              | 替代呈现     |
| `#EXT-X-STREAM-INF`         | 变体流       |
| `#EXT-X-I-FRAME-STREAM-INF` | I 帧变体流   |
| `#EXT-X-SESSION-DATA`       | 会话元数据   |
| `#EXT-X-SESSION-KEY`        | 会话加密密钥 |

### 通用标签（Media 或 Master）

| 标签                          | 描述         |
| ----------------------------- | ------------ |
| `#EXT-X-INDEPENDENT-SEGMENTS` | 独立分片声明 |
| `#EXT-X-START`                | 首选起始位置 |
| `#EXT-X-DEFINE`               | 变量定义     |

## 错误处理

当播放列表违反 RFC 8216 规则时，解析器会抛出 `InvalidPlaylistError`（继承自 `Error`）：

```typescript
import { parser, InvalidPlaylistError } from "@skax/hls-parse";

try {
  const playlist = parser(invalidM3u8);
} catch (error) {
  if (error instanceof InvalidPlaylistError) {
    console.error("无效的播放列表:", error.message);
  }
}
```

## 自定义标签解析

支持注册自定义标签解析器来处理非标准标签：

```typescript
import { parser } from "@skax/hls-parse";

const playlist = parser(m3u8Content, {
  customTagParsers: {
    "EXT-X-MY-TAG": (_name, value, attributes) => {
      return { timestamp: Number(value) };
    },
  },
});

// 自定义标签结果存储在 customTags 属性中
console.log(playlist.customTags?.EXT_X_MY_TAG);
```

## 低延迟 HLS（LL-HLS）

完整支持 LL-HLS 特性，包括：

- **部分分片**（`#EXT-X-PART`）：低延迟分片的增量交付
- **预加载提示**（`#EXT-X-PRELOAD-HINT`）：提前声明即将到来的分片
- **服务器控制**（`#EXT-X-SERVER-CONTROL`）：配置阻塞重载与跳过边界
- **跳过**（`#EXT-X-SKIP`）：声明已跳过的分片数量
- **呈现报告**（`#EXT-X-RENDITION-REPORT`）：替代呈现的最新分片信息
- **预取分片**（`#EXT-X-PREFETCH`）：提前声明预取分片

```typescript
import { parser } from "@skax/hls-parse";

const llhlsPlaylist = parser(`#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4.0,
fileSequence1.mp4
#EXT-X-PART:DURATION=1.0,URI="part1.mp4"
#EXT-X-PART:DURATION=1.0,URI="part2.mp4"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="part3.mp4"`);

// 访问 LL-HLS 特定属性
if (!playlist.isMasterPlaylist) {
  console.log(playlist.lowLatencyCompatibility?.canBlockReload); // true
  console.log(playlist.partTargetDuration); // 1.0
  console.log(playlist.segments[0].parts?.length); // 2
}
```

## 构建

```bash
npm run build
```

产物包含 CJS、ESM 和 TypeScript 声明文件，输出在 `dist/` 目录。

## 测试

```bash
npm test
```

测试覆盖率：语句 100%、分支 100%、函数 100%、行 100%。

## 项目结构

```
hls-parse/
├── src/
│   ├── parse.ts          # 主解析器（词法分析、语法分析、语义分析）
│   ├── types.ts          # 类型定义
│   ├── utils.ts          # 工具函数（字符串处理、属性解析、URL 解析）
│   ├── constants.ts      # HLS 标签常量
│   └── index.ts          # 公共 API 入口
├── __tests__/            # 测试文件
├── public/               # 在线演示
├── examples/             # 示例代码
└── dist/                 # 构建产物
```

## 许可证

MIT
