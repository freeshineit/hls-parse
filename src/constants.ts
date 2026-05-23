/**
 * HLS Tag 常量定义
 *
 * 所有 M3U8 / HLS 标签名称的统一常量。
 * 每个 tag 附带中英双语文档注释，
 * 使用时通过 `TAGS.TAG_NAME` 引用，避免硬编码字符串。
 *
 * @module constants
 * @category Types
 *
 * @example
 * ```ts
 * import { TAGS } from '@skax/hls-parse';
 * // TAGS.EXT_X_TARGETDURATION === "#EXT-X-TARGETDURATION"
 * ```
 */

// ============================================================================
// Basic Tags — 基础标签
// ============================================================================

/**
 * 文件格式标识符
 *
 * Extended M3U Playlist format identifier.
 * MUST be the first line of every Media or Master Playlist.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.1.1 | RFC 8216 §4.3.1.1}
 */
export const EXTM3U = "EXTM3U";
/**
 * 协议兼容版本号
 *
 * Protocol compatibility version number.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.1.2 | RFC 8216 §4.3.1.2}
 */
export const EXT_X_VERSION = "EXT-X-VERSION";
/**
 * 内容转向服务器配置
 *
 * Content Steering server URI.
 *
 * @beta  RFC 8216bis
 */
export const EXT_X_CONTENT_STEERING = "EXT-X-CONTENT-STEERING";

// ============================================================================
// Media Segment Tags — 媒体片段标签
// ============================================================================

/**
 * 片段时长及标题
 *
 * Segment duration and optional human-readable title.
 * REQUIRED for each Media Segment.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.1 | RFC 8216 §4.3.2.1}
 */
export const EXTINF = "EXTINF";
/**
 * 子范围字节区间
 *
 * Sub-range byte range within a resource.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.2 | RFC 8216 §4.3.2.2}
 */
export const EXT_X_BYTERANGE = "EXT-X-BYTERANGE";
/**
 * 不连续标记
 *
 * Discontinuity between the following segment and the one before it.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.3 | RFC 8216 §4.3.2.3}
 */
export const EXT_X_DISCONTINUITY = "EXT-X-DISCONTINUITY";
/**
 * LL-HLS 预取不连续
 *
 * Discontinuity marker for LL-HLS prefetch segments.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_PREFETCH_DISCONTINUITY = "EXT-X-PREFETCH-DISCONTINUITY";
/**
 * 加密密钥
 *
 * Encryption / decryption key for Media Segments.
 * Method: NONE | AES-128 | SAMPLE-AES
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.4 | RFC 8216 §4.3.2.4}
 */
export const EXT_X_KEY = "EXT-X-KEY";
/**
 * 媒体初始化段
 *
 * Media Initialization Section URI and optional byte range.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.5 | RFC 8216 §4.3.2.5}
 */
export const EXT_X_MAP = "EXT-X-MAP";
/**
 * 绝对日期时间
 *
 * Associating the first sample of a Media Segment with an absolute wall-clock time.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.6 | RFC 8216 §4.3.2.6}
 */
export const EXT_X_PROGRAM_DATE_TIME = "EXT-X-PROGRAM-DATE-TIME";
/**
 * 日期范围元数据
 *
 * Date Range metadata — carries SCTE-35 and ad-insertion data.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.7 | RFC 8216 §4.3.2.7}
 */
export const EXT_X_DATERANGE = "EXT-X-DATERANGE";
/**
 * 广告插播开始
 *
 * Splice-out marker — indicates the start of an ad break.
 */
export const EXT_X_CUE_OUT = "EXT-X-CUE-OUT";
/**
 * 广告插播结束
 *
 * Splice-in marker — indicates the end of an ad break.
 */
export const EXT_X_CUE_IN = "EXT-X-CUE-IN";
/**
 * 广告插播延续
 *
 * Splice-out continuation marker.
 */
export const EXT_X_CUE_OUT_CONT = "EXT-X-CUE-OUT-CONT";
/**
 * 通用提示标记
 *
 * Generic cue marker.
 */
export const EXT_X_CUE = "EXT-X-CUE";
/**
 * OATCLS SCTE-35 数据
 *
 * OATCLS SCTE-35 payload marker.
 */
export const EXT_OATCLS_SCTE35 = "EXT-OATCLS-SCTE35";
/**
 * 资产元数据
 *
 * Asset metadata (CAID) marker.
 */
export const EXT_X_ASSET = "EXT-X-ASSET";
/**
 * SCTE-35 数据
 *
 * SCTE-35 payload marker.
 */
export const EXT_X_SCTE35 = "EXT-X-SCTE35";
/**
 * LL-HLS 部分片段
 *
 * Partial Segment for Low-Latency HLS.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_PART = "EXT-X-PART";
/**
 * LL-HLS 预加载提示
 *
 * Preload Hint for Low-Latency HLS — TYPE=PART or TYPE=MAP.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_PRELOAD_HINT = "EXT-X-PRELOAD-HINT";
/**
 * 间隔片段标记
 *
 * Gap segment marker — indicates a Media Segment without media content.
 * Extends target duration for timing but carries no samples.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.8 | RFC 8216 §4.3.2.8 (bis)}
 */
export const EXT_X_GAP = "EXT-X-GAP";

// -- RFC 8216bis: EXT-X-BITRATE (Media Playlist tag)
/**
 * 媒体播放列表码率
 *
 * Indicates the segment bitrate of a Media Playlist.
 * Enables ABR without a Master Playlist (RFC 8216bis).
 *
 * @beta
 */
export const EXT_X_BITRATE = "EXT-X-BITRATE";

// ============================================================================
// Media Playlist Tags — 媒体播放列表全局标签
// ============================================================================

/**
 * 最大片段时长 (秒)
 *
 * Maximum Media Segment duration in seconds. REQUIRED for every Media Playlist.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.1 | RFC 8216 §4.3.3.1}
 */
export const EXT_X_TARGETDURATION = "EXT-X-TARGETDURATION";
/**
 * 媒体序列号基数
 *
 * Base Media Sequence Number of the first Media Segment.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.2 | RFC 8216 §4.3.3.2}
 */
export const EXT_X_MEDIA_SEQUENCE = "EXT-X-MEDIA-SEQUENCE";
/**
 * 不连续序列号基数
 *
 * Base Discontinuity Sequence Number.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.3 | RFC 8216 §4.3.3.3}
 */
export const EXT_X_DISCONTINUITY_SEQUENCE = "EXT-X-DISCONTINUITY-SEQUENCE";
/**
 * 播放列表终止标记
 *
 * End-of-playlist marker — no more segments will be added.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.4 | RFC 8216 §4.3.3.4}
 */
export const EXT_X_ENDLIST = "EXT-X-ENDLIST";
/**
 * 播放列表类型
 *
 * Playlist type — EVENT or VOD.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.5 | RFC 8216 §4.3.3.5}
 */
export const EXT_X_PLAYLIST_TYPE = "EXT-X-PLAYLIST-TYPE";
/**
 * 仅 I 帧播放列表
 *
 * I-frame only playlist — each segment is a single I-frame (trick play).
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.3.6 | RFC 8216 §4.3.3.6}
 */
export const EXT_X_I_FRAMES_ONLY = "EXT-X-I-FRAMES-ONLY";
/**
 * LL-HLS 服务端控制参数
 *
 * Low-Latency HLS server control — CAN-BLOCK-RELOAD, CAN-SKIP-UNTIL, HOLD-BACK, PART-HOLD-BACK.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_SERVER_CONTROL = "EXT-X-SERVER-CONTROL";
/**
 * LL-HLS 部分片段目标时长
 *
 * Partial Segment target duration for Low-Latency HLS — PART-TARGET.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_PART_INF = "EXT-X-PART-INF";
/**
 * LL-HLS 预取片段
 *
 * Prefetch segment for Low-Latency HLS.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_PREFETCH = "EXT-X-PREFETCH";
/**
 * LL-HLS 呈现报告
 *
 * Rendition Report for Low-Latency HLS — carries last MSN and last Part of a Rendition.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_RENDITION_REPORT = "EXT-X-RENDITION-REPORT";
/**
 * LL-HLS 跳过片段
 *
 * Skip indicator for Low-Latency HLS — SKIPPED-SEGMENTS count.
 *
 * @beta LL-HLS feature
 */
export const EXT_X_SKIP = "EXT-X-SKIP";

// ============================================================================
// Master Playlist Tags — 主播放列表标签
// ============================================================================

/**
 * 替代呈现
 *
 * Alternative Rendition — TYPE: AUDIO | VIDEO | SUBTITLES | CLOSED-CAPTIONS.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.1 | RFC 8216 §4.3.4.1}
 */
export const EXT_X_MEDIA = "EXT-X-MEDIA";
/**
 * 变体流
 *
 * Variant Stream — ABR adaptive bitrate stream.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.2 | RFC 8216 §4.3.4.2}
 */
export const EXT_X_STREAM_INF = "EXT-X-STREAM-INF";
/**
 * I 帧变体流
 *
 * I-frame Variant Stream — independent I-frame playlist for trick-play.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.3 | RFC 8216 §4.3.4.3}
 */
export const EXT_X_I_FRAME_STREAM_INF = "EXT-X-I-FRAME-STREAM-INF";
/**
 * 会话数据
 *
 * Session data — key-value pairs or JSON URI for arbitrary metadata.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.4 | RFC 8216 §4.3.4.4}
 */
export const EXT_X_SESSION_DATA = "EXT-X-SESSION-DATA";
/**
 * 会话加密密钥
 *
 * Session-wide encryption key — preloaded keys for the entire Master Playlist.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.5 | RFC 8216 §4.3.4.5}
 */
export const EXT_X_SESSION_KEY = "EXT-X-SESSION-KEY";

// ============================================================================
// Media-or-Master Playlist Tags — 通用标签
// ============================================================================

/**
 * 独立片段声明
 *
 * All Media Segments in the playlist are independently decodable.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.5.1 | RFC 8216 §4.3.5.1}
 */
export const EXT_X_INDEPENDENT_SEGMENTS = "EXT-X-INDEPENDENT-SEGMENTS";
/**
 * 建议起始位置
 *
 * Preferred point at which to start playback — TIME-OFFSET.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.5.2 | RFC 8216 §4.3.5.2}
 */
export const EXT_X_START = "EXT-X-START";
/**
 * 变量定义
 *
 * Variable definition — NAME and VALUE pair for substitution.
 */
export const EXT_X_DEFINE = "EXT-X-DEFINE";
