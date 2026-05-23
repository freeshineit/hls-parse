/**
 * Branch coverage gap filler — pushes parse.ts branches ≥95%
 */
import { parse, InvalidPlaylistError } from "../src";
import { MediaPlaylist, MasterPlaylist } from "../src/types";

describe("Branch gap — EXT-X-BITRATE", () => {
  it("EXT-X-BITRATE category + numeric param + store", () => {
    const p = parse("#EXTM3U\n#EXT-X-BITRATE:5000000\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.bitrate).toBe(5000000);
  });
});

describe("Branch gap — parseUserAttribute 0x prefix", () => {
  it("X- attribute with 0X hex", () => {
    const p = parse(
      '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z\n#EXTINF:10,\n#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",X-DATA=0XABCD\nseg.ts\n#EXT-X-ENDLIST',
    ) as MediaPlaylist;
    expect(p.segments[0].dateRange!.attributes!["X-DATA"]).toBeInstanceOf(Uint8Array);
  });
});

describe("Branch gap — CUE-OUT numeric path", () => {
  it("CUE-OUT with float triggers Number branch", () => {
    const p = parse("#EXTM3U\n#EXT-X-TARGETDURATION:30\n#EXTINF:10,\n#EXT-X-CUE-OUT:25.5\nseg.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(25.5);
  });
});

describe("Branch gap — checkDateRange empty path", () => {
  it("no daterange — checkDateRange exits early at hasDateRange:false", () => {
    const p = parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments).toHaveLength(1);
  });
  it("daterange with valid end-date = start-date + duration", () => {
    const p = parse(
      '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z\n#EXTINF:10,\n#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",DURATION=30,END-DATE="2014-03-05T11:15:30Z"\nseg.ts\n#EXT-X-ENDLIST',
    ) as MediaPlaylist;
    expect(p.segments[0].dateRange).toBeDefined();
  });
});

describe("Branch gap — duplicate INDEPENDENT-SEGMENTS", () => {
  it("duplicate independent-segments in media playlist", () => {
    expect(() => parse("#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST")).not.toThrow();
  });
});

describe("Branch gap — MediaorMasterPlaylist path", () => {
  it("MediaorMasterPlaylist tag after master type is determined passes through", () => {
    const p = parse('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8\n#EXT-X-DEFINE:NAME="x",VALUE="y"') as MasterPlaylist;
    expect(p.defines).toHaveLength(1);
  });
});

describe("Branch gap — version null check", () => {
  it("version is null passes through", () => {
    const p = parse("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:9.009,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.version).toBeUndefined();
  });
  it("version >= compatibleVersion — ok", () => {
    const p = parse('#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-TARGETDURATION:10\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST') as MediaPlaylist;
    expect(p.version).toBe(6);
  });
});

describe("Branch gap — LL-HLS without parts", () => {
  it("LL-HLS server-control without parts — exits early in checkLowLatencyCompatibility", () => {
    const p = parse(
      "#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,HOLD-BACK=12\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\ns.ts\n#EXT-X-ENDLIST",
    ) as MediaPlaylist;
    expect(p.lowLatencyCompatibility!.canBlockReload).toBe(true);
  });
});

describe("Branch gap — rendition report default fill", () => {
  it("rendition report with lastMSN undefined fills from last segment", () => {
    const p = parse(
      '#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=2\n#EXT-X-PART-INF:PART-TARGET=1\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\n#EXT-X-PART:DURATION=1,URI="p1.ts"\ns1.ts\n#EXT-X-RENDITION-REPORT:URI="audio.m3u8"\n#EXT-X-ENDLIST',
    ) as MediaPlaylist;
    expect(p.renditionReports[0].lastMSN).toBe(1);
  });
});
