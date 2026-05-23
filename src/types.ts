/**
 * HLS Playlist Type Definitions
 *
 * All types conforming to {@link https://datatracker.ietf.org/doc/html/rfc8216 | RFC 8216}
 * (HTTP Live Streaming) and LL-HLS (Low-Latency HLS) extensions.
 *
 * @remarks
 * All URIs in these types will be resolved to absolute when
 * {@link ParseOptions.uri} is provided to {@link parse}.
 *
 * @module types
 * @category Types
 */

/**
 * Media Initialization Section.
 *
 * Corresponds to the `#EXT-X-MAP` tag.
 * Contains the URI and optional byte range of the initialization resource
 * required to parse applicable Media Segments.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.5 | RFC 8216 §4.3.2.5}
 */
export interface MediaInitializationSection {
  /** Whether this is a preload hint (LL-HLS). */
  hint?: boolean;
  /** URI to the initialization section resource. */
  uri: string;
  /** Byte range within the resource. */
  byterange?: Byterange;
}

/**
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
  /** Length of the byte range in bytes. */
  length: number;
  /**
   * Start offset in bytes.
   *
   * @defaultValue `-1` (implicit offset)
   */
  offset: number;
}

/**
 * Display resolution.
 *
 * Corresponds to the `RESOLUTION` attribute value.
 *
 * @example `{ width: 1920, height: 1080 }` for `RESOLUTION=1920x1080`
 */
export interface Resolution {
  /** Horizontal pixel dimension. */
  width: number;
  /** Vertical pixel dimension. */
  height: number;
}

/**
 * Encryption / decryption key.
 *
 * Corresponds to `#EXT-X-KEY` and `#EXT-X-SESSION-KEY` tags.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.4 | RFC 8216 §4.3.2.4}
 */
export interface Key {
  /**
   * Encryption method.
   *
   * @remarks Valid values: `"NONE"`, `"AES-128"`, `"SAMPLE-AES"`.
   */
  method: string;
  /** URI to obtain the key file. */
  uri?: string;
  /**
   * Initialization Vector.
   *
   * @remarks Must be exactly 128 bits (16 bytes) when present.
   */
  iv?: Uint8Array;
  /**
   * Key format identifier.
   *
   * @defaultValue `"identity"`
   */
  format?: string;
  /** Key format version(s), separated by `/`. */
  formatVersion?: string;
}

/**
 * Parsed `#EXTINF` tag data.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.1 | RFC 8216 §4.3.2.1}
 */
export interface ExtInfo {
  /** Segment duration in seconds. */
  duration: number;
  /** Optional human-readable title. */
  title?: string;
}

/**
 * Partial segment for Low-Latency HLS.
 *
 * Corresponds to `#EXT-X-PART` and `#EXT-X-PRELOAD-HINT` (TYPE=PART) tags.
 *
 * @beta LL-HLS feature
 */
export interface PartialSegment {
  /** Whether this is a preload hint (`#EXT-X-PRELOAD-HINT`). */
  hint?: boolean;
  /** URI to the partial segment. */
  uri: string;
  /** Byte range within the resource. */
  byterange?: Byterange;
  /** Duration in seconds. */
  duration?: number;
  /** Whether this segment can be decoded independently. */
  independent?: boolean;
  /** Whether this segment is a gap. */
  gap?: boolean;
}

/**
 * Prefetch segment for Low-Latency HLS.
 *
 * Corresponds to the `#EXT-X-PREFETCH` tag.
 *
 * @beta LL-HLS feature
 */
export interface PrefetchSegment {
  /** URI of the prefetch segment. */
  uri: string;
  /** Media Sequence Number. */
  mediaSequenceNumber: number;
  /** Discontinuity Sequence Number. */
  discontinuitySequence: number;
  /** Whether this segment indicates a discontinuity. */
  discontinuity?: boolean;
  /** Encryption key (inherited from previous segment if not specified). */
  key?: Key | null;
}

/**
 * Media Segment.
 *
 * Represents a single segment in a Media Playlist, including all associated tags
 * (`#EXTINF`, `#EXT-X-KEY`, `#EXT-X-MAP`, `#EXT-X-BYTERANGE`, etc.).
 */
export interface Segment {
  /** URI of the media segment. */
  uri: string;
  /** Duration in seconds (from `#EXTINF`). */
  duration?: number;
  /** Optional title (from `#EXTINF`). */
  title?: string;
  /** Byte range within the resource (from `#EXT-X-BYTERANGE`). */
  byterange?: Byterange;
  /** Media Sequence Number. */
  mediaSequenceNumber: number;
  /** Discontinuity Sequence Number. */
  discontinuitySequence: number;
  /** Whether this segment is a discontinuity (`#EXT-X-DISCONTINUITY`). */
  discontinuity?: boolean;
  /** Whether this segment is a gap (`#EXT-X-GAP`). */
  gap?: boolean;
  /** Encryption key (`#EXT-X-KEY`). Inherited if not present. */
  key?: Key | null;
  /** Media Initialization Section (`#EXT-X-MAP`). Inherited if not present. */
  map?: MediaInitializationSection | null;
  /** Program date/time (`#EXT-X-PROGRAM-DATE-TIME`). */
  programDateTime?: Date;
  /** Date range metadata (`#EXT-X-DATERANGE`). */
  dateRange?: DateRange;
  /** Splice / marker information. */
  markers?: SpliceInfo[];
  /** Partial segments (LL-HLS `#EXT-X-PART` / `#EXT-X-PRELOAD-HINT`). */
  parts?: PartialSegment[];
}

/**
 * Date Range metadata.
 *
 * Corresponds to the `#EXT-X-DATERANGE` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.7 | RFC 8216 §4.3.2.7}
 */
export interface DateRange {
  /** Unique identifier. */
  id: string;
  /** CLASS name grouping ranges with shared semantics. */
  classId?: string;
  /** Start date/time. */
  start: Date;
  /** Cue information. */
  cue?: string;
  /** End date/time. */
  end?: Date;
  /** Duration in seconds. */
  duration?: number;
  /** Expected duration (when actual is not yet known). */
  plannedDuration?: number;
  /**
   * Whether this range ends at the start of the next range of the same CLASS.
   *
   * @remarks Cannot coexist with `duration` or `end`.
   */
  endOnNext?: boolean;
  /** Custom attributes (SCTE35- and X- prefixed). */
  attributes?: Record<string, any>;
}

/**
 * Splice / marker information.
 *
 * Carried by `#EXT-X-CUE-OUT`, `#EXT-X-CUE-IN`, and raw SCTE-35 tags.
 */
export interface SpliceInfo {
  /** Marker type. */
  type: "OUT" | "IN" | "RAW";
  /** Duration in seconds (for `OUT` type). */
  duration?: number;
  /** Original tag name (for `RAW` type). */
  tagName?: string;
  /** Raw tag value. */
  value?: any;
}

/**
 * Alternative Rendition.
 *
 * Corresponds to the `#EXT-X-MEDIA` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.1 | RFC 8216 §4.3.4.1}
 */
export interface Rendition {
  /** Media type: `"AUDIO"`, `"VIDEO"`, `"SUBTITLES"`, or `"CLOSED-CAPTIONS"`. */
  type: string;
  /** URI of the media playlist (optional for AUDIO/VIDEO). */
  uri?: string;
  /** Rendition group ID. */
  groupId: string;
  /** Primary language (RFC 5646 tag). */
  language?: string;
  /** Associated language (RFC 5646 tag). */
  assocLanguage?: string;
  /** Human-readable name. */
  name: string;
  /** Whether this is the default rendition. */
  isDefault?: boolean;
  /** Whether this can be auto-selected. */
  autoselect?: boolean;
  /** Whether this is forced (SUBTITLES only). */
  forced?: boolean;
  /**
   * In-stream ID.
   *
   * @remarks Required when `type` is `"CLOSED-CAPTIONS"`.
   * Valid: `"CC1"`-`"CC4"`, `"SERVICE1"`-`"SERVICE63"`.
   */
  instreamId?: string;
  /** Uniform Type Identifiers (UTIs), comma-separated. */
  characteristics?: string;
  /** Audio channel count and parameters. */
  channels?: string;
  /** Pathway ID for content steering. */
  pathwayId?: string;
}

/**
 * Variant Stream.
 *
 * Corresponds to `#EXT-X-STREAM-INF` or `#EXT-X-I-FRAME-STREAM-INF`.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.2 | RFC 8216 §4.3.4.2}
 */
export interface Variant {
  /** URI of the media playlist. */
  uri: string;
  /** Peak bit rate in bits per second. */
  bandwidth: number;
  /** Average bit rate in bits per second. */
  averageBandwidth?: number;
  /**
   * Variant SCORE (LL-HLS), used for prioritised playlist reload.
   *
   * @remarks If any variant has a SCORE, all variants SHOULD have one.
   */
  score?: number;
  /** Codec identifiers (RFC 6381). */
  codecs?: string;
  /** Optimal display resolution. */
  resolution?: Resolution;
  /** Maximum frame rate (rounded to 3 decimal places). */
  frameRate?: number;
  /** HDCP level: `"TYPE-0"` or `"NONE"`. */
  hdcpLevel?: string;
  /** Allowed Content Protection Configurations. */
  allowedCpc?: AllowedCpc[];
  /** Video range: `"SDR"`, `"HLG"`, or `"PQ"`. */
  videoRange?: string;
  /** Stable variant identifier. */
  stableVariantId?: string;
  /** Pathway ID for content steering. */
  pathwayId?: string;
  /** Program ID.
   *
   * @deprecated Removed in protocol version 6.
   */
  programId?: number;
  /** Whether this is an I-frame variant (`#EXT-X-I-FRAME-STREAM-INF`). */
  isIFrameOnly?: boolean;
  /** Audio renditions matching this variant's GROUP-ID. */
  audio?: Rendition[];
  /** Video renditions matching this variant's GROUP-ID. */
  video?: Rendition[];
  /** Subtitle renditions matching this variant's GROUP-ID. */
  subtitles?: Rendition[];
  /** Closed-caption renditions matching this variant's GROUP-ID. */
  closedCaptions?: Rendition[];
}

/**
 * Allowed Content Protection Configuration entry.
 *
 * Part of the `ALLOWED-CPC` attribute value.
 */
export interface AllowedCpc {
  /** Content protection format identifier. */
  format: string;
  /** List of Content Protection Configurations. */
  cpcList: string[];
}

/**
 * Session Data.
 *
 * Corresponds to the `#EXT-X-SESSION-DATA` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.4.4 | RFC 8216 §4.3.4.4}
 */
export interface SessionData {
  /** Data identifier (reverse-DNS recommended). */
  id: string;
  /** Inline value (mutually exclusive with `uri`). */
  value?: string;
  /** URI to a JSON resource (mutually exclusive with `value`). */
  uri?: string;
  /** Language of the value (RFC 5646 tag). */
  language?: string;
}

/**
 * Content Steering configuration.
 *
 * Corresponds to the `#EXT-X-CONTENT-STEERING` tag.
 */
export interface ContentSteering {
  /** Server URI for the steering manifest. */
  serverUri: string;
  /** Pathway ID to use. */
  pathwayId?: string;
}

/**
 * Rendition Report for Low-Latency HLS.
 *
 * Corresponds to the `#EXT-X-RENDITION-REPORT` tag.
 *
 * @beta LL-HLS feature
 */
export interface RenditionReport {
  /** URI of the rendition playlist (must be relative). */
  uri: string;
  /** Last Media Sequence Number. */
  lastMSN?: number;
  /** Last Part index. */
  lastPart?: number;
}

/**
 * Preferred start position.
 *
 * Corresponds to the `#EXT-X-START` tag.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.5.2 | RFC 8216 §4.3.5.2}
 */
export interface StartData {
  /**
   * Time offset in seconds.
   *
   * @remarks Positive = from beginning, negative = from end.
   */
  offset: number;
  /**
   * Whether to precisely seek to the TIME-OFFSET.
   *
   * @defaultValue `false`
   */
  precise?: boolean;
}

/**
 * Low-Latency HLS server control parameters.
 *
 * Corresponds to the `#EXT-X-SERVER-CONTROL` tag.
 *
 * @beta LL-HLS feature
 */
export interface LowLatencyCompatibility {
  /** Whether block reload is supported. */
  canBlockReload: boolean;
  /** Maximum skip duration in seconds. */
  canSkipUntil?: number;
  /** Minimum hold-back time in seconds. */
  holdBack?: number;
  /** Minimum part hold-back time in seconds. */
  partHoldBack?: number;
}

/**
 * Tag parameter tuple: `[value, attributes]`.
 *
 * @internal
 */
export type TagParam = [any, Record<string, any> | null];

/**
 * User-defined attribute value.
 *
 * @internal
 */
export type UserAttribute = string | number | Uint8Array;

/**
 * Master Playlist.
 *
 * Contains variant streams and renditions for adaptive bitrate streaming.
 *
 * @remarks
 * Type discriminator: `isMasterPlaylist === true`.
 *
 * @example
 * ```ts
 * import { parse } from '@skax/hls-parse';
 * const pl = parse(m3u8Content) as MasterPlaylist;
 * for (const v of pl.variants) {
 *   console.log(v.bandwidth, v.uri);
 * }
 * ```
 */
export interface MasterPlaylist {
  /** Type discriminator — always `true` for Master Playlist. */
  isMasterPlaylist: true;
  /** The raw playlist source text. */
  source?: string;
  /** Protocol compatibility version. */
  version?: number;
  /** Whether independent segments are signaled. */
  independentSegments?: boolean;
  /** Preferred start position. */
  start?: StartData;
  /** Content steering configuration. */
  contentSteering?: ContentSteering;
  /** Variable definitions (`#EXT-X-DEFINE`). */
  defines?: Record<string, any>[];
  /** Session data entries. */
  sessionDataList: SessionData[];
  /** Session keys. */
  sessionKeyList: Key[];
  /** Variant streams (`#EXT-X-STREAM-INF` / `#EXT-X-I-FRAME-STREAM-INF`). */
  variants: Variant[];
}

/**
 * Media Playlist.
 *
 * Contains segments and metadata for sequential playback.
 *
 * @remarks
 * Type discriminator: `isMasterPlaylist === false`.
 *
 * @example
 * ```ts
 * import { parse } from '@skax/hls-parse';
 * const pl = parse(m3u8Content) as MediaPlaylist;
 * for (const seg of pl.segments) {
 *   console.log(seg.uri, seg.duration);
 * }
 * ```
 */
export interface MediaPlaylist {
  /** Type discriminator — always `false` for Media Playlist. */
  isMasterPlaylist: false;
  /** The raw playlist source text. */
  source?: string;
  /** Protocol compatibility version. */
  version?: number;
  /** Whether independent segments are signaled. */
  independentSegments?: boolean;
  /** Preferred start position. */
  start?: StartData;
  /** Variable definitions (`#EXT-X-DEFINE`). */
  defines?: Record<string, any>[];
  /** Maximum segment duration in seconds (`#EXT-X-TARGETDURATION`). */
  targetDuration?: number;
  /** Base media sequence number. */
  mediaSequenceBase?: number;
  /** Base discontinuity sequence number. */
  discontinuitySequenceBase?: number;
  /** Whether the playlist is complete (`#EXT-X-ENDLIST`). */
  endlist?: boolean;
  /** Playlist type: `"EVENT"` or `"VOD"`. */
  playlistType?: string;
  /** Whether this is an I-frame only playlist. */
  isIFrame?: boolean;
  /** LL-HLS server control parameters. */
  lowLatencyCompatibility?: LowLatencyCompatibility;
  /** Partial segment target duration (LL-HLS). */
  partTargetDuration?: number;
  /** Number of skipped segments (LL-HLS `#EXT-X-SKIP`). */
  skip?: number;
  /** Media segments. */
  segments: Segment[];
  /** Prefetch segments (LL-HLS). */
  prefetchSegments: PrefetchSegment[];
  /** Rendition reports (LL-HLS). */
  renditionReports: RenditionReport[];
  /** Date ranges in the playlist. */
  dateRanges: DateRange[];
}

/**
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
 * Options for the {@link parse} function.
 */
export interface ParseOptions {
  /**
   * Base URI for resolving relative URLs in the playlist.
   *
   * @remarks
   * If provided, all relative URIs (segment URIs, key URIs, map URIs,
   * variant URIs, etc.) will be resolved to absolute URLs.
   *
   * @example
   * ```ts
   * const pl = parse(m3u8, { uri: 'https://example.com/hls/main.m3u8' });
   * // pl.segments[0].uri → 'https://example.com/hls/segment.ts'
   * ```
   */
  uri?: string;
}

// ============================================================================
// Type guard helpers
// ============================================================================

/**
 * Type guard: returns `true` if the parsed playlist is a Master Playlist.
 *
 * @example
 * ```ts
 * const pl = parse(m3u8);
 * if (isMasterPlaylist(pl)) {
 *   pl.variants; // ← narrowed to MasterPlaylist
 * }
 * ```
 */
export function isMasterPlaylist(pl: Playlist): pl is MasterPlaylist {
  return pl.isMasterPlaylist === true;
}

/**
 * Type guard: returns `true` if the parsed playlist is a Media Playlist.
 *
 * @example
 * ```ts
 * const pl = parse(m3u8);
 * if (isMediaPlaylist(pl)) {
 *   pl.segments; // ← narrowed to MediaPlaylist
 * }
 * ```
 */
export function isMediaPlaylist(pl: Playlist): pl is MediaPlaylist {
  return pl.isMasterPlaylist === false;
}
