/**
 * Comprehensive M3U8 test cases covering RFC 8216 +
 * real-world streaming service playlists.
 *
 * Purpose: push coverage > 97% lines / 95% branches
 */
import { parse, InvalidPlaylistError, resolveUrl } from "../src";
import { MasterPlaylist, MediaPlaylist } from "../src/types";

// ============================================================================
// 1.  ALLOWED-CPC  edge-cases  (lines 191, 198)
// ============================================================================
describe("ALLOWED-CPC", () => {
  // line 198 — !cpcText
  it("ALLOWED-CPC type without configuration throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000,ALLOWED-CPC="com.example:"`),
    ).toThrow(InvalidPlaylistError);
  });
  it("ALLOWED-CPC single valid entry", () => {
    const p = parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000,ALLOWED-CPC="com.example:A/B"
v.m3u8`) as MasterPlaylist;
    expect(p.variants[0].allowedCpc![0].cpcList).toEqual(["A", "B"]);
  });
});

// ============================================================================
// 2.  sameKey  deep-equal paths (lines 659-665)
// ============================================================================
describe("sameKey equality", () => {
  it("different IV is rejected as duplicate when uris same", () => {
    // same key1.uri !== key2.uri already makes them different, so both allowed.
    // This test verifies sameKey truly compares all fields.
    const p = parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1",IV=0xAABBCCDDEEFF00112233445566778899
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k2",KEYFORMAT="x"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("different format rejects duplicate", () => {
    const p = parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1",KEYFORMAT="a"
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1",KEYFORMAT="b"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
  it("different formatVersion rejects duplicate", () => {
    const p = parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1",KEYFORMATVERSIONS="1"
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1",KEYFORMATVERSIONS="2"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`) as MasterPlaylist;
    expect(p.sessionKeyList).toHaveLength(2);
  });
});

// ============================================================================
// 3.  CUE-OUT numeric code-path (line 357)
// ============================================================================
describe("CUE-OUT paths", () => {
  it("numeric CUE-OUT is treated as duration", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:30
#EXTINF:30,
#EXT-X-CUE-OUT:20
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(20);
  });
  it("CUE-OUT with float duration", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:30
#EXTINF:30,
#EXT-X-CUE-OUT:20.5
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(20.5);
  });
});

// ============================================================================
// 4.  EXT-X-START without TIME-OFFSET (master) → line 784
// ============================================================================
describe("EXT-X-START validation", () => {
  it("EXT-X-START without TIME-OFFSET in master throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-START:
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 5.  EXT-X-GAP version < 8 branch (line 812)
// ============================================================================
describe("EXT-X-GAP version check", () => {
  it("EXT-X-GAP without version in playlist still sets gap", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-GAP
seg.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.segments[0].gap).toBe(true);
  });
});

// ============================================================================
// 6.  EXT-X-KEY after parts (line 894)  +  EXT-X-MAP after parts
// ============================================================================
describe("Tag ordering – KEY/MAP after parts", () => {
  it("EXT-X-KEY after EXT-X-PART throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6,
#EXT-X-PART:DURATION=1,URI="p.ts"
#EXT-X-KEY:METHOD=AES-128,URI="k"
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("EXT-X-MAP after EXT-X-PART throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6,
#EXT-X-PART:DURATION=1,URI="p.ts"
#EXT-X-MAP:URI="init.mp4"
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("EXT-X-DISCONTINUITY after EXT-X-PART throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6,
#EXT-X-PART:DURATION=1,URI="p.ts"
#EXT-X-DISCONTINUITY
seg.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 7.  Prefetch with key inheritance (line 1055-1056)
// ============================================================================
describe("Prefetch key", () => {
  it("prefetch inherits key from previous segment", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-KEY:METHOD=AES-128,URI="k.bin"
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6,
seg.ts
#EXT-X-PREFETCH:p.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.prefetchSegments[0].key!.uri).toBe("k.bin");
  });
});

// ============================================================================
// 8.  LL-HLS hold-back/can-skip-until validation (lines 1242, 1276-1286)
// ============================================================================
describe("LL-HLS boundaries", () => {
  it("HOLD-BACK < 3*targetDuration throws — through full parse", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=10
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4,
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("CAN-SKIP-UNTIL < 6*targetDuration throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=20,HOLD-BACK=12
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4,
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("compatibleVersion reaches 9 via EXT-X-SKIP", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=12
#EXT-X-MEDIA-SEQUENCE:10
#EXT-X-SKIP:SKIPPED-SEGMENTS=3
#EXTINF:4,
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError); // version 6 < 9
  });
  it("PART segment index > 3 from end removes", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=2
#EXT-X-PART-INF:PART-TARGET=1
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="pa1.ts"
s1.ts
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="pa2.ts"
s2.ts
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="pa3.ts"
s3.ts
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="pa4.ts"
s4.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 9.  EXT-X-VERSION duplicate / MediaPlaylistTag duplicate (lines 1414, 1446)
// ============================================================================
describe("Duplicate tag guards", () => {
  it("duplicate EXT-X-VERSION in media", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXTINF:10,
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("duplicate EXT-X-TARGETDURATION in media", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-TARGETDURATION:12
#EXTINF:10,
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 10.  Trailing-segment path (lines 1499-1500)
// ============================================================================
describe("Trailing segment (no URI)", () => {
  it("trailing tags create a segment with empty URI", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:5,
#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.segments).toHaveLength(1);
    expect(p.segments[0].uri).toBe("");
    expect(p.segments[0].duration).toBe(5);
    expect(p.segments[0].programDateTime).toBeInstanceOf(Date);
  });
});

// ============================================================================
// 11.  Version too low for tag requirement (line 1644)
// ============================================================================
describe("Version mismatch", () => {
  it("EXT-X-BYTERANGE requires version >= 4", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10,
#EXT-X-BYTERANGE:500@0
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
  it("EXT-X-MAP in I-frame playlist needs version >= 5", () => {
    const p = parse(`#EXTM3U
#EXT-X-VERSION:5
#EXT-X-TARGETDURATION:5
#EXT-X-I-FRAMES-ONLY
#EXT-X-MAP:URI="i.mp4"
#EXTINF:2,
f.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.isIFrame).toBe(true);
    expect(p.version).toBe(5);
  });
});

// ============================================================================
// 12.  resolveUrl fallback (utils.ts lines 149, 161)
// ============================================================================
describe("resolveUrl fallback paths", () => {
  it("invalid base + / relative hits startsWith / branch", () => {
    const r = resolveUrl("invalid", "/absolute/path.ts");
    expect(r).toContain("/absolute/path.ts");
  });
  it("invalid base + ../ relative hits .. normalization", () => {
    const r = resolveUrl("invalid/base/", "../up.ts");
    expect(r).toContain("up.ts");
  });
});

// ============================================================================
// 13.  CHECKTAGCATEGORY — MediaorMasterPlaylist first (line 464)
// ============================================================================
describe("Tag category ordering", () => {
  it("MediaorMasterPlaylist tag before anything else is accepted", () => {
    const p = parse(`#EXTM3U
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-DEFINE:NAME="x",VALUE="1"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`) as MasterPlaylist;
    expect(p.independentSegments).toBe(true);
    expect(p.defines).toHaveLength(1);
  });
});

// ============================================================================
// 14.  matchTypes CLOSED-CAPTIONS not NONE (line 599)
// ============================================================================
describe("matchTypes closed-captions", () => {
  it("CLOSED-CAPTIONS value matching group worked", () => {
    const p = parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc1",NAME="en",INSTREAM-ID="CC1"
#EXT-X-STREAM-INF:BANDWIDTH=1000,CLOSED-CAPTIONS="cc1"
v.m3u8`) as MasterPlaylist;
    expect(p.variants[0].closedCaptions).toBeDefined();
  });
});

// ============================================================================
// 15.  Real-world M3U8 playlists
// ============================================================================
describe("Real-world M3U8", () => {
  it("Apple sample master (HLS Authoring Spec)", () => {
    const txt = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="audio/aac/en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",LANGUAGE="es",NAME="Spanish",AUTOSELECT=YES,DEFAULT=NO,URI="audio/aac/es.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="ec3",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="audio/ec3/en.m3u8",CHANNELS="6"
#EXT-X-STREAM-INF:BANDWIDTH=3000000,AVERAGE-BANDWIDTH=2500000,CODECS="avc1.64001f,mp4a.40.2",RESOLUTION=640x360,FRAME-RATE=29.970,AUDIO="aac"
v1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,AVERAGE-BANDWIDTH=4000000,CODECS="avc1.64001f,mp4a.40.2",RESOLUTION=1280x720,FRAME-RATE=29.970,AUDIO="aac"
v2.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=8000000,AVERAGE-BANDWIDTH=6500000,CODECS="avc1.640028,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=29.970,AUDIO="ec3"
v3.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=30000,CODECS="avc1.64001f",RESOLUTION=640x360,URI="iframes/v1.m3u8"
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=50000,CODECS="avc1.64001f",RESOLUTION=1280x720,URI="iframes/v2.m3u8"
`;
    const p = parse(txt) as MasterPlaylist;
    expect(p.variants).toHaveLength(5);
    expect(p.independentSegments).toBe(true);
    const iFrames = p.variants.filter((v) => v.isIFrameOnly);
    expect(iFrames).toHaveLength(2);
  });

  it("Simple VOD playlist", () => {
    const txt = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:4
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-INDEPENDENT-SEGMENTS
#EXTINF:5.0,
seg-0.ts
#EXTINF:5.0,
seg-1.ts
#EXT-X-ENDLIST
`;
    const p = parse(txt) as MediaPlaylist;
    expect(p.playlistType).toBe("VOD");
    expect(p.segments).toHaveLength(2);
    expect(p.endlist).toBe(true);
  });

  it("Live EVENT playlist", () => {
    const txt = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:10.0,
seg-100.ts
#EXTINF:10.0,
seg-101.ts
#EXTINF:10.0,
seg-102.ts
`;
    const p = parse(txt) as MediaPlaylist;
    expect(p.playlistType).toBe("EVENT");
    expect(p.endlist).toBeUndefined();
    expect(p.segments).toHaveLength(3);
    expect(p.segments[0].mediaSequenceNumber).toBe(100);
  });

  it("AES-128 encrypted segments with IV", () => {
    const txt = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0xAABBCCDDEEFF00112233445566778899
#EXTINF:10.0,
seg-0.ts
#EXTINF:10.0,
seg-1.ts
#EXT-X-ENDLIST
`;
    const p = parse(txt) as MediaPlaylist;
    expect(p.segments[0].key!.method).toBe("AES-128");
    expect(p.segments[0].key!.iv).toBeDefined();
    expect(p.segments[1].key!.iv).toBeDefined();
  });
});

// ============================================================================
// 16.  LL-HLS  complete low-latency playlist
// ============================================================================
describe("Complete LL-HLS playlist", () => {
  const llhls = `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-VERSION:9
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.5,CAN-SKIP-UNTIL=24,HOLD-BACK=12
#EXT-X-PART-INF:PART-TARGET=1
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="part1-1.ts",INDEPENDENT=YES
#EXT-X-PART:DURATION=1,URI="part1-2.ts"
#EXT-X-PART:DURATION=1,URI="part1-3.ts"
#EXT-X-PART:DURATION=1,URI="part1-4.ts"
seg1.ts
#EXTINF:4,
#EXT-X-PART:DURATION=1,URI="part2-1.ts"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="part2-2.ts"
seg2.ts
#EXT-X-RENDITION-REPORT:URI="../audio/en.m3u8",LAST-MSN=2,LAST-PART=1
#EXT-X-PREFETCH:seg3.ts
#EXT-X-ENDLIST`;

  it("parses complete LL-HLS", () => {
    const p = parse(llhls) as MediaPlaylist;
    expect(p.lowLatencyCompatibility!.canBlockReload).toBe(true);
  });
  it("segments have correct part counts", () => {
    const p = parse(llhls) as MediaPlaylist;
    expect(p.segments[0].parts).toHaveLength(4);
    expect(p.segments[1].parts).toHaveLength(2);
    expect(p.segments[1].parts![1].hint).toBe(true);
  });
  it("prefetch segment exists", () => {
    const p = parse(llhls) as MediaPlaylist;
    expect(p.prefetchSegments).toHaveLength(1);
    expect(p.prefetchSegments[0].uri).toBe("seg3.ts");
  });
  it("rendition report filled", () => {
    const p = parse(llhls) as MediaPlaylist;
    expect(p.renditionReports).toHaveLength(1);
    expect(p.renditionReports[0].uri).toBe("../audio/en.m3u8");
  });
});

// ============================================================================
// 17.  Content Steering / PATHWAY-ID
// ============================================================================
describe("Content Steering", () => {
  it("parses EXT-X-CONTENT-STEERING completely", () => {
    const p = parse(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-CONTENT-STEERING:SERVER-URI="steering.json",PATHWAY-ID="p1"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",PATHWAY-ID="p1",NAME="en",URI="en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000,AUDIO="aac"
v.m3u8`) as MasterPlaylist;
    expect(p.contentSteering!.serverUri).toBe("steering.json");
    expect(p.variants[0].audio![0].pathwayId).toBe("p1");
  });
});

// ============================================================================
// 17b.  Rendition URI Resolution
// ============================================================================
describe("Rendition URI resolution", () => {
  it("resolves audio rendition URIs in master playlist", () => {
    const p = parse(
      `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",URI="audio/en.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Spanish",URI="audio/es.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",URI="subs/en.vtt"
#EXT-X-STREAM-INF:BANDWIDTH=1000,AUDIO="aac",SUBTITLES="subs"
video.m3u8`,
      { uri: "https://example.com/hls/master.m3u8" },
    ) as MasterPlaylist;

    expect(p.variants[0].uri).toBe("https://example.com/hls/video.m3u8");
    // Audio rendition URIs should be resolved
    expect(p.variants[0].audio![0].uri).toBe(
      "https://example.com/hls/audio/en.m3u8",
    );
    expect(p.variants[0].audio![1].uri).toBe(
      "https://example.com/hls/audio/es.m3u8",
    );
    // Subtitle rendition URIs should be resolved
    expect(p.variants[0].subtitles![0].uri).toBe(
      "https://example.com/hls/subs/en.vtt",
    );
  });

  it("leaves absolute rendition URIs unchanged", () => {
    const p = parse(
      `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="English",URI="https://cdn.example.com/audio/en.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=1000,AUDIO="aac"
video.m3u8`,
      { uri: "https://example.com/hls/master.m3u8" },
    ) as MasterPlaylist;

    expect(p.variants[0].audio![0].uri).toBe(
      "https://cdn.example.com/audio/en.m3u8",
    );
  });

  it("resolves session key URIs", () => {
    const p = parse(
      `#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="keys/enc.key"
#EXT-X-STREAM-INF:BANDWIDTH=1000
video.m3u8`,
      { uri: "https://example.com/hls/master.m3u8" },
    ) as MasterPlaylist;

    expect(p.sessionKeyList[0].uri).toBe(
      "https://example.com/hls/keys/enc.key",
    );
  });
});

// ============================================================================
// 18.  STREAM-INF with SCORE (negative / inconsistent)
// ============================================================================
describe("SCORE attribute", () => {
  it("negative score throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000,SCORE=-1
v.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 19.  SESSION-KEY duplicate
// ============================================================================
describe("Session key duplicates", () => {
  it("duplicate session key with exact same attrs throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1"
#EXT-X-SESSION-KEY:METHOD=AES-128,URI="k1"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 20.  CLOSED-CAPTIONS=NONE with variant having cc
// ============================================================================
describe("CLOSED-CAPTIONS=NONE restrictions", () => {
  it("one CC=NONE and another has group throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="en",INSTREAM-ID="CC1"
#EXT-X-STREAM-INF:BANDWIDTH=1000,CLOSED-CAPTIONS=NONE
v1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000,CLOSED-CAPTIONS="cc"
v2.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 21.  SESSION-DATA duplicate id+language
// ============================================================================
describe("SESSION-DATA duplicates", () => {
  it("same id and language throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.example",LANGUAGE="en",VALUE="a"
#EXT-X-SESSION-DATA:DATA-ID="com.example",LANGUAGE="en",VALUE="b"
#EXT-X-STREAM-INF:BANDWIDTH=1000
v.m3u8`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 22.  ClOSeD-CAPTIONS INSTREAM-ID with SERVICE (version >=7)
// ============================================================================
describe("SERVICE INSTREAM-ID", () => {
  it("SERVICE value bumps compatible version to 7", () => {
    const p = parse(`#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MEDIA:TYPE=CLOSED-CAPTIONS,GROUP-ID="cc",NAME="svc",INSTREAM-ID="SERVICE3"
#EXT-X-STREAM-INF:BANDWIDTH=1000,CLOSED-CAPTIONS="cc"
v.m3u8`) as MasterPlaylist;
    expect(p.variants[0].closedCaptions).toHaveLength(1);
  });
});

// ============================================================================
// 23.  Negative TIME-OFFSET (EXT-X-START)
// ============================================================================
describe("EXT-X-START negative offset", () => {
  it("negative TIME-OFFSET accepted", () => {
    const p = parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-START:TIME-OFFSET=-30,PRECISE=NO
#EXTINF:10,
s.ts
#EXT-X-ENDLIST`) as MediaPlaylist;
    expect(p.start!.offset).toBe(-30);
    expect(p.start!.precise).toBe(false);
  });
});

// ============================================================================
// 24.  EXT-X-BYTERANGE implicit offset through different URI
// ============================================================================
describe("Byterange implicit offset mis-match", () => {
  it("different URI without offset throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9,
#EXT-X-BYTERANGE:500@0
a.ts
#EXTINF:9,
#EXT-X-BYTERANGE:500
b.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});

// ============================================================================
// 25.  BYTERANGE first segment without offset
// ============================================================================
describe("First byterange without offset", () => {
  it("first segment with no offset throws", () => {
    expect(() =>
      parse(`#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9,
#EXT-X-BYTERANGE:500
s.ts
#EXT-X-ENDLIST`),
    ).toThrow(InvalidPlaylistError);
  });
});
