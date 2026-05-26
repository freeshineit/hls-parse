# @skax/hls-parse

A robust M3U8/HLS playlist parser for JavaScript/TypeScript, compliant with [RFC 8216](https://datatracker.ietf.org/doc/html/rfc8216) (HTTP Live Streaming).

## Features

- ✅ **Full RFC 8216 Compliance** – Supports all standard HLS tags and attributes
- ✅ **Master Playlists** – Parse `EXT-X-STREAM-INF`, `EXT-X-I-FRAME-STREAM-INF`, `EXT-X-MEDIA`, etc.
- ✅ **Media Playlists** – Parse segments, encryption keys, byte ranges, discontinuities, etc.
- ✅ **LL-HLS (Low-Latency HLS)** – Full support for `EXT-X-PART`, `EXT-X-PRELOAD-HINT`, `EXT-X-SERVER-CONTROL`, `EXT-X-SKIP`, `EXT-X-RENDITION-REPORT`, `EXT-X-PREFETCH`, and more
- ✅ **Relative URL Resolution** – Resolve all relative URIs in a playlist against a base URL
- ✅ **Automatic Protocol Version Detection** – Detects required protocol version based on features used
- ✅ **Rigorous Validation** – Enforces RFC 8216 rules and constraints
- ✅ **TypeScript First** – Full type definitions for all parsed structures
- ✅ **SCTE-35 Support** – Parse splice markers, `EXT-X-CUE-OUT`, `EXT-X-CUE-IN`, `EXT-X-DATERANGE` with SCTE-35 attributes
- ✅ **Vendor-Specific Extensions** – Supports `EXT-X-CUE`, `EXT-OATCLS-SCTE35`, `EXT-X-ASSET`, `EXT-X-SCTE35`

## Installation

```bash
# npm
npm install @skax/hls-parse

# or pnpm
pnpm install @skax/hls-parse

# or yarn
yarn add @skax/hls-parse
```

## Demo

[https://freeshineit.github.io/hls-parse/media/](https://freeshineit.github.io/hls-parse/media/)

## Quick Start

```typescript
import { parse } from "@skax/hls-parse";

// Parse a Media Playlist
const playlist = parser(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`);

console.log(playlist.segments.length); // 2
console.log(playlist.segments[0].duration); // 9.009

// Parse a Master Playlist
const master = parser(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1920x1080
high.m3u8`);

console.log(master.variants[0].bandwidth); // 1280000
```

## URL Resolution

```typescript
import { parser } from "@skax/hls-parse";

const playlist = parser(m3u8Content, {
  uri: "https://example.com/hls/main.m3u8",
});

// All relative URIs are resolved to absolute URLs
console.log(playlist.segments[0].uri); // https://example.com/hls/segment1.ts
```

## API Reference

### `parser(text: string, options?: ParserOptions): Playlist`

Parses an M3U8 playlist string into a structured object.

| Parameter     | Type     | Description                                     |
| ------------- | -------- | ----------------------------------------------- |
| `text`        | `string` | The raw M3U8 playlist content                   |
| `options.uri` | `string` | (Optional) Base URI for resolving relative URLs |

**Returns:** `MasterPlaylist | MediaPlaylist`

**Throws:** `InvalidPlaylistError` if the playlist violates RFC 8216 syntax rules.

### `resolveUrl(base: string | undefined, relative: string): string`

Resolves a relative URI against a base URI.

### `InvalidPlaylistError`

Error class thrown when parsing invalid playlists.

## Types

### `Playlist`

Union type of `MasterPlaylist` and `MediaPlaylist`.

### `MasterPlaylist`

| Property               | Type                    | Description                                  |
| ---------------------- | ----------------------- | -------------------------------------------- |
| `isMasterPlaylist`     | `true`                  | Type discriminator                           |
| `version?`             | `number`                | Protocol version                             |
| `variants`             | `Variant[]`             | Variant streams                              |
| `sessionDataList`      | `SessionData[]`         | Session data entries                         |
| `sessionKeyList`       | `Key[]`                 | Session keys                                 |
| `independentSegments?` | `boolean`               | Whether segments are independently decodable |
| `start?`               | `StartData`             | Preferred start position                     |
| `contentSteering?`     | `ContentSteering`       | Content steering configuration               |
| `defines?`             | `Record<string, any>[]` | Variable definitions                         |

### `MediaPlaylist`

| Property                     | Type                      | Description                              |
| ---------------------------- | ------------------------- | ---------------------------------------- |
| `isMasterPlaylist`           | `false`                   | Type discriminator                       |
| `version?`                   | `number`                  | Protocol version                         |
| `targetDuration?`            | `number`                  | Maximum segment duration                 |
| `mediaSequenceBase?`         | `number`                  | Base media sequence number               |
| `discontinuitySequenceBase?` | `number`                  | Base discontinuity sequence number       |
| `endlist?`                   | `boolean`                 | Whether the playlist is complete         |
| `playlistType?`              | `string`                  | `"EVENT"` or `"VOD"`                     |
| `isIFrame?`                  | `boolean`                 | Whether this is an I-frame only playlist |
| `segments`                   | `Segment[]`               | Media segments                           |
| `prefetchSegments`           | `PrefetchSegment[]`       | Prefetch segments (LL-HLS)               |
| `renditionReports`           | `RenditionReport[]`       | Rendition reports (LL-HLS)               |
| `dateRanges`                 | `DateRange[]`             | Date ranges                              |
| `lowLatencyCompatibility?`   | `LowLatencyCompatibility` | LL-HLS server control                    |
| `partTargetDuration?`        | `number`                  | Partial segment target duration (LL-HLS) |
| `skip?`                      | `number`                  | Skipped segments (LL-HLS)                |

### `Segment`

| Property                | Type                                 | Description                             |
| ----------------------- | ------------------------------------ | --------------------------------------- |
| `uri`                   | `string`                             | URI of the media segment                |
| `duration?`             | `number`                             | Duration in seconds                     |
| `title?`                | `string`                             | Optional title                          |
| `byterange?`            | `Byterange`                          | Byte range                              |
| `mediaSequenceNumber`   | `number`                             | Media sequence number                   |
| `discontinuitySequence` | `number`                             | Discontinuity sequence number           |
| `discontinuity?`        | `boolean`                            | Whether this segment is a discontinuity |
| `gap?`                  | `boolean`                            | Whether this segment is a gap           |
| `key?`                  | `Key \| null`                        | Encryption key                          |
| `map?`                  | `MediaInitializationSection \| null` | Media initialization section            |
| `programDateTime?`      | `Date`                               | Program date/time                       |
| `dateRange?`            | `DateRange`                          | Date range metadata                     |
| `markers?`              | `SpliceInfo[]`                       | Splice/marker information               |
| `parts?`                | `PartialSegment[]`                   | Partial segments (LL-HLS)               |

### `PartialSegment` (LL-HLS)

| Property       | Type        | Description                     |
| -------------- | ----------- | ------------------------------- |
| `hint?`        | `boolean`   | Whether this is a preload hint  |
| `uri`          | `string`    | URI of the partial segment      |
| `byterange?`   | `Byterange` | Byte range                      |
| `duration?`    | `number`    | Duration in seconds             |
| `independent?` | `boolean`   | Whether independently decodable |
| `gap?`         | `boolean`   | Whether this is a gap           |

### `Variant`

| Property            | Type          | Description               |
| ------------------- | ------------- | ------------------------- |
| `uri`               | `string`      | URI of the media playlist |
| `bandwidth`         | `number`      | Peak bit rate             |
| `averageBandwidth?` | `number`      | Average bit rate          |
| `codecs?`           | `string`      | Codec identifiers         |
| `resolution?`       | `Resolution`  | Display resolution        |
| `frameRate?`        | `number`      | Maximum frame rate        |
| `audio?`            | `Rendition[]` | Audio renditions          |
| `video?`            | `Rendition[]` | Video renditions          |
| `subtitles?`        | `Rendition[]` | Subtitle renditions       |
| `closedCaptions?`   | `Rendition[]` | Closed-caption renditions |

## Supported Tags

### Basic Tags

- `#EXTM3U`
- `#EXT-X-VERSION`
- `#EXT-X-CONTENT-STEERING`

### Media Segment Tags

- `#EXTINF` – Segment duration and title
- `#EXT-X-BYTERANGE` – Byte range
- `#EXT-X-DISCONTINUITY` – Discontinuity marker
- `#EXT-X-PREFETCH-DISCONTINUITY` – LL-HLS discontinuity in prefetch
- `#EXT-X-KEY` – Encryption key
- `#EXT-X-MAP` – Media initialization section
- `#EXT-X-PROGRAM-DATE-TIME` – Absolute date/time
- `#EXT-X-DATERANGE` – Date range metadata
- `#EXT-X-CUE-OUT` / `#EXT-X-CUE-IN` – Splice markers
- `#EXT-X-CUE-OUT-CONT` / `#EXT-X-CUE` – Additional splice markers
- `#EXT-X-GAP` – Gap segment
- `#EXT-X-PART` – Partial segment (LL-HLS)
- `#EXT-X-PRELOAD-HINT` – Preload hint (LL-HLS)

### Media Playlist Tags

- `#EXT-X-TARGETDURATION` – Maximum segment duration
- `#EXT-X-MEDIA-SEQUENCE` – Media sequence number
- `#EXT-X-DISCONTINUITY-SEQUENCE` – Discontinuity sequence number
- `#EXT-X-ENDLIST` – End of playlist
- `#EXT-X-PLAYLIST-TYPE` – `EVENT` or `VOD`
- `#EXT-X-I-FRAMES-ONLY` – I-frame only playlist
- `#EXT-X-SERVER-CONTROL` – LL-HLS server control
- `#EXT-X-PART-INF` – LL-HLS part target
- `#EXT-X-PREFETCH` – Prefetch segment (LL-HLS)
- `#EXT-X-RENDITION-REPORT` – Rendition report (LL-HLS)
- `#EXT-X-SKIP` – Skip segments (LL-HLS)

### Master Playlist Tags

- `#EXT-X-MEDIA` – Alternative renditions
- `#EXT-X-STREAM-INF` – Variant stream
- `#EXT-X-I-FRAME-STREAM-INF` – I-frame variant stream
- `#EXT-X-SESSION-DATA` – Session metadata
- `#EXT-X-SESSION-KEY` – Session encryption key

### Media or Master Playlist Tags

- `#EXT-X-INDEPENDENT-SEGMENTS` – Independent segments
- `#EXT-X-START` – Preferred start position
- `#EXT-X-DEFINE` – Variable definitions

## Error Handling

The parser throws `InvalidPlaylistError` (a subclass of `Error`) when a playlist violates RFC 8216 rules:

```typescript
import { parse, InvalidPlaylistError } from "@skax/hls-parse";

try {
  const playlist = parser(invalidM3u8);
} catch (error) {
  if (error instanceof InvalidPlaylistError) {
    console.error("Invalid playlist:", error.message);
  }
}
```

## Examples

See the [examples](./examples) directory for runnable examples:

```bash
npx ts-node examples/basic.ts
```

## Build

```bash
npm run build
```

Produces CJS, ESM, and TypeScript declaration files in `dist/`.

## Test

```bash
npm test
```

## License

MIT
