/* =============================================================================
   chart.js — hand-rolled SVG scatter plot.

   x = cost per task (USD, log by default)   y = benchmark score
   Reasoning-effort variants of one model are drawn as separate points joined
   by a line, so "what does 4x the money buy?" is one glance.
   ========================================================================== */
(function (AA) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var F = AA.scale;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function median(values) {
    if (!values.length) return null;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /* ------------------------------------------------------------------ chart */

  AA.createChart = function (root, handlers) {
    handlers = handlers || {};

    var wrap = document.createElement('div');
    wrap.className = 'chart-wrap';

    var svg = el('svg', { class: 'chart-svg' });
    wrap.appendChild(svg);

    var gQuad = el('g', { class: 'l-quad' }, svg);
    var gPareto = el('g', { class: 'l-pareto' }, svg);
    var gGrid = el('g', { class: 'l-grid' }, svg);
    var gAxis = el('g', { class: 'l-axis' }, svg);
    var gLinks = el('g', { class: 'l-links' }, svg);
    var gPts = el('g', { class: 'l-pts' }, svg);
    var gLabels = el('g', { class: 'l-labels' }, svg);
    var gMsg = el('g', { class: 'l-msg' }, svg);

    var tip = document.createElement('div');
    tip.className = 'chart-tip';
    wrap.appendChild(tip);

    root.appendChild(wrap);

    var cfg = null;        /* current config from app.js           */
    var base = null;       /* full data extent                     */
    var view = null;       /* current zoom window (domain units)   */
    var baseKey = null;    /* reset zoom when data/benchmark changes */
    var xs = F.linear(), ys = F.linear();
    var plot = null;       /* {left, top, width, height}           */
    var placed = [];       /* [{x, y, p}] for hit testing          */
    var frame = null;

    /* ---------------------------------------------------------------- render */

    function measure() {
      var w = wrap.clientWidth || 800;
      var h = wrap.clientHeight || 480;
      var left = 66, right = 22, top = 18, bottom = 52;
      if (w < 520) { left = 52; right = 14; bottom = 46; }
      plot = { left: left, top: top, width: Math.max(40, w - left - right), height: Math.max(40, h - top - bottom) };
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      return { w: w, h: h };
    }

    function computeBase() {
      var pts = cfg.points;
      if (!pts.length) return null;

      var costs = [], scores = [];
      pts.forEach(function (p) {
        scores.push(p.score);
        if (cfg.priceScale === 'linear' || p.cost > 0) costs.push(p.cost);
      });

      var y0 = Math.min.apply(null, scores);
      var y1 = Math.max.apply(null, scores);
      var yPad = (y1 - y0) * 0.12 || Math.max(0.5, Math.abs(y1) * 0.05);
      var by0 = y0 - yPad, by1 = y1 + yPad;

      var x0, x1;
      if (!costs.length) {
        x0 = 0; x1 = 1;
      } else if (cfg.priceScale === 'log') {
        var lo = Math.min.apply(null, costs);
        var hi = Math.max.apply(null, costs);
        x0 = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1e-9))));
        x1 = Math.pow(10, Math.ceil(Math.log10(hi * 1.02)));
        if (!(x1 > x0)) x1 = x0 * 10;
      } else {
        var c0 = Math.min.apply(null, costs), c1 = Math.max.apply(null, costs);
        var pad = (c1 - c0) * 0.08 || Math.max(c1 * 0.2, 1);
        x0 = Math.max(0, c0 - pad);
        x1 = c1 + pad;
        if (!(x1 > x0)) x1 = x0 + 1;
      }

      return { x0: x0, x1: x1, y0: by0, y1: by1 };
    }

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(function () { frame = null; render(); });
    }

    function render() {
      if (!cfg) return;
      var size = measure();

      clear(gQuad); clear(gPareto); clear(gGrid); clear(gAxis);
      clear(gLinks); clear(gPts); clear(gLabels); clear(gMsg);

      if (!cfg.points.length) {
        el('text', {
          x: size.w / 2, y: size.h / 2, class: 'empty-msg'
        }, gMsg).textContent = cfg.emptyMessage || 'No data for this benchmark yet.';
        return;
      }

      var key = cfg.baseKey || '';
      if (key !== baseKey || !base) { baseKey = key; base = computeBase(); view = null; }
      if (!base) return;
      if (!view) view = { x0: base.x0, x1: base.x1, y0: base.y0, y1: base.y1 };

      xs = (cfg.priceScale === 'log' ? F.log() : F.linear());
      xs.domain(view.x0, view.x1).range(plot.left, plot.left + plot.width);
      ys = F.linear().domain(view.y0, view.y1).range(plot.top + plot.height, plot.top);

      drawGridAndAxes();
      drawZoomBadge();
      drawQuadrant();
      var paretoIds = drawPareto();
      drawLinks();
      drawPoints(paretoIds);
      drawLabels(paretoIds);
    }

    /* --------------------------------------------------------------- axes */

    function drawGridAndAxes() {
      var xticks = cfg.priceScale === 'log' ? F.logTicks(view.x0, view.x1) : F.linearTicks(view.x0, view.x1, Math.max(3, Math.round(plot.width / 110)));
      var yticks = F.linearTicks(view.y0, view.y1, Math.max(3, Math.round(plot.height / 56)));
      var x = plot.left, y = plot.top, w = plot.width, h = plot.height;

      yticks.forEach(function (t) {
        var py = Math.round(ys(t)) + 0.5;
        el('line', { x1: x, x2: x + w, y1: py, y2: py, class: 'grid-line' }, gGrid);
        el('text', { x: x - 9, y: py + 4, class: 'axis-text', 'text-anchor': 'end' }, gAxis)
          .textContent = F.num(t, Math.abs(t) < 10 ? (t % 1 === 0 ? 0 : 1) : 0);
      });

      xticks.forEach(function (t) {
        var px = Math.round(xs(t)) + 0.5;
        el('line', { x1: px, x2: px, y1: y, y2: y + h, class: 'grid-line' }, gGrid);
        el('text', { x: px, y: y + h + 18, class: 'axis-text', 'text-anchor': 'middle' }, gAxis)
          .textContent = F.usdAxis(t);
      });

      el('line', { x1: x, x2: x + w, y1: y + h + 0.5, y2: y + h + 0.5, class: 'axis-line' }, gAxis);
      el('line', { x1: x + 0.5, x2: x + 0.5, y1: y, y2: y + h, class: 'axis-line' }, gAxis);

      el('text', {
        x: x + w / 2, y: y + h + 40, class: 'axis-title', 'text-anchor': 'middle'
      }, gAxis).textContent = 'Cost per task (USD)' + (cfg.priceScale === 'log' ? ' — log scale' : '');

      var unit = cfg.benchmark && cfg.benchmark.unit === 'percent' ? 'Accuracy (%)' : 'Score';
      var yTitle = cfg.benchmark ? cfg.benchmark.label : 'Score';
      var yt = el('text', {
        x: 0, y: 0, class: 'axis-title', 'text-anchor': 'middle',
        transform: 'translate(16,' + (y + h / 2) + ') rotate(-90)'
      }, gAxis);
      yt.textContent = yTitle + (unit === 'Accuracy (%)' ? '' : ' (' + unit + ')');
    }

    /* ----------------------------------------------------------- quadrant */

    function drawZoomBadge() {
      if (!base) return;
      var baseSpan = base.x1 - base.x0;
      var viewSpan = view.x1 - view.x0;
      var ratio = baseSpan / viewSpan;
      var panned = Math.abs((view.x0 - base.x0) / baseSpan) > 0.001;
      if (ratio < 1.02 && !panned) return;

      var label = (ratio >= 1.02 ? (ratio >= 10 ? Math.round(ratio) + '×' : ratio.toFixed(1) + '×') + ' zoomed' : 'panned') +
        ' — click Reset';
      el('text', {
        x: plot.left + plot.width, y: plot.top + 14,
        class: 'axis-text', 'text-anchor': 'end'
      }, gAxis).textContent = label;
    }

    function drawQuadrant() {
      if (!cfg.showQuadrant) return;
      var costs = cfg.points.map(function (p) { return p.cost; });
      var scores = cfg.points.map(function (p) { return p.score; });
      var mc = median(costs), ms = median(scores);
      if (mc === null || ms === null) return;

      var mx = clampToView(xs(mc), plot.left, plot.left + plot.width);
      var my = clampToView(ys(ms), plot.top, plot.top + plot.height);

      el('rect', {
        x: plot.left, y: plot.top,
        width: Math.max(0, mx - plot.left),
        height: Math.max(0, my - plot.top),
        rx: 3, class: 'quadrant'
      }, gQuad);

      el('text', {
        x: plot.left + 9, y: plot.top + 16, class: 'quadrant-label'
      }, gQuad).textContent = 'most attractive quadrant';
    }

    function clampToView(px, lo, hi) { return Math.min(hi, Math.max(lo, px)); }

    /* -------------------------------------------------------------- pareto */

    function paretoPoints() {
      var sorted = cfg.points.slice().sort(function (a, b) {
        return a.cost - b.cost || b.score - a.score;
      });
      var best = -Infinity;
      var out = [];
      sorted.forEach(function (p) {
        if (p.score > best + 1e-9) { best = p.score; out.push(p); }
      });
      return out;
    }

    function drawPareto() {
      if (!cfg.showPareto) return {};
      var line = paretoPoints();
      var map = {};
      line.forEach(function (p) { map[p.key] = true; });
      if (line.length > 1) {
        el('polyline', {
          points: line.map(function (p) { return xs(clampCost(p)) + ',' + ys(p.score); }).join(' '),
          class: 'pareto-line'
        }, gPareto);
      }
      return map;
    }

    function clampCost(p) {
      if (cfg.priceScale !== 'log') return p.cost;
      return Math.max(p.cost, view.x0);
    }

    /* -------------------------------------------------------- effort links */

    function drawLinks() {
      if (!cfg.showLinks) return;
      var byModel = {};
      cfg.points.forEach(function (p) { (byModel[p.modelId] = byModel[p.modelId] || []).push(p); });

      Object.keys(byModel).forEach(function (mid) {
        var arr = byModel[mid];
        if (arr.length < 2) return;
        arr.sort(function (a, b) { return a.effortIndex - b.effortIndex; });
        el('polyline', {
          points: arr.map(function (p) { return xs(clampCost(p)) + ',' + ys(p.score); }).join(' '),
          class: 'effort-link',
          stroke: cfg.colorOf(arr[0].provider)
        }, gLinks);
      });
    }

    /* -------------------------------------------------------------- points */

    function radius(p) {
      var single = !p.effort || p.effort === 'default';
      return single ? 5 : Math.min(11, 4 + 1.25 * p.effortIndex);
    }

    function drawPoints(paretoMap) {
      placed = [];
      var sel = cfg.selectedModelId;

      cfg.points.forEach(function (p) {
        var px = xs(clampCost(p));
        var py = ys(p.score);
        placed.push({ x: px, y: py, p: p });

        var cls = 'pt';
        if (p.placeholder) cls += ' placeholder';
        if (paretoMap[p.key]) cls += ' pareto';
        if (sel && p.modelId === sel) cls += ' sel';
        else if (sel) cls += ' dim';

        var node = el('circle', {
          cx: px, cy: py, r: radius(p),
          fill: cfg.colorOf(p.provider),
          'fill-opacity': p.placeholder ? 0.45 : 0.92,
          class: cls
        }, gPts);

        node.setAttribute('data-key', p.key);
      });
    }

    /* -------------------------------------------------------------- labels */

    function drawLabels(paretoMap) {
      var cand = [];
      var sel = cfg.selectedModelId;

      cfg.points.forEach(function (p) { if (sel && p.modelId === sel) cand.push({ p: p, pri: 0 }); });

      if (cfg.showLabels) {
        cfg.points.forEach(function (p) { if (paretoMap[p.key]) cand.push({ p: p, pri: 1 }); });
        cfg.points.slice()
          .sort(function (a, b) { return b.score - a.score; })
          .slice(0, 8)
          .forEach(function (p) { cand.push({ p: p, pri: 2 }); });
      }

      var seen = {};
      var boxes = [];
      var lx = plot.left + plot.width, ly = plot.top + plot.height;

      cand.sort(function (a, b) { return a.pri - b.pri; }).forEach(function (c) {
        if (seen[c.p.key]) return;
        seen[c.p.key] = true;

        var px = xs(clampCost(c.p));
        var py = ys(c.p.score);
        var text = c.p.modelName + (c.p.effortShort ? ' (' + c.p.effortShort + ')' : '');
        var w = text.length * 5.9 + 8;
        var h = 13;

        var spots = [
          [px + 9, py + 4, 'start'],
          [px - 9, py + 4, 'end'],
          [px, py - 10, 'middle'],
          [px, py + 17, 'middle']
        ];

        for (var i = 0; i < spots.length; i++) {
          var s = spots[i];
          var tx = s[2] === 'start' ? s[0] : s[2] === 'end' ? s[0] - w : s[0] - w / 2;
          var box = { x1: tx, y1: s[1] - h + 2, x2: tx + w, y2: s[1] + 3 };
          if (box.x1 < 2 || box.x2 > lx - 2 || box.y1 < 1 || box.y2 > ly - 1) continue;
          if (boxes.some(function (b) { return !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2); })) continue;

          boxes.push(box);
          el('text', { x: s[0], y: s[1], class: 'pt-label', 'text-anchor': s[2] }, gLabels).textContent = text;
          break;
        }
      });
    }

    /* ------------------------------------------------------------- tooltip */

    function nearest(mx, my) {
      var best = null, bestD = 144; /* 12px radius */
      for (var i = 0; i < placed.length; i++) {
        var dx = placed[i].x - mx, dy = placed[i].y - my;
        var d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = placed[i]; }
      }
      return best;
    }

    function costBreakdown(p) {
      if (!p.pricing) return null;
      var rows = [];
      ['input', 'output', 'cache_read', 'cache_write'].forEach(function (k) {
        var v = p.pricing[k];
        if (typeof v === 'number') rows.push([k.replace('_', ' ') + ' $/Mtok', '$' + v]);
      });
      return rows.length ? rows : null;
    }

    function tipHtml(p) {
      var rows = [
        ['Score', F.num(p.score, 2)],
        ['Cost / task', F.usd(p.cost)],
        ['Effort', p.effort === 'default' ? '—' : p.effortLabel],
        ['Score per $1', p.cost > 0 ? F.num(p.score / p.cost, 2) : '—']
      ];

      var pricing = costBreakdown(p);
      if (pricing) pricing.forEach(function (r) { rows.push(r); });

      rows.push(['Context', F.tokens(p.contextWindow) || '—']);
      rows.push(['Released', F.date(p.releaseDate)]);

      var html =
        '<div class="t-name">' + F.escapeHtml(p.modelName) + '</div>' +
        '<div class="t-sub">' + F.escapeHtml(p.provider) + (p.openWeights ? ' · open weights' : '') + '</div>' +
        '<table>' + rows.map(function (r) {
          return '<tr><td>' + F.escapeHtml(r[0]) + '</td><td>' + F.escapeHtml(r[1]) + '</td></tr>';
        }).join('') + '</table>';

      if (p.placeholder) html += '<div class="t-warn">Placeholder data — replace with real values.</div>';
      if (p.cost <= 0 && cfg.priceScale === 'log') html += '<div class="t-warn">Cost 0 cannot be placed on a log axis; drawn at the left edge.</div>';

      html += '<div class="t-hint">Click to pin this model.</div>';
      return html;
    }

    function showTip(p, clientX, clientY) {
      tip.innerHTML = tipHtml(p);
      tip.classList.add('on');
      var rect = wrap.getBoundingClientRect();
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = clientX - rect.left;
      var y = clientY - rect.top - 14;
      x = Math.min(rect.width - tw / 2 - 4, Math.max(tw / 2 + 4, x));
      if (y - th < 4) y = clientY - rect.top + th + 22;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    }

    function hideTip() { tip.classList.remove('on'); }

    /* ---------------------------------------------------------- interaction */

    function toLocal(ev) {
      var r = wrap.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    var pointers = new Map();
    var drag = null;
    var suppressClick = false;

    svg.addEventListener('pointerdown', function (ev) {
      pointers.set(ev.pointerId, ev);
      svg.setPointerCapture(ev.pointerId);
      hideTip();
      if (pointers.size === 1) {
        var p = toLocal(ev);
        drag = { x0: p.x, y0: p.y, moved: 0, pinch: null };
        suppressClick = false;
        svg.classList.add('dragging');
      } else if (pointers.size === 2) {
        var pts = Array.from(pointers.values()).map(toLocal);
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        drag.pinch = { d: d, cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
      }
    });

    svg.addEventListener('pointermove', function (ev) {
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, ev);
      var p = toLocal(ev);

      if (drag && pointers.size === 2 && drag.pinch) {
        var pts = Array.from(pointers.values()).map(toLocal);
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        var cx = (pts[0].x + pts[1].x) / 2;
        var cy = (pts[0].y + pts[1].y) / 2;
        if (drag.pinch.d > 8) zoomAt(Math.log(d / drag.pinch.d), cx, cy);
        panBy(cx - drag.pinch.cx, cy - drag.pinch.cy);
        drag.pinch = { d: d, cx: cx, cy: cy };
        return;
      }

      if (drag) {
        var dx = p.x - drag.x0, dy = p.y - drag.y0;
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved > 3) { suppressClick = true; panBy(dx, dy); }
        drag.x0 = p.x; drag.y0 = p.y;
        return;
      }

      var hit = nearest(p.x, p.y);
      if (hit) {
        showTip(hit.p, ev.clientX, ev.clientY);
        svg.style.cursor = 'pointer';
        if (cfg && cfg.hoverModelId !== hit.p.modelId) {
          cfg.hoverModelId = hit.p.modelId;
          if (handlers.onHover) handlers.onHover(hit.p.modelId);
        }
      } else {
        hideTip();
        svg.style.cursor = 'crosshair';
        if (cfg && cfg.hoverModelId) {
          cfg.hoverModelId = null;
          if (handlers.onHover) handlers.onHover(null);
        }
      }
    });

    function endPointer(ev) {
      pointers.delete(ev.pointerId);
      if (svg.hasPointerCapture && svg.hasPointerCapture(ev.pointerId)) svg.releasePointerCapture(ev.pointerId);
      if (pointers.size < 2 && drag) drag.pinch = null;
      if (!pointers.size) {
        svg.classList.remove('dragging');
        drag = null;
        /* A cancelled gesture never produces a click, so don't let it eat
           the next real one. */
        if (ev.type === 'pointercancel') suppressClick = false;
      }
    }

    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', endPointer);

    /* Selection lives on `click` so that a tap, a mouse click and a
       keyboard/AT-triggered activation all behave the same. Drags are
       filtered out via suppressClick. */
    svg.addEventListener('click', function (ev) {
      if (suppressClick) { suppressClick = false; return; }
      var p = toLocal(ev);
      var hit = nearest(p.x, p.y);
      if (handlers.onSelect) handlers.onSelect(hit ? hit.p.modelId : null, hit ? hit.p : null);
    });

    svg.addEventListener('pointerleave', function () {
      hideTip();
      if (cfg && cfg.hoverModelId) {
        cfg.hoverModelId = null;
        if (handlers.onHover) handlers.onHover(null);
      }
    });

    /* Ctrl/⌘ + wheel zooms. A plain wheel is left alone so the page still
       scrolls when the cursor happens to sit over the chart. */
    svg.addEventListener('wheel', function (ev) {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      var p = toLocal(ev);
      var delta = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      zoomAt(-delta * 0.0022, p.x, p.y);
    }, { passive: false });

    svg.addEventListener('dblclick', function () { resetView(); });

    /* ---------------------------------------------------------- view maths */

    function zoomAt(delta, px, py) {
      if (!base || !plot) return;
      var fx = clamp((px - plot.left) / plot.width, 0, 1);
      var fy = clamp((py - plot.top) / plot.height, 0, 1);

      var bx0 = view.x0, bx1 = view.x1, by0 = view.y0, by1 = view.y1;
      var anchorX = bx0 + (bx1 - bx0) * fx;
      var anchorY = by0 + (by1 - by0) * fy;

      var kx = Math.exp(delta), ky = Math.exp(delta);
      var nx0 = anchorX - (anchorX - bx0) * kx;
      var nx1 = anchorX + (bx1 - anchorX) * kx;
      var ny0 = anchorY - (anchorY - by0) * ky;
      var ny1 = anchorY + (by1 - anchorY) * ky;

      var minX = (base.x1 - base.x0) / 400, maxX = base.x1 - base.x0;
      var minY = (base.y1 - base.y0) / 60, maxY = base.y1 - base.y0;

      var spanX = clamp(nx1 - nx0, minX, maxX);
      var spanY = clamp(ny1 - ny0, minY, maxY);
      var cx = (nx0 + nx1) / 2, cy = (ny0 + ny1) / 2;

      view = { x0: cx - spanX / 2, x1: cx + spanX / 2, y0: cy - spanY / 2, y1: cy + spanY / 2 };
      schedule();
    }

    function panBy(dxPx, dyPx) {
      if (!view) return;
      var dx = (dxPx / plot.width) * (view.x1 - view.x0);
      var dy = (dyPx / plot.height) * (view.y1 - view.y0);
      view = { x0: view.x0 - dx, x1: view.x1 - dx, y0: view.y0 - dy, y1: view.y1 - dy };
      schedule();
    }

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    function resetView() {
      view = null;
      baseKey = null; /* force recompute on next render */
      schedule();
    }

    /* ------------------------------------------------------------- wiring */

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { schedule(); });
      ro.observe(wrap);
    } else {
      window.addEventListener('resize', schedule);
    }

    return {
      /* Data changes render synchronously so the plot can never lag behind the
         DOM around it (rAF is throttled in background tabs). Only the
         continuous zoom/pan path goes through a frame callback. */
      update: function (next) { cfg = next; render(); },
      zoomBy: function (factor) {
        zoomAt(-factor, plot ? plot.left + plot.width / 2 : 0, plot ? plot.top + plot.height / 2 : 0);
      },
      panBy: panBy,
      resetView: resetView,
      redraw: schedule,
      getView: function () { return view; },
      destroy: function () { if (ro) ro.disconnect(); wrap.remove(); }
    };
  };

})(window.AA = window.AA || {});