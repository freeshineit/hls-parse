/**
 * hls-parse Basic Usage Examples
 *
 * Run with: npx ts-node examples/basic.ts
 */

import { parse, Playlist, MasterPlaylist, MediaPlaylist } from '../src';

// ---------------------------------------------------------------------------
// Example 1: Parse a simple Media Playlist
// ---------------------------------------------------------------------------
function exampleSimpleMediaPlaylist() {
  const m3u8 = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:3
#EXTINF:9.009,
http://media.example.com/first.ts
#EXTINF:9.009,
http://media.example.com/second.ts
#EXTINF:3.003,
http://media.example.com/third.ts
#EXT-X-ENDLIST`;

  const playlist = parse(m3u8) as MediaPlaylist;
  console.log('=== Simple Media Playlist ===');
  console.log(`Target Duration: ${playlist.targetDuration}s`);
  console.log(`Version: ${playlist.version}`);
  console.log(`Segments: ${playlist.segments.length}`);
  for (const seg of playlist.segments) {
    console.log(`  - ${seg.uri} (${seg.duration}s)`);
  }
  console.log(`Endlist: ${playlist.endlist}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Example 2: Parse a Master Playlist with variants
// ---------------------------------------------------------------------------
function exampleMasterPlaylist() {
  const m3u8 = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,AVERAGE-BANDWIDTH=1000000,CODECS="mp4a.40.2,avc1.4d401e",RESOLUTION=1280x720
low.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,AVERAGE-BANDWIDTH=2000000,CODECS="mp4a.40.2,avc1.4d401e",RESOLUTION=1920x1080
mid.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=7680000,AVERAGE-BANDWIDTH=6000000,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=3840x2160
hi.m3u8`;

  const playlist = parse(m3u8) as MasterPlaylist;
  console.log('=== Master Playlist ===');
  console.log(`Variants: ${playlist.variants.length}`);
  for (const variant of playlist.variants) {
    console.log(`  - ${variant.uri}`);
    console.log(`    Bandwidth: ${variant.bandwidth} bps`);
    console.log(`    Resolution: ${variant.resolution?.width}x${variant.resolution?.height}`);
    console.log(`    Codecs: ${variant.codecs}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Example 3: Parse a playlist with relative URL resolution
// ---------------------------------------------------------------------------
function exampleUrlResolution() {
  const m3u8 = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:9.009,
segment1.ts
#EXTINF:9.009,
segment2.ts
#EXT-X-ENDLIST`;

  const playlist = parse(m3u8, {
    uri: 'https://cdn.example.com/hls/main.m3u8',
  }) as MediaPlaylist;

  console.log('=== URL Resolution ===');
  for (const seg of playlist.segments) {
    console.log(`  Resolved: ${seg.uri}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Example 4: Parse an LL-HLS (Low-Latency) playlist
// ---------------------------------------------------------------------------
function exampleLLHLS() {
  const m3u8 = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=36.0,HOLD-BACK=18.0,PART-HOLD-BACK=3.0
#EXT-X-PART-INF:PART-TARGET=1.0
#EXT-X-MEDIA-SEQUENCE:100
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="seg100-part1.ts",INDEPENDENT=YES
#EXT-X-PART:DURATION=1.0,URI="seg100-part2.ts"
#EXT-X-PART:DURATION=1.0,URI="seg100-part3.ts"
#EXT-X-PART:DURATION=1.0,URI="seg100-part4.ts"
seg100.ts
#EXTINF:6.0,
#EXT-X-PART:DURATION=1.0,URI="seg101-part1.ts"
#EXT-X-PART:DURATION=1.0,URI="seg101-part2.ts"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="seg101-part3.ts"
seg101.ts
#EXT-X-RENDITION-REPORT:URI="../1m/wait.m3u8",LAST-MSN=101,LAST-PART=2
#EXT-X-PREFETCH:seg102.ts
#EXT-X-ENDLIST`;

  const playlist = parse(m3u8) as MediaPlaylist;
  console.log('=== LL-HLS (Low-Latency HLS) ===');
  console.log(`Server Control: ${JSON.stringify(playlist.lowLatencyCompatibility, null, 2)}`);
  console.log(`Part Target: ${playlist.partTargetDuration}s`);
  console.log(`Rendition Reports: ${playlist.renditionReports.length}`);
  for (const seg of playlist.segments) {
    console.log(`  Segment #${seg.mediaSequenceNumber}: ${seg.uri} (${seg.duration}s)`);
    if (seg.parts && seg.parts.length > 0) {
      for (const part of seg.parts) {
        console.log(`    Part: ${part.uri}${part.hint ? ' (preload hint)' : ''} ${part.duration ? `(${part.duration}s)` : ''}`);
      }
    }
  }
  if (playlist.prefetchSegments.length > 0) {
    console.log(`  Prefetch: ${playlist.prefetchSegments[0].uri}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Example 5: Parse an encrypted playlist
// ---------------------------------------------------------------------------
function exampleEncryptedPlaylist() {
  const m3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:7794
#EXT-X-TARGETDURATION:15
#EXT-X-KEY:METHOD=AES-128,URI="https://priv.example.com/key.php?r=52"
#EXTINF:2.833,
http://media.example.com/fileSequence52-A.ts
#EXTINF:15.0,
http://media.example.com/fileSequence52-B.ts
#EXT-X-KEY:METHOD=AES-128,URI="https://priv.example.com/key.php?r=53"
#EXTINF:15.0,
http://media.example.com/fileSequence53-A.ts
#EXT-X-ENDLIST`;

  const playlist = parse(m3u8) as MediaPlaylist;
  console.log('=== Encrypted Playlist ===');
  for (const seg of playlist.segments) {
    console.log(`  Segment: ${seg.uri}`);
    if (seg.key) {
      console.log(`    Key: ${seg.key.method} - ${seg.key.uri}`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Run all examples
// ---------------------------------------------------------------------------
exampleSimpleMediaPlaylist();
exampleMasterPlaylist();
exampleUrlResolution();
exampleLLHLS();
exampleEncryptedPlaylist();

console.log('All examples completed!');
