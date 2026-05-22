/**
 * Utility functions for HLS parsing
 */

/**
 * Custom error class for invalid playlist parsing.
 * Extends Error to provide structured validation feedback.
 */
export class InvalidPlaylistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlaylistError';
  }
}

/**
 * Throws an InvalidPlaylistError with the given message.
 * Used throughout the parser to enforce RFC 8216 compliance.
 */
export function INVALIDPLAYLIST(message: string): never {
  throw new InvalidPlaylistError(message);
}

/**
 * Trims matching characters from both ends of a string.
 * Used primarily for removing quotes from attribute values.
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
 * Splits a string at the first occurrence of a delimiter.
 * Returns a tuple of [before, after].
 */
export function splitAt(str: string, delimiter: string): [string, string] {
  const index = str.indexOf(delimiter);
  if (index === -1) {
    return [str, ''];
  }
  return [str.slice(0, index), str.slice(index + 1)];
}

/**
 * Splits a comma-separated list while preserving quoted strings.
 * This is essential for correctly parsing HLS attribute lists
 * where values may contain commas inside quotes.
 */
export function splitByCommaWithPreservingQuotes(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
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
 * Converts a string to a number (decimal-integer or decimal-floating-point).
 * Handles the full range of HLS numeric formats.
 */
export function toNumber(str: string): number {
  const num = Number(str);
  if (isNaN(num)) {
    INVALIDPLAYLIST(`Invalid numeric value: ${str}`);
  }
  return num;
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 * Handles the "0x" or "0X" prefix format used in HLS.
 */
export function hexToByteSequence(hex: string): Uint8Array {
  let h = hex;
  if (h.startsWith('0x') || h.startsWith('0X')) {
    h = h.slice(2);
  }
  // Ensure even length
  if (h.length % 2 !== 0) {
    h = '0' + h;
  }
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Converts a snake_case or UPPER-CASE string to camelCase.
 * Used for converting HLS attribute names to JS property names.
 */
export function camelify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase());
}

/**
 * Resolves a relative URI against a base URI.
 * If the URI is absolute (has a scheme), it is returned as-is.
 * If no base URI is provided, the URI is returned as-is.
 * Supports both http:// and https:// schemes.
 */
export function resolveUrl(base: string | undefined, relative: string): string {
  if (!base) return relative;

  // If already absolute, return as-is
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(relative)) {
    return relative;
  }

  try {
    // Use the URL constructor for proper resolution
    const baseUrl = new URL(base);
    // Handle protocol-relative URLs (starting with //)
    if (relative.startsWith('//')) {
      return baseUrl.protocol + relative;
    }
    return new URL(relative, baseUrl).href;
  } catch {
    // If base is not a valid URL, try simple concatenation
    if (relative.startsWith('/')) {
      // Absolute path relative to domain
      const match = base.match(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\/[^/]+/);
      if (match) {
        return match[0] + relative;
      }
    }
    // Relative path
    const baseDir = base.replace(/\/[^/]*$/, '/');
    // Handle ./ and ../ in relative
    let resolved = baseDir + relative;
    // Normalize .. and .
    const parts = resolved.split('/');
    const result: string[] = [];
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.') {
        result.push(part);
      }
    }
    return result.join('/');
  }
}
