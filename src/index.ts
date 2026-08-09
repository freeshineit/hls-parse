/**
 * @slax/hls-parse — 一个健壮的 M3U8 / HLS 播放列表解析器。
 *
 * A robust M3U8 / HLS playlist parser.
 *
 * 根据
 * {@link https://datatracker.ietf.org/doc/html/rfc8216 | RFC 8216} (HTTP Live Streaming) 解析 M3U8 播放列表。
 *
 * Parses M3U8 playlists according to
 * {@link https://datatracker.ietf.org/doc/html/rfc8216 | RFC 8216} (HTTP Live Streaming).
 *
 * ## Features | 功能特性
 *
 * - **主播放列表** — 自适应码率流，替代呈现
 * - **Master Playlists** — adaptive bitrate streaming, alternative renditions
 * - **媒体播放列表** — 片段、加密密钥、字节范围、不连续性
 * - **Media Playlists** — segments, encryption keys, byte ranges, discontinuities
 * - **低延迟 HLS** — 部分片段、预加载提示、服务端控制、跳过、预取
 * - **LL-HLS** — partial segments, preload hints, server control, skip, prefetch
 * - **相对 URL 解析** — 基于基础 URL 解析所有 URI
 * - **Relative URL resolution** — resolve all URIs against a base URL
 * - **自动版本检测** — 检测所需的协议版本
 * - **Automatic version detection** — detects required protocol version
 * - **完整 TypeScript 支持** — 完整的类型定义
 * - **Full TypeScript support** — complete type definitions
 *
 * @example Quick Start
 * ```typescript
 * import { parse } from '@skax/hls-parse';
 *
 * const playlist = parser(`#EXTM3U
 * #EXT-X-TARGETDURATION:10
 * #EXTINF:9.009,
 * segment.ts
 * #EXT-X-ENDLIST`);
 *
 * if (playlist.isMasterPlaylist) {
 *   console.log('Master:', playlist.variants.length);
 * } else {
 *   console.log('Media:', playlist.segments.length);
 * }
 * ```
 *
 * @example With URL Resolution
 * ```typescript
 * const playlist = parser(m3u8, {
 *   uri: 'https://example.com/hls/main.m3u8'
 * });
 * // All relative URIs are resolved to absolute
 * ```
 *
 * @module hls-parse
 * @packageDocumentation
 */

export { parser, default as default } from "./parse";
export { InvalidPlaylistError, resolveUrl } from "./utils";
export { isMasterPlaylist, isMediaPlaylist } from "./types";
export * as TAGS from "./constants";

export type {
  Playlist,
  MasterPlaylist,
  MediaPlaylist,
  Segment,
  PartialSegment,
  PrefetchSegment,
  Variant,
  Rendition,
  Key,
  MediaInitializationSection,
  Byterange,
  Resolution,
  DateRange,
  SpliceInfo,
  SessionData,
  ContentSteering,
  RenditionReport,
  StartData,
  LowLatencyCompatibility,
  AllowedCpc,
  UserAttribute,
  ExtInfo,
  ParserOptions,
  CustomTagParser,
} from "./types";
