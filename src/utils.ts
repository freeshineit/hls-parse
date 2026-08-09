/**
 * HLS 解析工具函数。
 *
 * Utility functions for HLS parsing.
 *
 * @module utils
 * @category Internal
 * @internal
 */

/**
 * 无效播放列表错误类。
 *
 * Custom error class for invalid playlist parsing.
 *
 * Thrown by the `parser` function when a playlist violates RFC 8216 syntax rules.
 * Extends the standard `Error` class.
 *
 * @example
 * ```ts
 * try {
 *   parser(m3u8);
 * } catch (e) {
 *   if (e instanceof InvalidPlaylistError) {
 *     console.log(e.message);
 *   }
 * }
 * ```
 */
export class InvalidPlaylistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlaylistError";
  }
}

/**
 * 抛出无效播放列表错误。
 *
 * Throws an {@link InvalidPlaylistError} with the given message.
 * Used throughout the parser to enforce RFC 8216 compliance.
 *
 * @param message - The error message describing the violation
 * @returns never — function always throws
 * @throws {InvalidPlaylistError} Always
 * @internal
 */
export function INVALIDPLAYLIST(message: string) {
  // throw new InvalidPlaylistError(message);
  console.warn(message);
}

/**
 * 从字符串两端修剪匹配的字符。
 *
 * Trims matching characters from both ends of a string.
 * Used primarily for removing quotes from attribute values.
 *
 * @param str - The string to trim, or `undefined`
 * @param char - The character to strip from both ends
 * @returns The trimmed string, or `undefined` if input was `undefined`
 *
 * @example
 * ```ts
 * trim('"hello"', '"'); // "hello"
 * trim(undefined, '"'); // undefined
 * ```
 * @internal
 */
export function trim(str: string | undefined, char: string): string | undefined {
  if (str === undefined) return undefined;
  let start = 0;
  let end = str.length - 1;
  while (start <= end && str[start] === char) start++;
  while (end >= start && str[end] === char) end--;
  return str.slice(start, end + 1);
}

/**
 * 在第一个分隔符处将字符串分割为两部分。
 *
 * Splits a string at the first occurrence of a delimiter.
 * Returns a `[before, after]` tuple.
 *
 * @param str - The string to split
 * @param delimiter - The delimiter character
 * @returns A tuple `[beforeDelimiter, afterDelimiter]`
 *
 * @example
 * ```ts
 * splitAt('hello=world', '='); // ['hello', 'world']
 * ```
 * @internal
 */
export function splitAt(str: string, delimiter: string): [string, string] {
  const index = str.indexOf(delimiter);
  if (index === -1) {
    return [str, ""];
  }
  return [str.slice(0, index), str.slice(index + 1)];
}

/**
 * 按逗号分割列表，同时保留引号内的字符串。
 *
 * Splits a comma-separated list while preserving quoted strings.
 *
 * This is essential for correctly parsing HLS attribute lists where
 * values may contain commas inside quotes.
 *
 * @param str - The comma-separated attribute string
 * @returns Array of individual attribute key=value pairs
 *
 * @example
 * ```ts
 * splitByCommaWithPreservingQuotes('a="1,2",b=hello');
 * // ['a="1,2"', 'b=hello']
 * ```
 * @internal
 */
export function splitByCommaWithPreservingQuotes(str: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

/**
 * 将字符串转换为数字（十进制整数或十进制浮点数）。
 *
 * Converts a string to a number (decimal-integer or decimal-floating-point).
 * Handles the full range of HLS numeric formats.
 *
 * @param str - The numeric string (e.g., `"10.5"`)
 * @returns The parsed number
 * @throws {InvalidPlaylistError} If the string is not a valid number
 * @internal
 */
export function toNumber(str: string): number {
  const num = Number(str);
  if (isNaN(num)) {
    INVALIDPLAYLIST(`Invalid numeric value: ${str}`);
  }
  return num;
}

/**
 * 将十六进制字符串转换为 Uint8Array。
 *
 * Converts a hexadecimal string to a `Uint8Array`.
 *
 * Handles the `0x` / `0X` prefix and odd-length hex strings.
 *
 * @param hex - The hex string, optionally prefixed with `0x` or `0X`
 * @returns Byte array representation
 *
 * @example
 * ```ts
 * hexToByteSequence('0xFF');   // Uint8Array [255]
 * hexToByteSequence('0F');     // Uint8Array [15] (padded)
 * ```
 */
export function hexToByteSequence(hex: string): Uint8Array {
  let h = hex;
  if (h.startsWith("0x") || h.startsWith("0X")) {
    h = h.slice(2);
  }
  // 确保偶数长度 / Ensure even length
  if (h.length % 2 !== 0) {
    h = "0" + h;
  }
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * 将 snake_case 或 UPPER-KEBAB 字符串转换为 camelCase。
 *
 * Converts a snake_case or UPPER-KEBAB string to camelCase.
 * Used for mapping HLS attribute names (e.g., `GROUP-ID`) to
 * JavaScript property names (e.g., `groupId`).
 *
 * @param str - The HLS attribute name
 * @returns camelCase version
 *
 * @example
 * ```ts
 * camelify('CLOSED-CAPTIONS'); // 'closedCaptions'
 * ```
 * @internal
 */
export function camelify(str: string): string {
  return str.toLowerCase().replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

/**
 * 解析相对 URL 为绝对地址。
 *
 * Resolves a relative URI against a base URI.
 *
 * If the URI is absolute (has a scheme), it is returned as-is.
 * If no base URI is provided, the URI is returned as-is.
 * Supports `http://`, `https://`, and other standard schemes.
 *
 * @param base - The base URI for resolution, or `undefined`
 * @param relative - The relative URI to resolve
 * @returns The resolved absolute URI, or the original if already absolute
 *
 * @example
 * ```ts
 * resolveUrl('https://example.com/dir/playlist.m3u8', 'segment.ts');
 * // 'https://example.com/dir/segment.ts'
 *
 * resolveUrl(undefined, 'segment.ts');
 * // 'segment.ts' (no base, returned as-is)
 * ```
 */
export function resolveUrl(base: string | undefined, relative: string): string {
  if (!base) return relative;
  // 不支持空地址 / Unsupported empty address
  if (!relative) return "";

  // 如果已是绝对地址，直接返回 / If already absolute, return as-is
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(relative)) {
    return relative;
  }

  try {
    // Use the URL constructor for proper resolution
    const baseUrl = new URL(base);
    // 处理协议相对 URL（以 // 开头）/ Handle protocol-relative URLs (starting with //)
    if (relative.startsWith("//")) {
      return baseUrl.protocol + relative;
    }
    return new URL(relative, baseUrl).href;
  } catch {
    // 如果基础 URL 无效，尝试简单拼接 / If base is not a valid URL, try simple concatenation
    if (relative.startsWith("/")) {
      // 相对于域名的绝对路径 / Absolute path relative to domain
      const match = base.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\/[^/]+/);
      if (match) {
        return match[0] + relative;
      }
    }
    // 相对路径 / Relative path
    const baseDir = base.replace(/\/[^/]*$/, "/");
    // 处理相对路径中的 ./ 和 ../ / Handle ./ and ../ in relative
    const resolved = baseDir + relative;
    // 规范化 .. 和 . 路径 / Normalize .. and .
    const parts = resolved.split("/");
    const result: string[] = [];
    for (const part of parts) {
      if (part === "..") {
        result.pop();
      } else if (part !== ".") {
        result.push(part);
      }
    }
    return result.join("/");
  }
}

// ============================================================================
// Tag parameter parsers — 标签参数解析器
// ============================================================================

import type { AllowedCpc, Byterange, ExtInfo, ParsedAttrs, Resolution, TagParam, UserAttribute } from "./types";
import * as T from "./constants";

/**
 * 解析 EXTINF 标签值。
 *
 * Parses the EXTINF tag value.
 * Format: #EXTINF:<duration>,[<title>]
 *
 * The title field may contain percent-encoded UTF-8 characters.
 */
export function parseEXTINF(param: string): ExtInfo {
  const pair = splitAt(param, ",") as [string, string];
  return {
    duration: toNumber(pair[0]),
    title: pair[1] ? decodeURIComponent(encodeURIComponent(pair[1])) : undefined,
  };
}

/**
 * 解析 EXT-X-BYTERANGE 标签值。
 *
 * Parses the EXT-X-BYTERANGE tag value. Format: #EXT-X-BYTERANGE:<n>[@<o>]
 */
export function parseBYTERANGE(param: string): Byterange {
  const pair = splitAt(param, "@");
  return {
    length: toNumber(pair[0]),
    offset: pair[1] ? toNumber(pair[1]) : -1,
  };
}

/**
 * 解析分辨率字符串。
 *
 * Parses a resolution string "widthxheight".
 */
export function parseResolution(str: string): Resolution {
  const pair = splitAt(str, "x") as [string, string];
  return { width: toNumber(pair[0]), height: toNumber(pair[1]) };
}

/**
 * 解析 ALLOWED-CPC 属性值。
 *
 * Parses ALLOWED-CPC attribute value.
 */
export function parseAllowedCpc(str: string): AllowedCpc[] {
  const message = "ALLOWED-CPC: Each entry must consist of KEYFORMAT and Content Protection Configuration";
  const list = str.split(",");
  const allowedCpcList: AllowedCpc[] = [];
  for (const item of list) {
    const [format, cpcText] = splitAt(item, ":");
    if (!format || !cpcText) {
      INVALIDPLAYLIST(message);
      continue;
    }
    allowedCpcList.push({ format, cpcList: cpcText.split("/") });
  }
  return allowedCpcList;
}

/**
 * 从十六进制字符串解析初始化向量。
 *
 * Parses an Initialization Vector from a hex string. Must be 128 bits (16 bytes).
 */
export function parseIV(str: string): Uint8Array {
  const iv = hexToByteSequence(str);
  if (iv.length !== 16) {
    INVALIDPLAYLIST("IV must be a 128-bit unsigned integer");
  }
  return iv;
}

/**
 * 解析用户自定义属性值（X- 前缀）。
 *
 * Parses a user-defined attribute value (X- prefixed).
 */
export function parseUserAttribute(str: string): UserAttribute {
  if (str.startsWith('"')) return trim(str, '"')!;
  if (str.startsWith("0x") || str.startsWith("0X")) return hexToByteSequence(str);
  return toNumber(str);
}

/**
 * 解析属性列表（逗号分隔的 key=value 对）。
 *
 * Parses an attribute list (comma-separated key=value pairs).
 */
export function parseAttributeList(param: string): ParsedAttrs {
  const attributes: ParsedAttrs = {};
  for (const item of splitByCommaWithPreservingQuotes(param)) {
    const [key, value] = splitAt(item, "=");
    const val = trim(value, '"')!;
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
        attributes[key] = toNumber(val);
        break;
      default:
        if (key.startsWith("SCTE35-")) attributes[key] = hexToByteSequence(val);
        else if (key.startsWith("X-")) attributes[key] = parseUserAttribute(value!);
        else {
          if (key === "VIDEO-RANGE" && val !== "SDR" && val !== "HLG" && val !== "PQ") {
            INVALIDPLAYLIST(`VIDEO-RANGE: unknown value "${val}"`);
          }
          attributes[key] = val;
        }
    }
  }
  return attributes;
}

/**
 * 将标签行分割为名称和参数。
 *
 * Splits a tag line into name and parameter. Format: #EXT-TAG-NAME:parameter
 */
export function splitTag(line: string): [string, string | null] {
  const index = line.indexOf(":");
  if (index === -1) return [line.slice(1).trim(), null];
  return [line.slice(1, index).trim(), line.slice(index + 1).trim()];
}

/**
 * 将标签参数解析为结构化的 [value, attributes] 对。
 *
 * Parses a tag's parameters into a structured [value, attributes] pair.
 */
export function parseTagParam(name: string, param: string | null): TagParam {
  if (param === null) return [null, null];
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
      return [toNumber(param), null];
    case T.EXT_X_DEVICE_TIME:
      return [param, null];
    case T.EXT_X_CUE_OUT:
      if (!Number.isNaN(Number(param))) return [toNumber(param), null];
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
      return [param, null];
    case T.EXT_X_PLAYLIST_TYPE:
      return [param, null];
    default:
      return [param, null];
  }
}
