/**
 * Last-mile branch gap filler
 */
import { parser, InvalidPlaylistError } from "../src";
import { MediaPlaylist, MasterPlaylist } from "../src/types";

describe("Last gap — 0X prefix", () => {
  it("parseUserAttribute with 0X uppercase hex", () => {
    const p = parser(
      '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-PROGRAM-DATE-TIME:2014-03-05T11:15:00Z\n#EXTINF:10,\n#EXT-X-DATERANGE:ID="r1",START-DATE="2014-03-05T11:15:00Z",X-DATA=0XABCD\nseg.ts\n#EXT-X-ENDLIST',
    ) as MediaPlaylist;
    expect(p.segments[0].dateRange!.attributes!["X-DATA"]).toBeInstanceOf(Uint8Array);
  });
});

describe("Last gap — CUE-OUT numeric code-path", () => {
  it("CUE-OUT with number hits toNumber return", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:30\n#EXTINF:10,\n#EXT-X-CUE-OUT:10\nseg.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.segments[0].markers![0].duration).toBe(10);
  });
});

describe("Last gap — matchTypes with AUDIO matched", () => {
  it("matchTypes passes through matched AUDIO group", () => {
    const p = parser('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="en",URI="en.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=1,AUDIO="aac"\nv.m3u8') as MasterPlaylist;
    expect(p.variants[0].audio).toHaveLength(1);
  });
});

describe("Last gap — checkLowLatencyCompatibility when undefined", () => {
  it("no server-control → checkLowLatencyCompatibility never called/early return", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.lowLatencyCompatibility).toBeUndefined();
  });
});

describe("Last gap — version null path", () => {
  it("version is null (explicitly) passes version check", () => {
    const p = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:9.009,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(p.version).toBeUndefined();
  });
});
