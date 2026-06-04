/**
 * HLS / M3U8 Playlist Parser
 *
 * Parses M3U8 playlists according to RFC 8216 (HTTP Live Streaming),
 * including support for:
 * - Master Playlists (EXT-X-STREAM-INF, EXT-X-I-FRAME-STREAM-INF, etc.)
 * - Media Playlists (Media Segments, Encryption Keys, etc.)
 * - LL-HLS / Low-Latency HLS (EXT-X-PART, EXT-X-PRELOAD-HINT,
 *   EXT-X-SERVER-CONTROL, EXT-X-SKIP, EXT-X-RENDITION-REPORT, etc.)
 * - Relative URL resolution
 * - Automatic protocol version detection
 * - Variable substitution (EXT-X-DEFINE)
 *
 * Usage:
 *   import { parse } from '@skax/hls-parse';
 *   const playlist = parser(m3u8Content);
 *   // With URL resolution:
 *   const playlist = parser(m3u8Content, { uri: 'https://example.com/playlist.m3u8' });
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8216
 */

import {
  AllowedCpc,
  Byterange,
  ContentSteering,
  DateRange,
  ExtInfo,
  Key,
  LowLatencyCompatibility,
  MasterPlaylist,
  MediaInitializationSection,
  MediaPlaylist,
  ParserOptions,
  PartialSegment,
  PrefetchSegment,
  Rendition,
  RenditionReport,
  Resolution,
  Segment,
  SessionData,
  SpliceInfo,
  StartData,
  TagParam,
  UserAttribute,
  Variant,
} from "./types";
import * as utils from "./utils";
import * as T from "./constants";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Internal tag category for grouping tags */
type TagCategory = "Basic" | "Segment" | "MasterPlaylist" | "MediaPlaylist" | "MediaorMasterPlaylist" | "Unknown";

/** Parsed tag representation */
interface Tag {
  name: string;
  category: TagCategory;
  value: any;
  attributes: Record<string, any>;
}

/** A line in the playlist - either a parsed tag or a URI string */
type Line = string | Tag;

/** Internal parsing state */
interface ParseState {
  isMasterPlaylist?: boolean;
  hasMap: boolean;
  targetDuration: number;
  compatibleVersion: number;
  isClosedCaptionsNone: boolean;
  hash: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Tag category classification
// ---------------------------------------------------------------------------

/**
 * Determines the category of an HLS tag based on RFC 8216.
 * Categories determine which playlist type the tag belongs to.
 *
 * 根据 RFC 8216 判断 HLS tag 的分类。
 * 分类决定了该 tag 属于哪种播放列表类型。
 */
function getTagCategory(tagName: string): TagCategory {
  switch (tagName) {
    // ── Basic Tags ──────────────────────────────────────────────
    case T.EXTM3U:
    case T.EXT_X_VERSION:
    case T.EXT_X_CONTENT_STEERING:
      return "Basic";

    // ── Media Segment Tags ──────────────────────────────────────
    case T.EXTINF:
    case T.EXT_X_BYTERANGE:
    case T.EXT_X_DISCONTINUITY:
    case T.EXT_X_PREFETCH_DISCONTINUITY:
    case T.EXT_X_KEY:
    case T.EXT_X_MAP:
    case T.EXT_X_PROGRAM_DATE_TIME:
    case T.EXT_X_DATERANGE:
    case T.EXT_X_CUE_OUT:
    case T.EXT_X_CUE_IN:
    case T.EXT_X_CUE_OUT_CONT:
    case T.EXT_X_CUE:
    case T.EXT_OATCLS_SCTE35:
    case T.EXT_X_ASSET:
    case T.EXT_X_SCTE35:
    case T.EXT_X_PART:
    case T.EXT_X_PRELOAD_HINT:
    case T.EXT_X_GAP:
      return "Segment";

    // -- Custom tags
    case T.EXT_X_DEVICE_TIME:
      return "Segment";

    // -- RFC 8216bis
    case T.EXT_X_BITRATE:
      return "MediaPlaylist";

    // ── Media Playlist Tags ─────────────────────────────────────
    case T.EXT_X_TARGETDURATION:
    case T.EXT_X_MEDIA_SEQUENCE:
    case T.EXT_X_DISCONTINUITY_SEQUENCE:
    case T.EXT_X_ENDLIST:
    case T.EXT_X_PLAYLIST_TYPE:
    case T.EXT_X_I_FRAMES_ONLY:
    case T.EXT_X_SERVER_CONTROL:
    case T.EXT_X_PART_INF:
    case T.EXT_X_PREFETCH:
    case T.EXT_X_RENDITION_REPORT:
    case T.EXT_X_SKIP:
      return "MediaPlaylist";

    // ── Master Playlist Tags ────────────────────────────────────
    case T.EXT_X_MEDIA:
    case T.EXT_X_STREAM_INF:
    case T.EXT_X_I_FRAME_STREAM_INF:
    case T.EXT_X_SESSION_DATA:
    case T.EXT_X_SESSION_KEY:
      return "MasterPlaylist";

    // ── Media-or-Master Tags ────────────────────────────────────
    case T.EXT_X_INDEPENDENT_SEGMENTS:
    case T.EXT_X_START:
    case T.EXT_X_DEFINE:
      return "MediaorMasterPlaylist";

    default:
      // 未知标签 — 按 RFC 8216 要求应忽略 / Unknown tag — MUST be ignored per RFC
      return "Unknown";
  }
}

// ---------------------------------------------------------------------------
// Tag parameter parsers
// ---------------------------------------------------------------------------

/**
 * Parses the EXTINF tag value.
 * Format: #EXTINF:<duration>,[<title>]
 *
 * The title field may contain percent-encoded UTF-8 characters.
 * We use encodeURIComponent + decodeURIComponent for safe decoding
 * (replaces the deprecated escape() function).
 */
function parseEXTINF(param: string): ExtInfo {
  const pair = utils.splitAt(param, ",") as [string, string];
  return {
    duration: utils.toNumber(pair[0]),
    title: pair[1] ? decodeURIComponent(encodeURIComponent(pair[1])) : undefined,
  };
}

/**
 * Parses the EXT-X-BYTERANGE tag value.
 * Format: #EXT-X-BYTERANGE:<n>[@<o>]
 */
function parseBYTERANGE(param: string): Byterange {
  const pair = utils.splitAt(param, "@");
  return {
    length: utils.toNumber(pair[0]),
    offset: pair[1] ? utils.toNumber(pair[1]) : -1,
  };
}

/**
 * Parses a resolution string "widthxheight".
 */
function parseResolution(str: string): Resolution {
  const pair = utils.splitAt(str, "x") as [string, string];
  return {
    width: utils.toNumber(pair[0]),
    height: utils.toNumber(pair[1]),
  };
}

/**
 * Parses ALLOWED-CPC attribute value.
 */
function parseAllowedCpc(str: string): AllowedCpc[] {
  const message = "ALLOWED-CPC: Each entry must consist of KEYFORMAT and Content Protection Configuration";
  const list = str.split(",");
  const allowedCpcList: AllowedCpc[] = [];
  for (const item of list) {
    const [format, cpcText] = utils.splitAt(item, ":");
    if (!format || !cpcText) {
      utils.INVALIDPLAYLIST(message);
      continue;
    }
    allowedCpcList.push({ format, cpcList: cpcText.split("/") });
  }
  return allowedCpcList;
}

/**
 * Parses an Initialization Vector from a hex string.
 * Must be exactly 128 bits (16 bytes).
 */
function parseIV(str: string): Uint8Array {
  const iv = utils.hexToByteSequence(str);
  if (iv.length !== 16) {
    utils.INVALIDPLAYLIST("IV must be a 128-bit unsigned integer");
  }
  return iv;
}

/**
 * Parses a user-defined attribute value (X- prefixed).
 * Can be a quoted string, hex sequence, or number.
 */
function parseUserAttribute(str: string): UserAttribute {
  if (str.startsWith('"')) {
    return utils.trim(str, '"')!;
  }
  if (str.startsWith("0x") || str.startsWith("0X")) {
    return utils.hexToByteSequence(str);
  }
  return utils.toNumber(str);
}

/**
 * Updates compatible version based on Key attributes.
 */
function setCompatibleVersionOfKey(params: ParseState, attributes: Record<string, any>) {
  if (attributes["IV"] && params.compatibleVersion < 2) {
    params.compatibleVersion = 2;
  }
  if ((attributes["KEYFORMAT"] || attributes["KEYFORMATVERSIONS"]) && params.compatibleVersion < 5) {
    params.compatibleVersion = 5;
  }
}

/**
 * Parses an attribute list (comma-separated key=value pairs).
 * This handles all the attribute types defined in RFC 8216 Section 4.2.
 */
function parseAttributeList(param: string): Record<string, any> {
  const attributes: Record<string, any> = {};
  for (const item of utils.splitByCommaWithPreservingQuotes(param)) {
    const [key, value] = utils.splitAt(item, "=");
    const val = utils.trim(value, '"')!;
    switch (key) {
      case "URI":
        attributes[key] = val;
        break;
      case "START-DATE":
      case "END-DATE":
        attributes[key] = new Date(val);
        break;
      case "IV":
        attributes[key] = parseIV(val);
        break;
      case "BYTERANGE":
        attributes[key] = parseBYTERANGE(val);
        break;
      case "RESOLUTION":
        attributes[key] = parseResolution(val);
        break;
      case "ALLOWED-CPC":
        attributes[key] = parseAllowedCpc(val);
        break;
      case "END-ON-NEXT":
      case "DEFAULT":
      case "AUTOSELECT":
      case "FORCED":
      case "PRECISE":
      case "CAN-BLOCK-RELOAD":
      case "INDEPENDENT":
      case "GAP":
        attributes[key] = val === "YES";
        break;
      case "DURATION":
      case "PLANNED-DURATION":
      case "BANDWIDTH":
      case "AVERAGE-BANDWIDTH":
      case "FRAME-RATE":
      case "TIME-OFFSET":
      case "CAN-SKIP-UNTIL":
      case "HOLD-BACK":
      case "PART-HOLD-BACK":
      case "PART-TARGET":
      case "BYTERANGE-START":
      case "BYTERANGE-LENGTH":
      case "LAST-MSN":
      case "LAST-PART":
      case "SKIPPED-SEGMENTS":
      case "SCORE":
      case "PROGRAM-ID":
        attributes[key] = utils.toNumber(val);
        break;
      default:
        if (key.startsWith("SCTE35-")) {
          attributes[key] = utils.hexToByteSequence(val);
        } else if (key.startsWith("X-")) {
          attributes[key] = parseUserAttribute(value!);
        } else {
          if (key === "VIDEO-RANGE" && val !== "SDR" && val !== "HLG" && val !== "PQ") {
            utils.INVALIDPLAYLIST(`VIDEO-RANGE: unknown value "${val}"`);
          }
          attributes[key] = val;
        }
    }
  }
  return attributes;
}

/**
 * Splits a tag line into name and parameter.
 * Format: #EXT-TAG-NAME:parameter or #EXT-TAG-NAME
 */
function splitTag(line: string): [string, string | null] {
  const index = line.indexOf(":");
  if (index === -1) {
    return [line.slice(1).trim(), null];
  }
  return [line.slice(1, index).trim(), line.slice(index + 1).trim()];
}

/**
 * Parses a tag's parameters into a structured [value, attributes] pair.
 * Different tags have different parameter formats.
 */
function parseTagParam(name: string, param: string | null): TagParam {
  if (param === null) {
    return [null, null];
  }

  switch (name) {
    case T.EXTM3U:
    case T.EXT_X_DISCONTINUITY:
    case T.EXT_X_ENDLIST:
    case T.EXT_X_I_FRAMES_ONLY:
    case T.EXT_X_INDEPENDENT_SEGMENTS:
    case T.EXT_X_CUE_IN:
    case T.EXT_X_GAP:
      return [null, null];
    case T.EXT_X_VERSION:
    case T.EXT_X_TARGETDURATION:
    case T.EXT_X_MEDIA_SEQUENCE:
    case T.EXT_X_DISCONTINUITY_SEQUENCE:
    case T.EXT_X_BITRATE:
      return [utils.toNumber(param), null];
    case T.EXT_X_DEVICE_TIME:
      return [param, null];
    case T.EXT_X_CUE_OUT:
      // For backwards compatibility: attributes list is optional.
      // If only a number is found, use it as the duration.
      if (!Number.isNaN(Number(param))) {
        return [utils.toNumber(param), null];
      }
      // If attributes are found, parse them (e.g., DURATION=...)
      return [null, parseAttributeList(param)];
    case T.EXT_X_KEY:
    case T.EXT_X_MAP:
    case T.EXT_X_DATERANGE:
    case T.EXT_X_MEDIA:
    case T.EXT_X_STREAM_INF:
    case T.EXT_X_I_FRAME_STREAM_INF:
    case T.EXT_X_SESSION_DATA:
    case T.EXT_X_SESSION_KEY:
    case T.EXT_X_START:
    case T.EXT_X_SERVER_CONTROL:
    case T.EXT_X_PART_INF:
    case T.EXT_X_PART:
    case T.EXT_X_PRELOAD_HINT:
    case T.EXT_X_RENDITION_REPORT:
    case T.EXT_X_SKIP:
    case T.EXT_X_DEFINE:
    case T.EXT_X_CONTENT_STEERING:
      return [null, parseAttributeList(param)];
    case T.EXTINF:
      return [parseEXTINF(param), null];
    case T.EXT_X_BYTERANGE:
      return [parseBYTERANGE(param), null];
    case T.EXT_X_PROGRAM_DATE_TIME:
      // 不对时间进行处理
      return [param, null];
    case T.EXT_X_PLAYLIST_TYPE:
      return [param, null]; // <EVENT|VOD>
    default:
      return [param, null]; // Unknown tag - return raw value
  }
}

/**
 * Throws a mixed tags error when a playlist contains both
 * media and master playlist tags.
 *
 * 当播放列表同时包含 Media 和 Master 标签时抛出混合标签错误。
 */
function MIXEDTAGS() {
  utils.INVALIDPLAYLIST("The file contains both media and master playlist tags.");
}

// ---------------------------------------------------------------------------
// Tag line parsing
// ---------------------------------------------------------------------------

/**
 * Parses a single tag line and determines its category.
 *
 * 解析单个 tag 行并判断其分类。
 */
function parseTag(line: string, params: ParseState): Tag | null {
  const [name, param] = splitTag(line);
  const category = getTagCategory(name);
  CHECKTAGCATEGORY(category, params);
  if (category === "Unknown") {
    return null; // RFC 8216: unrecognized tags MUST be ignored / 未识别标签必须忽略
  }
  // Media playlist tags (except RENDITION-REPORT and PREFETCH) must be unique
  // 媒体播放列表标签（RENDITION-REPORT 和 PREFETCH 除外）同一类型只能出现一次
  if (category === "MediaPlaylist" && name !== T.EXT_X_RENDITION_REPORT && name !== T.EXT_X_PREFETCH) {
    if (params.hash[name]) {
      utils.INVALIDPLAYLIST("There MUST NOT be more than one Media Playlist tag of each type in any Media Playlist");
    }
    params.hash[name] = true;
  }
  const [value, attributes] = parseTagParam(name, param);
  return { name, category, value, attributes: attributes || {} };
}

/**
 * Checks that the tag category is consistent with the playlist type.
 * Ensures master and media tags aren't mixed.
 *
 * 检查 tag 分类是否与播放列表类型一致。
 * 确保 Master 和 Media 标签不会混用。
 *
 * Logic / 逻辑:
 *   - Segment / MediaPlaylist → 设定 isMasterPlaylist = false
 *   - MasterPlaylist          → 设定 isMasterPlaylist = true
 *   - 如果已设定为相反类型 → 抛出 MIXEDTAGS 错误
 *   - Basic / MediaorMasterPlaylist / Unknown → 不改变判定
 */
function CHECKTAGCATEGORY(category: TagCategory, params: ParseState) {
  if (category === "Segment" || category === "MediaPlaylist") {
    // 媒体标签 → 判定为 Media Playlist
    if (params.isMasterPlaylist === undefined) {
      params.isMasterPlaylist = false;
      return;
    }
    if (params.isMasterPlaylist) {
      MIXEDTAGS(); // 之前判定为 Master，现在出现媒体标签 → 混用
    }
    return;
  }
  if (category === "MasterPlaylist") {
    // 主播放列表标签 → 判定为 Master Playlist
    if (params.isMasterPlaylist === undefined) {
      params.isMasterPlaylist = true;
      return;
    }
    if (params.isMasterPlaylist === false) {
      MIXEDTAGS(); // 之前判定为 Media，现在出现主列表标签 → 混用
    }
  }
  // Basic / MediaorMasterPlaylist / Unknown → 不改变类型判定
}

// ---------------------------------------------------------------------------
// Lexical analysis (line-by-line parsing)
// ---------------------------------------------------------------------------

/**
 * Performs the initial lexical parsing of the raw playlist text.
 * Splits into lines, categorizes tags, and returns an array of Lines.
 */
function lexicalParser(text: string, params: ParseState): Line[] {
  const lines: Line[] = [];

  // Strip UTF-8 BOM if present (RFC 8216 §4.1: MUST NOT contain BOM)
  let normalized = text;
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }

  // Split by common line endings
  const rawLines = normalized.split(/\r?\n/);

  for (const l of rawLines) {
    // Trim whitespace (V8 optimization: create a new string)
    const line = l.trim();
    if (!line) {
      // Empty line - skip
      continue;
    }

    if (line.startsWith("#")) {
      if (line.startsWith("#EXT")) {
        // Tag line
        const tag = parseTag(line, params);
        if (tag) {
          lines.push(tag);
        }
      }
      // Comment line (##... or other) - skip
      continue;
    }
    // URI line
    lines.push(line);
  }

  // Validate that the first line is EXTM3U
  if (lines.length === 0 || typeof lines[0] !== "object" || (lines[0] as Tag).name !== T.EXTM3U) {
    utils.INVALIDPLAYLIST("The EXTM3U tag MUST be the first line.");
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Master Playlist parsing
// ---------------------------------------------------------------------------

/**
 * Parses a Rendition from an EXT-X-MEDIA tag.
 */
function parseRendition(tag: Tag): Rendition {
  const attrs = tag.attributes;
  return {
    type: attrs["TYPE"],
    uri: attrs["URI"],
    groupId: attrs["GROUP-ID"],
    language: attrs["LANGUAGE"],
    assocLanguage: attrs["ASSOC-LANGUAGE"],
    name: attrs["NAME"],
    isDefault: attrs["DEFAULT"],
    autoselect: attrs["AUTOSELECT"],
    forced: attrs["FORCED"],
    instreamId: attrs["INSTREAM-ID"],
    characteristics: attrs["CHARACTERISTICS"],
    channels: attrs["CHANNELS"],
    pathwayId: attrs["PATHWAY-ID"],
  };
}

/**
 * Validates that variant attributes reference valid rendition groups.
 */
function matchTypes(attrs: Record<string, any>, variant: Variant, params: ParseState) {
  for (const type of ["AUDIO", "VIDEO", "SUBTITLES", "CLOSED-CAPTIONS"]) {
    if (type === "CLOSED-CAPTIONS" && attrs[type] === "NONE") {
      params.isClosedCaptionsNone = true;
      (variant as any).closedCaptions = [];
    } else if (attrs[type]) {
      const key = utils.camelify(type) as keyof Variant;
      const renditions = (variant[key] as Rendition[]) || [];
      if (renditions.length > 0 && !renditions.some((item) => item.groupId === attrs[type])) {
        utils.INVALIDPLAYLIST(`${type} attribute MUST match the value of the GROUP-ID attribute of an EXT-X-MEDIA tag whose TYPE attribute is ${type}.`);
      }
    }
  }
}

/**
 * Parses a Variant Stream from EXT-X-STREAM-INF or EXT-X-I-FRAME-STREAM-INF.
 *
 * @param mediaGroups — pre-indexed Map<TYPE, Map<GROUP-ID, Rendition[]>>
 */
function parseVariant(variantAttrs: Record<string, any>, uri: string, iFrameOnly: boolean, params: ParseState, mediaGroups: Map<string, Map<string, Rendition[]>>): Variant {
  const variant: Variant = {
    uri,
    bandwidth: variantAttrs["BANDWIDTH"],
    averageBandwidth: variantAttrs["AVERAGE-BANDWIDTH"],
    score: variantAttrs["SCORE"],
    codecs: variantAttrs["CODECS"],
    resolution: variantAttrs["RESOLUTION"],
    frameRate: variantAttrs["FRAME-RATE"],
    hdcpLevel: variantAttrs["HDCP-LEVEL"],
    allowedCpc: variantAttrs["ALLOWED-CPC"],
    videoRange: variantAttrs["VIDEO-RANGE"],
    stableVariantId: variantAttrs["STABLE-VARIANT-ID"],
    pathwayId: variantAttrs["PATHWAY-ID"] || variantAttrs["STABLE-PATHWAY-ID"],
    programId: variantAttrs["PROGRAM-ID"],
    isIFrameOnly: iFrameOnly,
  };

  // Attach matching renditions using pre-indexed map (O(1) per group)
  for (const type of ["AUDIO", "VIDEO", "SUBTITLES", "CLOSED-CAPTIONS"]) {
    const attrsGroupId = variantAttrs[type];
    if (!attrsGroupId) continue;
    const typeMap = mediaGroups.get(type);
    if (!typeMap) continue;
    const renditions = typeMap.get(attrsGroupId);
    if (renditions) {
      for (const r of renditions) {
        addRenditionToList(variant, r, type);
      }
    }
  }

  matchTypes(variantAttrs, variant, params);
  return variant;
}

/** Add an already-parsed Rendition to a variant's list */
function addRenditionToList(variant: Variant, rendition: Rendition, type: string) {
  const key = utils.camelify(type) as keyof Variant;
  let renditions = variant[key] as Rendition[] | undefined;
  if (!renditions) {
    renditions = [];
    (variant as any)[key] = renditions;
  }
  renditions.push(rendition);
}

/**
 * Compares two Key objects for equality.
 */
function sameKey(key1: Key, key2: Key): boolean {
  if (key1.method !== key2.method) return false;
  if (key1.uri !== key2.uri) return false;
  if (key1.iv) {
    if (!key2.iv) return false;
    if (key1.iv.byteLength !== key2.iv.byteLength) return false;
    for (let i = 0; i < key1.iv.byteLength; i++) {
      if (key1.iv[i] !== key2.iv[i]) return false;
    }
  } else if (key2.iv) {
    return false;
  }
  if (key1.format !== key2.format) return false;
  if (key1.formatVersion !== key2.formatVersion) return false;
  return true;
}

/**
 * Pre-index EXT-X-MEDIA tags into Map<TYPE, Map<GROUP-ID, Rendition[]>>.
 * This allows O(1) lookup when attaching renditions to variants,
 * replacing the previous O(V × N) per-variant scan.
 */
function buildMediaGroupIndex(lines: Line[]): Map<string, Map<string, Rendition[]>> {
  const index = new Map<string, Map<string, Rendition[]>>();
  for (const line of lines) {
    if (typeof line === "object" && line.name === T.EXT_X_MEDIA) {
      const rendition = parseRendition(line);
      const type = rendition.type;
      const groupId = rendition.groupId;
      if (!type || !groupId) {
        utils.INVALIDPLAYLIST("EXT-X-MEDIA TYPE attribute is REQUIRED.");
      }
      let typeMap = index.get(type);
      if (!typeMap) {
        typeMap = new Map();
        index.set(type, typeMap);
      }
      let group = typeMap.get(groupId);
      if (!group) {
        group = [];
        typeMap.set(groupId, group);
      }
      // Validate uniqueness (same GROUP, same NAME)
      if (group.some((r) => r.name === rendition.name)) {
        utils.INVALIDPLAYLIST("All EXT-X-MEDIA tags in the same Group MUST have different NAME attributes.");
      }
      // Validate only one DEFAULT per group
      if (rendition.isDefault && group.some((r) => r.isDefault)) {
        utils.INVALIDPLAYLIST("A Group MUST NOT have more than one member with a DEFAULT attribute of YES.");
      }
      group.push(rendition);
    }
  }
  return index;
}

/**
 * Parses a Master Playlist (contains EXT-X-STREAM-INF, EXT-X-MEDIA, etc.).
 */
function parseMasterPlaylist(lines: Line[], params: ParseState): MasterPlaylist {
  const playlist: MasterPlaylist = {
    isMasterPlaylist: true,
    variants: [],
    sessionDataList: [],
    sessionKeyList: [],
  };

  // Pre-index EXT-X-MEDIA tags into Map<TYPE, Map<GROUP-ID, Rendition[]>>
  // This avoids O(V×N) scanning in parseVariant.
  const mediaGroups = buildMediaGroupIndex(lines);

  let variantIsScored = false;

  for (const [index, line] of lines.entries()) {
    if (typeof line === "string") continue;
    const { name, value, attributes } = line;

    if (name === T.EXT_X_VERSION) {
      playlist.version = value;
    } else if (name === T.EXT_X_CONTENT_STEERING) {
      playlist.contentSteering = {
        serverUri: attributes["SERVER-URI"],
        pathwayId: attributes["PATHWAY-ID"],
      };
    } else if (name === T.EXT_X_STREAM_INF) {
      const uriLine = lines[index + 1];
      if (typeof uriLine !== "string" || uriLine.startsWith("#")) {
        utils.INVALIDPLAYLIST("EXT-X-STREAM-INF must be followed by a URI line");
      }
      const variant = parseVariant(attributes, uriLine as string, false, params, mediaGroups);
      if (typeof variant.score === "number") {
        variantIsScored = true;
        if (variant.score < 0) {
          utils.INVALIDPLAYLIST("SCORE attribute on EXT-X-STREAM-INF must be a positive decimal-floating-point number.");
        }
      }
      playlist.variants.push(variant);
    } else if (name === T.EXT_X_I_FRAME_STREAM_INF) {
      const variant = parseVariant(attributes, attributes.URI, true, params, mediaGroups);
      playlist.variants.push(variant);
    } else if (name === T.EXT_X_SESSION_DATA) {
      const sessionData: SessionData = {
        id: attributes["DATA-ID"],
        value: attributes["VALUE"],
        uri: attributes["URI"],
        language: attributes["LANGUAGE"],
      };
      if (playlist.sessionDataList.some((item) => item.id === sessionData.id && item.language === sessionData.language)) {
        utils.INVALIDPLAYLIST("A Playlist MUST NOT contain more than one EXT-X-SESSION-DATA tag with the same DATA-ID attribute and the same LANGUAGE attribute.");
      }
      playlist.sessionDataList.push(sessionData);
    } else if (name === T.EXT_X_SESSION_KEY) {
      if (attributes["METHOD"] === "NONE") {
        utils.INVALIDPLAYLIST("EXT-X-SESSION-KEY: The value of the METHOD attribute MUST NOT be NONE");
      }
      const sessionKey: Key = {
        method: attributes["METHOD"],
        uri: attributes["URI"],
        iv: attributes["IV"],
        format: attributes["KEYFORMAT"],
        formatVersion: attributes["KEYFORMATVERSIONS"],
      };
      if (playlist.sessionKeyList.some((item) => sameKey(item, sessionKey))) {
        utils.INVALIDPLAYLIST("A Master Playlist MUST NOT contain more than one EXT-X-SESSION-KEY tag with the same METHOD, URI, IV, KEYFORMAT, and KEYFORMATVERSIONS attribute values.");
      }
      setCompatibleVersionOfKey(params, attributes);
      playlist.sessionKeyList.push(sessionKey);
    } else if (name === T.EXT_X_INDEPENDENT_SEGMENTS) {
      if (playlist.independentSegments) {
        utils.INVALIDPLAYLIST("EXT-X-INDEPENDENT-SEGMENTS tag MUST NOT appear more than once in a Playlist");
      }
      playlist.independentSegments = true;
    } else if (name === T.EXT_X_START) {
      if (playlist.start) {
        utils.INVALIDPLAYLIST("EXT-X-START tag MUST NOT appear more than once in a Playlist");
      }
      if (typeof attributes["TIME-OFFSET"] !== "number") {
        utils.INVALIDPLAYLIST("EXT-X-START: TIME-OFFSET attribute is REQUIRED");
      }
      playlist.start = {
        offset: attributes["TIME-OFFSET"],
        precise: attributes["PRECISE"] || false,
      };
    } else if (name === T.EXT_X_DEFINE) {
      if (!playlist.defines) playlist.defines = [];
      playlist.defines.push(attributes);
    }
  }

  // Validate scores: if any variant has a score, all should
  if (variantIsScored) {
    for (const variant of playlist.variants) {
      if (typeof variant.score !== "number") {
        utils.INVALIDPLAYLIST("If any Variant Stream contains the SCORE attribute, then all Variant Streams in the Master Playlist SHOULD have a SCORE attribute");
      }
    }
  }

  // Validate closed-captions consistency
  if (params.isClosedCaptionsNone) {
    for (const variant of playlist.variants) {
      const cc = variant.closedCaptions;
      if (cc && cc.length > 0) {
        utils.INVALIDPLAYLIST("If there is a variant with CLOSED-CAPTIONS attribute of NONE, all EXT-X-STREAM-INF tags MUST have this attribute with a value of NONE");
      }
    }
  }

  return playlist;
}

// ---------------------------------------------------------------------------
// Media Playlist parsing
// ---------------------------------------------------------------------------

/**
 * Parses an EXT-X-DATERANGE tag's attributes into a DateRange object.
 */
function parseDateRange(attributes: Record<string, any>): DateRange {
  const attrs: Record<string, any> = {};
  for (const key of Object.keys(attributes)) {
    if (key.startsWith("SCTE35-") || key.startsWith("X-")) {
      attrs[key] = attributes[key];
    }
  }
  return {
    id: attributes["ID"],
    classId: attributes["CLASS"],
    start: attributes["START-DATE"],
    cue: attributes["CUE"],
    end: attributes["END-DATE"],
    duration: attributes["DURATION"],
    plannedDuration: attributes["PLANNED-DURATION"],
    endOnNext: attributes["END-ON-NEXT"],
    attributes: attrs,
  };
}

/**
 * Parses a Media Segment from a range of lines in the playlist.
 * Collects all the segment-level tags that apply to a URI.
 */
function parseSegment(lines: Line[], uri: string, start: number, end: number, mediaSequenceNumber: number, discontinuitySequence: number, params: ParseState): Segment {
  const segment: Segment = {
    uri,
    mediaSequenceNumber,
    discontinuitySequence,
    markers: [],
    parts: [],
  };

  let partHint = false;

  for (let i = start; i <= end; i++) {
    if (typeof lines[i] === "string") continue;
    const { name, value, attributes } = lines[i] as Tag;

    if (name === T.EXTINF) {
      if (!Number.isInteger(value.duration) && params.compatibleVersion < 3) {
        params.compatibleVersion = 3;
      }
      // https://datatracker.ietf.org/doc/html/rfc8216#section-4.3.2.1
      if (Math.round(value.duration) > params.targetDuration) {
        utils.INVALIDPLAYLIST("EXTINF duration, when rounded to the nearest integer, MUST be less than or equal to the target duration");
      }
      segment.duration = value.duration;
      segment.title = value.title;
    } else if (name === T.EXT_X_BYTERANGE) {
      if (params.compatibleVersion < 4) {
        params.compatibleVersion = 4;
      }
      segment.byterange = value;
    } else if (name === T.EXT_X_DISCONTINUITY) {
      if (segment.parts && segment.parts.length > 0) {
        utils.INVALIDPLAYLIST("EXT-X-DISCONTINUITY must appear before the first EXT-X-PART tag of the Parent Segment.");
      }
      segment.discontinuity = true;
    } else if (name === T.EXT_X_GAP) {
      if (params.compatibleVersion < 8) {
        params.compatibleVersion = 8;
      }
      segment.gap = true;
    } else if (name === T.EXT_X_KEY) {
      if (segment.parts && segment.parts.length > 0) {
        utils.INVALIDPLAYLIST("EXT-X-KEY must appear before the first EXT-X-PART tag of the Parent Segment.");
      }
      setCompatibleVersionOfKey(params, attributes);
      segment.key = {
        method: attributes["METHOD"],
        uri: attributes["URI"],
        iv: attributes["IV"],
        format: attributes["KEYFORMAT"],
        formatVersion: attributes["KEYFORMATVERSIONS"],
      };
    } else if (name === T.EXT_X_MAP) {
      if (segment.parts && segment.parts.length > 0) {
        utils.INVALIDPLAYLIST("EXT-X-MAP must appear before the first EXT-X-PART tag of the Parent Segment.");
      }
      if (params.compatibleVersion < 5) {
        params.compatibleVersion = 5;
      }
      params.hasMap = true;
      segment.map = {
        uri: attributes["URI"],
        byterange: attributes["BYTERANGE"],
      };
    } else if (name === T.EXT_X_PROGRAM_DATE_TIME) {
      segment.programDateTime = value;
    } else if (name === T.EXT_X_DEVICE_TIME) {
      segment.deviceTime = value;
    } else if (name === T.EXT_X_DATERANGE) {
      segment.dateRange = parseDateRange(attributes);
    } else if (name === T.EXT_X_CUE_OUT) {
      if (!segment.markers) segment.markers = [];
      segment.markers.push({
        type: "OUT",
        duration: (attributes && attributes.DURATION) || value,
      });
    } else if (name === T.EXT_X_CUE_IN) {
      if (!segment.markers) segment.markers = [];
      segment.markers.push({ type: "IN" });
    } else if (name === T.EXT_X_CUE_OUT_CONT || name === T.EXT_X_CUE || name === T.EXT_OATCLS_SCTE35 || name === T.EXT_X_ASSET || name === T.EXT_X_SCTE35) {
      if (!segment.markers) segment.markers = [];
      segment.markers.push({
        type: "RAW",
        tagName: name,
        value,
      });
    } else if (name === T.EXT_X_PRELOAD_HINT && !attributes["TYPE"]) {
      utils.INVALIDPLAYLIST("EXT-X-PRELOAD-HINT: TYPE attribute is mandatory");
    } else if (name === T.EXT_X_PRELOAD_HINT && attributes["TYPE"] === "PART" && partHint) {
      utils.INVALIDPLAYLIST("Servers should not add more than one EXT-X-PRELOAD-HINT tag with the same TYPE attribute to a Playlist.");
    } else if ((name === T.EXT_X_PART || name === T.EXT_X_PRELOAD_HINT) && !attributes["URI"]) {
      utils.INVALIDPLAYLIST("EXT-X-PART / EXT-X-PRELOAD-HINT: URI attribute is mandatory");
    } else if (name === T.EXT_X_PRELOAD_HINT && attributes["TYPE"] === "MAP") {
      params.hasMap = true;
      segment.map = {
        hint: true,
        uri: attributes["URI"],
        byterange: {
          length: attributes["BYTERANGE-LENGTH"],
          offset: attributes["BYTERANGE-START"] || 0,
        },
      };
    } else if (name === T.EXT_X_PART || (name === T.EXT_X_PRELOAD_HINT && attributes["TYPE"] === "PART")) {
      if (name === T.EXT_X_PART && !attributes["DURATION"]) {
        utils.INVALIDPLAYLIST("EXT-X-PART: DURATION attribute is mandatory");
      }
      if (name === T.EXT_X_PRELOAD_HINT) {
        partHint = true;
      }
      if (!segment.parts) segment.parts = [];
      const partialSegment: PartialSegment = {
        hint: name === T.EXT_X_PRELOAD_HINT,
        uri: attributes["URI"],
        byterange:
          name === T.EXT_X_PART
            ? attributes["BYTERANGE"]
            : {
                length: attributes["BYTERANGE-LENGTH"],
                offset: attributes["BYTERANGE-START"] || 0,
              },
        duration: attributes["DURATION"],
        independent: attributes["INDEPENDENT"],
        gap: attributes["GAP"],
      };
      if (segment.gap && !partialSegment.gap) {
        utils.INVALIDPLAYLIST("Partial segments must have GAP=YES if they are in a gap (EXT-X-GAP)");
      }
      segment.parts.push(partialSegment);
    }
  }

  return segment;
}

/**
 * Parses a Prefetch Segment (EXT-X-PREFETCH) for LL-HLS.
 */
function parsePrefetchSegment(lines: Line[], uri: string, start: number, end: number, mediaSequenceNumber: number, discontinuitySequence: number, params: ParseState): PrefetchSegment {
  const segment: PrefetchSegment = {
    uri,
    mediaSequenceNumber,
    discontinuitySequence,
  };

  for (let i = start; i <= end; i++) {
    if (typeof lines[i] === "string") continue;
    const { name, attributes } = lines[i] as Tag;

    if (name === T.EXTINF) {
      utils.INVALIDPLAYLIST("A prefetch segment must not be advertised with an EXTINF tag.");
    } else if (name === T.EXT_X_DISCONTINUITY) {
      utils.INVALIDPLAYLIST("A prefetch segment must not be advertised with an EXT-X-DISCONTINUITY tag.");
    } else if (name === T.EXT_X_PREFETCH_DISCONTINUITY) {
      segment.discontinuity = true;
    } else if (name === T.EXT_X_KEY) {
      setCompatibleVersionOfKey(params, attributes);
      segment.key = {
        method: attributes["METHOD"],
        uri: attributes["URI"],
        iv: attributes["IV"],
        format: attributes["KEYFORMAT"],
        formatVersion: attributes["KEYFORMATVERSIONS"],
      };
    } else if (name === T.EXT_X_MAP) {
      utils.INVALIDPLAYLIST("Prefetch segments must not be advertised with an EXT-X-MAP tag.");
    }
  }

  return segment;
}

/**
 * Adds a segment to the playlist, resolving inherited properties
 * (key, map, discontinuity sequence, byterange offset).
 */
function addSegment(
  playlist: MediaPlaylist,
  segment: Segment,
  discontinuitySequence: number,
  currentKey?: Key | null,
  currentMap?: MediaInitializationSection | null,
): [number, Key | null, MediaInitializationSection | null] {
  const { discontinuity, key, map, byterange, uri } = segment;

  // Calculate discontinuity sequence
  if (discontinuity) {
    segment.discontinuitySequence = discontinuitySequence + 1;
  }

  // Inherit key from previous segment if not specified
  if (!key) {
    segment.key = currentKey;
  }

  // Inherit map from previous segment if not specified
  if (!map) {
    segment.map = currentMap;
  }

  // Resolve implicit byterange offset
  if (byterange && byterange.offset === -1) {
    const { segments } = playlist;
    if (segments.length > 0) {
      const prevSegment = segments[segments.length - 1];
      if (prevSegment.byterange && prevSegment.uri === uri) {
        byterange.offset = prevSegment.byterange.offset + prevSegment.byterange.length;
      } else {
        utils.INVALIDPLAYLIST("If offset of EXT-X-BYTERANGE is not present, a previous Media Segment MUST be a sub-range of the same media resource");
      }
    } else {
      utils.INVALIDPLAYLIST("If offset of EXT-X-BYTERANGE is not present, a previous Media Segment MUST appear in the Playlist file");
    }
  }

  playlist.segments.push(segment);

  return [segment.discontinuitySequence, segment.key ?? null, segment.map ?? null];
}

/**
 * Validates DateRange constraints across all segments.
 */
function checkDateRange(segments: Segment[]) {
  const earliestDates = new Map<string, Date>();
  const rangeList = new Map<string, Array<{ start: number; end: number }>>();
  let hasDateRange = false;
  let hasProgramDateTime = false;

  for (let i = segments.length - 1; i >= 0; i--) {
    const { programDateTime, dateRange } = segments[i];
    if (programDateTime) {
      hasProgramDateTime = true;
    }
    if (dateRange && dateRange.start) {
      hasDateRange = true;

      // END-ON-NEXT cannot coexist with DURATION or END-DATE
      if (dateRange.endOnNext && (dateRange.end || dateRange.duration)) {
        utils.INVALIDPLAYLIST("An EXT-X-DATERANGE tag with an END-ON-NEXT=YES attribute MUST NOT contain DURATION or END-DATE attributes.");
      }

      const start = dateRange.start.getTime();
      const duration = dateRange.duration || 0;

      // END-DATE must equal START-DATE + DURATION
      if (dateRange.end && dateRange.duration) {
        if (start + duration * 1000 !== dateRange.end.getTime()) {
          utils.INVALIDPLAYLIST("END-DATE MUST be equal to the value of the START-DATE attribute plus the value of the DURATION");
        }
      }

      // Resolve END-ON-NEXT
      if (dateRange.endOnNext && dateRange.classId) {
        dateRange.end = earliestDates.get(dateRange.classId);
      }

      earliestDates.set(dateRange.classId!, dateRange.start);

      const end = dateRange.end ? dateRange.end.getTime() : start + duration * 1000;

      // Check overlapping ranges with same CLASS
      if (dateRange.classId) {
        const range = rangeList.get(dateRange.classId);
        if (range) {
          for (const entry of range) {
            if ((entry.start <= start && entry.end > start) || (entry.start >= start && entry.start < end)) {
              utils.INVALIDPLAYLIST("DATERANGE tags with the same CLASS should not overlap");
            }
          }
          range.push({ start, end });
        } else {
          rangeList.set(dateRange.classId, [{ start, end }]);
        }
      }
    }
  }

  // If any DateRange exists, there must be at least one PROGRAM-DATE-TIME
  if (hasDateRange && !hasProgramDateTime) {
    utils.INVALIDPLAYLIST("If a Playlist contains an EXT-X-DATERANGE tag, it MUST also contain at least one EXT-X-PROGRAM-DATE-TIME tag.");
  }
}

/**
 * Validates LL-HLS (Low-Latency HLS) compatibility constraints.
 */
function checkLowLatencyCompatibility(playlist: MediaPlaylist, containsParts: boolean) {
  const { lowLatencyCompatibility, targetDuration, partTargetDuration } = playlist;

  if (!lowLatencyCompatibility) return;

  const { canSkipUntil, holdBack, partHoldBack } = lowLatencyCompatibility;

  // Skip boundary must be at least 6x target duration
  if (canSkipUntil !== undefined && canSkipUntil < targetDuration! * 6) {
    utils.INVALIDPLAYLIST("The Skip Boundary must be at least six times the EXT-X-TARGETDURATION.");
  }

  // HOLD-BACK must be at least 3x target duration
  if (holdBack !== undefined && holdBack < targetDuration! * 3) {
    utils.INVALIDPLAYLIST("HOLD-BACK must be at least three times the EXT-X-TARGETDURATION.");
  }

  if (containsParts) {
    if (partTargetDuration === undefined) {
      utils.INVALIDPLAYLIST("EXT-X-PART-INF is required if a Playlist contains one or more EXT-X-PART tags");
    }
    if (partHoldBack === undefined) {
      utils.INVALIDPLAYLIST("PART-HOLD-BACK attribute is mandatory");
    }
    if (partHoldBack !== undefined && partHoldBack < partTargetDuration!) {
      utils.INVALIDPLAYLIST("PART-HOLD-BACK must be at least PART-TARGET");
    }

    // Validate partial segment durations
    for (const [segmentIndex, { parts }] of playlist.segments.entries()) {
      if (!parts || parts.length === 0) continue;
      if (segmentIndex < playlist.segments.length - 3) {
        utils.INVALIDPLAYLIST("Remove EXT-X-PART tags from the Playlist after they are greater than three target durations from the end of the Playlist.");
      }
      for (const [partIndex, { duration }] of parts.entries()) {
        if (duration === undefined) continue;
        if (duration > partTargetDuration!) {
          utils.INVALIDPLAYLIST("PART-TARGET is the maximum duration of any Partial Segment");
        }
        if (partIndex < parts.length - 1 && duration < partTargetDuration! * 0.85) {
          utils.INVALIDPLAYLIST("All Partial Segments except the last part of a segment must have a duration of at least 85% of PART-TARGET");
        }
      }
    }

    // Fill in rendition report defaults
    for (const report of playlist.renditionReports) {
      const lastSegment = playlist.segments[playlist.segments.length - 1];
      if (report.lastMSN === undefined && lastSegment) {
        report.lastMSN = lastSegment.mediaSequenceNumber;
      }
      if ((report.lastPart === undefined || report.lastPart === null) && lastSegment && lastSegment.parts && lastSegment.parts.length > 0) {
        report.lastPart = lastSegment.parts.length - 1;
      }
    }
  }
}

/**
 * Parses a Media Playlist (contains segments and media-level tags).
 */
function parseMediaPlaylist(lines: Line[], params: ParseState): MediaPlaylist {
  const playlist: MediaPlaylist = {
    isMasterPlaylist: false,
    segments: [],
    prefetchSegments: [],
    renditionReports: [],
    dateRanges: [],
  };

  let segmentStart = -1;
  let mediaSequence = 0;
  let discontinuitySequence = 0;
  let currentKey: Key | null = null;
  let currentMap: MediaInitializationSection | null = null;
  let containsParts = false;
  let prefetchFound = false;

  for (const [index, line] of lines.entries()) {
    if (typeof line === "string") {
      // URI line - finalize the current segment
      if (segmentStart === -1) {
        utils.INVALIDPLAYLIST("A URI line is not preceded by any segment tags");
      }
      if (!playlist.targetDuration) {
        utils.INVALIDPLAYLIST("The EXT-X-TARGETDURATION tag is REQUIRED");
      }
      if (prefetchFound) {
        utils.INVALIDPLAYLIST("These segments must appear after all complete segments.");
      }

      const segment = parseSegment(lines, line, segmentStart, index - 1, mediaSequence++, discontinuitySequence, params);

      const [newDiscSeq, newKey, newMap] = addSegment(playlist, segment, discontinuitySequence, currentKey, currentMap);
      discontinuitySequence = newDiscSeq;
      currentKey = newKey;
      currentMap = newMap;

      if (!containsParts && segment.parts && segment.parts.length > 0) {
        containsParts = true;
      }

      segmentStart = -1;
      continue;
    }

    // Tag line
    const { name, value, attributes, category } = line as Tag;

    // Handle EXT-X-DATERANGE at playlist level (before category segmentation)
    if (name === T.EXT_X_DATERANGE) {
      const dateRange = parseDateRange(attributes);
      playlist.dateRanges.push(dateRange);
    }

    if (category === "Segment") {
      if (segmentStart === -1) {
        segmentStart = index;
      }
      continue;
    }

    if (name === T.EXT_X_VERSION) {
      if (playlist.version === undefined) {
        playlist.version = value;
      } else {
        utils.INVALIDPLAYLIST("A Playlist file MUST NOT contain more than one EXT-X-VERSION tag.");
      }
    } else if (name === T.EXT_X_TARGETDURATION) {
      playlist.targetDuration = params.targetDuration = value;
    } else if (name === T.EXT_X_MEDIA_SEQUENCE) {
      if (playlist.segments.length > 0) {
        utils.INVALIDPLAYLIST("The EXT-X-MEDIA-SEQUENCE tag MUST appear before the first Media Segment in the Playlist.");
      }
      playlist.mediaSequenceBase = value;
      mediaSequence = value;
    } else if (name === T.EXT_X_BITRATE) {
      // RFC 8216bis: segment bitrate of the media playlist
      playlist.bitrate = value;
    } else if (name === T.EXT_X_DISCONTINUITY_SEQUENCE) {
      if (playlist.segments.length > 0) {
        utils.INVALIDPLAYLIST("The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before the first Media Segment in the Playlist.");
      }
      if (segmentStart !== -1) {
        utils.INVALIDPLAYLIST("The EXT-X-DISCONTINUITY-SEQUENCE tag MUST appear before any EXT-X-DISCONTINUITY tag.");
      }
      playlist.discontinuitySequenceBase = value;
      discontinuitySequence = value;
    } else if (name === T.EXT_X_ENDLIST) {
      playlist.endlist = true;
    } else if (name === T.EXT_X_PLAYLIST_TYPE) {
      playlist.playlistType = value;
    } else if (name === T.EXT_X_I_FRAMES_ONLY) {
      if (params.compatibleVersion < 4) {
        params.compatibleVersion = 4;
      }
      playlist.isIFrame = true;
    } else if (name === T.EXT_X_INDEPENDENT_SEGMENTS) {
      if (playlist.independentSegments) {
        utils.INVALIDPLAYLIST("EXT-X-INDEPENDENT-SEGMENTS tag MUST NOT appear more than once in a Playlist");
      }
      playlist.independentSegments = true;
    } else if (name === T.EXT_X_START) {
      if (playlist.start) {
        utils.INVALIDPLAYLIST("EXT-X-START tag MUST NOT appear more than once in a Playlist");
      }
      if (typeof attributes["TIME-OFFSET"] !== "number") {
        utils.INVALIDPLAYLIST("EXT-X-START: TIME-OFFSET attribute is REQUIRED");
      }
      playlist.start = {
        offset: attributes["TIME-OFFSET"],
        precise: attributes["PRECISE"] || false,
      };
    } else if (name === T.EXT_X_SERVER_CONTROL) {
      if (!attributes["CAN-BLOCK-RELOAD"]) {
        utils.INVALIDPLAYLIST("EXT-X-SERVER-CONTROL: CAN-BLOCK-RELOAD=YES is mandatory for Low-Latency HLS");
      }
      playlist.lowLatencyCompatibility = {
        canBlockReload: attributes["CAN-BLOCK-RELOAD"],
        canSkipUntil: attributes["CAN-SKIP-UNTIL"],
        holdBack: attributes["HOLD-BACK"],
        partHoldBack: attributes["PART-HOLD-BACK"],
      };
    } else if (name === T.EXT_X_PART_INF) {
      if (!attributes["PART-TARGET"]) {
        utils.INVALIDPLAYLIST("EXT-X-PART-INF: PART-TARGET attribute is mandatory");
      }
      playlist.partTargetDuration = attributes["PART-TARGET"];
    } else if (name === T.EXT_X_RENDITION_REPORT) {
      if (!attributes["URI"]) {
        utils.INVALIDPLAYLIST("EXT-X-RENDITION-REPORT: URI attribute is mandatory");
      }
      if (/^[a-z]+:/i.test(attributes["URI"])) {
        utils.INVALIDPLAYLIST("EXT-X-RENDITION-REPORT: URI must be relative to the playlist uri");
      }
      playlist.renditionReports.push({
        uri: attributes["URI"],
        lastMSN: attributes["LAST-MSN"],
        lastPart: attributes["LAST-PART"],
      });
    } else if (name === T.EXT_X_SKIP) {
      if (!attributes["SKIPPED-SEGMENTS"]) {
        utils.INVALIDPLAYLIST("EXT-X-SKIP: SKIPPED-SEGMENTS attribute is mandatory");
      }
      if (params.compatibleVersion < 9) {
        params.compatibleVersion = 9;
      }
      playlist.skip = attributes["SKIPPED-SEGMENTS"];
      mediaSequence += playlist.skip!;
    } else if (name === T.EXT_X_PREFETCH) {
      const segment = parsePrefetchSegment(lines, value, segmentStart === -1 ? index : segmentStart, index - 1, mediaSequence++, discontinuitySequence, params);
      if (segment.discontinuity) {
        segment.discontinuitySequence++;
        discontinuitySequence = segment.discontinuitySequence;
      }
      if (!segment.key) {
        segment.key = currentKey;
      }
      playlist.prefetchSegments.push(segment);
      prefetchFound = true;
      segmentStart = -1;
    } else if (name === T.EXT_X_DEFINE) {
      if (!playlist.defines) playlist.defines = [];
      playlist.defines.push(attributes);
    }
  }

  // Handle trailing segments (no URI line at end)
  if (segmentStart !== -1) {
    const segment = parseSegment(lines, "", segmentStart, lines.length - 1, mediaSequence++, discontinuitySequence, params);
    const { parts } = segment;
    if (parts && parts.length > 0 && !playlist.endlist && !parts[parts.length - 1]?.hint) {
      utils.INVALIDPLAYLIST("If the Playlist contains EXT-X-PART tags and does not contain an EXT-X-ENDLIST tag, the Playlist must contain an EXT-X-PRELOAD-HINT tag with a TYPE=PART attribute");
    }
    addSegment(playlist, segment, discontinuitySequence, currentKey, currentMap);
    if (!containsParts && segment.parts && segment.parts.length > 0) {
      containsParts = true;
    }
  }

  // Validate DateRanges
  checkDateRange(playlist.segments);

  // Validate LL-HLS compatibility
  if (playlist.lowLatencyCompatibility) {
    checkLowLatencyCompatibility(playlist, containsParts);
  }

  return playlist;
}

// ---------------------------------------------------------------------------
// Semantic analysis (structured parsing)
// ---------------------------------------------------------------------------

/**
 * Performs semantic analysis on the parsed lines to produce
 * a structured MasterPlaylist or MediaPlaylist.
 */
function semanticParser(lines: Line[], params: ParseState): MasterPlaylist | MediaPlaylist {
  let playlist: MasterPlaylist | MediaPlaylist;

  if (params.isMasterPlaylist) {
    playlist = parseMasterPlaylist(lines, params);
  } else {
    playlist = parseMediaPlaylist(lines, params);
    if (!playlist.isMasterPlaylist && !playlist.isIFrame && params.hasMap && params.compatibleVersion < 6) {
      params.compatibleVersion = 6;
    }
  }

  // Validate protocol version compatibility
  // Only throw if an explicit EXT-X-VERSION tag is present and is too low.
  // If no version tag is specified, we accept the playlist for interoperability.
  if (params.compatibleVersion > 1) {
    if (playlist.version !== undefined && playlist.version !== null && playlist.version < params.compatibleVersion) {
      utils.INVALIDPLAYLIST(`EXT-X-VERSION needs to be ${params.compatibleVersion} or higher.`);
    }
  }

  return playlist;
}

// ---------------------------------------------------------------------------
// URI resolution
// ---------------------------------------------------------------------------

/**
 * Resolves all relative URIs in a playlist against a base URI.
 * This supports both Master Playlists and Media Playlists.
 */
function resolvePlaylistUris(playlist: MasterPlaylist | MediaPlaylist, baseUri: string): void {
  if (playlist.isMasterPlaylist) {
    const master = playlist as MasterPlaylist;

    // Resolve variant URIs
    for (const variant of master.variants) {
      variant.uri = utils.resolveUrl(baseUri, variant.uri);

      // Resolve rendition URIs inside each variant (audio / video / subtitles)
      for (const type of ["audio", "video", "subtitles", "closedCaptions"] as const) {
        const renditions = variant[type];
        if (renditions) {
          for (const r of renditions) {
            if (r.uri) {
              r.uri = utils.resolveUrl(baseUri, r.uri);
            }
          }
        }
      }
    }

    // Resolve session data URIs
    for (const sd of master.sessionDataList) {
      if (sd.uri) {
        sd.uri = utils.resolveUrl(baseUri, sd.uri);
      }
    }

    // Resolve session key URIs
    for (const sk of master.sessionKeyList) {
      if (sk.uri) {
        sk.uri = utils.resolveUrl(baseUri, sk.uri);
      }
    }

    // Resolve content steering URI
    const steering = master.contentSteering;
    if (steering) {
      steering.serverUri = utils.resolveUrl(baseUri, steering.serverUri);
    }
  } else {
    const mp = playlist as MediaPlaylist;
    // Resolve segment URIs
    for (const segment of mp.segments) {
      segment.uri = utils.resolveUrl(baseUri, segment.uri);
      if (segment.key && segment.key.uri) {
        segment.key.uri = utils.resolveUrl(baseUri, segment.key.uri);
      }
      if (segment.map && segment.map.uri) {
        segment.map.uri = utils.resolveUrl(baseUri, segment.map.uri);
      }
      if (segment.parts) {
        for (const part of segment.parts) {
          part.uri = utils.resolveUrl(baseUri, part.uri);
        }
      }
    }
    // Resolve prefetch segment URIs
    for (const prefetch of mp.prefetchSegments) {
      prefetch.uri = utils.resolveUrl(baseUri, prefetch.uri);
      if (prefetch.key && prefetch.key.uri) {
        prefetch.key.uri = utils.resolveUrl(baseUri, prefetch.key.uri);
      }
    }
    // Resolve rendition report URIs
    for (const report of mp.renditionReports) {
      report.uri = utils.resolveUrl(baseUri, report.uri);
    }
  }
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

/**
 * Parses an M3U8 playlist string into a structured object.
 *
 * Automatically detects whether the playlist is a Master Playlist or
 * Media Playlist and parses accordingly.
 *
 * @param text - The raw M3U8 playlist content as a string
 * @param options - Optional parsing options
 * @param options.uri - Base URI for resolving relative URLs in the playlist
 * @returns A structured MasterPlaylist or MediaPlaylist object
 *
 * @throws {InvalidPlaylistError} If the playlist violates RFC 8216 syntax rules
 *
 * @example
 * ```typescript
 * import { parser } from '@skax/hls-parse';
 *
 * // Parse a simple media playlist
 * const media = parser(`#EXTM3U
 * #EXT-X-TARGETDURATION:10
 * #EXTINF:9.009,
 * segment1.ts
 * #EXTINF:9.009,
 * segment2.ts
 * #EXT-X-ENDLIST`);
 *
 * // Parse with relative URL resolution
 * const master = parser(m3u8Content, {
 *   uri: 'https://example.com/path/to/playlist.m3u8'
 * });
 * ```
 */
function parser(text: string, options?: ParserOptions): MasterPlaylist | MediaPlaylist {
  const params: ParseState = {
    isMasterPlaylist: undefined,
    hasMap: false,
    targetDuration: 0,
    compatibleVersion: 1,
    isClosedCaptionsNone: false,
    hash: {},
  };

  const lines = lexicalParser(text, params);
  const playlist = semanticParser(lines, params);
  playlist.source = text;

  // Resolve relative URIs if a base URI is provided
  if (options?.uri) {
    resolvePlaylistUris(playlist, options.uri);
  }

  return playlist;
}

export default parser;
export { parser };
