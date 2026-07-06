/* =============================================================================
 * pixels.js — Get Certified: Pixel Overworld
 * A tiny, dependency-free pixel-art SVG sprite library.
 *
 * Everything is authored on an integer pixel grid and rendered as inline SVG
 * with shape-rendering:crispEdges, so sprites stay razor-sharp at any integer
 * scale and never depend on external binaries. Palette is DawnBringer-16
 * (warm, limited, hue-shifted) per DESIGN-BRIEF-A.
 *
 * Public API (attached to window.GCPixels):
 *   GCPixels.PAL                      -> the char->hex palette map
 *   GCPixels.sprite(name, opts)       -> SVG string for a named sprite
 *   GCPixels.node(opts)               -> a level-select node disk (state-aware)
 *   GCPixels.svgFromRows(rows, opts)  -> low-level: build SVG from a char matrix
 *   GCPixels.names()                  -> list of available sprite names
 *   GCPixels.inject(el, name, opts)   -> set el.innerHTML to a sprite
 * ========================================================================== */
/* eslint-disable */
// @ts-nocheck
// Ported from get-certified-game/src/pixels.js — dependency-free pixel-art SVG
// sprite lib (DawnBringer-16, crisp integer grid). Adapted to an ES module.
const _M = (function () {
  'use strict';

  /* ---- DawnBringer 16 palette, keyed by single char --------------------- */
  var PAL = {
    '.': null,          // transparent
    x: '#140c1c',       // deepest shadow
    W: '#442434',       // wine brown (shadow accent)
    w: '#30346d',       // deep blue (water shadow)
    a: '#4e4a4e',       // warm neutral gray
    d: '#854c30',       // brown (dirt/path shadow)
    g: '#346524',       // forest green (terrain shadow)
    r: '#d04648',       // warm red (hearts / locked)
    k: '#757161',       // stone / khaki
    b: '#597dce',       // sky / water blue
    o: '#d27d2c',       // orange-brown (path / wood / xp)
    n: '#8595a1',       // cool gray (UI mid)
    G: '#6daa2c',       // grass green (terrain mid)
    s: '#d2aa99',       // sand / light
    c: '#6dc2ca',       // cyan-teal accent
    y: '#dad45e',       // gold / stars / coins
    e: '#deeed6',       // near-white highlight / text
    // extended: purples for the Claude / Anthropic world + cool accents
    p: '#7c5cff',       // Anthropic purple (core)
    u: '#3a2b6b',       // deep purple shadow
    P: '#b9a7ff',       // lavender highlight
    m: '#d98a5b',       // terracotta accent (Anthropic clay)
    i: '#bfe9ff'        // ice / bright cyan glow
  };

  /* ---- deterministic tiny RNG (so tiles are stable across reloads) ------ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- low-level: char matrix -> crisp SVG (horizontal run-length) ------ */
  function svgFromRows(rows, opts) {
    opts = opts || {};
    var pal = opts.pal || PAL;
    var h = rows.length;
    var w = rows[0].length;
    // validate rectangular grid — catches authoring typos loudly
    for (var i = 0; i < h; i++) {
      if (rows[i].length !== w) {
        throw new Error('pixels.js: row ' + i + ' width ' + rows[i].length + ' != ' + w);
      }
    }
    var rects = [];
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      var x = 0;
      while (x < w) {
        var ch = row[x];
        var col = pal[ch];
        if (col == null) { x++; continue; }
        var run = 1;
        while (x + run < w && row[x + run] === ch) run++;
        rects.push('<rect x="' + x + '" y="' + y + '" width="' + run + '" height="1" fill="' + col + '"/>');
        x += run;
      }
    }
    var cls = opts.class ? ' class="' + opts.class + '"' : '';
    var style = opts.style ? ' style="' + opts.style + '"' : '';
    var title = opts.title ? '<title>' + opts.title + '</title>' : '';
    var extra = opts.svgAttr ? ' ' + opts.svgAttr : '';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img"' + cls + style + extra + '>' +
      title + rects.join('') + '</svg>';
  }

  /* ---- procedural terrain tiles (guaranteed-valid, tileable) ------------ */
  function fillTile(base, speck, speck2, seed) {
    var rnd = mulberry32(seed);
    var N = 16, rows = [];
    for (var y = 0; y < N; y++) {
      var line = '';
      for (var x = 0; x < N; x++) {
        var v = rnd();
        // keep the 1px border mostly base so neighbouring tiles blend
        var edge = (x === 0 || y === 0 || x === N - 1 || y === N - 1);
        if (!edge && v > 0.90 && speck2) line += speck2;
        else if (v > 0.80) line += speck;
        else line += base;
      }
      rows.push(line);
    }
    return rows;
  }

  function waterTile(seed) {
    var rnd = mulberry32(seed);
    var N = 16, rows = [];
    for (var y = 0; y < N; y++) {
      var line = '';
      for (var x = 0; x < N; x++) {
        var v = rnd();
        // horizontal ripple bands: teal highlights on some rows, dark on others
        if ((y % 4 === 1) && v > 0.72) line += 'c';
        else if ((y % 4 === 3) && v > 0.80) line += 'w';
        else line += 'b';
      }
      rows.push(line);
    }
    return rows;
  }

  /* ---- grid composer: draw primitives into a guaranteed-rectangular matrix
   * so landmark sprites can never desync their row widths. --------------- */
  function grid(w, h, bg) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var line = '';
      for (var x = 0; x < w; x++) line += (bg || '.');
      rows.push(line.split(''));
    }
    return {
      w: w, h: h, rows: rows,
      px: function (x, y, c) {
        if (x >= 0 && x < w && y >= 0 && y < h) this.rows[y][x] = c;
        return this;
      },
      rect: function (x, y, rw, rh, c) {
        for (var yy = y; yy < y + rh; yy++)
          for (var xx = x; xx < x + rw; xx++) this.px(xx, yy, c);
        return this;
      },
      // symmetric trapezoid/tower body that narrows or widens by `slope` per row
      hline: function (x, y, len, c) { return this.rect(x, y, len, 1, c); },
      vline: function (x, y, len, c) { return this.rect(x, y, 1, len, c); },
      // filled disc (blocky) centered at cx,cy radius r
      disc: function (cx, cy, r, c) {
        for (var yy = -r; yy <= r; yy++)
          for (var xx = -r; xx <= r; xx++)
            if (xx * xx + yy * yy <= r * r + r * 0.5) this.px(cx + xx, cy + yy, c);
        return this;
      },
      ring: function (cx, cy, r, c) {
        for (var a = 0; a < 360; a += 6) {
          var rad = a * Math.PI / 180;
          this.px(Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), c);
        }
        return this;
      },
      out: function () { return this.rows.map(function (r) { return r.join(''); }); }
    };
  }

  /* ---- hand-authored icon matrices -------------------------------------- */
  var M = {};

  M.heart = [
    '................',
    '................',
    '...rrrr..rrrr...',
    '..reeerr.rrrrr..',
    '.reeerrrrrrrrrr.',
    '.reerrrrrrrrrrr.',
    '.rrrrrrrrrrrrrr.',
    '.rrrrrrrrrrrrrr.',
    '.Wrrrrrrrrrrrrr.',
    '..Wrrrrrrrrrrr..',
    '...Wrrrrrrrrr...',
    '....Wrrrrrrr....',
    '.....Wrrrrr.....',
    '......Wrrr......',
    '.......Wr.......',
    '................'
  ];

  M.star = [
    '................',
    '.......yy.......',
    '.......ee.......',
    '......yeey......',
    '......yeey......',
    '.....yeeeey.....',
    '.yyyyyeeeeyyyyy.',
    '..yyeeeeeeeeyy..',
    '...yeeeeeeeey...',
    '....yeeeeeey....',
    '....yeeeeeey....',
    '...yeeydyeeey...',
    '..yeey.d.yeey...',
    '.yyy.......yyy..',
    '.y...........y..',
    '................'
  ];

  M.coin = [
    '................',
    '.....oooooo.....',
    '...ooyyyyyyoo...',
    '..oyyeeeyyyyyo..',
    '..oyeeyyyyyyyo..',
    '.oyeyyyyyyyyyyo.',
    '.oyyyyoooyyyyyo.',
    '.oyyyyoooyyyyyo.',
    '.oyyyyoooyyyyyo.',
    '.oyyyyoooyyyyyo.',
    '.oyyyyyyyyyyyyo.',
    '..oyyyyyyyyyyo..',
    '..oyyyyyyyyyyo..',
    '...ooyyyyyyoo...',
    '.....oooooo.....',
    '................'
  ];

  M.tree = [
    '......gGGg......',
    '....gGGGGGGg....',
    '...gGGGGGGGGg...',
    '..gGGgGGGGGGGg..',
    '..GGGGGGGGgGGG..',
    '.gGGGGgGGGGGGGg.',
    '.gGGgGGGGGgGGGg.',
    '.gGGGGGGGGGGGGg.',
    '..GGGGGgGGGGGG..',
    '..gGGGGGGGGGGg..',
    '...gGGGGGGGGg...',
    '.....gGGGGg.....',
    '......dodo......',
    '......dodo......',
    '.....ddoodd.....',
    '....dddoodddd...'
  ];

  M.cloud = [
    '........eeee........',
    '......eeeeeeee......',
    '....eeeeeeeeeeee....',
    '..eeeeeeeeeeeeeeee..',
    '.eeeeeeeeeeeeeeeeee.',
    'eeeeeeeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeeeeeee',
    '.nneeeeeeeeeeeeeenn.',
    '..nnnnnnnnnnnnnnnn..',
    '....nn........nn....'
  ];

  // 32x32 hero castle (stone with battlements, gate, gold pennant)
  M.castle = [
    '................................',
    '..............yy................',
    '..............ye................',
    '..............yeeee.............',
    '..............yeeeeee...........',
    '..............yeee..............',
    '..............y.................',
    '.kk.kk.kk.....y.....kk.kk.kk....',
    '.kkkkkkkk.....y.....kkkkkkkk....',
    '.knnnnkk.kk.kk.kk.kk.knnnnnk....',
    '.knnnnkkkkkkkkkkkkkkkknnnnnk....',
    '.knwwnknnnnnnnnnnnnnnknwwnnk....',
    '.knwwnknnnnnnnnnnnnnnknwwnnk....',
    '.knnnnknnnnnnnnnnnnnnknnnnnk....',
    '.kkkkkknnnnnnnnnnnnnnkkkkkkk....',
    '....knnnnnnnnnnnnnnnnnnnnk......',
    '....knnwwnnnnnnnnnnnnwwnnk......',
    '....knnwwnnnnwwwwnnnnwwnnk......',
    '....knnnnnnnwddddwnnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....knnnnnnwdxxxxdwnnnnnnk......',
    '....kkkkkkkkkxxxxkkkkkkkkk......',
    '...kGGGGGGGGGxxxxGGGGGGGGGk.....',
    '..gGGGGGGGGGGxxxxGGGGGGGGGGg....',
    '.gGGGGGGGGGGGGGGGGGGGGGGGGGGg...',
    'gGGGGGGGGGGGGGGGGGGGGGGGGGGGGg..',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..'
  ];

  // signpost / cheat-sheet scroll node
  M.signpost = [
    '................',
    '.....dddddd.....',
    '....dssssssd....',
    '...dssssssssd...',
    '...dseeeeeesd...',
    '...dseoooeesd...',
    '...dseeeeeesd...',
    '...dseoooeesd...',
    '...dseeeeeesd...',
    '....dssssssd....',
    '.....dddddd.....',
    '.......oo.......',
    '.......oo.......',
    '.......oo.......',
    '......dood......',
    '................'
  ];

  // short dotted path segment tile (horizontal), orange stepping stones
  M.pathH = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..ooo.....ooo...',
    '.odddo...odddo..',
    '.odddo...odddo..',
    '..ooo.....ooo...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ];

  /* ============ distinct per-cert LANDMARKS (32x32) =====================
   * Each certification world gets its own keep so AIF / CLF / CCA never look
   * interchangeable. Built via the grid composer (rectangular-safe). */

  // AIF — "Neural Orb Tower": a tall dark-teal spire crowned by a glowing
  // cyan orb wrapped in an orbit ring (neural/AI motif).
  function towerAIF() {
    var g = grid(32, 32, '.');
    // grassy mound base
    g.rect(2, 29, 28, 3, 'G').rect(0, 31, 32, 1, 'g');
    g.px(6, 28, 'G').px(25, 28, 'G');
    // tower shaft (stone-teal) tapering
    g.rect(11, 12, 10, 18, 'k');          // body
    g.rect(12, 12, 8, 18, 'n');           // lighter face
    g.rect(12, 12, 2, 18, 'e');           // left highlight column
    g.rect(18, 12, 2, 18, 'a');           // right shade column
    // brick banding
    for (var by = 15; by < 30; by += 3) g.hline(12, by, 8, 'k');
    // arched door
    g.rect(14, 24, 4, 6, 'x').px(14, 24, 'k').px(17, 24, 'k').rect(15, 23, 2, 1, 'k');
    // battlement crown
    g.rect(10, 10, 12, 3, 'k');
    g.px(10, 9, 'k').px(13, 9, 'k').px(16, 9, 'k').px(19, 9, 'k').px(21, 9, 'k');
    g.px(11, 9, 'k').px(14, 9, 'k').px(17, 9, 'k').px(20, 9, 'k');
    // glowing neural orb on top + orbit ring
    g.disc(16, 6, 4, 'c');
    g.disc(16, 6, 3, 'i');
    g.px(15, 5, 'e').px(16, 5, 'e');       // specular highlight
    g.ring(16, 6, 6, 'b');                 // orbit ring
    g.px(22, 6, 'y').px(10, 6, 'y');       // orbit nodes
    g.px(16, 0, 'i');                      // top glow speck
    return g.out();
  }

  // CLF — "Cloud Fortress": a wide sky-blue keep sitting on / wrapped by
  // clouds, twin turrets, an AWS-orange banner.
  function fortressCLF() {
    var g = grid(32, 32, '.');
    // cloud base the fortress floats on
    g.rect(2, 27, 28, 3, 'e').rect(0, 29, 32, 3, 'n');
    g.px(4, 26, 'e').px(10, 26, 'e').px(20, 26, 'e').px(26, 26, 'e');
    // main keep body (cool blue stone)
    g.rect(6, 12, 20, 16, 'w').rect(7, 12, 18, 16, 'b');
    g.rect(7, 12, 2, 16, 'i');             // left highlight
    g.rect(23, 12, 2, 16, 'w');            // right shade
    // twin turrets
    g.rect(4, 8, 5, 20, 'w').rect(5, 8, 3, 20, 'b');
    g.rect(23, 8, 5, 20, 'w').rect(24, 8, 3, 20, 'b');
    // battlements on turrets + keep
    ['4','7','23','26'].forEach(function () {});
    g.px(4, 7, 'w').px(6, 7, 'w').px(8, 7, 'w');
    g.px(23, 7, 'w').px(25, 7, 'w').px(27, 7, 'w');
    g.px(8, 11, 'w').px(11, 11, 'w').px(14, 11, 'w').px(17, 11, 'w').px(20, 11, 'w').px(23, 11, 'w');
    // gate
    g.rect(13, 21, 6, 7, 'x').rect(14, 20, 4, 1, 'w');
    g.px(13,20,'w').px(18,20,'w');
    // windows
    g.rect(10, 15, 2, 3, 'i').rect(20, 15, 2, 3, 'i');
    // AWS-orange banner on center mast
    g.vline(16, 3, 6, 's');
    g.rect(17, 3, 5, 4, 'o').px(21, 4, 'o').px(20, 5, 'o');
    // little cloud puffs at sides
    g.disc(3, 24, 2, 'e').disc(29, 24, 2, 'e');
    return g.out();
  }

  // CCA — "Anthropic Keep": a purple castle with a lavender roof, a glowing
  // clay-orange spark crest (Anthropic mark feel).
  function keepCCA() {
    var g = grid(32, 32, '.');
    // purple mound base
    g.rect(2, 29, 28, 3, 'u').rect(0, 31, 32, 1, 'u');
    // keep body (purple stone)
    g.rect(7, 13, 18, 16, 'u').rect(8, 13, 16, 16, 'p');
    g.rect(8, 13, 2, 16, 'P');             // left highlight
    g.rect(22, 13, 2, 16, 'u');            // right shade
    // brick banding
    for (var by2 = 16; by2 < 28; by2 += 3) g.hline(8, by2, 16, 'u');
    // corner towers
    g.rect(4, 9, 5, 20, 'u').rect(5, 9, 3, 20, 'p').rect(5, 9, 1, 20, 'P');
    g.rect(23, 9, 5, 20, 'u').rect(24, 9, 3, 20, 'p');
    // pointed lavender roofs on towers
    g.px(6, 6, 'P').rect(5, 7, 3, 1, 'P').rect(4, 8, 5, 1, 'u');
    g.px(25, 6, 'P').rect(24, 7, 3, 1, 'P').rect(23, 8, 5, 1, 'u');
    // central roof gable
    g.px(16, 8, 'P').rect(15, 9, 3, 1, 'P').rect(13, 10, 7, 1, 'p').rect(11, 11, 11, 1, 'u');
    g.rect(11, 12, 11, 1, 'p');
    // battlements
    g.px(11, 12, 'u').px(14, 12, 'u').px(17, 12, 'u').px(20, 12, 'u');
    // gate
    g.rect(13, 22, 6, 7, 'x').rect(14, 21, 4, 1, 'p');
    g.px(13,21,'p').px(18,21,'p');
    // windows glowing clay
    g.rect(11, 16, 2, 3, 'm').rect(19, 16, 2, 3, 'm');
    // Anthropic-style spark crest on the mast
    g.vline(16, 2, 6, 's');
    g.disc(16, 4, 2, 'm');
    g.px(16, 1, 'm').px(16, 7, 'm').px(13, 4, 'm').px(19, 4, 'm'); // burst rays
    g.px(14, 2, 'm').px(18, 2, 'm').px(14, 6, 'm').px(18, 6, 'm');
    return g.out();
  }

  /* ============ hard-edged pixel SUN (disc + stepped/dithered corona) =====
   * No radial gradient anywhere: a solid gold disc, a one-step orange rim, a
   * specular highlight, and a stepped corona of alternating dithered rays so
   * it reads as authored pixel art instead of a soft CSS glow. */
  function sun() {
    var N = 28, cx = 14, cy = 14, g = grid(N, N, '.');
    // dithered outer corona (two stepped rings, checker-thinned = no gradient)
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var dx = x - cx, dy = y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d >= 10.5 && d < 12.5 && ((x + y) % 2 === 0)) g.px(x, y, 'o');
        else if (d >= 9 && d < 10.5 && (((x + y) % 2 === 0) || (x % 3 === 0))) g.px(x, y, 'y');
      }
    }
    // solid body
    g.disc(cx, cy, 8, 'o');   // rim (one hard step darker)
    g.disc(cx, cy, 7, 'y');   // gold body
    g.disc(cx, cy, 5, 'e');   // inner warm-white core
    g.disc(cx, cy, 4, 'y');   // back to gold so core is just a highlight ring
    // specular highlight top-left (hard block)
    g.disc(cx - 3, cy - 3, 1, 'e').px(cx - 4, cy - 3, 'e').px(cx - 3, cy - 4, 'e');
    return g.out();
  }

  /* ============ dithered parallax MOUNTAIN bands ==========================
   * A wide, horizontally-tileable range built column-by-column from summed
   * sines (deterministic). Each peak has a hard sunlit left face, a shaded
   * right face, and a Bayer-ordered dither transition band — hard edges only,
   * limited palette, no alpha gradients. `pal` chooses the band's 3 tones so
   * near/far layers read as distinct parallax planes. */
  var BAYER4 = [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ];
  function mountainBand(w, h, lightC, midC, shadeC, seed) {
    var g = grid(w, h, '.');
    var rnd = mulberry32(seed);
    var phase = rnd() * 6.28, phase2 = rnd() * 6.28;
    for (var x = 0; x < w; x++) {
      // seamless: use frequencies that complete whole cycles over width w
      var t = (x / w) * Math.PI * 2;
      var peak = 0.5
        + 0.30 * Math.sin(t * 3 + phase)
        + 0.14 * Math.sin(t * 7 + phase2)
        + 0.06 * Math.sin(t * 13);
      var top = Math.round(h - peak * (h - 2)); // higher peak => smaller top y
      if (top < 1) top = 1;
      for (var y = top; y < h; y++) {
        var depth = y - top;              // distance below the ridge line
        // left face (sunlit) vs right face (shade): use local slope sign
        var slope = Math.cos(t * 3 + phase); // >0 rising to the right
        var band = 2;                     // dither transition thickness
        var col;
        if (depth < band) {
          // ridge highlight, dithered against mid using Bayer threshold
          col = (BAYER4[y % 4][x % 4] / 16) < 0.5 ? lightC : midC;
        } else if (slope > 0) {
          col = midC;                     // sunlit slope
        } else {
          // shaded slope, dithered mid->shade for a stepped look
          col = (BAYER4[y % 4][x % 4] / 16) < 0.45 ? midC : shadeC;
        }
        g.px(x, y, col);
      }
    }
    return g.out();
  }
  function mountainsFar() { return mountainBand(96, 30, 'b', 'w', 'u', 91); }
  function mountainsNear() { return mountainBand(80, 34, 'n', 'a', 'W', 137); }

  var SPRITES = {
    grass: function () { return fillTile('G', 'g', null, 7); },
    dirt: function () { return fillTile('o', 'd', null, 13); },
    sand: function () { return fillTile('s', 'o', null, 29); },
    water: function () { return waterTile(41); },
    heart: function () { return M.heart; },
    star: function () { return M.star; },
    coin: function () { return M.coin; },
    tree: function () { return M.tree; },
    cloud: function () { return M.cloud; },
    castle: function () { return M.castle; },
    signpost: function () { return M.signpost; },
    path: function () { return M.pathH; },
    sun: sun,
    mountainsFar: mountainsFar,
    mountainsNear: mountainsNear,
    // per-cert landmarks
    towerAIF: towerAIF,
    fortressCLF: fortressCLF,
    keepCCA: keepCCA
  };

  function sprite(name, opts) {
    var gen = SPRITES[name];
    if (!gen) throw new Error('pixels.js: unknown sprite "' + name + '"');
    return svgFromRows(gen(), Object.assign({ title: name }, opts || {}));
  }

  function names() { return Object.keys(SPRITES); }

  /* ---- level node: a stone disk, state-aware --------------------------- *
   * state: 'locked' | 'open' | 'current' | 'done' | 'boss' | 'special'
   * A 16x16 chunky disk with a colored core; the app overlays a number/glyph.
   */
  function node(opts) {
    opts = opts || {};
    var state = opts.state || 'open';
    // core color per state, pulled from the semantic mapping in the brief
    var core = {
      locked: 'a',   // dim neutral
      open: 'b',     // sky-blue, inviting
      current: 'y',  // gold, "you are here"
      done: 'G',     // grass-green, cleared
      boss: 'r',     // red, danger/boss
      special: 'c'   // teal accent (cheat sheet / bonus)
    }[state] || 'b';
    var ring = state === 'locked' ? 'a' : 'k';
    var hi = state === 'locked' ? 'n' : 'e';
    var C = core, R = ring, H = hi;
    // 16x16 disk: R = outer ring, C = core, H = top-left highlight, x = deep rim
    var rows = [
      '................',
      '.....xRRRRx.....',
      '...xRRHHHHRRx...',
      '..xRHHCCCCHHRx..',
      '..RHCCCCCCCCHR..',
      '.xRCCCCCCCCCCRx.',
      '.RHCCCCCCCCCCHR.',
      '.RCCCCCCCCCCCCR.',
      '.RCCCCCCCCCCCCR.',
      '.RHCCCCCCCCCCHR.',
      '.xRCCCCCCCCCCRx.',
      '..RCCCCCCCCCCR..',
      '..xRxCCCCCCxRx..',
      '...xRRxCCxRRx...',
      '.....xRRRRx.....',
      '................'
    ];
    // remap placeholder chars to chosen palette chars
    var remapped = rows.map(function (line) {
      var out = '';
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === 'C') out += C;
        else if (ch === 'R') out += R;
        else if (ch === 'H') out += H;
        else out += ch;
      }
      return out;
    });
    return svgFromRows(remapped, Object.assign({ title: 'node-' + state }, opts));
  }

  function inject(el, name, opts) {
    if (!el) return;
    el.innerHTML = (name === 'node') ? node(opts) : sprite(name, opts);
  }

  /* Object.assign polyfill guard for very old engines (not needed modern) */
  if (typeof Object.assign !== 'function') {
    Object.assign = function (t) {
      for (var i = 1; i < arguments.length; i++) {
        var s = arguments[i]; if (!s) continue;
        for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
      }
      return t;
    };
  }

  return {
    PAL: PAL,
    svgFromRows: svgFromRows,
    sprite: sprite,
    node: node,
    names: names,
    inject: inject
  };
})();

export const PAL = _M.PAL;
export const svgFromRows = _M.svgFromRows;
export const sprite = _M.sprite;
export const node = _M.node;
export const names = _M.names;
export default _M;
