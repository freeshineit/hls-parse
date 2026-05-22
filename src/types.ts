/**
 * HLS Playlist Type Definitions
 *
 * Based on RFC 8216 (HTTP Live Streaming) and the LL-HLS (Low-Latency HLS) extensions.
 */

/** Media Initialization Section (EXT-X-MAP) */
export interface MediaInitializationSection {
  /** Whether this is a preload hint (LL-HLS) */
  hint?: boolean;
  /** URI to the initialization section resource */
  uri: string;
  /** Byte range within the resource */
  byterange?: Byterange;
}

/** Byte range specification */
export interface Byterange {
  /** Length of the byte range in bytes */
  length: number;
  /** Start offset from the beginning of the resource (optional, -1 if not present) */
  offset: number;
}

/** Resolution specification (width x height) */
export interface Resolution {
  width: number;
  height: number;
}

/** Encryption key information (EXT-X-KEY) */
export interface Key {
  /** Encryption method: NONE, AES-128, SAMPLE-AES */
  method: string;
  /** URI to obtain the key */
  uri?: string;
  /** Initialization Vector (128-bit) */
  iv?: Uint8Array;
  /** Key format (e.g., "identity") */
  format?: string;
  /** Key format versions */
  formatVersion?: string;
}

/** EXTINF tag data */
export interface ExtInfo {
  /** Segment duration in seconds */
  duration: number;
  /** Optional human-readable title */
  title?: string;
}

/** Partial segment (EXT-X-PART) for LL-HLS */
export interface PartialSegment {
  /** Whether this is a preload hint (EXT-X-PRELOAD-HINT) */
  hint?: boolean;
  /** URI to the partial segment */
  uri: string;
  /** Byte range within the resource */
  byterange?: Byterange;
  /** Duration in seconds */
  duration?: number;
  /** Whether this segment can be decoded independently */
  independent?: boolean;
  /** Whether this segment is a gap */
  gap?: boolean;
}

/** Prefetch segment (EXT-X-PREFETCH) for LL-HLS */
export interface PrefetchSegment {
  /** URI of the prefetch segment */
  uri: string;
  /** Media Sequence Number */
  mediaSequenceNumber: number;
  /** Discontinuity Sequence Number */
  discontinuitySequence: number;
  /** Whether this segment indicates a discontinuity */
  discontinuity?: boolean;
  /** Encryption key */
  key?: Key | null;
}

/** Media Segment */
export interface Segment {
  /** URI of the media segment */
  uri: string;
  /** Duration in seconds (from EXTINF) */
  duration?: number;
  /** Optional title (from EXTINF) */
  title?: string;
  /** Byte range within the resource */
  byterange?: Byterange;
  /** Media Sequence Number */
  mediaSequenceNumber: number;
  /** Discontinuity Sequence Number */
  discontinuitySequence: number;
  /** Whether this segment is a discontinuity */
  discontinuity?: boolean;
  /** Whether this segment is a gap (EXT-X-GAP) */
  gap?: boolean;
  /** Encryption key */
  key?: Key | null;
  /** Media Initialization Section (EXT-X-MAP) */
  map?: MediaInitializationSection | null;
  /** Program date/time */
  programDateTime?: Date;
  /** Date range metadata */
  dateRange?: DateRange;
  /** Splice/marker information */
  markers?: SpliceInfo[];
  /** Partial segments (LL-HLS) */
  parts?: PartialSegment[];
}

/** Date Range (EXT-X-DATERANGE) */
export interface DateRange {
  /** Unique identifier */
  id: string;
  /** Class name */
  classId?: string;
  /** Start date/time */
  start: Date;
  /** Cue information */
  cue?: string;
  /** End date/time */
  end?: Date;
  /** Duration in seconds */
  duration?: number;
  /** Planned duration in seconds */
  plannedDuration?: number;
  /** Whether this range ends on the next range of the same CLASS */
  endOnNext?: boolean;
  /** Custom attributes (X- and SCTE35- prefixed) */
  attributes?: Record<string, any>;
}

/** Splice/marker information */
export interface SpliceInfo {
  /** Type: OUT, IN, or RAW */
  type: 'OUT' | 'IN' | 'RAW';
  /** Duration (for OUT type) */
  duration?: number;
  /** Tag name (for RAW type) */
  tagName?: string;
  /** Raw value */
  value?: any;
}

/** Rendition (EXT-X-MEDIA) */
export interface Rendition {
  /** Media type: AUDIO, VIDEO, SUBTITLES, CLOSED-CAPTIONS */
  type: string;
  /** URI of the media playlist */
  uri?: string;
  /** Rendition group ID */
  groupId: string;
  /** Primary language */
  language?: string;
  /** Associated language */
  assocLanguage?: string;
  /** Human-readable name */
  name: string;
  /** Whether this is the default rendition */
  isDefault?: boolean;
  /** Whether this rendition can be auto-selected */
  autoselect?: boolean;
  /** Whether this rendition is forced (SUBTITLES only) */
  forced?: boolean;
  /** In-stream ID (CLOSED-CAPTIONS) */
  instreamId?: string;
  /** Characteristics (UTIs) */
  characteristics?: string;
  /** Audio channel information */
  channels?: string;
  /** Pathway ID (content steering) */
  pathwayId?: string;
}

/** Variant Stream (EXT-X-STREAM-INF / EXT-X-I-FRAME-STREAM-INF) */
export interface Variant {
  /** URI of the media playlist */
  uri: string;
  /** Peak bit rate in bits per second */
  bandwidth: number;
  /** Average bit rate in bits per second */
  averageBandwidth?: number;
  /** Variant score (for LL-HLS) */
  score?: number;
  /** Codec identifiers */
  codecs?: string;
  /** Optimal display resolution */
  resolution?: Resolution;
  /** Maximum frame rate */
  frameRate?: number;
  /** HDCP level */
  hdcpLevel?: string;
  /** Allowed CPC */
  allowedCpc?: AllowedCpc[];
  /** Video range (SDR, HLG, PQ) */
  videoRange?: string;
  /** Stable variant identifier */
  stableVariantId?: string;
  /** Pathway ID */
  pathwayId?: string;
  /** Program ID (deprecated) */
  programId?: number;
  /** Whether this is an I-frame variant */
  isIFrameOnly?: boolean;
  /** Audio renditions matching this variant's GROUP-ID */
  audio?: Rendition[];
  /** Video renditions matching this variant's GROUP-ID */
  video?: Rendition[];
  /** Subtitle renditions matching this variant's GROUP-ID */
  subtitles?: Rendition[];
  /** Closed-caption renditions matching this variant's GROUP-ID */
  closedCaptions?: Rendition[];
}

/** Allowed CPC entry */
export interface AllowedCpc {
  format: string;
  cpcList: string[];
}

/** Session Data (EXT-X-SESSION-DATA) */
export interface SessionData {
  /** Data identifier */
  id: string;
  /** Value (if inline) */
  value?: string;
  /** URI to JSON resource */
  uri?: string;
  /** Language */
  language?: string;
}

/** Content Steering (EXT-X-CONTENT-STEERING) */
export interface ContentSteering {
  /** Server URI for steering manifest */
  serverUri: string;
  /** Pathway ID to use */
  pathwayId?: string;
}

/** Rendition Report (EXT-X-RENDITION-REPORT) for LL-HLS */
export interface RenditionReport {
  /** URI of the rendition playlist (relative) */
  uri: string;
  /** Last Media Sequence Number */
  lastMSN?: number;
  /** Last Part index */
  lastPart?: number;
}

/** Start offset information (EXT-X-START) */
export interface StartData {
  /** Time offset in seconds (positive from start, negative from end) */
  offset: number;
  /** Whether to precisely seek to the offset */
  precise?: boolean;
}

/** LL-HLS compatibility information (EXT-X-SERVER-CONTROL) */
export interface LowLatencyCompatibility {
  /** Whether block reload is supported */
  canBlockReload: boolean;
  /** Maximum skip duration in seconds */
  canSkipUntil?: number;
  /** Minimum hold-back time in seconds */
  holdBack?: number;
  /** Minimum part hold-back time in seconds */
  partHoldBack?: number;
}

/** Tag parameter pair */
export type TagParam = [any, Record<string, any> | null];

/** User-defined attribute value */
export type UserAttribute = string | number | Uint8Array;

/**
 * Master Playlist
 *
 * Contains variant streams and renditions for adaptive bitrate streaming.
 */
export interface MasterPlaylist {
  /** The raw playlist source text */
  source?: string;
  /** Protocol compatibility version */
  version?: number;
  /** Whether independent segments are signaled */
  independentSegments?: boolean;
  /** Preferred start position */
  start?: StartData;
  /** Content steering configuration */
  contentSteering?: ContentSteering;
  /** Variable definitions (EXT-X-DEFINE) */
  defines?: Record<string, any>[];
  /** Session data entries */
  sessionDataList: SessionData[];
  /** Session keys */
  sessionKeyList: Key[];
  /** Variant streams */
  variants: Variant[];
  /** Type discriminator */
  isMasterPlaylist: true;
}

/**
 * Media Playlist
 *
 * Contains segments and metadata for playback.
 */
export interface MediaPlaylist {
  /** The raw playlist source text */
  source?: string;
  /** Protocol compatibility version */
  version?: number;
  /** Whether independent segments are signaled */
  independentSegments?: boolean;
  /** Preferred start position */
  start?: StartData;
  /** Variable definitions (EXT-X-DEFINE) */
  defines?: Record<string, any>[];
  /** Target duration in seconds */
  targetDuration?: number;
  /** Base media sequence number */
  mediaSequenceBase?: number;
  /** Base discontinuity sequence number */
  discontinuitySequenceBase?: number;
  /** Whether the playlist is complete */
  endlist?: boolean;
  /** Playlist type: EVENT, VOD, or undefined */
  playlistType?: string;
  /** Whether this is an I-frame only playlist */
  isIFrame?: boolean;
  /** LL-HLS server control */
  lowLatencyCompatibility?: LowLatencyCompatibility;
  /** LL-HLS partial segment target duration */
  partTargetDuration?: number;
  /** LL-HLS skipped segments (EXT-X-SKIP) */
  skip?: number;
  /** Media segments */
  segments: Segment[];
  /** Prefetch segments (LL-HLS) */
  prefetchSegments: PrefetchSegment[];
  /** Rendition reports (LL-HLS) */
  renditionReports: RenditionReport[];
  /** Date ranges in the playlist */
  dateRanges: DateRange[];
  /** Type discriminator */
  isMasterPlaylist: false;
}

/** Union type for any playlist */
export type Playlist = MasterPlaylist | MediaPlaylist;

/**
 * Options for parsing
 */
export interface ParseOptions {
  /**
   * Base URI for resolving relative URLs.
   * If provided, all relative URIs in the playlist will be resolved.
   */
  uri?: string;
}
