/**
 * hls-parse - A robust M3U8/HLS playlist parser
 *
 * Parses M3U8 playlists according to RFC 8216 (HTTP Live Streaming),
 * including support for:
 * - Master Playlists (adaptive bitrate streaming)
 * - Media Playlists (segments, encryption, etc.)
 * - LL-HLS / Low-Latency HLS (partial segments, preload hints, etc.)
 * - Relative URL resolution
 * - Automatic protocol version detection
 *
 * @packageDocumentation
 */

export { parse, default as default } from './parse';
export { InvalidPlaylistError, resolveUrl } from './utils';

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
  ParseOptions,
} from './types';
