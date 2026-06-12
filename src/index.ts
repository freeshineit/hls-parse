/**
 * @slax/hls-parse — A robust M3U8 / HLS playlist parser.
 *
 * Parses M3U8 playlists according to
 * {@link https://datatracker.ietf.org/doc/html/rfc8216 | RFC 8216} (HTTP Live Streaming).
 *
 * ## Features
 *
 * - **Master Playlists** — adaptive bitrate streaming, alternative renditions
 * - **Media Playlists** — segments, encryption keys, byte ranges, discontinuities
 * - **LL-HLS** — partial segments, preload hints, server control, skip, prefetch
 * - **Relative URL resolution** — resolve all URIs against a base URL
 * - **Automatic version detection** — detects required protocol version
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
