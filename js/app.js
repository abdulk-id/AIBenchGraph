/* =============================================================================
   app.js — state, filters and DOM wiring.
   ========================================================================== */
(function (AA) {
  'use strict';

  var F = AA.scale;

  /* ---------------------------------------------------------------- config */

  var PALETTE = [
    '#5aa9ff', '#f97362', '#4ade80', '#fbbf24', '#c084fc', '#22d3ee',
    '#f472b6', '#a3e635', '#fb923c', '#818cf8', '#2dd4bf', '#e879f9',
    '#94a3b8', '#eab308', '#60a5fa', '#34d399', '#f87171', '#7dd3fc'
  ];

  var KNOWN_PROVIDERS = {
    'OpenAI': '#10a37f',
    'Anthropic': '#d97757',
    'Google': '#4285f4',
    'DeepMind': '#4285f4',
    'xAI': '#8e9bb3',
    'Meta': '#2f81f7',
    'DeepSeek': '#4d6bfe',
    'Alibaba': '#ff6a00',
    'Z.AI': '#2f6df6',
    'Moonshot': '#6c5ce7',
    'Mistral': '#fa520f',
    'Amazon': '#ff9900',
    'NVIDIA': '#76b900',
    'Microsoft': '#00a4ef',
    'MiniMax': '#ff4d6d',
    'ByteDance': '#325ab4'
  };

  /* ------------------------------------------------------------------ state */

  var state = {
    raw: null,
    ds: null,
    sourceName: 'data/models.js',
    benchmarkId: null,
    search: '',
    openWeightsOnly: false,
    releasedBefore: '',
    hiddenProviders: {},
    priceScale: 'log',
    showPareto: true,
    showQuadrant: true,
    showLinks: true,
    showLabels: false,
    view: 'chart',
    selectedModelId: null,
    colors: {}
  };

  var chart = null;
  var table = null;
  var visible = [];

  /* ------------------------------------------------------------------- dom */

  var $ = function (id) { return document.getElementById(id); };

  var dom = {
    metaLine: $('metaLine'),
    tabs: $('tabs'),
    legend: $('legend'),
    stats: $('stats'),
    alert: $('alert'),
    chart: $('chart'),
    chartPanel: $('chartPanel'),
    chartTitle: $('chartTitle'),
    chartDesc: $('chartDesc'),
    detail: $('detail'),
    tablePanel: $('tablePanel'),
    table: $('table'),
    search: $('search'),
    openWeights: $('openWeights'),
    releasedBefore: $('releasedBefore'),
    priceScale: $('priceScale'),
    showPareto: $('showPareto'),
    showQuadrant: $('showQuadrant'),
    showLinks: $('showLinks'),
    showLabels: $('showLabels'),
    zoomIn: $('zoomIn'),
    zoomOut: $('zoomOut'),
    zoomReset: $('zoomReset'),
    viewChart: $('viewChart'),
    viewTable: $('viewTable'),
    fileInput: $('fileInput'),
    dropHint: $('dropHint'),
    copyTsv: $('copyTsv'),
    downloadCsv: $('downloadCsv')
  };

  /* ------------------------------------------------------------------ utils */

  function colorFor(provider) {
    if (!state.colors[provider]) state.colors[provider] = '#66748a';
    return state.colors[provider];
  }

  function assignColors(ds) {
    var known = {}, used = {};
    Object.keys(KNOWN_PROVIDERS).forEach(function (p) { known[p] = KNOWN_PROVIDERS[p]; used[KNOWN_PROVIDERS[p]] = 1; });

    var unknown = ds.providers.filter(function (p) { return !known[p]; });
    var slot = 0;
    unknown.forEach(function (p) {
      while (slot < PALETTE.length && used[PALETTE[slot]]) slot++;
      known[p] = PALETTE[slot % PALETTE.length] || '#66748a';
      used[known[p]] = 1;
    });

    state.colors = known;
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function downloadMissing(kind) {
    if (!state.ds) return;
    var name = 'aa-data-' + kind + '-' + stamp();
    if (kind === 'tsv') {
      download(name + '.tsv', AA.data.stubTsv(state.ds), 'text/tab-separated-values');
    } else {
      download(name + '.json', JSON.stringify(AA.data.stub(state.ds, kind === 'full'), null, 2));
    }
  }

  /* ------------------------------------------------------------------ load */

  function loadFrom(raw, sourceName) {
    var ds;
    try {
      ds = AA.data.load(raw);
    } catch (err) {
      showAlert('Could not read the data: ' + err.message, true);
      return;
    }

    state.raw = raw;
    state.ds = ds;
    state.sourceName = sourceName;
    state.selectedModelId = null;
    state.hiddenProviders = {};
    assignColors(ds);

    if (!ds.benchmarkById[state.benchmarkId]) {
      state.benchmarkId = (ds.benchmarks.filter(function (b) { return b.id === 'intelligence_index'; })[0] || ds.benchmarks[0]).id;
    }

    buildTabs();
    buildChart();
    refresh();

    dom.metaLine.innerHTML = describeSource(ds, sourceName);
  }

  function describeSource(ds, sourceName) {
    var meta = ds.meta || {};
    var bits = [];
    if (meta.source) bits.push(F.escapeHtml(meta.source));
    if (meta.index_version) bits.push(F.escapeHtml(meta.index_version));
    if (meta.updated) bits.push('updated ' + F.escapeHtml(F.date(meta.updated)));
    bits.push(ds.models.length + ' models · ' + ds.benchmarks.length + ' benchmarks');
    bits.push('source: <code>' + F.escapeHtml(sourceName) + '</code>');
    return bits.join(' &middot; ');
  }

  function reload() {
    if (window.AA_DATA) {
      loadFrom(window.AA_DATA, 'data/models.js');
    } else {
      state.ds = null;
      showAlert(
        'window.AA_DATA was not found.\n\n' +
        'Open this page from the project folder (so that data/models.js sits next to it), ' +
        'or use Data → Load JSON file to pick one.', true);
      dom.metaLine.textContent = 'No data loaded.';
    }
  }

  /* ------------------------------------------------------------------ tabs */

  function modelCountFor(benchId) {
    var seen = {};
    state.ds.points.forEach(function (p) { if (p.benchmarkId === benchId) seen[p.modelId] = 1; });
    return Object.keys(seen).length;
  }

  function buildTabs() {
    var groups = [];
    var byGroup = {};

    state.ds.benchmarks.forEach(function (b) {
      if (!byGroup[b.group]) { byGroup[b.group] = []; groups.push(b.group); }
      byGroup[b.group].push(b);
    });

    var html = '';
    groups.forEach(function (g) {
      if (groups.length > 1) html += '<span class="tab group">' + F.escapeHtml(g) + '</span>';
      byGroup[g].forEach(function (b) {
        var n = modelCountFor(b.id);
        var on = b.id === state.benchmarkId ? ' on' : '';
        html += '<button type="button" class="tab' + on + '" data-bench="' + F.escapeHtml(b.id) + '"' +
          (b.id === state.benchmarkId ? ' aria-current="true"' : '') + '>' +
          F.escapeHtml(b.label) +
          '<span class="count">' + (n ? n : '–') + '</span></button>';
      });
    });
    dom.tabs.innerHTML = html;

    var active = dom.tabs.querySelector('.tab.on');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    dom.tabs.onclick = function (ev) {
      var t = ev.target.closest('.tab[data-bench]');
      if (!t) return;
      state.benchmarkId = t.getAttribute('data-bench');
      state.selectedModelId = null;
      buildTabs();
      refresh();
    };
  }

  function currentBenchmark() {
    return state.ds.benchmarkById[state.benchmarkId] || state.ds.benchmarks[0];
  }

  /* --------------------------------------------------------------- filtering */

  function passesFilters(p) {
    if (state.openWeightsOnly && !p.openWeights) return false;
    if (state.hiddenProviders[p.provider]) return false;
    if (state.releasedBefore && p.releaseDate && p.releaseDate > state.releasedBefore) return false;
    if (state.search) {
      var q = state.search.toLowerCase();
      if ((p.modelName + ' ' + p.provider).toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
  }

  function computeVisible() {
    return state.ds.points.filter(function (p) {
      return p.benchmarkId === state.benchmarkId && passesFilters(p);
    }).map(function (p) {
      return Object.assign({}, p, { color: colorFor(p.provider) });
    });
  }

  function filtersActive() {
    return !!state.search || state.openWeightsOnly || !!state.releasedBefore ||
      Object.keys(state.hiddenProviders).length > 0;
  }

  function filterSignature() {
    return [state.benchmarkId, state.priceScale, state.search, state.openWeightsOnly,
      state.releasedBefore, Object.keys(state.hiddenProviders).sort().join(','),
      visible.length].join('|');
  }

  /* ----------------------------------------------------------------- render */

  function buildChart() {
    if (chart) chart.destroy();
    chart = AA.createChart(dom.chart, {
      onSelect: function (modelId) {
        state.selectedModelId = (state.selectedModelId === modelId) ? null : modelId;
        refresh();
      }
    });

    table = AA.createTable(dom.table, {
      onSelect: function (modelId) {
        state.selectedModelId = (state.selectedModelId === modelId) ? null : modelId;
        refresh();
      }
    });
  }

  function refresh() {
    if (!state.ds) return;
    var b = currentBenchmark();

    visible = computeVisible();
    var sig = filterSignature();

    /* Pareto: walk ascending cost, keep the running best score. */
    var pareto = {};
    var bestSoFar = -Infinity;
    visible.slice().sort(function (a, c) { return a.cost - c.cost || c.score - a.score; }).forEach(function (p) {
      if (p.score > bestSoFar + 1e-9) { bestSoFar = p.score; pareto[p.key] = true; }
    });
    visible.forEach(function (p) { p.pareto = !!pareto[p.key]; });

    /* chart */
    dom.chartTitle.textContent = b.label;
    dom.chartDesc.textContent = b.description || '';

    chart.update({
      points: visible,
      benchmark: b,
      priceScale: state.priceScale,
      showPareto: state.showPareto,
      showQuadrant: state.showQuadrant,
      showLinks: state.showLinks,
      showLabels: state.showLabels,
      selectedModelId: state.selectedModelId,
      baseKey: sig,
      colorOf: colorFor,
      emptyMessage: filtersActive()
        ? 'No models match the current filters for ' + b.label + '.'
        : 'No data for ' + b.label + ' yet — add it to data/models.js.'
    });

    /* table */
    table.update(visible, { selectedModelId: state.selectedModelId });

    buildLegend();
    buildStats();
    buildDetail(b);
    buildAlert();
    dom.chartPanel.hidden = state.view !== 'chart';
    dom.tablePanel.hidden = state.view !== 'table';
    dom.viewChart.classList.toggle('on', state.view === 'chart');
    dom.viewTable.classList.toggle('on', state.view === 'table');
    dom.viewChart.setAttribute('aria-selected', state.view === 'chart');
    dom.viewTable.setAttribute('aria-selected', state.view === 'table');
  }

  /* ---------------------------------------------------------------- legend */

  function buildLegend() {
    var counts = {};
    visible.forEach(function (p) { counts[p.provider] = (counts[p.provider] || 0) + 1; });

    var html = state.ds.providers.map(function (prov) {
      var n = counts[prov] || 0;
      var off = state.hiddenProviders[prov];
      return '<span class="legend-item' + (off ? ' off' : '') + '" data-provider="' + F.escapeHtml(prov) + '"' +
        (n ? '' : ' title="no data in this view"') + '>' +
        '<i class="swatch" style="background:' + colorFor(prov) + '"></i>' +
        F.escapeHtml(prov) + '<span class="n">' + n + '</span></span>';
    }).join('');

    html += '<span class="legend-sep"></span>';
    html += '<span class="legend-note"><span class="size-key">' +
      '<i style="width:7px;height:7px"></i><i style="width:9px;height:9px"></i>' +
      '<i style="width:11px;height:11px"></i><i style="width:13px;height:13px"></i></span>' +
      'low → high reasoning effort</span>';
    if (state.ds.hasPlaceholder) {
      html += '<span class="legend-note"><i class="swatch" style="width:10px;height:10px;border-radius:50%;' +
        'background:#fff;opacity:.45;border:1px dashed #fff"></i>placeholder entry</span>';
    }

    dom.legend.innerHTML = html;
    dom.legend.onclick = function (ev) {
      var item = ev.target.closest('.legend-item');
      if (!item) return;
      var p = item.getAttribute('data-provider');
      if (state.hiddenProviders[p]) delete state.hiddenProviders[p];
      else state.hiddenProviders[p] = true;
      refresh();
    };
  }

  /* ----------------------------------------------------------------- stats */

  function buildStats() {
    var tiles = [];

    var modelSet = {};
    visible.forEach(function (p) { modelSet[p.modelId] = 1; });
    tiles.push(['Plotted', Object.keys(modelSet).length + ' models', visible.length + ' points']);

    if (!visible.length) {
      tiles.push(['Nothing to show',
        filtersActive() ? 'filters are hiding everything' : 'no data for this benchmark',
        filtersActive() ? 'Clear the search or re-enable a provider' : 'Data → Export missing data']);
    }

    if (visible.length) {
      var topScore = visible.reduce(function (a, p) { return p.score > a.score ? p : a; });
      var cheapest = visible.reduce(function (a, p) { return p.cost < a.cost ? p : a; });
      var bestValue = visible.reduce(function (a, p) {
        var v = p.cost > 0 ? p.score / p.cost : -1;
        var av = a.cost > 0 ? a.score / a.cost : -1;
        return v > av ? p : a;
      });

      tiles.push(['Top score', F.num(topScore.score, 2), topScore.modelName]);
      tiles.push(['Cheapest', F.usd(cheapest.cost), cheapest.modelName]);
      tiles.push(['Best value', F.num(bestValue.score / bestValue.cost, 1) + ' pts/$',
        bestValue.modelName + (bestValue.effortShort ? ' · ' + bestValue.effortShort : '')]);

      var onPareto = visible.filter(function (p) { return p.pareto; }).length;
      tiles.push(['Pareto frontier', onPareto + ' points', 'not beaten on both axes']);

      var placeholders = visible.filter(function (p) { return p.placeholder; }).length;
      if (placeholders) tiles.push(['Placeholder', placeholders + ' points', 'not real data']);
    }

    dom.stats.innerHTML = tiles.map(function (t) {
      return '<div class="stat"><div class="k">' + F.escapeHtml(t[0]) + '</div>' +
        '<div class="v">' + F.escapeHtml(t[1]) + '</div>' +
        '<div class="d">' + F.escapeHtml(t[2] || '') + '</div></div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- detail */

  function buildDetail(b) {
    var id = state.selectedModelId;
    if (!id || !state.ds.modelById[id]) { dom.detail.hidden = true; dom.detail.innerHTML = ''; return; }

    var m = state.ds.modelById[id];
    var cells = state.ds.points.filter(function (p) { return p.modelId === id && p.benchmarkId === b.id; });
    cells.sort(function (a, c) { return a.effortIndex - c.effortIndex; });

    var otherBenchmarks = state.ds.points.filter(function (p) { return p.modelId === id && p.benchmarkId !== b.id; })
      .sort(function (a, c) { return c.score - a.score; });

    var pricingRows = [];
    if (m.pricing) {
      ['input', 'output', 'cache_read', 'cache_write'].forEach(function (k) {
        if (typeof m.pricing[k] === 'number') {
          pricingRows.push('<tr><td>' + F.escapeHtml(k.replace('_', ' ')) + '</td><td>$' + m.pricing[k] + '</td></tr>');
        }
      });
    }

    var html =
      '<div class="detail-head"><h3>' + F.escapeHtml(m.name) + '</h3>' +
      '<span class="muted">' + F.escapeHtml(m.provider) + (m.openWeights ? ' · open weights' : ' · closed weights') + '</span>' +
      (m.placeholder ? ' <span class="stat" style="padding:2px 8px;font-size:11px;color:#fbbf24;border-color:#5c4a1f">placeholder</span>' : '') +
      '<button type="button" class="detail-close" data-action="unpin">Unpin</button></div>' +
      '<div class="detail-grid">';

    html += '<div><table><caption>' + F.escapeHtml(b.label) + ' — effort levels</caption>' +
      '<thead><tr><th>Effort</th><th>Score</th><th>Cost / task</th></tr></thead><tbody>' +
      (cells.length ? cells.map(function (p) {
        return '<tr class="' + (p.pareto ? 'cur' : '') + '"><td>' + F.escapeHtml(p.effort === 'default' ? 'default' : p.effortLabel) +
          '</td><td>' + F.num(p.score, 2) + '</td><td>' + F.usd(p.cost) + '</td></tr>';
      }).join('') : '<tr><td colspan="3" class="muted">No data for this benchmark.</td></tr>') +
      '</tbody></table></div>';

    html += '<div><table><caption>Model</caption><tbody>' +
      '<tr><td>Released</td><td>' + F.escapeHtml(F.date(m.releaseDate)) + '</td></tr>' +
      '<tr><td>Context window</td><td>' + F.escapeHtml(F.tokens(m.contextWindow) || '—') + '</td></tr>' +
      pricingRows.join('') +
      (m.notes ? '<tr><td>Notes</td><td>' + F.escapeHtml(m.notes) + '</td></tr>' : '') +
      '</tbody></table></div>';

    if (otherBenchmarks.length) {
      html += '<div><table><caption>Other benchmarks</caption><tbody>' +
        otherBenchmarks.map(function (p) {
          return '<tr><td>' + F.escapeHtml(p.benchmarkLabel) +
            (p.effortShort ? ' <span class="effort">(' + F.escapeHtml(p.effortShort) + ')</span>' : '') +
            '</td><td>' + F.num(p.score, 2) + '</td><td>' + F.usd(p.cost) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    html += '</div>';
    dom.detail.innerHTML = html;
    dom.detail.hidden = false;
  }

  /* ----------------------------------------------------------------- alert */

  function buildAlert() {
    var ds = state.ds;
    var lines = [];

    if (ds.hasPlaceholder) {
      lines.push('This file contains PLACEHOLDER data — invented values used to prove the chart renders. ' +
        'Replace every entry marked "placeholder": true before drawing any conclusions.');
    }
    if (ds.errors.length) lines.push('Data errors:\n• ' + ds.errors.join('\n• '));
    if (ds.warnings.length) {
      lines.push('Skipped ' + ds.warnings.length + ' entr' + (ds.warnings.length === 1 ? 'y' : 'ies') +
        ' (first 5):\n• ' + ds.warnings.slice(0, 5).join('\n• '));
    }

    var missing = ds.models.filter(function (m) {
      return m.benchmarks.indexOf(state.benchmarkId) < 0;
    });

    if (!lines.length) { dom.alert.hidden = true; dom.alert.textContent = ''; return; }

    if (missing.length && !filtersActive()) {
      lines.push(missing.length + ' of ' + ds.models.length + ' models have no entry for ' +
        currentBenchmark().label + ' and are not shown. Use Data → Export missing data to fill them in.');
    }

    dom.alert.textContent = lines.join('\n\n');
    dom.alert.hidden = false;
    dom.alert.classList.toggle('error', ds.errors.length > 0);
  }

  function showAlert(msg, isError) {
    dom.alert.textContent = msg;
    dom.alert.hidden = false;
    dom.alert.classList.toggle('error', !!isError);
  }

  /* ------------------------------------------------------------------ events */

  function wire() {
    var debounce;
    dom.search.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        state.search = dom.search.value.trim();
        refresh();
      }, 120);
    });

    dom.openWeights.addEventListener('change', function () {
      state.openWeightsOnly = dom.openWeights.checked;
      refresh();
    });

    dom.releasedBefore.addEventListener('change', function () {
      state.releasedBefore = dom.releasedBefore.value;
      refresh();
    });

    dom.priceScale.addEventListener('change', function () {
      state.priceScale = dom.priceScale.value;
      chart.resetView();
      refresh();
    });

    [['showPareto', 'showPareto'], ['showQuadrant', 'showQuadrant'],
     ['showLinks', 'showLinks'], ['showLabels', 'showLabels']].forEach(function (pair) {
      dom[pair[0]].addEventListener('change', function () {
        state[pair[1]] = dom[pair[0]].checked;
        refresh();
      });
    });

    dom.zoomIn.addEventListener('click', function () { chart.zoomBy(-0.35); });
    dom.zoomOut.addEventListener('click', function () { chart.zoomBy(0.35); });
    dom.zoomReset.addEventListener('click', function () { chart.resetView(); });

    dom.viewChart.addEventListener('click', function () { state.view = 'chart'; refresh(); });
    dom.viewTable.addEventListener('click', function () { state.view = 'table'; refresh(); });

    dom.copyTsv.addEventListener('click', function () {
      var text = table.tsv();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { flash(dom.copyTsv, 'Copied'); },
          function () { download('aa-view-' + stamp() + '.tsv', text, 'text/tab-separated-values'); });
      } else {
        download('aa-view-' + stamp() + '.tsv', text, 'text/tab-separated-values');
      }
    });

    dom.downloadCsv.addEventListener('click', function () {
      download('aa-view-' + stamp() + '.csv', table.tsv(), 'text/csv');
    });

    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var menu = btn.closest('details');
      if (menu) menu.open = false;

      if (action === 'stub-missing-json') downloadMissing('missing');
      else if (action === 'stub-full-json') downloadMissing('full');
      else if (action === 'stub-missing-tsv') downloadMissing('tsv');
      else if (action === 'unpin') { state.selectedModelId = null; refresh(); }
      else if (action === 'download-current') {
        download('aa-data-' + stamp() + '.json',
          JSON.stringify({ meta: state.raw.meta || {}, benchmarks: state.raw.benchmarks || [], models: state.raw.models || [] }, null, 2));
      } else if (action === 'load-json') {
        dom.fileInput.click();
      } else if (action === 'reload') {
        location.reload();
      }
    });

    dom.fileInput.addEventListener('change', function () {
      if (dom.fileInput.files && dom.fileInput.files[0]) readFile(dom.fileInput.files[0]);
      dom.fileInput.value = '';
    });

    /* drag & drop a JSON file anywhere on the page */
    var dragDepth = 0;
    window.addEventListener('dragenter', function (ev) {
      ev.preventDefault();
      dragDepth++;
      dom.dropHint.hidden = false;
    });
    window.addEventListener('dragover', function (ev) { ev.preventDefault(); });
    window.addEventListener('dragleave', function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) dom.dropHint.hidden = true;
    });
    window.addEventListener('drop', function (ev) {
      ev.preventDefault();
      dragDepth = 0;
      dom.dropHint.hidden = true;
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) readFile(f);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && document.activeElement !== dom.search) {
        ev.preventDefault();
        dom.search.focus();
        dom.search.select();
      } else if (ev.key === 'Escape') {
        if (state.selectedModelId) { state.selectedModelId = null; refresh(); }
        else if (document.activeElement === dom.search) dom.search.blur();
      }
    });
  }

  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 900);
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        showAlert('That file is not valid JSON: ' + err.message, true);
        return;
      }
      loadFrom(parsed, file.name);
    };
    reader.onerror = function () { showAlert('Could not read ' + file.name, true); };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------- boot */

  wire();
  reload();

})(window.AA = window.AA || {});