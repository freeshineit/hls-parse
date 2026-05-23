/**
 * Gap-fill tests targeting remaining uncovered lines.
 * Run: npx jest coverage-gap.test.ts --coverage --collectCoverageFrom=src/parse.ts
 */
import { parse, isMasterPlaylist, isMediaPlaylist, InvalidPlaylistError, resolveUrl } from "../src";
import { MasterPlaylist, MediaPlaylist } from "../src/types";

// ===========================================================================
// Type guards (types.ts:595,610)
// ===========================================================================
describe("Type guards", () => {
  it("isMasterPlaylist returns true for master", () => {
    const pl = parse("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8");
    expect(isMasterPlaylist(pl)).toBe(true);
  });
  it("isMasterPlaylist returns false for media", () => {
    const pl = parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST");
    expect(isMasterPlaylist(pl)).toBe(false);
  });
  it("isMediaPlaylist returns true for media", () => {
    const pl = parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST");
    expect(isMediaPlaylist(pl)).toBe(true);
  });
  it("isMediaPlaylist returns false for master", () => {
    const pl = parse("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8");
    expect(isMediaPlaylist(pl)).toBe(false);
  });
});

// ===========================================================================
// parseAllowedCpc — !cpcText (line 213)
// ===========================================================================
describe("parseAllowedCpc edge cases", () => {
  it("ALLOWED-CPC entry with missing cpcText throws", () => {
    expect(() => parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,ALLOWED-CPC="com.example:"\nv.m3u8')).toThrow(InvalidPlaylistError);
  });
  it("ALLOWED-CPC entry with multi-part format works", () => {
    const p = parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,ALLOWED-CPC="com.x:A/B/C,com.y:D"\nv.m3u8') as MasterPlaylist;
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
    const p = parse("#EXTM3U\n#EXT-X-TARGETDURATION:30\n#EXTINF:10,\n#EXT-X-CUE-OUT:DURATION=30\nseg.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(30);
  });
});

// ===========================================================================
// CHECKTAGCATEGORY — MediaorMasterPlaylist before type determination (line 495)
// ===========================================================================
describe("MediaorMasterPlaylist first", () => {
  it("MediaorMasterPlaylist tag before master/media detection is accepted as master", () => {
    const p = parse("#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8") as MasterPlaylist;
    expect(p.independentSegments).toBe(true);
  });
  it("MediaorMasterPlaylist tag before media detection is accepted as media", () => {
    const p = parse("#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.independentSegments).toBe(true);
  });
});

// ===========================================================================
// matchTypes — CLOSED-CAPTIONS matching existing group (line 594)
// ===========================================================================
describe("matchTypes deep path", () => {
  it("CLOSED-CAPTIONS matches pre-indexed group correctly", () => {
    const p = parse('#EXTM3U\n#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc1",NAME="en",INSTREAM-ID="CC1"\n#EXT-X-STREAM-INF:BANDWIDTH=1,CLOSED-CAPTIONS="cc1"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0].closedCaptions).toHaveLength(1);
  });
  it("AUDIO matches group but no matching EXT-X-MEDIA", () => {
    // matchTypes check: renditions.length === 0, so no error
    const p = parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="no-match"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0]).toBeDefined();
  });
});

// ===========================================================================
// sameKey IV comparison (lines 671-674, 677)
// ===========================================================================
describe("sameKey full IV comparison", () => {
  it("sameKey — same IV bytes → duplicate rejected", () => {
    expect(() =>
      parse(
        '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
      ),
    ).toThrow(InvalidPlaylistError);
  });
  it("sameKey — key2 has IV when key1 does not", () => {
    const p = parse(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1"\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k2",IV=0xAABBCCDDEEFF00112233445566778899\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — different format → kept", () => {
    const p = parse(
      '#EXTM3U\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="a"\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k",KEYFORMAT="b"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8',
    ) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("sameKey — same format, different formatVersion → kept", () => {
    const p = parse(
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
    const p = parse('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-KEY:METHOD=AES-128,URI="k.bin"\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:6,\ns.ts\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeDefined();
    expect(p.prefetchSegments[0].key!.uri).toBe("k.bin");
  });
  it("prefetch without prior key gets null key", () => {
    const p = parse("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:6,\ns.ts\n#EXT-X-PREFETCH:p.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.prefetchSegments[0].key).toBeNull();
  });
});

// ===========================================================================
// HOLD-BACK / CAN-SKIP-UNTIL validation edge (lines 1303,1339,1347)
// ===========================================================================
describe("LL-HLS boundary validation edges", () => {
  it("HOLD-BACK exactly 3x target — allowed", () => {
    const p = parse(
      "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=12\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST",
    ) as MediaPlaylist;
    expect(p.lowLatencyCompatibility!.holdBack).toBe(12);
  });
  it("CAN-SKIP-UNTIL exactly 6x target — allowed", () => {
    const p = parse(
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
    expect(() => parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-ENDLIST\n#EXT-X-ENDLIST\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).toThrow(InvalidPlaylistError);
  });
  it("duplicate EXT-X-PLAYLIST-TYPE throws", () => {
    expect(() => parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXT-X-PLAYLIST-TYPE:EVENT\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).toThrow(InvalidPlaylistError);
  });
  it("duplicate EXT-X-I-FRAMES-ONLY throws", () => {
    expect(() => parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-I-FRAMES-ONLY\n#EXT-X-I-FRAMES-ONLY\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).toThrow(InvalidPlaylistError);
  });
});

// ===========================================================================
// Trailing segment with parts (lines 1560-1561)
// ===========================================================================
describe("Trailing segment full path", () => {
  it("trailing segment created with all tags", () => {
    const p = parse(
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
    const p = parse("#EXTM3U\n#EXT-X-VERSION:4\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-BYTERANGE:500@0\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.version).toBe(4);
  });
  it("version just below requirement for BYTERANGE — throws", () => {
    expect(() => parse("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\n#EXT-X-BYTERANGE:500@0\ns.ts\n#EXT-X-ENDLIST")).toThrow(InvalidPlaylistError);
  });
});
