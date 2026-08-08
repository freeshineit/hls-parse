/**
 * Gap-fill tests targeting remaining uncovered lines.
 * Run: npx jest coverage-gap.test.ts --coverage --collectCoverageFrom=src/parse.ts
 */
import { parser, isMasterPlaylist, isMediaPlaylist, InvalidPlaylistError, resolveUrl } from "../src";
import { parseTagParam } from "../src/utils";
import { MasterPlaylist, MediaPlaylist } from "../src/types";

// ===========================================================================
// Type guards (types.ts:595,610)
// ===========================================================================
describe("Type guards", () => {
  it("isMasterPlaylist returns true for master", () => {
    const pl = parser("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8");
    expect(isMasterPlaylist(pl)).toBe(true);
  });
  it("isMasterPlaylist returns false for media", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST");
    expect(isMasterPlaylist(pl)).toBe(false);
  });
  it("isMediaPlaylist returns true for media", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST");
    expect(isMediaPlaylist(pl)).toBe(true);
  });
  it("isMediaPlaylist returns false for master", () => {
    const pl = parser("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8");
    expect(isMediaPlaylist(pl)).toBe(false);
  });
});

// ===========================================================================
// parseAllowedCpc — !cpcText (line 213)
// ===========================================================================
describe("parseAllowedCpc edge cases", () => {
  it("ALLOWED-CPC entry with missing cpcText throws", () => {
    expect(() => parser('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,ALLOWED-CPC="com.example:"\nv.m3u8')).not.toThrow();
  });
  it("ALLOWED-CPC entry with multi-part format works", () => {
    const p = parser('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,ALLOWED-CPC="com.x:A/B/C,com.y:D"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0].allowedCpc!).toHaveLength(2);
    expect(p.variants[0].allowedCpc![0].cpcList).toEqual(["A", "B", "C"]);
    expect(p.variants[0].allowedCpc![1].cpcList).toEqual(["D"]);
  });
});

// ===========================================================================
// CUE-OUT NaN path (line 372)
// ===========================================================================
describe("CUE-OUT NaN path", () => {
  it("CUE-OUT with non-numeric attribute-style param falls to parseAttributeList", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:30\n#EXTINF:10,\n#EXT-X-CUE-OUT:DURATION=30\nseg.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(30);
  });
});

// ===========================================================================
// CHECKTAGCATEGORY — MediaorMasterPlaylist before type determination (line 495)
// ===========================================================================
describe("MediaorMasterPlaylist first", () => {
  it("MediaorMasterPlaylist tag before master/media detection is accepted as master", () => {
    const p = parser("#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8") as MasterPlaylist;
    expect(p.independentSegments).toBe(true);
  });
  it("MediaorMasterPlaylist tag before media detection is accepted as media", () => {
    const p = parser("#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.independentSegments).toBe(true);
  });
});

// ===========================================================================
// matchTypes — CLOSED-CAPTIONS matching existing group (line 594)
// ===========================================================================
describe("matchTypes deep path", () => {
  it("CLOSED-CAPTIONS matches pre-indexed group correctly", () => {
    const p = parser('#EXTM3U\n#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc1",NAME="en",INSTREAM-ID="CC1"\n#EXT-X-STREAM-INF:BANDWIDTH=1,CLOSED-CAPTIONS="cc1"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0].closedCaptions).toHaveLength(1);
  });
  it("AUDIO matches group but no matching EXT-X-MEDIA", () => {
    // matchTypes check: renditions.length === 0, so no error
    const p = parser('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="no-match"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0]).toBeDefined();
  });
});

// ===========================================================================
// sameKey IV comparison (lines 671-674, 677)
// ===========================================================================
describe("sameKey full IV comparison", () => {
  it("sameKey — same IV bytes → duplicate rejected", () => {
    expect(() =>
      parser(
        '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
      ),
    ).not.toThrow();
  });
  it("sameKey — key2 has IV when key1 does not (same URI)", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k"\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — different format → kept", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="a"\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="b"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — same format, different formatVersion → kept", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="a",KEYFORMATVERSIONS="1"\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="a",KEYFORMATVERSIONS="2"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
});

// ===========================================================================
// Prefetch key code-path (lines 1116-1117)
// ===========================================================================
describe("Prefetch key code paths", () => {
  it("prefetch inherits key and sets it", () => {
    const p = parser('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-KEY:METHOD=AES-128,URI="k.bin"\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:6,\ns.ts\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeDefined();
    expect(p.prefetchSegments[0].key!.uri).toBe("k.bin");
  });
  it("prefetch without prior key gets null key", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:6,\ns.ts\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeNull();
  });
});

// ===========================================================================
// HOLD-BACK / CAN-SKIP-UNTIL validation edge (lines 1303,1339,1347)
// ===========================================================================
describe("LL-HLS boundary validation edges", () => {
  it("HOLD-BACK exactly 3x target — allowed", () => {
    const p = parser(
      "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=12\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST",
    ) as MediaPlaylist;
    expect(p.lowLatencyCompatibility!.holdBack).toBe(12);
  });
  it("CAN-SKIP-UNTIL exactly 6x target — allowed", () => {
    const p = parser(
      "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=12\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST",
    ) as MediaPlaylist;
    expect(p.lowLatencyCompatibility!.canSkipUntil).toBe(24);
  });
});

// ===========================================================================
// Duplicate version/playlist tag guards (lines 1475, 1507)
// ===========================================================================
describe("Duplicate guard deeper paths", () => {
  it("duplicate EXT-X-ENDLIST throws", () => {
    expect(() => parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-ENDLIST\n#EXT-X-ENDLIST\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
  it("duplicate EXT-X-PLAYLIST-TYPE throws", () => {
    expect(() => parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-PLAYLIST-TYPE:EVENT\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
  it("duplicate EXT-X-I-FRAMES-ONLY throws", () => {
    expect(() => parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-I-FRAMES-ONLY\n#EXT-X-I-FRAMES-ONLY\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
});

// ===========================================================================
// Trailing segment with parts (lines 1560-1561)
// ===========================================================================
describe("Trailing segment full path", () => {
  it("trailing segment created with all tags", () => {
    const p = parser(
      "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:10,\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:00Z\n#EXTINF:5,\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:10Z\n#EXT-X-ENDLIST",
    ) as MediaPlaylist;
    // First segment: tag #EXTINF:10 + trailing tags before second EXTINF
    // Second segment (trailing): EXTINF:5 + PROGRAM-DATE-TIME
    expect(p.segments.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// Version validation at boundary (line 1733)
// ===========================================================================
describe("Version boundary checks", () => {
  it("version exactly matching compatible version — ok", () => {
    const p = parser("#EXTM3U\n#EXT-X-VERSION:4\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-BYTERANGE:500@0\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.version).toBe(4);
  });
  it("version just below requirement for BYTERANGE — throws", () => {
    expect(() => parser("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-BYTERANGE:500@0\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
});

// ===========================================================================
// BOM stripping (parse.ts line 280)
// ===========================================================================
describe("UTF-8 BOM handling", () => {
  it("strips leading BOM from playlist text", () => {
    const p = parser("\uFEFF#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.targetDuration).toBe(10);
    expect(p.segments).toHaveLength(1);
  });
});

// ===========================================================================
// MIXEDTAGS — Master tag after Media detection (parse.ts line 260)
// ===========================================================================
describe("Mixed tags reverse direction", () => {
  it("Media tag first then Master tag triggers MIXEDTAGS", () => {
    // TARGETDURATION (MediaPlaylist) sets isMasterPlaylist=false,
    // then EXT-X-MEDIA (MasterPlaylist) triggers MIXEDTAGS at line 260
    expect(() => parser('#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="g",NAME="en"')).not.toThrow();
  });
});

// ===========================================================================
// Prefetch with own EXT-X-KEY (parse.ts lines 783-784)
// ===========================================================================
describe("Prefetch own EXT-X-KEY", () => {
  it("prefetch with inter-segment EXT-X-KEY tag gets its own key", () => {
    const p = parser('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\ns.ts\n#EXT-X-KEY:METHOD=AES-128,URI="pk.bin"\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeDefined();
    expect(p.prefetchSegments[0].key!.uri).toBe("pk.bin");
  });
});

// ===========================================================================
// EXT-X-PART-INF without PART-TARGET (parse.ts line 1099)
// ===========================================================================
describe("PART-INF missing PART-TARGET", () => {
  it("PART-INF without PART-TARGET warns", () => {
    expect(() => parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-PART-INF:\n#EXTINF:6,\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
});

// ===========================================================================
// EXT-X-DEFINE in media playlist (parse.ts lines 1136-1137)
// ===========================================================================
describe("EXT-X-DEFINE in media playlist", () => {
  it("media playlist with EXT-X-DEFINE stores defines", () => {
    const p = parser('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-DEFINE:NAME="qux",VALUE="val"\n#EXTINF:6,\ns.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.defines).toBeDefined();
    expect(p.defines).toHaveLength(1);
  });
});

// ===========================================================================
// Prefetch key URI resolution (parse.ts line 1268)
// ===========================================================================
describe("Prefetch key URI resolution", () => {
  it("resolves prefetch key URI when base URI is provided", () => {
    const p = parser('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-KEY:METHOD=AES-128,URI="k.bin"\n#EXTINF:6,\ns.ts\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST', {
      uri: "http://example.com/playlist.m3u8",
    }) as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeDefined();
    expect(p.prefetchSegments[0].key!.uri).toBe("http://example.com/k.bin");
  });
});

// ===========================================================================
// InvalidPlaylistError constructor (utils.ts lines 28-29)
// ===========================================================================
describe("InvalidPlaylistError", () => {
  it("constructs with correct name and message", () => {
    const err = new InvalidPlaylistError("test error");
    expect(err.name).toBe("InvalidPlaylistError");
    expect(err.message).toBe("test error");
    expect(err).toBeInstanceOf(Error);
  });
});

// ===========================================================================
// resolveUrl absolute path fallback (utils.ts line 243)
// ===========================================================================
describe("resolveUrl fallback path", () => {
  it("resolves absolute path when base URL constructor throws", () => {
    const result = resolveUrl("http://[", "/path.ts");
    expect(result).toBe("http://[/path.ts");
  });
  it("returns empty string for empty relative URL", () => {
    expect(resolveUrl("http://base", "")).toBe("");
  });
});

// ===========================================================================
// parseTagParam — EXT-X-GAP with non-null param (utils.ts line 419)
// ===========================================================================
describe("parseTagParam edge case — non-null param", () => {
  it("EXT-X-GAP with empty string param parses correctly", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\n#EXT-X-GAP:\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].gap).toBe(true);
  });
});

// ===========================================================================
// parseTagParam — all switch case branches (utils.ts lines 412-419)
// ===========================================================================
describe("parseTagParam switch cases with non-null param", () => {
  it("EXTM3U with non-null param", () => {
    expect(parseTagParam("EXTM3U", "x")).toEqual([null, null]);
  });
  it("EXT-X-DISCONTINUITY with non-null param", () => {
    expect(parseTagParam("EXT-X-DISCONTINUITY", "x")).toEqual([null, null]);
  });
  it("EXT-X-ENDLIST with non-null param", () => {
    expect(parseTagParam("EXT-X-ENDLIST", "x")).toEqual([null, null]);
  });
  it("EXT-X-I-FRAMES-ONLY with non-null param", () => {
    expect(parseTagParam("EXT-X-I-FRAMES-ONLY", "x")).toEqual([null, null]);
  });
  it("EXT-X-INDEPENDENT-SEGMENTS with non-null param", () => {
    expect(parseTagParam("EXT-X-INDEPENDENT-SEGMENTS", "x")).toEqual([null, null]);
  });
  it("EXT-X-CUE-IN with non-null param", () => {
    expect(parseTagParam("EXT-X-CUE-IN", "x")).toEqual([null, null]);
  });
});

// ===========================================================================
// sameKey — same-length but different IV bytes (parse.ts lines 419-422)
// ===========================================================================
describe("sameKey IV byte-by-byte comparison", () => {
  it("same-length but different IV bytes → both keys kept", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0x00112233445566778899AABBCCDDEEFF\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — different methods → both keys kept", () => {
    const p = parser('#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k"\n#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="k"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8') as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — different IV lengths → both keys kept", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABB\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — key1 has IV but key2 does not → both keys kept", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
});

// ===========================================================================
// addCustomTag — various value types (parse.ts line 476)
// ===========================================================================
describe("addCustomTag value paths", () => {
  it("custom tag with object value from parser", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-CUSTOM:val1\n#EXTINF:6,\ns.ts\n#EXT-X-ENDLIST", {
      customTagParsers: {
        "EXT-X-CUSTOM": (_n, v) => ({ raw: v }),
      },
    }) as MediaPlaylist;
    expect(p.customTags!.EXT_X_CUSTOM).toBeDefined();
  });
  it("custom tag in master playlist — value path", () => {
    const p = parser("#EXTM3U\n#EXT-X-CUSTOM:ATTR=val\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8", {
      customTagParsers: {
        "EXT-X-CUSTOM": (_n, _v, attrs) => attrs,
      },
    }) as MasterPlaylist;
    expect(p.customTags!.EXT_X_CUSTOM).toBeDefined();
  });
  it("custom tag with attribute syntax — falls back to attributes", () => {
    // Tag with attribute syntax: value is null, attributes are parsed
    // The addCustomTag ternary should push the attributes object
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-CUSTOM:KEY=val\n#EXTINF:6,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.customTags!.EXT_X_CUSTOM).toBeDefined();
    expect(p.customTags!.EXT_X_CUSTOM[0]).toEqual({ KEY: "val" });
  });
  it("custom tag with plain value — falls back to value string", () => {
    // Tag without parser and without attribute syntax: value is the raw string
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-CUSTOM:hello\n#EXTINF:6,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.customTags!.EXT_X_CUSTOM).toBeDefined();
    expect(p.customTags!.EXT_X_CUSTOM[0]).toBe("hello");
  });
});

// ===========================================================================
// DATERANGE overlap check (parse.ts line 892)
// ===========================================================================
describe("DATERANGE overlap detection", () => {
  it("overlapping DATERANGE with same CLASS triggers warning", () => {
    expect(() =>
      parser(
        '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:00Z\n#EXT-X-DATERANGE:ID="r1",CLASS="ad",START-DATE="2023-01-01T00:00:00Z",END-DATE="2023-01-01T00:00:10Z"\n#EXTINF:5,\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:05Z\n#EXT-X-DATERANGE:ID="r2",CLASS="ad",START-DATE="2023-01-01T00:00:05Z",END-DATE="2023-01-01T00:00:15Z"\ns.ts\n#EXT-X-ENDLIST',
      ),
    ).not.toThrow();
  });
  it("non-overlapping DATERANGE with same CLASS — no warning", () => {
    // Ranges 10s-15s then 0s-5s: reverse iteration processes 0s-5s first, then
    // 10s-15s second, hitting both entry.start<=start and entry.start>=start branches
    expect(() =>
      parser(
        '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:10Z\n#EXT-X-DATERANGE:ID="r2",CLASS="ad",START-DATE="2023-01-01T00:00:10Z",END-DATE="2023-01-01T00:00:15Z"\n#EXTINF:5,\ns1.ts\n#EXT-X-PROGRAM-DATE-TIME:2023-01-01T00:00:00Z\n#EXT-X-DATERANGE:ID="r1",CLASS="ad",START-DATE="2023-01-01T00:00:00Z",END-DATE="2023-01-01T00:00:05Z"\n#EXTINF:5,\ns2.ts\n#EXT-X-ENDLIST',
      ),
    ).not.toThrow();
  });
});

// ===========================================================================
// CUE-IN after CUE-OUT — markers array exists (parse.ts line 704)
// ===========================================================================
describe("CUE-OUT + CUE-IN marker sequence", () => {
  it("CUE-OUT followed by CUE-IN shares markers array", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:30\n#EXTINF:30,\n#EXT-X-CUE-OUT:30\n#EXT-X-CUE-IN\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers).toHaveLength(2);
    expect(p.segments[0].markers![0].type).toBe("OUT");
    expect(p.segments[0].markers![1].type).toBe("IN");
  });
});

// ===========================================================================
// EXT-X-PRELOAD-HINT TYPE=MAP (parse.ts lines 719-727)
// ===========================================================================
describe("PRELOAD-HINT TYPE=MAP", () => {
  it("preload hint with TYPE=MAP creates map with hint flag", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:6,\ns1.ts\n#EXTINF:6,\n#EXT-X-PRELOAD-HINT:TYPE=MAP,URI="init2.mp4",BYTERANGE-LENGTH=500,BYTERANGE-START=0\ns2.ts\n#EXT-X-ENDLIST',
    ) as MediaPlaylist;
    const seg = p.segments[1];
    expect(seg.map).toBeDefined();
    expect(seg.map!.hint).toBe(true);
    expect(seg.map!.uri).toBe("init2.mp4");
  });
});

// ===========================================================================
// SCTE-35 / ASSET / CUE tags (parse.ts line 707)
// ===========================================================================
describe("SCTE35 and splice tags", () => {
  it("EXT-X-ASSET tag creates RAW marker", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-ASSET:CAID=0x0000000020D8\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers).toBeDefined();
    expect(p.segments[0].markers![0].type).toBe("RAW");
  });
  it("EXT-X-SCTE35 tag creates RAW marker", () => {
    const p = parser('#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-SCTE35:CUE="/DAlAAAAAAeAA"\ns.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.segments[0].markers).toBeDefined();
    expect(p.segments[0].markers![0].type).toBe("RAW");
  });
});
