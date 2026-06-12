/**
 * Custom tag parser tests
 */
import { parser } from "../src";
import { MediaPlaylist, MasterPlaylist } from "../src/types";

describe("Custom tag parser", () => {
  it("unknown tag stored as-is without parser", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-UNKNOWN:hello\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(pl.customTags).toBeDefined();
    expect(pl.customTags!.EXT_X_UNKNOWN).toEqual(["hello"]);
  });

  it("custom parser receives tag name and raw value", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-MYTAG:12345\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST", {
      customTagParsers: {
        "EXT-X-MYTAG": (name, value) => {
          expect(name).toBe("EXT-X-MYTAG");
          expect(value).toBe("12345");
          return Number(value);
        },
      },
    }) as MediaPlaylist;
    expect(pl.customTags!.EXT_X_MYTAG).toEqual([12345]);
  });

  it("custom parser with attributes", () => {
    const pl = parser('#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-DATA:KEY="val",NUM=42\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST', {
      customTagParsers: {
        "EXT-X-DATA": (_name, _value, attrs) => attrs,
      },
    }) as MediaPlaylist;
    expect(pl.customTags!.EXT_X_DATA).toEqual([{ KEY: "val", NUM: "42" }]);
  });

  it("multiple occurrences aggregate into array", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-EVT:A\n#EXTINF:5,\ns1.ts\n#EXT-X-EVT:B\n#EXTINF:5,\ns2.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(pl.customTags!.EXT_X_EVT).toEqual(["A", "B"]);
  });

  it("custom tag in master playlist", () => {
    const pl = parser("#EXTM3U\n#EXT-X-CUSTOM:val1\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8", {
      customTagParsers: {
        "EXT-X-CUSTOM": (_n, v) => v.toUpperCase(),
      },
    }) as MasterPlaylist;
    expect(pl.customTags!.EXT_X_CUSTOM).toEqual(["VAL1"]);
  });

  it("custom tag in master playlist with attribute", () => {
    const pl = parser('#EXTM3U\n#EXT-X-INFO:VER="2"\n#EXT-X-STREAM-INF:BANDWIDTH=1\nv.m3u8', {
      customTagParsers: {
        "EXT-X-INFO": (_n, _v, a) => ({ version: a.VER }),
      },
    }) as MasterPlaylist;
    expect(pl.customTags!.EXT_X_INFO).toEqual([{ version: "2" }]);
  });

  it("no custom parsers — all unknown tags go as raw", () => {
    const pl = parser("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-A:1\n#EXT-X-A:2\n#EXTINF:10,\ns.ts\n#EXT-X-ENDLIST") as MediaPlaylist;
    expect(pl.customTags!.EXT_X_A).toEqual(["1", "2"]);
  });
});
