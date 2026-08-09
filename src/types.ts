/**
 * HLS 播放列表类型定义。
 *
 * HLS Playlist Type Definitions
 *
 * All types conforming to {@link https://datatracker.ietf.org/doc/html/rfc8216 | RFC 8216}
 * (HTTP Live Streaming) and LL-HLS (Low-Latency HLS) extensions.
 *
 * @remarks
 * All URIs in these types will be resolved to absolute when
 * {@link ParserOptions.uri} is provided to the `parser` function.
 *
 * @module types
 * @category Types
 */

/**
 * 媒体初始化段。
 *
 * Media Initialization Section.
 *
 * Corresponds to the `#EXT-X-MAP` tag.
 * Contains the URI and optional byte range of the initialization resource
 * required to parse applicable Media Segments.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.5 | RFC 8216 §4.3.2.5}
 */
export interface MediaInitializationSection {
  /**
   * 是否为预加载提示（LL-HLS）。
   *
   * Whether this is a preload hint (LL-HLS).
   */
  hint?: boolean;
  /**
   * 初始化段资源的 URI。
   *
   * URI to the initialization section resource.
   */
  uri: string;
  /**
   * 资源的字节范围。
   *
   * Byte range within the resource.
   */
  byterange?: Byterange;
}

/**
 * 字节范围规范。
 *
 * Byte range specification.
 *
 * Corresponds to the `#EXT-X-BYTERANGE` tag value.
 *
 * @remarks
 * When `offset` is `-1` it indicates the sub-range begins at the next byte
 * following the sub-range of the previous Media Segment.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.2 | RFC 8216 §4.3.2.2}
 */
export interface Byterange {
  /**
   * 字节范围的长度（以字节为单位）。
   *
   * Length of the byte range in bytes.
   */
  length: number;
  /**
   * 起始偏移量（以字节为单位）。
   *
   * Start offset in bytes.
   *
   * @defaultValue `-1` (implicit offset)
   */
  offset: number;
}

/**
 * 显示分辨率。
 *
 * Display resolution.
 *
 * Corresponds to the `RESOLUTION` attribute value.
 *
 * @example `{ width: 1920, height: 1080 }` for `RESOLUTION=1920x1080`
 */
export interface Resolution {
  /**
   * 水平像素尺寸。
   *
   * Horizontal pixel dimension.
   */
  width: number;
  /**
   * 垂直像素尺寸。
   *
   * Vertical pixel dimension.
   */
  height: number;
}

/**
 * 加密/解密密钥。
 *
 * Encryption / decryption key.
 *
 * Corresponds to `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` tags.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.4 | RFC 8216 §4.3.2.4}
 */
export interface Key {
  /**
   * 加密方法。
   *
   * Encryption method.
   *
   * @remarks Valid values: `"NONE"`, `"AES-128"`, `"SAMPLE-AES"`.
   */
  method: string;
  /**
   * 获取密钥文件的 URI。
   *
   * URI to obtain the key file.
   */
  uri?: string;
  /**
   * 初始化向量。
   *
   * Initialization Vector.
   *
   * @remarks Must be exactly 128 bits (16 bytes) when present.
   */
  iv?: Uint8Array;
  /**
   * 密钥格式标识符。
   *
   * Key format identifier.
   *
   * @defaultValue `"identity"`
   */
  format?: string;
  /**
   * 密钥格式版本，以 "/" 分隔。
   *
   * Key format version(s), separated by `/`.
   */
  formatVersion?: string;
}

/**
 * 解析后的 #EXTINF 标签数据。
 *
 * Parsed `#EXTINF` tag data.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.1 | RFC 8216 §4.3.2.1}
 */
export interface ExtInfo {
  /**
   * 片段时长（秒）。
   *
   * Segment duration in seconds.
   */
  duration: number;
  /**
   * 可选的人类可读标题。
   *
   * Optional human-readable title.
   */
  title?: string;
}

/**
 * 低延迟 HLS 的部分片段。
 *
 * Partial segment for Low-Latency HLS.
 *
 * Corresponds to `#EXT-X-PART` and `#EXT-X-PRELOAD-HINT` (TYPE=PART) tags.
 *
 * @beta LL-HLS feature
 */
export interface PartialSegment {
  /**
   * 是否为预加载提示（#EXT-X-PRELOAD-HINT）。
   *
   * Whether this is a preload hint (`#EXT-X-PRELOAD-HINT`).
   */
  hint?: boolean;
  /**
   * 部分片段的 URI。
   *
   * URI to the partial segment.
   */
  uri: string;
  /**
   * 资源的字节范围。
   *
   * Byte range within the resource.
   */
  byterange?: Byterange;
  /**
   * 时长（秒）。
   *
   * Duration in seconds.
   */
  duration?: number;
  /**
   * 此片段是否可以独立解码。
   *
   * Whether this segment can be decoded independently.
   */
  independent?: boolean;
  /**
   * 此片段是否为间隔。
   *
   * Whether this segment is a gap.
   */
  gap?: boolean;
}

/**
 * 低延迟 HLS 的预取片段。
 *
 * Prefetch segment for Low-Latency HLS.
 *
 * Corresponds to the `#EXT-X-PREFETCH` tag.
 *
 * @beta LL-HLS feature
 */
export interface PrefetchSegment {
  /**
   * 预取片段的 URI。
   *
   * URI of the prefetch segment.
   */
  uri: string;
  /**
   * 媒体序列号。
   *
   * Media Sequence Number.
   */
  mediaSequenceNumber: number;
  /**
   * 间断序列号。
   *
   * Discontinuity Sequence Number.
   */
  discontinuitySequence: number;
  /**
   * 此片段是否标识间断。
   *
   * Whether this segment indicates a discontinuity.
   */
  discontinuity?: boolean;
  /**
   * 加密密钥（如未指定则继承自前一个片段）。
   *
   * Encryption key (inherited from previous segment if not specified).
   */
  key?: Key | null;
}

/**
 * 媒体片段。
 *
 * Media Segment.
 *
 * Represents a single segment in a Media Playlist, including all associated tags
 * (`#EXTINF`, `#EXT-X-KEY`, `#EXT-X-MAP`, `#EXT-X-BYTERANGE`, etc.).
 */
export interface Segment {
  /**
   * 媒体片段的 URI。
   *
   * URI of the media segment.
   */
  uri: string;
  /**
   * 时长（秒）（来自 #EXTINF）。
   *
   * Duration in seconds (from `#EXTINF`).
   */
  duration?: number;
  /**
   * 可选标题（来自 #EXTINF）。
   *
   * Optional title (from `#EXTINF`).
   */
  title?: string;
  /**
   * 资源的字节范围（来自 #EXT-X-BYTERANGE）。
   *
   * Byte range within the resource (from `#EXT-X-BYTERANGE`).
   */
  byterange?: Byterange;
  /**
   * 媒体序列号。
   *
   * Media Sequence Number.
   */
  mediaSequenceNumber: number;
  /**
   * 间断序列号。
   *
   * Discontinuity Sequence Number.
   */
  discontinuitySequence: number;
  /**
   * 此片段是否为间断（#EXT-X-DISCONTINUITY）。
   *
   * Whether this segment is a discontinuity (`#EXT-X-DISCONTINUITY`).
   */
  discontinuity?: boolean;
  /**
   * 此片段是否为间隔（#EXT-X-GAP）。
   *
   * Whether this segment is a gap (`#EXT-X-GAP`).
   */
  gap?: boolean;
  /**
   * 加密密钥（#EXT-X-KEY）。如不存在则继承。
   *
   * Encryption key (`#EXT-X-KEY`). Inherited if not present.
   */
  key?: Key | null;
  /**
   * 媒体初始化段（#EXT-X-MAP）。如不存在则继承。
   *
   * Media Initialization Section (`#EXT-X-MAP`). Inherited if not present.
   */
  map?: MediaInitializationSection | null;
  /**
   * 节目日期/时间（#EXT-X-PROGRAM-DATE-TIME）。
   *
   * Program date/time (`#EXT-X-PROGRAM-DATE-TIME`).
   * https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.6
   *
   * #EXT-X-PROGRAM-DATE-TIME:2010-02-19T14:54:23.031+08:00
   */
  programDateTime?: string;
  /**
   * Ezviz 设备时间戳（#EXT-X-DEVICE-TIME）。
   *
   * Ezviz device timestamp (`#EXT-X-DEVICE-TIME`).
   *
   * #EXT-X-DEVICE-TIME:20260603013421
   */
  deviceTime?: string;
  /**
   * 日期范围元数据（#EXT-X-DATERANGE）。
   *
   * Date range metadata (`#EXT-X-DATERANGE`).
   */
  dateRange?: DateRange;
  /**
   * 拼接/标记信息。
   *
   * Splice / marker information.
   */
  markers?: SpliceInfo[];
  /**
   * 部分片段（LL-HLS #EXT-X-PART / #EXT-X-PRELOAD-HINT）。
   *
   * Partial segments (LL-HLS `#EXT-X-PART` / `#EXT-X-PRELOAD-HINT`).
   */
  parts?: PartialSegment[];
}

/**
 * 日期范围元数据。
 *
 * Date Range metadata.
 *
 * Corresponds to the `#EXT-X-DATERANGE` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.7 | RFC 8216 §4.3.2.7}
 */
export interface DateRange {
  /**
   * 唯一标识符。
   *
   * Unique identifier.
   */
  id: string;
  /**
   * CLASS 名称，用于分组具有共享语义的范围。
   *
   * CLASS name grouping ranges with shared semantics.
   */
  classId?: string;
  /**
   * 开始日期/时间。
   *
   * Start date/time.
   */
  start: Date;
  /**
   * 提示信息。
   *
   * Cue information.
   */
  cue?: string;
  /**
   * 结束日期/时间。
   *
   * End date/time.
   */
  end?: Date;
  /**
   * 时长（秒）。
   *
   * Duration in seconds.
   */
  duration?: number;
  /**
   * 预期时长（实际值尚未确定时）。
   *
   * Expected duration (when actual is not yet known).
   */
  plannedDuration?: number;
  /**
   * 此范围是否在同一 CLASS 的下一个范围开始时结束。
   *
   * Whether this range ends at the start of the next range of the same CLASS.
   *
   * @remarks Cannot coexist with `duration` or `end`.
   */
  endOnNext?: boolean;
  /**
   * 自定义属性（SCTE35- 和 X- 前缀）。
   *
   * Custom attributes (SCTE35- and X- prefixed).
   */
  attributes?: Record<string, AttrValue>;
}

/**
 * 拼接/标记信息。
 *
 * Splice / marker information.
 *
 * Carried by `#EXT-X-CUE-OUT`, `#EXT-X-CUE-IN`, and raw SCTE-35 tags.
 */
export interface SpliceInfo {
  /**
   * 标记类型。
   *
   * Marker type.
   */
  type: "OUT" | "IN" | "RAW";
  /**
   * 时长（秒）（适用于 OUT 类型）。
   *
   * Duration in seconds (for `OUT` type).
   */
  duration?: number;
  /**
   * 原始标签名称（适用于 RAW 类型）。
   *
   * Original tag name (for `RAW` type).
   */
  tagName?: string;
  /**
   * 原始标签值。
   *
   * Raw tag value.
   */
  value?: unknown;
}

/**
 * 替代呈现方式（Alternative Rendition）。
 *
 * Alternative Rendition.
 *
 * Corresponds to the `#EXT-X-MEDIA` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.1 | RFC 8216 §4.3.4.1}
 */
export interface Rendition {
  /**
   * 媒体类型：AUDIO、VIDEO、SUBTITLES 或 CLOSED-CAPTIONS。
   *
   * Media type: `"AUDIO"`, `"VIDEO"`, `"SUBTITLES"`, or `"CLOSED-CAPTIONS"`.
   */
  type: string;
  /**
   * 媒体播放列表的 URI（AUDIO/VIDEO 可选）。
   *
   * URI of the media playlist (optional for AUDIO/VIDEO).
   */
  uri?: string;
  /**
   * 呈现方式组 ID。
   *
   * Rendition group ID.
   */
  groupId: string;
  /**
   * 主要语言（RFC 5646 标签）。
   *
   * Primary language (RFC 5646 tag).
   */
  language?: string;
  /**
   * 关联语言（RFC 5646 标签）。
   *
   * Associated language (RFC 5646 tag).
   */
  assocLanguage?: string;
  /**
   * 人类可读名称。
   *
   * Human-readable name.
   */
  name: string;
  /**
   * 是否为默认呈现方式。
   *
   * Whether this is the default rendition.
   */
  isDefault?: boolean;
  /**
   * 是否可自动选择。
   *
   * Whether this can be auto-selected.
   */
  autoselect?: boolean;
  /**
   * 是否为强制呈现（仅限 SUBTITLES）。
   *
   * Whether this is forced (SUBTITLES only).
   */
  forced?: boolean;
  /**
   * 流内 ID。
   *
   * In-stream ID.
   *
   * @remarks Required when `type` is `"CLOSED-CAPTIONS"`.
   * Valid: `"CC1"`-`"CC4"`, `"SERVICE1"`-`"SERVICE63"`.
   */
  instreamId?: string;
  /**
   * 统一类型标识符（UTI），逗号分隔。
   *
   * Uniform Type Identifiers (UTIs), comma-separated.
   */
  characteristics?: string;
  /**
   * 音频声道数及参数。
   *
   * Audio channel count and parameters.
   */
  channels?: string;
  /**
   * 内容引导的路径 ID。
   *
   * Pathway ID for content steering.
   */
  pathwayId?: string;
}

/**
 * 变体流（Variant Stream）。
 *
 * Variant Stream.
 *
 * Corresponds to `#EXT-X-STREAM-INF` or `#EXT-X-I-FRAME-STREAM-INF`.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.2 | RFC 8216 §4.3.4.2}
 */
export interface Variant {
  /**
   * 媒体播放列表的 URI。
   *
   * URI of the media playlist.
   */
  uri: string;
  /**
   * 峰值比特率（bps）。
   *
   * Peak bit rate in bits per second.
   */
  bandwidth: number;
  /**
   * 平均比特率（bps）。
   *
   * Average bit rate in bits per second.
   */
  averageBandwidth?: number;
  /**
   * 变体分数（LL-HLS），用于优先级播放列表重新加载。
   *
   * Variant SCORE (LL-HLS), used for prioritised playlist reload.
   *
   * @remarks If any variant has a SCORE, all variants SHOULD have one.
   */
  score?: number;
  /**
   * 编解码器标识符（RFC 6381）。
   *
   * Codec identifiers (RFC 6381).
   */
  codecs?: string;
  /**
   * 最佳显示分辨率。
   *
   * Optimal display resolution.
   */
  resolution?: Resolution;
  /**
   * 最大帧率（保留 3 位小数）。
   *
   * Maximum frame rate (rounded to 3 decimal places).
   */
  frameRate?: number;
  /**
   * HDCP 级别：TYPE-0 或 NONE。
   *
   * HDCP level: `"TYPE-0"` or `"NONE"`.
   */
  hdcpLevel?: string;
  /**
   * 允许的内容保护配置。
   *
   * Allowed Content Protection Configurations.
   */
  allowedCpc?: AllowedCpc[];
  /**
   * 视频范围：SDR、HLG 或 PQ。
   *
   * Video range: `"SDR"`, `"HLG"`, or `"PQ"`.
   */
  videoRange?: string;
  /**
   * 稳定的变体标识符。
   *
   * Stable variant identifier.
   */
  stableVariantId?: string;
  /**
   * 内容引导的路径 ID。
   *
   * Pathway ID for content steering.
   */
  pathwayId?: string;
  /**
   * 节目 ID。
   *
   * Program ID.
   *
   * @deprecated Removed in protocol version 6.
   */
  programId?: number;
  /**
   * 是否为 I-frame 变体（#EXT-X-I-FRAME-STREAM-INF）。
   *
   * Whether this is an I-frame variant (`#EXT-X-I-FRAME-STREAM-INF`).
   */
  isIFrameOnly?: boolean;
  /**
   * 与此变体 GROUP-ID 匹配的音频呈现方式。
   *
   * Audio renditions matching this variant's GROUP-ID.
   */
  audio?: Rendition[];
  /**
   * 与此变体 GROUP-ID 匹配的视频呈现方式。
   *
   * Video renditions matching this variant's GROUP-ID.
   */
  video?: Rendition[];
  /**
   * 与此变体 GROUP-ID 匹配的字幕呈现方式。
   *
   * Subtitle renditions matching this variant's GROUP-ID.
   */
  subtitles?: Rendition[];
  /**
   * 与此变体 GROUP-ID 匹配的隐藏式字幕呈现方式。
   *
   * Closed-caption renditions matching this variant's GROUP-ID.
   */
  closedCaptions?: Rendition[];
}

/**
 * 允许的内容保护配置条目。
 *
 * Allowed Content Protection Configuration entry.
 *
 * Part of the `ALLOWED-CPC` attribute value.
 */
export interface AllowedCpc {
  /**
   * 内容保护格式标识符。
   *
   * Content protection format identifier.
   */
  format: string;
  /**
   * 内容保护配置列表。
   *
   * List of Content Protection Configurations.
   */
  cpcList: string[];
}

/**
 * 会话数据。
 *
 * Session Data.
 *
 * Corresponds to the `#EXT-X-SESSION-DATA` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.4 | RFC 8216 §4.3.4.4}
 */
export interface SessionData {
  /**
   * 数据标识符（建议使用反向 DNS 格式）。
   *
   * Data identifier (reverse-DNS recommended).
   */
  id: string;
  /**
   * 内联值（与 uri 互斥）。
   *
   * Inline value (mutually exclusive with `uri`).
   */
  value?: string;
  /**
   * JSON 资源 URI（与 value 互斥）。
   *
   * URI to a JSON resource (mutually exclusive with `value`).
   */
  uri?: string;
  /**
   * 值的语言（RFC 5646 标签）。
   *
   * Language of the value (RFC 5646 tag).
   */
  language?: string;
}

/**
 * 内容引导配置。
 *
 * Content Steering configuration.
 *
 * Corresponds to the `#EXT-X-CONTENT-STEERING` tag.
 */
export interface ContentSteering {
  /**
   * 引导清单的服务器 URI。
   *
   * Server URI for the steering manifest.
   */
  serverUri: string;
  /**
   * 要使用的路径 ID。
   *
   * Pathway ID to use.
   */
  pathwayId?: string;
}

/**
 * 低延迟 HLS 的呈现方式报告。
 *
 * Rendition Report for Low-Latency HLS.
 *
 * Corresponds to the `#EXT-X-RENDITION-REPORT` tag.
 *
 * @beta LL-HLS feature
 */
export interface RenditionReport {
  /**
   * 呈现方式播放列表的 URI（必须为相对路径）。
   *
   * URI of the rendition playlist (must be relative).
   */
  uri: string;
  /**
   * 最后的媒体序列号。
   *
   * Last Media Sequence Number.
   */
  lastMSN?: number;
  /**
   * 最后的部分索引。
   *
   * Last Part index.
   */
  lastPart?: number;
}

/**
 * 首选起始位置。
 *
 * Preferred start position.
 *
 * Corresponds to the `#EXT-X-START` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.5.2 | RFC 8216 §4.3.5.2}
 */
export interface StartData {
  /**
   * 时间偏移量（秒）。
   *
   * Time offset in seconds.
   *
   * @remarks Positive = from beginning, negative = from end.
   */
  offset: number;
  /**
   * 是否精确定位到 TIME-OFFSET。
   *
   * Whether to precisely seek to the TIME-OFFSET.
   *
   * @defaultValue `false`
   */
  precise?: boolean;
}

/**
 * 低延迟 HLS 服务器控制参数。
 *
 * Low-Latency HLS server control parameters.
 *
 * Corresponds to the `#EXT-X-SERVER-CONTROL` tag.
 *
 * @beta LL-HLS feature
 */
export interface LowLatencyCompatibility {
  /**
   * 是否支持阻塞式重新加载。
   *
   * Whether block reload is supported.
   */
  canBlockReload: boolean;
  /**
   * 最大跳过时长（秒）。
   *
   * Maximum skip duration in seconds.
   */
  canSkipUntil?: number;
  /**
   * 最小保持时间（秒）。
   *
   * Minimum hold-back time in seconds.
   */
  holdBack?: number;
  /**
   * 最小部分保持时间（秒）。
   *
   * Minimum part hold-back time in seconds.
   */
  partHoldBack?: number;
}

/**
 * 所有已解析属性值的联合类型。
 *
 * Union of all possible parsed attribute values.
 */
export type AttrValue = string | number | boolean | Date | Uint8Array | Resolution | Byterange | AllowedCpc[];

/**
 * 已解析标签属性的映射。
 *
 * Map of parsed tag attributes.
 */
export type ParsedAttrs = Record<string, AttrValue>;

/**
 * 标签参数元组：[value, attributes]。
 *
 * Tag parameter tuple: `[value, attributes]`.
 *
 * @internal
 */
export type TagParam = [string | number | ExtInfo | Byterange | null, ParsedAttrs | null];

/**
 * 用户自定义属性值。
 *
 * User-defined attribute value.
 *
 * @internal
 */
export type UserAttribute = string | number | Uint8Array;

/**
 * 主播放列表（Master Playlist）。
 *
 * Master Playlist.
 *
 * Contains variant streams and renditions for adaptive bitrate streaming.
 *
 * @remarks
 * Type discriminator: `isMasterPlaylist === true`.
 *
 * @example
 * ```ts
 * import { parser } from '@skax/hls-parse';
 * const pl = parser(m3u8Content) as MasterPlaylist;
 * for (const v of pl.variants) {
 *   console.log(v.bandwidth, v.uri);
 * }
 * ```
 */
export interface MasterPlaylist {
  /**
   * 类型判别器 — 主播放列表始终为 true。
   *
   * Type discriminator — always `true` for Master Playlist.
   */
  isMasterPlaylist: true;
  /**
   * 原始播放列表源文本。
   *
   * The raw playlist source text.
   */
  source?: string;
  /**
   * 协议兼容版本。
   *
   * Protocol compatibility version.
   */
  version?: number;
  /**
   * 是否标记了独立片段。
   *
   * Whether independent segments are signaled.
   */
  independentSegments?: boolean;
  /**
   * 首选起始位置。
   *
   * Preferred start position.
   */
  start?: StartData;
  /**
   * 内容引导配置。
   *
   * Content steering configuration.
   */
  contentSteering?: ContentSteering;
  /**
   * 变量定义（#EXT-X-DEFINE）。
   *
   * Variable definitions (`#EXT-X-DEFINE`).
   */
  defines?: Record<string, AttrValue>[];
  /**
   * 会话数据条目。
   *
   * Session data entries.
   */
  sessionDataList: SessionData[];
  /**
   * 会话密钥。
   *
   * Session keys.
   */
  sessionKeyList: Key[];
  /**
   * 变体流（#EXT-X-STREAM-INF / #EXT-X-I-FRAME-STREAM-INF）。
   *
   * Variant streams (`#EXT-X-STREAM-INF` / `#EXT-X-I-FRAME-STREAM-INF`).
   */
  variants: Variant[];
  /**
   * 自定义/未知标签。标签中的 "-" → "_"。
   *
   * Custom/unknown tags. Tag `-` → `_`.
   */
  customTags?: Record<string, unknown[]>;
}

/**
 * 媒体播放列表（Media Playlist）。
 *
 * Media Playlist.
 *
 * Contains segments and metadata for sequential playback.
 *
 * @remarks
 * Type discriminator: `isMasterPlaylist === false`.
 *
 * @example
 * ```ts
 * import { parser } from '@skax/hls-parse';
 * const pl = parser(m3u8Content) as MediaPlaylist;
 * for (const seg of pl.segments) {
 *   console.log(seg.uri, seg.duration);
 * }
 * ```
 */
export interface MediaPlaylist {
  /**
   * 类型判别器 — 媒体播放列表始终为 false。
   *
   * Type discriminator — always `false` for Media Playlist.
   */
  isMasterPlaylist: false;
  /**
   * 原始播放列表源文本。
   *
   * The raw playlist source text.
   */
  source?: string;
  /**
   * 协议兼容版本。
   *
   * Protocol compatibility version.
   */
  version?: number;
  /**
   * 是否标记了独立片段。
   *
   * Whether independent segments are signaled.
   */
  independentSegments?: boolean;
  /**
   * 首选起始位置。
   *
   * Preferred start position.
   */
  start?: StartData;
  /**
   * 变量定义（#EXT-X-DEFINE）。
   *
   * Variable definitions (`#EXT-X-DEFINE`).
   */
  defines?: Record<string, AttrValue>[];
  /**
   * 最大片段时长（秒）（#EXT-X-TARGETDURATION）。
   *
   * Maximum segment duration in seconds (`#EXT-X-TARGETDURATION`).
   */
  targetDuration?: number;
  /**
   * 基础媒体序列号。
   *
   * Base media sequence number.
   */
  mediaSequenceBase?: number;
  /**
   * 基础间断序列号。
   *
   * Base discontinuity sequence number.
   */
  discontinuitySequenceBase?: number;
  /**
   * 播放列表是否已完成（#EXT-X-ENDLIST）。
   *
   * Whether the playlist is complete (`#EXT-X-ENDLIST`).
   */
  endlist?: boolean;
  /**
   * 播放列表类型：EVENT 或 VOD。
   *
   * Playlist type: `"EVENT"` or `"VOD"`.
   */
  playlistType?: string;
  /**
   * 是否为仅 I-frame 的播放列表。
   *
   * Whether this is an I-frame only playlist.
   */
  isIFrame?: boolean;
  /**
   * LL-HLS 服务器控制参数。
   *
   * LL-HLS server control parameters.
   */
  lowLatencyCompatibility?: LowLatencyCompatibility;
  /**
   * 部分片段目标时长（LL-HLS）。
   *
   * Partial segment target duration (LL-HLS).
   */
  partTargetDuration?: number;
  /**
   * 媒体播放列表的比特率（bps）（RFC 8216bis EXT-X-BITRATE）。
   *
   * Bitrate of the media playlist in bps (RFC 8216bis EXT-X-BITRATE).
   */
  bitrate?: number;
  /**
   * 跳过的片段数（LL-HLS #EXT-X-SKIP）。
   *
   * Number of skipped segments (LL-HLS `#EXT-X-SKIP`).
   */
  skip?: number;
  /**
   * 媒体片段。
   *
   * Media segments.
   */
  segments: Segment[];
  /**
   * 预取片段（LL-HLS）。
   *
   * Prefetch segments (LL-HLS).
   */
  prefetchSegments: PrefetchSegment[];
  /**
   * 呈现方式报告（LL-HLS）。
   *
   * Rendition reports (LL-HLS).
   */
  renditionReports: RenditionReport[];
  /**
   * 播放列表中的日期范围。
   *
   * Date ranges in the playlist.
   */
  dateRanges: DateRange[];
  /**
   * 自定义/未知标签。标签中的 "-" → "_"。
   *
   * Custom/unknown tags. Tag `-` → `_`.
   */
  customTags?: Record<string, unknown[]>;
}

/**
 * 任意已解析播放列表的联合类型。
 *
 * Union type for any parsed playlist.
 *
 * @remarks
 * Use the `isMasterPlaylist` discriminator to narrow the type:
 * ```ts
 * if (pl.isMasterPlaylist) {
 *   // pl is MasterPlaylist
 * } else {
 *   // pl is MediaPlaylist
 * }
 * ```
 */
export type Playlist = MasterPlaylist | MediaPlaylist;

/**
 * 自定义标签解析器函数。
 *
 * Custom tag parser function.
 * Receives the parsed tag and returns structured data.
 *
 * @param _tagName - The tag name (e.g., `"EXT-X-CUSTOM"`)
 * @param _value - The parsed value from the tag
 * @param _attributes - Parsed attribute key-value pairs
 * @returns Any structured data to attach to the segment or playlist
 *
 * @example
 * ```ts
 * const myParser: CustomTagParser = (name, value, attrs) => {
 *   return { timestamp: Number(value) };
 * };
 * ```
 */
// eslint-disable-next-line no-unused-vars
export type CustomTagParser = (_tagName: string, _value: unknown, _attributes: Record<string, unknown>) => unknown;

/**
 * parser 函数的选项。
 *
 * Options for the `parser` function.
 */
export interface ParserOptions {
  /**
   * 用于解析播放列表中相对 URL 的基础 URI。
   *
   * Base URI for resolving relative URLs in the playlist.
   *
   * @remarks
   * If provided, all relative URIs (segment URIs, key URIs, map URIs,
   * variant URIs, etc.) will be resolved to absolute URLs.
   *
   * @example
   * ```ts
   * const pl = parser(m3u8, { uri: 'https://example.com/hls/main.m3u8' });
   * // pl.segments[0].uri → 'https://example.com/hls/segment.ts'
   * ```
   */
  uri?: string;
  /**
   * 自定义标签解析器，键为标签名（不含 # 前缀）。
   *
   * Custom tag parsers keyed by tag name (without `#` prefix).
   * When a matching tag is encountered, the parser is called and its
   * return value is stored on `playlist.customTags[tagName]`.
   *
   * @example
   * ```ts
   * const pl = parser(m3u8, {
   *   customTagParsers: {
   *     'EXT-X-MY-TAG': (name, value, attrs) => ({ ts: Number(value) }),
   *   },
   * });
   * // pl.customTags.EXT_X_MY_TAG → [{ ts: 123 }]
   * ```
   */
  customTagParsers?: Record<string, CustomTagParser>;
}

// ============================================================================
// Type guard helpers — 类型守卫辅助函数
// ============================================================================

/**
 * 类型守卫：如果解析后的播放列表是主播放列表，返回 true。
 *
 * Type guard: returns `true` if the parsed playlist is a Master Playlist.
 *
 * @example
 * ```ts
 * const pl = parser(m3u8);
 * if (isMasterPlaylist(pl)) {
 *   pl.variants; // ← narrowed to MasterPlaylist
 * }
 * ```
 */
export function isMasterPlaylist(pl: Playlist): pl is MasterPlaylist {
  return pl.isMasterPlaylist === true;
}

/**
 * 类型守卫：如果解析后的播放列表是媒体播放列表，返回 true。
 *
 * Type guard: returns `true` if the parsed playlist is a Media Playlist.
 *
 * @example
 * ```ts
 * const pl = parser(m3u8);
 * if (isMediaPlaylist(pl)) {
 *   pl.segments; // ← narrowed to MediaPlaylist
 * }
 * ```
 */
export function isMediaPlaylist(pl: Playlist): pl is MediaPlaylist {
  return pl.isMasterPlaylist === false;
}
