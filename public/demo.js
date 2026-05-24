/**
 * HLS M3U8 Parser Demo — collapsible JSON result viewer
 */
(function () {
  "use strict";
  /* global HlsParse */
  var parser = HlsParse.parser;
  var resolveUrl = HlsParse.resolveUrl;
  var InvalidPlaylistError = HlsParse.InvalidPlaylistError;

  // ---- DOM refs ----
  var $ = function (id) {
    return document.getElementById(id);
  };
  var urlInput = $("url-input");
  var textInput = $("text-input");
  var fetchBtn = $("fetch-btn");
  var parseBtn = $("parse-btn");
  var statusBar = $("status");
  var resultsDiv = $("results");
  var emptyPlaceholder = $("empty-placeholder");

  // ---- Embedded samples ----
  var SAMPLES = {
    master:
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000,AVERAGE-BANDWIDTH=1000000,CODECS="mp4a.40.2,avc1.4d401e",RESOLUTION=1280x720\nvideo/1000k.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2560000,AVERAGE-BANDWIDTH=2000000,CODECS="mp4a.40.2,avc1.4d401e",RESOLUTION=1920x1080\nvideo/2000k.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=5120000,AVERAGE-BANDWIDTH=4000000,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=3840x2160\nvideo/4000k.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=65000,CODECS="mp4a.40.5"\naudio/only.m3u8',
    media:
      "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:9.009,\nhttp://media.example.com/first.ts\n#EXTINF:9.009,\nhttp://media.example.com/second.ts\n#EXTINF:3.003,\nhttp://media.example.com/third.ts\n#EXT-X-ENDLIST",
    llhls:
      '#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=1.0,CAN-SKIP-UNTIL=12.0\n#EXT-X-PART-INF:PART-TARGET=1.0\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4.0,\nfileSequence1.mp4\n#EXT-X-PART:DURATION=1.0,URI="part1.mp4"\n#EXT-X-PART:DURATION=1.0,URI="part2.mp4"\n#EXT-X-PART:DURATION=1.0,URI="part3.mp4"\n#EXT-X-PART:DURATION=1.0,URI="part4.mp4"\n#EXTINF:4.0,\nfileSequence2.mp4\n#EXT-X-PRELOAD-HINT:TYPE=PART,URI="part5.mp4"',
    encrypted:
      '#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-KEY:METHOD=AES-128,URI="https://priv.example.com/key.php?r=52"\n#EXTINF:9.009,\nhttp://media.example.com/fileSequence52-A.ts\n#EXTINF:9.009,\nhttp://media.example.com/fileSequence52-B.ts\n#EXTINF:3.003,\nhttp://media.example.com/fileSequence52-C.ts\n#EXT-X-ENDLIST',
  };

  // ---- Tabs ----
  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      document.querySelectorAll(".tab-btn,.tab-panel").forEach(function (el) {
        el.classList.remove("active");
      });
      this.classList.add("active");
      $(this.dataset.tab === "url" ? "tab-url" : "tab-text").classList.add("active");
    });
  });

  // ---- Sample URLs ----
  document.querySelectorAll("#tab-url .sample-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      urlInput.value = this.dataset.url;
    });
  });

  // ---- Sample texts ----
  document.querySelectorAll("#tab-text .sample-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      textInput.value = SAMPLES[this.dataset.sample];
    });
  });

  // ---- Status helpers ----
  function showStatus(msg, cls) {
    statusBar.innerHTML = msg;
    statusBar.className = "status-bar " + (cls || "info") + " show";
  }

  // =================================================================
  //  COLLAPSIBLE JSON RENDERER
  // =================================================================

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** return colored value span */
  function valSpan(val) {
    if (val === null || val === undefined) return '<span class="j-null">null</span>';
    if (typeof val === "number") return '<span class="j-number">' + val + "</span>";
    if (typeof val === "boolean") return '<span class="j-bool">' + val + "</span>";
    if (typeof val === "string" && /^https?:\/\//.test(val)) return '<span class="j-uri">' + esc(val) + "</span>";
    return '<span class="j-string">' + esc(String(val)) + "</span>";
  }

  /** key-value line */
  function kv(key, val) {
    return '<div class="j-kv"><span class="j-key">' + esc(key) + "</span>" + valSpan(val) + "</div>";
  }

  var _id = 0;

  /**
   * Build a collapsible section.
   * @param {string} label  - section name
   * @param {*}      data   - value
   * @param {{}}     meta   - { badge, cols, rowFmt }
   */
  function section(label, data, meta) {
    meta = meta || {};
    if (data === null || data === undefined) {
      return '<div class="j-section"><div class="j-toggle" style="cursor:default">' + kv(label, data) + "</div></div>";
    }

    /* ----- Array of objects => table ----- */
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && !(data[0] instanceof Date)) {
      var id = "t" + ++_id;
      var cols = meta.cols || Object.keys(data[0]);
      var badge = meta.badge ? '<span class="j-type' + (meta.badgeClass || "") + '">' + meta.badge + "</span>" : "";

      var h = '<div class="j-section">';
      h += '<div class="j-toggle" onclick="var b=document.getElementById(\'' + id + "');b.classList.toggle('open');this.firstElementChild.classList.toggle('open')\">";
      h += '<span class="j-arr">▶</span>' + label + ' <span class="j-count">[' + data.length + "]</span>" + badge + "</div>";
      h += '<div class="j-body" id="' + id + '"><div class="j-table-wrap"><table class="j-table">';

      // Header
      h += "<tr>";
      cols.forEach(function (c) {
        h += "<th>" + esc(c) + "</th>";
      });
      h += '<th class="j-mono">···</th></tr>';

      // Rows
      data.forEach(function (item, i) {
        var rid = "r" + ++_id;
        h += "<tr>";
        cols.forEach(function (c) {
          var v = meta.rowFmt ? meta.rowFmt(c, item) : item[c];
          if (v === undefined || v === null) h += '<td class="j-mono">-</td>';
          else if (typeof v === "boolean") h += '<td class="j-mono">' + (v ? "✓" : "-") + "</td>";
          else h += '<td class="j-mono">' + esc(String(v)) + "</td>";
        });
        h +=
          '<td class="j-mono"><button style="font-size:.65rem;padding:0 .35rem" onclick="var r=document.getElementById(\'' +
          rid +
          "');r.style.display=r.style.display==='table-row'?'none':'table-row'\">+</button></td>";
        h += "</tr>";
        h += '<tr class="j-detail-row" id="' + rid + '"><td colspan="' + (cols.length + 1) + '"><pre class="j-detail-pre">' + esc(JSON.stringify(item, null, 2)) + "</pre></td></tr>";
      });

      h += "</table></div></div></div>";
      return h;
    }

    /* ----- Object => nested sections ----- */
    if (data && typeof data === "object" && !(data instanceof Date)) {
      var keys = Object.keys(data);
      if (keys.length === 0) return '<div class="j-section"><div class="j-toggle" style="cursor:default">' + kv(label, "{}") + "</div></div>";

      var id2 = "o" + ++_id;
      var badge2 = meta.badge ? '<span class="j-type' + (meta.badgeClass || "") + '">' + meta.badge + "</span>" : "";
      var h2 = '<div class="j-section">';
      h2 += '<div class="j-toggle" onclick="var b=document.getElementById(\'' + id2 + "');b.classList.toggle('open');this.firstElementChild.classList.toggle('open')\">";
      h2 += '<span class="j-arr">▶</span>' + label + ' <span class="j-count">{' + keys.length + "}</span>" + badge2 + "</div>";
      h2 += '<div class="j-body" id="' + id2 + '">';
      keys.forEach(function (k) {
        var v = data[k];
        if (v && typeof v === "object" && !(v instanceof Date)) {
          h2 += section(k, v, {});
        } else {
          h2 += '<div style="padding:.15rem 0">' + kv(k, v) + "</div>";
        }
      });
      h2 += "</div></div>";
      return h2;
    }

    /* ----- Scalar ----- */
    return '<div class="j-section"><div class="j-toggle" style="cursor:default">' + kv(label, data) + "</div></div>";
  }

  /** Main render function */
  function render(pl) {
    _id = 0;
    emptyPlaceholder.style.display = "none";

    var isMst = pl.isMasterPlaylist;
    var html = '<div class="j-root">';

    // Top bar
    html += '<div class="j-toggle" style="background:#0f172a;font-size:.9rem">';
    html += '<span style="color:#60a5fa">' + (isMst ? "📋 Master Playlist" : "🎬 Media Playlist") + "</span>";
    html += '<span class="j-type' + (isMst ? " j-type-master" : "") + '" style="margin-left:1rem">' + (isMst ? "MASTER" : "MEDIA") + "</span>";
    if (pl.version) html += '<span style="margin-left:.5rem;font-size:.7rem;padding:.15rem .5rem;border-radius:9999px;background:#8b5cf6;color:#fff">v' + pl.version + "</span>";
    if (pl.lowLatencyCompatibility) html += '<span style="margin-left:.3rem;font-size:.7rem;padding:.15rem .5rem;border-radius:9999px;background:#f59e0b;color:#000">LL-HLS</span>';
    html += "</div>";

    if (isMst) {
      // Master playlist
      if (pl.variants && pl.variants.length)
        html += section("variants", pl.variants, {
          badge: "VARIANTS",
          badgeClass: " j-type-master",
          cols: ["uri", "bandwidth", "averageBandwidth", "resolution", "codecs"],
          rowFmt: function (c, it) {
            if (c === "resolution" && it.resolution) return it.resolution.width + "x" + it.resolution.height;
            return it[c];
          },
        });
      if (pl.contentSteering)
        html += section("contentSteering", pl.contentSteering, {
          badge: "STEERING",
        });
      if (pl.sessionDataList && pl.sessionDataList.length)
        html += section("sessionDataList", pl.sessionDataList, {
          badge: "SESSIONS",
        });
      if (pl.sessionKeyList && pl.sessionKeyList.length) html += section("sessionKeyList", pl.sessionKeyList, { badge: "KEYS" });
      if (pl.defines && pl.defines.length) html += section("defines", pl.defines, { badge: "DEFINES" });
      if (pl.start) html += section("start", pl.start, { badge: "START" });
    } else {
      // Media playlist
      if (pl.targetDuration !== undefined) html += section("targetDuration", pl.targetDuration);
      if (pl.mediaSequenceBase !== undefined) html += section("mediaSequenceBase", pl.mediaSequenceBase);
      if (pl.endlist !== undefined) html += section("endlist", pl.endlist);
      if (pl.playlistType) html += section("playlistType", pl.playlistType);
      if (pl.isIFrame) html += section("isIFrame", pl.isIFrame);
      if (pl.partTargetDuration !== undefined) html += section("partTargetDuration", pl.partTargetDuration);
      if (pl.skip !== undefined) html += section("skip", pl.skip);
      if (pl.lowLatencyCompatibility)
        html += section("lowLatencyCompatibility", pl.lowLatencyCompatibility, {
          badge: "LL-HLS",
        });
      if (pl.start) html += section("start", pl.start, { badge: "START" });
      if (pl.defines && pl.defines.length) html += section("defines", pl.defines, { badge: "DEFINES" });
      if (pl.segments && pl.segments.length)
        html += section("segments", pl.segments, {
          badge: "SEGMENTS",
          cols: ["mediaSequenceNumber", "uri", "duration", "discontinuity", "gap"],
          rowFmt: function (c, it) {
            if (c === "discontinuity") return it.discontinuity || false;
            if (c === "gap") return it.gap || false;
            return it[c];
          },
        });
      if (pl.prefetchSegments && pl.prefetchSegments.length)
        html += section("prefetchSegments", pl.prefetchSegments, {
          badge: "PREFETCH",
        });
      if (pl.renditionReports && pl.renditionReports.length)
        html += section("renditionReports", pl.renditionReports, {
          badge: "REPORTS",
        });
      if (pl.dateRanges && pl.dateRanges.length) html += section("dateRanges", pl.dateRanges, { badge: "DATERANGES" });
    }

    html += "</div>";
    resultsDiv.innerHTML = html;
  }

  // ---- Handle fetch ----
  fetchBtn.addEventListener("click", function () {
    var url = urlInput.value.trim();
    if (!url) return showStatus("请输入 URL", "error");
    showStatus("正在获取...", "loading");
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error(r.statusText);
        return r.text();
      })
      .then(function (text) {
        showStatus("解析中...", "loading");
        var pl = parser(text, { uri: url });
        showStatus("解析成功: " + (pl.isMasterPlaylist ? "Master" : "Media") + " Playlist", "success");
        render(pl);
      })
      .catch(function (e) {
        showStatus("失败: " + e.message, "error");
        console.error(e);
      });
  });

  // ---- Handle text parse ----
  parseBtn.addEventListener("click", function () {
    var text = textInput.value.trim();
    if (!text) return showStatus("请输入 M3U8 文本", "error");
    try {
      var pl = parser(text);
      showStatus("解析成功: " + (pl.isMasterPlaylist ? "Master" : "Media") + " Playlist", "success");
      render(pl);
    } catch (e) {
      showStatus("格式错误: " + e.message, "error");
    }
  });
})();
