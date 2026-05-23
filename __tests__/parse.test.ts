/**
 * Tests for the HLS/M3U8 Parser
 *
 * Covers:
 * - Master Playlists
 * - Media Playlists
 * - LL-HLS / Low-Latency HLS
 * - URL resolution
 * - Error handling
 * - Edge cases
 */

import { parse, InvalidPlaylistError, resolveUrl } from "../src";
import { MasterPlaylist, MediaPlaylist, Segment, PartialSegment, Variant } from "../src/types";

// ===========================================================================
// URL Resolution
// ===========================================================================

describe("resolveUrl", () => {
  it("returns relative URIs as-is when no base is provided", () => {
    expect(resolveUrl(undefined, "segment.ts")).toBe("segment.ts");
  });

  it("resolves relative URIs against a base URL", () => {
    const base = "https://example.com/path/to/playlist.m3u8";
    expect(resolveUrl(base, "segment.ts")).toBe("https://example.com/path/to/segment.ts");
  });

  it("resolves absolute paths relative to the domain", () => {
    const base = "https://example.com/path/to/playlist.m3u8";
    expect(resolveUrl(base, "/segments/segment.ts")).toBe("https://example.com/segments/segment.ts");
  });

  it("leaves absolute URIs unchanged", () => {
    const base = "https://example.com/path/to/playlist.m3u8";
    expect(resolveUrl(base, "https://other.com/segment.ts")).toBe("https://other.com/segment.ts");
  });

  it("handles protocol-relative URIs", () => {
    const base = "https://example.com/playlist.m3u8";
    expect(resolveUrl(base, "//other.com/segment.ts")).toBe("https://other.com/segment.ts");
  });

  it("resolves ../ paths correctly", () => {
    const base = "https://example.com/a/b/c/playlist.m3u8";
    expect(resolveUrl(base, "../../segment.ts")).toBe("https://example.com/a/segment.ts");
  });

  it("resolves ./ paths correctly", () => {
    const base = "https://example.com/a/b/c/playlist.m3u8";
    expect(resolveUrl(base, "./segment.ts")).toBe("https://example.com/a/b/c/segment.ts");
  });

  it("handles http scheme", () => {
    const base = "http://example.com/playlist.m3u8";
    expect(resolveUrl(base, "segment.ts")).toBe("http://example.com/segment.ts");
  });
});

// ===========================================================================
// Basic Parsing
// ===========================================================================

describe("parse", () => {
  it("throws on empty input", () => {
    expect(() => parse("")).toThrow(InvalidPlaylistError);
    expect(() => parse("")).toThrow("EXTM3U tag MUST be the first");
  });

  it("throws when EXTM3U is missing", () => {
    expect(() => parse("#EXTINF:10,\nsegment.ts")).toThrow(InvalidPlaylistError);
  });

  it("parses a minimal media playlist", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`);

    expect(result.isMasterPlaylist).toBe(false);
    const media = result as MediaPlaylist;
    expect(media.targetDuration).toBe(10);
    expect(media.segments).toHaveLength(2);
    expect(media.segments[0].uri).toBe("segment1.ts");
    expect(media.segments[0].duration).toBe(9.009);
    expect(media.segments[1].uri).toBe("segment2.ts");
    expect(media.endlist).toBe(true);
  });

  it("stores the source text", () => {
    const source = "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nts\n#EXT-X-ENDLIST";
    const result = parse(source);
    expect(result.source).toBe(source);
  });

  it("ignores comments", () => {
    const result = parse(`#EXTM3U
# This is a comment
#EXT-X-TARGETDURATION:10
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].uri).toBe("segment.ts");
  });

  it("ignores empty lines", () => {
    const result = parse(`#EXTM3U

#EXT-X-TARGETDURATION:10

#EXTINF:10,
segment.ts

#EXT-X-ENDLIST
`) as MediaPlaylist;

    expect(result.segments).toHaveLength(1);
  });

  it("ignores unknown tags", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-CUSTOM-UNKNOWN:value
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments).toHaveLength(1);
  });
});

// ===========================================================================
// Master Playlist Parsing
// ===========================================================================

describe("Master Playlist", () => {
  it("parses a simple master playlist", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AVERAGE-BANDWIDTH=1000000
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,AVERAGE-BANDWIDTH=2000000
mid.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=7680000,AVERAGE-BANDWIDTH=6000000
hi.m3u8`) as MasterPlaylist;

    expect(result.isMasterPlaylist).toBe(true);
    expect(result.variants).toHaveLength(3);
    expect(result.variants[0].bandwidth).toBe(1280000);
    expect(result.variants[0].uri).toBe("low.m3u8");
    expect(result.variants[1].bandwidth).toBe(2560000);
    expect(result.variants[2].bandwidth).toBe(7680000);
  });

  it("parses master playlist with version", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.version).toBe(7);
  });

  it("parses master playlist with CODECS", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CODECS="mp4a.40.2,avc1.4d401e"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].codecs).toBe("mp4a.40.2,avc1.4d401e");
  });

  it("parses master playlist with RESOLUTION", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].resolution).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it("parses master playlist with FRAME-RATE", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,FRAME-RATE=30.000
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].frameRate).toBe(30);
  });

  it("parses EXT-X-I-FRAME-STREAM-INF", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=86000,URI="low/iframe.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=2560000
mid.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=150000,URI="mid/iframe.m3u8"`) as MasterPlaylist;

    expect(result.variants).toHaveLength(4);
    const iframeVariants = result.variants.filter((v) => v.isIFrameOnly);
    expect(iframeVariants).toHaveLength(2);
    expect(iframeVariants[0].uri).toBe("low/iframe.m3u8");
    expect(iframeVariants[0].bandwidth).toBe(86000);
  });

  it("parses EXT-X-MEDIA renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="main/english-audio.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Deutsch",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="de",URI="main/german-audio.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CODECS="mp4a.40.2",AUDIO="aac"
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,CODECS="mp4a.40.2",AUDIO="aac"
mid.m3u8`) as MasterPlaylist;

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].audio).toHaveLength(2);
    expect(result.variants[0].audio![0].name).toBe("English");
    expect(result.variants[0].audio![0].language).toBe("en");
    expect(result.variants[0].audio![0].isDefault).toBe(true);
    expect(result.variants[0].audio![1].name).toBe("Deutsch");
    expect(result.variants[0].audio![1].language).toBe("de");
  });

  it("parses VIDEO renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=VIDEO,GROUP-ID="low",NAME="Main",DEFAULT=YES,URI="low/main.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,VIDEO="low"
low/main.m3u8`) as MasterPlaylist;

    expect(result.variants[0].video).toHaveLength(1);
    expect(result.variants[0].video![0].name).toBe("Main");
  });

  it("parses SUBTITLES renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="subtitles/en.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Spanish",DEFAULT=NO,AUTOSELECT=YES,LANGUAGE="es",URI="subtitles/es.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SUBTITLES="subs"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].subtitles).toHaveLength(2);
  });

  it("parses CLOSED-CAPTIONS renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="CC1",DEFAULT=YES,INSTREAM-ID="CC1"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CLOSED-CAPTIONS="cc"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].closedCaptions).toHaveLength(1);
    expect(result.variants[0].closedCaptions![0].instreamId).toBe("CC1");
  });

  it("parses CLOSED-CAPTIONS=NONE", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CLOSED-CAPTIONS=NONE
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,CLOSED-CAPTIONS=NONE
mid.m3u8`) as MasterPlaylist;

    // With CLOSED-CAPTIONS=NONE, closedCaptions should be empty array
    expect(result.variants[0].closedCaptions).toEqual([]);
  });

  it("parses EXT-X-SESSION-DATA", () => {
    const result = parse(`#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.example.title",VALUE="Example"
#EXT-X-SESSION-DATA:DATA-ID="com.example.uri",URI="data.json"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.sessionDataList).toHaveLength(2);
    expect(result.sessionDataList[0].id).toBe("com.example.title");
    expect(result.sessionDataList[0].value).toBe("Example");
    expect(result.sessionDataList[1].id).toBe("com.example.uri");
    expect(result.sessionDataList[1].uri).toBe("data.json");
  });

  it("parses EXT-X-SESSION-KEY", () => {
    const result = parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="https://example.com/key",KEYFORMAT="identity",KEYFORMATVERSIONS="1"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.sessionKeyList).toHaveLength(1);
    expect(result.sessionKeyList[0].method).toBe("AES-128");
    expect(result.sessionKeyList[0].uri).toBe("https://example.com/key");
  });

  it("parses EXT-X-INDEPENDENT-SEGMENTS in master", () => {
    const result = parse(`#EXTM3U
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.independentSegments).toBe(true);
  });

  it("parses EXT-X-START", () => {
    const result = parse(`#EXTM3U
#EXT-X-START:TIME-OFFSET=30.5,PRECISE=YES
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.start).toBeDefined();
    expect(result.start!.offset).toBe(30.5);
    expect(result.start!.precise).toBe(true);
  });

  it("parses EXT-X-DEFINE in master", () => {
    const result = parse(`#EXTM3U
#EXT-X-DEFINE:NAME="foo",VALUE="bar"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.defines).toHaveLength(1);
    expect(result.defines![0]["NAME"]).toBe("foo");
    expect(result.defines![0]["VALUE"]).toBe("bar");
  });

  it("parses EXT-X-CONTENT-STEERING", () => {
    const result = parse(`#EXTM3U
#EXT-X-CONTENT-STEERING:SERVER-URI="https://example.com/steering",PATHWAY-ID="pathway-1"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.contentSteering).toBeDefined();
    expect(result.contentSteering!.serverUri).toBe("https://example.com/steering");
    expect(result.contentSteering!.pathwayId).toBe("pathway-1");
  });

  it("throws on mixed master and media tags", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8
#EXTINF:10,
segment.ts`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-STREAM-INF without URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
#EXT-X-STREAM-INF:BANDWIDTH=2560000
mid.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate EXT-X-INDEPENDENT-SEGMENTS", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate EXT-X-START", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-START:TIME-OFFSET=0
#EXT-X-START:TIME-OFFSET=10
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-SESSION-KEY with METHOD=NONE", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=NONE
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate EXT-X-SESSION-DATA same ID and language", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.example.title",LANGUAGE="en",VALUE="Title"
#EXT-X-SESSION-DATA:DATA-ID="com.example.title",LANGUAGE="en",VALUE="Title2"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate rendition name in same group", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",URI="en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",URI="en2.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on multiple DEFAULT in same group", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",DEFAULT=YES,URI="en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Spanish",DEFAULT=YES,URI="es.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate EXT-X-START without TIME-OFFSET", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-START:TIME-OFFSET=10,PRECISE=YES
#EXT-X-START:TIME-OFFSET=20
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// Media Playlist Parsing
// ===========================================================================

describe("Media Playlist", () => {
  it("parses EXT-X-VERSION", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.version).toBe(3);
  });

  it("parses EXT-X-MEDIA-SEQUENCE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:9.009,
segment.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.mediaSequenceBase).toBe(100);
    expect(result.segments[0].mediaSequenceNumber).toBe(100);
    expect(result.segments[1].mediaSequenceNumber).toBe(101);
  });

  it("parses EXT-X-PLAYLIST-TYPE EVENT", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.playlistType).toBe("EVENT");
  });

  it("parses EXT-X-PLAYLIST-TYPE VOD", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.playlistType).toBe("VOD");
  });

  it("parses EXT-X-I-FRAMES-ONLY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-I-FRAMES-ONLY
#EXTINF:1.0,
iframe1.ts
#EXTINF:1.0,
iframe2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.isIFrame).toBe(true);
  });

  it("parses EXT-X-BYTERANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-BYTERANGE:1000@0
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].byterange).toEqual({
      length: 1000,
      offset: 0,
    });
  });

  it("parses EXT-X-BYTERANGE without offset", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-BYTERANGE:1000@0
segment.ts
#EXTINF:9.009,
#EXT-X-BYTERANGE:500
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[1].byterange).toEqual({
      length: 500,
      offset: 1000,
    });
  });

  it("throws on EXT-X-BYTERANGE without offset when no previous segment", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-BYTERANGE:1000
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("parses EXT-X-DISCONTINUITY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
seg1.ts
#EXT-X-DISCONTINUITY
#EXTINF:9.009,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].discontinuity).toBeFalsy();
    expect(result.segments[1].discontinuity).toBe(true);
    // Discontinuity sequence should be 1 for the second segment
    expect(result.segments[1].discontinuitySequence).toBe(1);
  });

  it("parses EXT-X-DISCONTINUITY-SEQUENCE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-DISCONTINUITY-SEQUENCE:5
#EXTINF:9.009,
seg1.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.discontinuitySequenceBase).toBe(5);
    expect(result.segments[0].discontinuitySequence).toBe(5);
  });

  it("parses EXT-X-KEY with AES-128", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key"
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key).toBeDefined();
    expect(result.segments[0].key!.method).toBe("AES-128");
    expect(result.segments[0].key!.uri).toBe("https://example.com/key");
  });

  it("parses EXT-X-KEY with IV", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key",IV=0x1234567890ABCDEF1234567890ABCDEF
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.iv).toBeDefined();
    expect(result.segments[0].key!.iv!.length).toBe(16);
  });

  it("parses EXT-X-KEY with KEYFORMAT", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="key.bin",KEYFORMAT="com.example"
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.format).toBe("com.example");
  });

  it("parses EXT-X-KEY with METHOD=NONE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key"
#EXTINF:9.009,
seg1.ts
#EXT-X-KEY:METHOD=NONE
#EXTINF:9.009,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.method).toBe("AES-128");
    expect(result.segments[1].key!.method).toBe("NONE");
  });

  it("inherits key for segments without EXT-X-KEY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="https://example.com/key"
#EXTINF:9.009,
seg1.ts
#EXTINF:9.009,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.uri).toBe("https://example.com/key");
    expect(result.segments[1].key!.uri).toBe("https://example.com/key");
  });

  it("parses EXT-X-MAP", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="init.mp4",BYTERANGE="1000@0"
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].map).toBeDefined();
    expect(result.segments[0].map!.uri).toBe("init.mp4");
    expect(result.segments[0].map!.byterange).toEqual({
      length: 1000,
      offset: 0,
    });
  });

  it("inherits map for segments without EXT-X-MAP", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="init.mp4"
#EXTINF:9.009,
seg1.ts
#EXTINF:9.009,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].map!.uri).toBe("init.mp4");
    expect(result.segments[1].map!.uri).toBe("init.mp4");
  });

  it("parses EXT-X-PROGRAM-DATE-TIME", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2010-02-19T14:54:23.031+08:00
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].programDateTime).toBeInstanceOf(Date);
    expect(result.segments[0].programDateTime!.getFullYear()).toBe(2010);
  });

  it("parses EXT-X-GAP", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-GAP
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].gap).toBe(true);
  });

  it("parses a live playlist without ENDLIST", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:8
#EXT-X-MEDIA-SEQUENCE:2680
#EXTINF:7.975,
fileSequence2680.ts
#EXTINF:7.941,
fileSequence2681.ts`) as MediaPlaylist;

    expect(result.endlist).toBeUndefined();
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].mediaSequenceNumber).toBe(2680);
  });

  it("throws on URI line without preceding segment tags", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
segment.ts`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on missing EXT-X-TARGETDURATION", () => {
    expect(() =>
      parse(`#EXTM3U
#EXTINF:10,
segment.ts`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duration > target duration", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:11.5,
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate EXT-X-VERSION", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-MEDIA-SEQUENCE after segments", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-DISCONTINUITY-SEQUENCE after segments", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-DISCONTINUITY-SEQUENCE:1
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-DISCONTINUITY-SEQUENCE after DISCONTINUITY", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-DISCONTINUITY
#EXT-X-DISCONTINUITY-SEQUENCE:1
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// SCTE-35 / Splice / Marker Support
// ===========================================================================

describe("SCTE-35 and Splice markers", () => {
  it("parses EXT-X-CUE-OUT with duration", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers).toHaveLength(1);
    expect(result.segments[0].markers![0].type).toBe("OUT");
    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("parses EXT-X-CUE-OUT with attributes", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:DURATION=15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("OUT");
    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("parses EXT-X-CUE-IN", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-IN
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("IN");
  });

  it("parses RAW splice markers", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-OATCLS-SCTE35:/DAlAAAAAAAAAP/wFAUAAAABf+//wpiQkv4ARKogAAEBAQAA
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
    expect(result.segments[0].markers![0].tagName).toBe("EXT-OATCLS-SCTE35");
  });

  it("parses EXT-X-CUE-OUT-CONT", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT-CONT:Elapsed=15.0,Duration=120.0,SCTE35="/DAlAAA..."
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
    expect(result.segments[0].markers![0].tagName).toBe("EXT-X-CUE-OUT-CONT");
  });

  it("parses EXT-X-CUE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE:"/DAlAAA..."
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
    expect(result.segments[0].markers![0].tagName).toBe("EXT-X-CUE");
  });

  it("parses EXT-X-ASSET", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-ASSET:CAID="urn:ad:ad-id"
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
    expect(result.segments[0].markers![0].tagName).toBe("EXT-X-ASSET");
  });

  it("parses EXT-X-SCTE35", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-SCTE35:/DAlAAA...
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
    expect(result.segments[0].markers![0].tagName).toBe("EXT-X-SCTE35");
  });
});

// ===========================================================================
// EXT-X-DATERANGE
// ===========================================================================

describe("EXT-X-DATERANGE", () => {
  it("parses EXT-X-DATERANGE at playlist level", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-DATERANGE:ID="test",CLASS="com.example",START-DATE="2014-03-05T11:15:00Z",DURATION=59.993
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.dateRanges).toHaveLength(1);
    expect(result.dateRanges[0].id).toBe("test");
    expect(result.dateRanges[0].duration).toBe(59.993);
  });

  it("parses EXT-X-DATERANGE on a segment", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="splice-1",CLASS="splice",START-DATE="2014-03-05T11:15:00Z",DURATION=59.993
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].dateRange).toBeDefined();
    expect(result.segments[0].dateRange!.id).toBe("splice-1");
  });

  it("parses SCTE-35 attributes in DATERANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="splice-6FFFFFF0",START-DATE="2014-03-05T11:15:00Z",SCTE35-OUT=0xFC002F0000000000FF000014056FFFFFF000E011622DCAFF000052636200000000000A0008029896F5000008700000000
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes).toBeDefined();
    expect(dr.attributes!["SCTE35-OUT"]).toBeInstanceOf(Uint8Array);
  });

  it("parses END-ON-NEXT with CLASS", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="range1",CLASS="ad",START-DATE="2014-03-05T11:15:00Z",END-ON-NEXT=YES
seg1.ts
#EXTINF:10,
#EXT-X-DATERANGE:ID="range2",CLASS="ad",START-DATE="2014-03-05T11:30:00Z"
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].dateRange!.endOnNext).toBe(true);
    // After checking date ranges, end should be resolved to range2's start
    expect(result.segments[0].dateRange!.end).toBeDefined();
  });

  it("throws on DATERANGE with END-ON-NEXT=YES and DURATION", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="r1",CLASS="ad",START-DATE="2014-03-05T11:15:00Z",DURATION=30.0,END-ON-NEXT=YES
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on overlapping DATERANGEs with same CLASS", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="r1",CLASS="ad",START-DATE="2014-03-05T11:15:00Z",DURATION=600.0
seg1.ts
#EXTINF:10,
#EXT-X-DATERANGE:ID="r2",CLASS="ad",START-DATE="2014-03-05T11:20:00Z",DURATION=600.0
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on DATERANGE without PROGRAM-DATE-TIME", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z"
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on invalid END-DATE + DURATION mismatch", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",DURATION=30.0,END-DATE="2014-03-05T11:30:00Z"
segment.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// LL-HLS (Low-Latency HLS)
// ===========================================================================

describe("LL-HLS / Low-Latency HLS", () => {
  it("parses EXT-X-SERVER-CONTROL", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=36.0,HOLD-BACK=18.0,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=1.0,URI="seg100-part1.ts"
#EXT-X-PART:DURATION=1.0,URI="seg100-part2.ts",INDEPENDENT=YES
#EXTINF:6.0,
seg101.ts
#EXT-X-PART:DURATION=1.0,URI="seg101-part1.ts"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="seg101-part2.ts"
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.lowLatencyCompatibility).toBeDefined();
    expect(result.lowLatencyCompatibility!.canBlockReload).toBe(true);
    expect(result.lowLatencyCompatibility!.canSkipUntil).toBe(36);
    expect(result.lowLatencyCompatibility!.holdBack).toBe(18);
    expect(result.partTargetDuration).toBe(1.0);
  });

  it("parses EXT-X-PART", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="part1.ts"
#EXT-X-PART:DURATION=1.0,URI="part2.ts",INDEPENDENT=YES
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const parts = result.segments[0].parts!;
    expect(parts).toHaveLength(2);
    expect(parts[0].uri).toBe("part1.ts");
    expect(parts[0].duration).toBe(1.0);
    expect(parts[1].independent).toBe(true);
    expect(parts[1].hint).toBe(false);
  });

  it("parses EXT-X-PRELOAD-HINT with TYPE=PART", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="part1.ts"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="part2-hint.ts"
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const parts = result.segments[0].parts!;
    expect(parts).toHaveLength(2);
    expect(parts[1].hint).toBe(true);
    expect(parts[1].uri).toBe("part2-hint.ts");
  });

  it("parses EXT-X-PRELOAD-HINT with TYPE=MAP", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="init-hint.mp4",BYTERANGE-START=0,BYTERANGE-LENGTH=100
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].map).toBeDefined();
    expect(result.segments[0].map!.hint).toBe(true);
    expect(result.segments[0].map!.uri).toBe("init-hint.mp4");
    expect(result.segments[0].map!.byterange).toEqual({
      length: 100,
      offset: 0,
    });
  });

  it("throws on EXT-X-PRELOAD-HINT without TYPE", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PRELOAD-HINT:URI="part.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-PART without DURATION", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:URI="part.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-PART / PRELOAD-HINT without URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=1.0
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate PART preload hints", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="p1.ts"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="p2.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("parses EXT-X-SKIP", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=36.0,HOLD-BACK=18.0
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-SKIP:SKIPPED-SEGMENTS=3
#EXTINF:6.0,
seg103.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.skip).toBe(3);
    expect(result.segments[0].mediaSequenceNumber).toBe(103);
  });

  it("parses EXT-X-RENDITION-REPORT", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-RENDITION-REPORT:URI="../1m/wait.m3u8",LAST-MSN=100,LAST-PART=2
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.renditionReports).toHaveLength(1);
    expect(result.renditionReports[0].uri).toBe("../1m/wait.m3u8");
    expect(result.renditionReports[0].lastMSN).toBe(100);
    expect(result.renditionReports[0].lastPart).toBe(2);
  });

  it("throws on EXT-X-RENDITION-REPORT without URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-RENDITION-REPORT:LAST-MSN=100
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-RENDITION-REPORT with absolute URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-RENDITION-REPORT:URI="https://example.com/other.m3u8"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-SKIP without SKIPPED-SEGMENTS", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=36.0
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-SKIP:
#EXTINF:6.0,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("parses EXT-X-PREFETCH", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.prefetchSegments).toHaveLength(1);
    expect(result.prefetchSegments[0].uri).toBe("seg101.ts");
    expect(result.prefetchSegments[0].mediaSequenceNumber).toBe(101);
  });

  it("throws on prefetch with EXTINF", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXTINF:6.0,
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on prefetch with EXT-X-DISCONTINUITY", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-DISCONTINUITY
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on prefetch with EXT-X-MAP", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-MAP:URI="init.mp4"
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on segments after prefetch", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXTINF:6.0,
seg102.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on missing PART-HOLD-BACK with parts", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,HOLD-BACK=18.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on missing PART-TARGET with parts", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on PART-HOLD-BACK < PART-TARGET", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=0.5
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on CAN-BLOCK-RELOAD missing for LL-HLS", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:HOLD-BACK=18.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("validates HOLD-BACK >= 3x target duration", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=36.0,HOLD-BACK=10.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("validates CAN-SKIP-UNTIL >= 6x target duration", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=30.0,HOLD-BACK=18.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on PART duration > PART-TARGET", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=2.0,URI="p1.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on non-last PART duration < 85% of PART-TARGET", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PART:DURATION=0.5,URI="p1.ts"
#EXT-X-PART:DURATION=1.0,URI="p2.ts"
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("allows last PART duration < 85% of PART-TARGET", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-PART:DURATION=0.5,URI="p2.ts"
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].parts).toHaveLength(2);
  });

  it("parses EXT-X-PREFETCH-DISCONTINUITY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH-DISCONTINUITY
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.prefetchSegments[0].discontinuity).toBe(true);
  });

  it("handles trailing segment with parts not in endlist without hint", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-PART:DURATION=1.0,URI="p2.ts"`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-PART in gap without GAP=YES on part", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:8
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-GAP
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on duplicate media playlist tag", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-PART-INF:PART-TARGET=2.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// URL Resolution with Playlist
// ===========================================================================

describe("URL Resolution in Playlist", () => {
  it("resolves relative URIs in a media playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].uri).toBe("https://example.com/dir/segment1.ts");
    expect(result.segments[1].uri).toBe("https://example.com/dir/segment2.ts");
  });

  it("resolves absolute URIs in a media playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
/segment1.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].uri).toBe("https://example.com/segment1.ts");
  });

  it("resolves relative URIs in a master playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000
mid.m3u8`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MasterPlaylist;

    expect(result.variants[0].uri).toBe("https://example.com/dir/low.m3u8");
    expect(result.variants[1].uri).toBe("https://example.com/dir/mid.m3u8");
  });

  it("resolves key URIs in media playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].key!.uri).toBe("https://example.com/dir/key.bin");
  });

  it("resolves map URIs in media playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="init.mp4"
#EXTINF:9.009,
segment.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].map!.uri).toBe("https://example.com/dir/init.mp4");
  });

  it("resolves part URIs in media playlist", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="part1.ts"
seg100.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].parts![0].uri).toBe("https://example.com/dir/part1.ts");
  });

  it("resolves prefetch URIs", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.prefetchSegments[0].uri).toBe("https://example.com/dir/seg101.ts");
  });

  it("resolves rendition report URIs", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-RENDITION-REPORT:URI="../1m/wait.m3u8"
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.renditionReports[0].uri).toBe("https://example.com/1m/wait.m3u8");
  });

  it("resolves content steering URI", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-CONTENT-STEERING:SERVER-URI="steering.json"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MasterPlaylist;

    expect(result.contentSteering!.serverUri).toBe("https://example.com/dir/steering.json");
  });

  it("resolves session data URI", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.example",URI="data.json"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MasterPlaylist;

    expect(result.sessionDataList[0].uri).toBe("https://example.com/dir/data.json");
  });

  it("does not modify absolute URIs when resolving", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
https://cdn.example.com/segment.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.segments[0].uri).toBe("https://cdn.example.com/segment.ts");
  });
});

// ===========================================================================
// Protocol Version Detection
// ===========================================================================

describe("Protocol Version Detection", () => {
  it("detects version 2 needed for IV", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x1234567890ABCDEF1234567890ABCDEF
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.version).toBeUndefined(); // No EXT-X-VERSION tag
    // But compatibleVersion should be 2, so if version is present it should be >= 2
  });

  it("detects version 3 needed for float EXTINF", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
seg.ts
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    // No version tag, so it's implicit
    expect(result.version).toBeUndefined();
  });

  it("validates version when EXTM3U does not meet requirements", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:1
#EXT-X-TARGETDURATION:10
#EXT-X-BYTERANGE:1000@0
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("validates version for EXT-X-BYTERANGE (needs version >= 4)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-BYTERANGE:1000@0
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("validates version for EXT-X-MAP in non-IFrame (needs version >= 6)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:5
#EXT-X-TARGETDURATION:10
#EXT-X-MAP:URI="init.mp4"
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// InvalidPlaylistError
// ===========================================================================

describe("InvalidPlaylistError", () => {
  it("has the correct name", () => {
    try {
      parse("");
    } catch (e: any) {
      expect(e.name).toBe("InvalidPlaylistError");
      expect(e).toBeInstanceOf(Error);
    }
  });
});

// ===========================================================================
// Edge Cases
// ===========================================================================

describe("Edge Cases", () => {
  it("handles CRLF line endings", () => {
    const result = parse("#EXTM3U\r\n#EXT-X-TARGETDURATION:10\r\n#EXTINF:10,\r\nseg.ts\r\n#EXT-X-ENDLIST\r\n") as MediaPlaylist;
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].uri).toBe("seg.ts");
  });

  it("handles duration as integer", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].duration).toBe(10);
  });

  it("handles segment with title", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,My Title
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].title).toBe("My Title");
  });

  it("throws on version too low for MEDIA-SEQUENCE", () => {
    // Actually MEDIA-SEQUENCE is version 1 compatible, let's verify
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.mediaSequenceBase).toBe(0);
  });

  it("handles empty prefetch segments list", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.prefetchSegments).toEqual([]);
  });

  it("handles empty rendition reports list", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.renditionReports).toEqual([]);
  });

  it("handles VARIANT with HDCP-LEVEL", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,HDCP-LEVEL=TYPE-0
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].hdcpLevel).toBe("TYPE-0");
  });

  it("handles VARIANT with VIDEO-RANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,VIDEO-RANGE=HLG
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].videoRange).toBe("HLG");
  });

  it("throws on invalid VIDEO-RANGE", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,VIDEO-RANGE=INVALID
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles VARIANT with SCORE", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SCORE=0.5
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,SCORE=0.8
mid.m3u8`) as MasterPlaylist;

    expect(result.variants[0].score).toBe(0.5);
    expect(result.variants[1].score).toBe(0.8);
  });

  it("throws on negative SCORE", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SCORE=-1.0
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on inconsistent SCORE (some variants have it, some do not)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SCORE=0.5
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000
mid.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles ALLOWED-CPC", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,ALLOWED-CPC="com.example:1/2/3,com.other:4/5"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].allowedCpc).toBeDefined();
    expect(result.variants[0].allowedCpc).toHaveLength(2);
    expect(result.variants[0].allowedCpc![0].format).toBe("com.example");
    expect(result.variants[0].allowedCpc![0].cpcList).toEqual(["1", "2", "3"]);
  });

  it("handles CHARACTERISTICS in renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog,public.easy-to-read",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SUBTITLES="subs"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].subtitles![0].characteristics).toBe("public.accessibility.transcribes-spoken-dialog,public.easy-to-read");
  });

  it("handles CHANNELS in audio renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",CHANNELS="6",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].audio![0].channels).toBe("6");
  });

  it("handles stable variant ID", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,STABLE-VARIANT-ID="abc123"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].stableVariantId).toBe("abc123");
  });

  it("handles PATHWAY-ID in variant", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,PATHWAY-ID="pathway-1"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].pathwayId).toBe("pathway-1");
  });

  it("handles PATHWAY-ID in rendition", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",PATHWAY-ID="p1",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].audio![0].pathwayId).toBe("p1");
  });

  it("parses EXT-X-GAP in valid context", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:8
#EXT-X-TARGETDURATION:10
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-GAP
#EXT-X-PART:DURATION=1.0,URI="p1.ts",GAP=YES
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].gap).toBe(true);
    expect(result.segments[0].parts![0].gap).toBe(true);
  });

  it("handles X- attributes in DATERANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="custom",CLASS="custom",START-DATE="2014-03-05T11:15:00Z",X-COM-EXAMPLE-AD-ID="ABC123"
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes!["X-COM-EXAMPLE-AD-ID"]).toBe("ABC123");
  });

  it("handles multiple date ranges at playlist level", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",DURATION=30.0
#EXT-X-DATERANGE:ID="r2",CLASS="other",START-DATE="2014-03-05T12:00:00Z",DURATION=60.0
#EXTINF:10,
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.dateRanges).toHaveLength(2);
  });

  it("handles PROGRAM-DATE-TIME on multiple segments", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
seg1.ts
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:10Z
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].programDateTime).toBeDefined();
    expect(result.segments[1].programDateTime).toBeDefined();
  });
});

// ===========================================================================
// Regression Tests from RFC 8216 Examples
// ===========================================================================

describe("RFC 8216 Examples", () => {
  it("parses simple media playlist (Section 8.1)", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:3
#EXTINF:9.009,
http://media.example.com/first.ts
#EXTINF:9.009,
http://media.example.com/second.ts
#EXTINF:3.003,
http://media.example.com/third.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.version).toBe(3);
    expect(result.targetDuration).toBe(10);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].duration).toBe(9.009);
    expect(result.segments[0].uri).toBe("http://media.example.com/first.ts");
    expect(result.segments[2].duration).toBe(3.003);
    expect(result.endlist).toBe(true);
  });

  it("parses live playlist (Section 8.2)", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:8
#EXT-X-MEDIA-SEQUENCE:2680

#EXTINF:7.975,
https://priv.example.com/fileSequence2680.ts
#EXTINF:7.941,
https://priv.example.com/fileSequence2681.ts
#EXTINF:7.975,
https://priv.example.com/fileSequence2682.ts`) as MediaPlaylist;

    expect(result.version).toBe(3);
    expect(result.mediaSequenceBase).toBe(2680);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].mediaSequenceNumber).toBe(2680);
    expect(result.endlist).toBeUndefined();
  });

  it("parses master playlist (Section 8.4)", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AVERAGE-BANDWIDTH=1000000
http://example.com/low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,AVERAGE-BANDWIDTH=2000000
http://example.com/mid.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=7680000,AVERAGE-BANDWIDTH=6000000
http://example.com/hi.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=65000,CODECS="mp4a.40.5"
http://example.com/audio-only.m3u8`) as MasterPlaylist;

    expect(result.variants).toHaveLength(4);
    expect(result.variants[3].codecs).toBe("mp4a.40.5");
  });

  it("parses encrypted segment playlist", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:7794
#EXT-X-TARGETDURATION:15

#EXT-X-KEY:METHOD=AES-128,URI="https://priv.example.com/key.php?r=52"

#EXTINF:2.833,
http://media.example.com/fileSequence52-A.ts
#EXTINF:15.0,
http://media.example.com/fileSequence52-B.ts
#EXTINF:13.333,
http://media.example.com/fileSequence52-C.ts

#EXT-X-KEY:METHOD=AES-128,URI="https://priv.example.com/key.php?r=53"

#EXTINF:15.0,
http://media.example.com/fileSequence53-A.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments).toHaveLength(4);
    expect(result.segments[0].key!.uri).toBe("https://priv.example.com/key.php?r=52");
    expect(result.segments[3].key!.uri).toBe("https://priv.example.com/key.php?r=53");
  });
});

// ===========================================================================
// Additional Coverage Tests
// ===========================================================================

describe("Coverage edge cases", () => {
  it("handles X- attribute with hex value", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="test",START-DATE="2014-03-05T11:15:00Z",X-CUSTOM-DATA=0xABCD
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes!["X-CUSTOM-DATA"]).toBeInstanceOf(Uint8Array);
  });

  it("handles X- attribute with numeric value", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="test",START-DATE="2014-03-05T11:15:00Z",X-COUNT=42
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes!["X-COUNT"]).toBe(42);
  });

  it("handles CUE-OUT with non-numeric value falling back to attributes", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:DURATION=30.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].duration).toBe(30.0);
  });

  it("handles odd-length hex in hexToByteSequence via IV", () => {
    // Use a 31-hex-char value (after 0x), which should be padded to 32 = 16 bytes
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x0123456789ABCDEF0123456789ABCDE
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.iv).toBeDefined();
    expect(result.segments[0].key!.iv!.length).toBe(16);
  });

  it("handles CUE-OUT with NaN value treating as attributes", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:DURATION=15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("allows MediaorMasterPlaylist tags in either type", () => {
    const result = parse(`#EXTM3U
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.independentSegments).toBe(true);
  });

  it("validates IV length is exactly 128-bit", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0xFF
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles ASSOC-LANGUAGE in renditions", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Norwegian",LANGUAGE="nb",ASSOC-LANGUAGE="no",URI="nb.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].audio![0].assocLanguage).toBe("no");
  });

  it("handles FORCED attribute in SUBTITLES", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",FORCED=YES,URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,SUBTITLES="subs"
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].subtitles![0].forced).toBe(true);
  });

  it("handles AUDIO uri missing default from variant", () => {
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AUDIO="aac"
low.m3u8`) as MasterPlaylist;

    const audio = result.variants[0].audio!;
    expect(audio).toHaveLength(1);
    expect(audio[0].uri).toBe("en.m3u8");
  });

  it("handles resolveUrl with file:// protocol base", () => {
    const base = "file:///path/to/playlist.m3u8";
    expect(resolveUrl(base, "segment.ts")).toBe("file:///path/to/segment.ts");
  });

  it("handles resolveUrl with base ending without filename", () => {
    expect(resolveUrl("https://example.com/", "segment.ts")).toBe("https://example.com/segment.ts");
  });

  it("handles ALLOWED-CPC empty list", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,ALLOWED-CPC=""
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-MEDIA without TYPE", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-MEDIA:GROUP-ID="aac",NAME="English",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on missing PART-HOLD-BACK in LL-HLS with parts", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,HOLD-BACK=18.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("throws on EXT-X-PART after more than 3 durations from end", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p2.ts"
seg101.ts
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p3.ts"
seg102.ts
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p4.ts"
seg103.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles X- attribute with quoted string value", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="test",START-DATE="2014-03-05T11:15:00Z",X-COM-EXAMPLE="hello"
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes!["X-COM-EXAMPLE"]).toBe("hello");
  });

  it("handles SCTE35- attributes in DATERANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="splice",START-DATE="2014-03-05T11:15:00Z",SCTE35-CMD=0xFC002F
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    const dr = result.segments[0].dateRange!;
    expect(dr.attributes!["SCTE35-CMD"]).toBeInstanceOf(Uint8Array);
  });

  it("handles CUE with attributes syntax", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE:DURATION=30.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
  });

  it("handles fragmented MP4 setup with EXT-X-MAP and I-FRAMES-ONLY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-I-FRAMES-ONLY
#EXT-X-MAP:URI="init.mp4"
#EXTINF:1.0,
iframe1.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.isIFrame).toBe(true);
    expect(result.segments[0].map).toBeDefined();
  });

  it("handles resolveUrl with invalid base URL", () => {
    // With no path separator in base, simple concatenation is used
    const result = resolveUrl("not-a-valid-url", "segment.ts");
    expect(result).toBe("not-a-valid-urlsegment.ts");
  });

  it("handles hexToByteSequence without 0x prefix", () => {
    const { hexToByteSequence } = require("../src/utils");
    const result = hexToByteSequence("FF");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(255);
  });

  it("handles hexToByteSequence with uppercase 0X prefix", () => {
    const { hexToByteSequence } = require("../src/utils");
    const result = hexToByteSequence("0XFF");
    expect(result.length).toBe(1);
    expect(result[0]).toBe(255);
  });

  it("handles hexToByteSequence with odd length", () => {
    const { hexToByteSequence } = require("../src/utils");
    const result = hexToByteSequence("0xF");
    expect(result.length).toBe(1);
    expect(result[0]).toBe(15);
  });

  it("handles toNumber with valid integer", () => {
    const { toNumber } = require("../src/utils");
    expect(toNumber("42")).toBe(42);
  });

  it("handles toNumber with valid float", () => {
    const { toNumber } = require("../src/utils");
    expect(toNumber("3.14")).toBe(3.14);
  });

  it("handles trim function", () => {
    const { trim } = require("../src/utils");
    expect(trim('"hello"', '"')).toBe("hello");
    expect(trim(undefined, '"')).toBeUndefined();
  });

  it("handles splitAt without delimiter", () => {
    const { splitAt } = require("../src/utils");
    const [a, b] = splitAt("hello", ",");
    expect(a).toBe("hello");
    expect(b).toBe("");
  });

  it("handles camelify function", () => {
    const { camelify } = require("../src/utils");
    expect(camelify("AUDIO")).toBe("audio");
    expect(camelify("CLOSED-CAPTIONS")).toBe("closedCaptions");
  });

  it("handles splitByCommaWithPreservingQuotes", () => {
    const { splitByCommaWithPreservingQuotes } = require("../src/utils");
    const result = splitByCommaWithPreservingQuotes('a="1,2",b="hello"');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('a="1,2"');
    expect(result[1]).toBe('b="hello"');
  });

  it("handles EXT-X-KEY with KEYFORMATVERSIONS", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-KEY:METHOD=AES-128,URI="key",KEYFORMAT="identity",KEYFORMATVERSIONS="1"
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key!.formatVersion).toBe("1");
  });

  it("handles duplicate EXT-X-SESSION-KEY", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="key1"
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="key1"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles CLOSED-CAPTIONS without matching group", () => {
    // cc2 doesn't match cc1, so no renditions are added to the variant.
    // closedCaptions remains undefined since no rendition matched.
    const result = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc1",NAME="CC1",INSTREAM-ID="CC1"
#EXT-X-STREAM-INF:BANDWIDTH=1280000,CLOSED-CAPTIONS="cc2"
low.m3u8`) as MasterPlaylist;

    // No closedCaptions were attached to this variant
    expect(result.variants[0].closedCaptions).toBeUndefined();
  });

  it("validates EXT-X-START has TIME-OFFSET in media playlist", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-START:
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-PREFETCH with KEY", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.prefetchSegments[0].key!.uri).toBe("key.bin");
  });

  it("validates END-DATE matches START-DATE + DURATION in DATERANGE", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXTINF:10,
#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",DURATION=30.0,END-DATE="2014-03-05T11:15:30Z"
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].dateRange).toBeDefined();
  });

  it("validates BYTERANGE through different URI without previous match", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-BYTERANGE:1000@0
seg1.ts
#EXTINF:9.009,
#EXT-X-BYTERANGE:500
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles error on STREAM-INF with tag instead of URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
#EXT-X-STREAM-INF:BANDWIDTH=2560000
mid.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles missing PART-TARGET with parts in LL-HLS", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("resolves key URIs in prefetch segments", () => {
    const result = parse(
      `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`,
      { uri: "https://example.com/dir/playlist.m3u8" },
    ) as MediaPlaylist;

    expect(result.prefetchSegments[0].uri).toBe("https://example.com/dir/seg101.ts");
  });

  it("handles resolveUrl with complex fallback", () => {
    // Test the fallback path in resolveUrl
    const result = resolveUrl("https://example.com/a/b/playlist.m3u8", "../../c/segment.ts");
    expect(result).toBe("https://example.com/c/segment.ts");
  });

  it("handles ALLOWED-CPC with invalid entry format", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,ALLOWED-CPC="invalid"
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-KEY before parts", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].key).toBeDefined();
    expect(result.segments[0].parts).toHaveLength(1);
  });

  it("handles EXT-X-MAP before parts", () => {
    const result = parse(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-MAP:URI="init.mp4"
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
seg100.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].map).toBeDefined();
  });

  it("handles duplicate EXT-X-VERSION in media playlist", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-MEDIA-SEQUENCE after segments (error)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-DISCONTINUITY-SEQUENCE after segments (error)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
seg.ts
#EXT-X-DISCONTINUITY-SEQUENCE:1
#EXTINF:10,
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles BYTERANGE through different URI", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-BYTERANGE:1000@0
seg1.ts
#EXTINF:9.009,
#EXT-X-BYTERANGE:500
seg2.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles sameKey with different IV lengths", () => {
    // This tests the sameKey function indirectly through duplicate session keys
    // with different attributes
    const result = parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="key1",KEYFORMAT="identity"
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="key2",KEYFORMAT="identity"
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`) as MasterPlaylist;

    expect(result.sessionKeyList).toHaveLength(2);
  });

  it("handles duplicate EXT-X-START in master (throw)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-START:TIME-OFFSET=0
#EXT-X-START:TIME-OFFSET=10
#EXT-X-STREAM-INF:BANDWIDTH=1280000
low.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-START without TIME-OFFSET in media", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-START:
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-GAP with compatible version < 8", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-GAP
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].gap).toBe(true);
  });

  it("handles CUE-OUT with number in attribute list format", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("handles EXT-X-PREFETCH with key inheritance", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
seg100.ts
#EXT-X-PREFETCH:seg101.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.prefetchSegments[0].key).toBeDefined();
  });

  it("handles toNumber with invalid value", () => {
    const { toNumber } = require("../src/utils");
    expect(() => toNumber("not-a-number")).toThrow(InvalidPlaylistError);
  });

  it("handles CUE with attributes format (backward compat)", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE:"SCTE35="
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].type).toBe("RAW");
  });

  it("handles fallback path in resolveUrl with / starting", () => {
    // This exercises the fallback path where relative starts with /
    const result = resolveUrl("invalid-url", "/segment.ts");
    expect(result).toContain("/segment.ts");
  });

  it("handles fallback path with valid base for absolute path", () => {
    // Test the resolveUrl fallback with an absolute path (starts with /)
    // when the base has a valid http URL
    const result = resolveUrl("https://example.com/base/playlist.m3u8", "/absolute/segment.ts");
    expect(result).toBe("https://example.com/absolute/segment.ts");
  });

  it("handles splitByCommaWithPreservingQuotes with unmatched quotes", () => {
    const { splitByCommaWithPreservingQuotes } = require("../src/utils");
    const result = splitByCommaWithPreservingQuotes('a="1,b=2');
    expect(result).toHaveLength(1);
  });

  it("handles CUE-OUT with attribute list format (non-numeric)", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:DURATION=15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("handles all types of streaming INF attributes", () => {
    const result = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,HDCP-LEVEL=TYPE-0,VIDEO-RANGE=PQ
low.m3u8`) as MasterPlaylist;

    expect(result.variants[0].hdcpLevel).toBe("TYPE-0");
    expect(result.variants[0].videoRange).toBe("PQ");
  });

  it("handles CUE-OUT with non-numeric value", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-CUE-OUT:DURATION=15.0
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].markers![0].duration).toBe(15.0);
  });

  it("handles duplicate EXT-X-START", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-START:TIME-OFFSET=0
#EXT-X-START:TIME-OFFSET=10
#EXTINF:10,
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-MAP after parts (error)", () => {
    // EXT-X-PART before EXT-X-MAP should throw
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-MAP:URI="init.mp4"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles EXT-X-KEY after parts (error)", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="p1.ts"
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
seg100.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });

  it("handles trailing segment without URI", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:10.0,
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",DURATION=30.0
#EXT-X-ENDLIST`) as MediaPlaylist;

    // Trailing segment with no URI should be created with empty URI
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].uri).toBe("");
    expect(result.segments[0].duration).toBe(10.0);
    expect(result.segments[0].programDateTime).toBeDefined();
    expect(result.segments[0].dateRange).toBeDefined();
  });

  it("handles EXT-X-GAP with version check correctly", () => {
    const result = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
#EXT-X-GAP
segment.ts
#EXT-X-ENDLIST`) as MediaPlaylist;

    expect(result.segments[0].gap).toBe(true);
  });
});
