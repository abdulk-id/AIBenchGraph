/* =============================================================================
   data.js — load, validate and normalise the dataset.

   The data file (data/models.js) assigns a plain JSON object to window.AA_DATA,
   which keeps everything working when index.html is opened straight from disk
   (file:// blocks fetch() and ES modules).
   ========================================================================== */
(function (AA) {
  'use strict';

  /* Reasoning-effort keys are free-form; this only fixes the drawing order. */
  var EFFORT_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

  var EFFORT_LABELS = {
    'none': 'Non-reasoning',
    'minimal': 'Minimal',
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'xhigh': 'Extra high',
    'max': 'Max',
    'default': 'Default'
  };

  var DEFAULT_BENCHMARK = {
    id: 'intelligence_index',
    label: 'Intelligence Index',
    group: 'Index',
    unit: 'index',
    description: 'Artificial Analysis Intelligence Index, a weighted average of 10 evaluations.'
  };

  function titleize(s) {
    return String(s).replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }

  function effortIndex(key) {
    var i = EFFORT_ORDER.indexOf(key);
    return i < 0 ? EFFORT_ORDER.length + 1 : i;
  }

  function effortLabel(key) {
    return EFFORT_LABELS[key] || titleize(key);
  }

  function effortShort(key) {
    return key === 'default' ? '' : (EFFORT_LABELS[key] || titleize(key));
  }

  function sortEfforts(keys) {
    return keys.slice().sort(function (a, b) {
      var d = effortIndex(a) - effortIndex(b);
      return d !== 0 ? d : a.localeCompare(b);
    });
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  /* ------------------------------------------------------------ normalise */

  function load(raw) {
    var errors = [];
    var warnings = [];

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Data did not export an object. Expected window.AA_DATA = { benchmarks: [...], models: [...] }.');
    }

    var meta = raw.meta || {};

    /* -- benchmarks -- */
    var benchSrc = Array.isArray(raw.benchmarks) && raw.benchmarks.length
      ? raw.benchmarks
      : [DEFAULT_BENCHMARK];

    if (!Array.isArray(raw.benchmarks) || !raw.benchmarks.length) {
      warnings.push('No benchmarks listed; fell back to a single "Intelligence Index" tab.');
    }

    var seenBench = {};
    var benchmarks = benchSrc.map(function (b, i) {
      b = b || {};
      var id = b.id || ('benchmark_' + (i + 1));
      if (seenBench[id]) errors.push('Duplicate benchmark id: ' + id);
      seenBench[id] = true;
      return {
        id: id,
        label: b.label || titleize(id),
        short: b.short || null,
        group: b.group || 'Other',
        unit: b.unit || 'score',
        description: b.description || '',
        order: i
      };
    });

    var benchById = {};
    benchmarks.forEach(function (b) { benchById[b.id] = b; });

    /* -- models -- */
    var rawModels = Array.isArray(raw.models) ? raw.models : [];
    if (!Array.isArray(raw.models)) warnings.push('`models` was not an array; nothing to plot.');

    var seenModel = {};
    var models = [];
    var points = [];

    rawModels.forEach(function (m, mi) {
      if (!m || typeof m !== 'object') { errors.push('models[' + mi + '] is not an object.'); return; }

      var id = m.id || null;
      if (!id) {
        id = 'model_' + (mi + 1);
        warnings.push('models[' + mi + '] has no id; using "' + id + '".');
      }
      if (seenModel[id]) errors.push('Duplicate model id: ' + id);
      seenModel[id] = true;

      var results = (m.results && typeof m.results === 'object') ? m.results : {};
      var effortSet = {};
      Object.keys(results).forEach(function (bid) {
        var r = results[bid];
        if (!r || typeof r !== 'object') return;
        Object.keys(r).forEach(function (k) { effortSet[k] = true; });
      });

      var efforts = sortEfforts(Object.keys(effortSet));
      var model = {
        id: id,
        name: m.name || id,
        provider: m.provider || 'Unknown',
        releaseDate: typeof m.release_date === 'string' ? m.release_date : null,
        openWeights: !!m.open_weights,
        contextWindow: isNum(m.context_window) ? m.context_window : null,
        pricing: (m.pricing && typeof m.pricing === 'object') ? m.pricing : null,
        placeholder: !!m.placeholder,
        notes: m.notes || null,
        efforts: efforts,
        benchmarks: Object.keys(results).filter(function (b) { return !!benchById[b]; }),
        results: results /* kept verbatim so the export helper can round-trip */
      };

      models.push(model);

      /* Flatten to plottable points: one per (model, benchmark, effort). */
      benchmarks.forEach(function (b) {
        var byEffort = results[b.id];
        if (!byEffort || typeof byEffort !== 'object') return;

        Object.keys(byEffort).forEach(function (effKey) {
          var cell = byEffort[effKey];

          if (!cell || typeof cell !== 'object') {
            warnings.push(b.label + ' / ' + model.name + ': entry "' + effKey + '" is not an object; skipped.');
            return;
          }
          if (!isNum(cell.score) || !isNum(cell.cost)) {
            warnings.push(b.label + ' / ' + model.name + ' (' + effortLabel(effKey) + '): needs numeric `score` and `cost`; skipped.');
            return;
          }
          if (cell.cost < 0) {
            warnings.push(b.label + ' / ' + model.name + ' (' + effortLabel(effKey) + '): negative `cost`; skipped.');
            return;
          }

          points.push({
            key: model.id + '|' + b.id + '|' + effKey,
            modelId: model.id,
            modelName: model.name,
            provider: model.provider,
            placeholder: model.placeholder,
            openWeights: model.openWeights,
            releaseDate: model.releaseDate,
            pricing: model.pricing,
            benchmarkId: b.id,
            benchmarkLabel: b.label,
            unit: b.unit,
            effort: effKey,
            effortLabel: effortLabel(effKey),
            effortShort: effortShort(effKey),
            effortIndex: effortIndex(effKey),
            score: cell.score,
            cost: cell.cost
          });
        });
      });
    });

    if (!models.length) warnings.push('No models in the data file.');

    return {
      meta: meta,
      benchmarks: benchmarks,
      benchmarkById: benchById,
      models: models,
      modelById: models.reduce(function (acc, m) { acc[m.id] = m; return acc; }, {}),
      points: points,
      providers: uniqueSorted(models.map(function (m) { return m.provider; })),
      hasPlaceholder: models.some(function (m) { return m.placeholder; }),
      errors: errors,
      warnings: warnings
    };
  }

  /* ---------------------------------------------------------------- helpers */

  function uniqueSorted(arr) {
    return arr.filter(function (v, i) { return arr.indexOf(v) === i; }).sort();
  }

  /* Every (model x effort x benchmark) cell that has no value yet — feeds the
     "export missing data" helper. `includeFilled` also emits existing values. */
  function stub(ds, includeFilled) {
    var out = { meta: ds.meta, benchmarks: ds.benchmarks, models: [] };

    ds.models.forEach(function (m) {
      var efforts = m.efforts.length ? m.efforts : ['default'];
      var results = {};
      var cells = 0;

      ds.benchmarks.forEach(function (b) {
        var bucket = {};
        efforts.forEach(function (eff) {
          var existing = m.results && m.results[b.id] && m.results[b.id][eff];
          if (existing && isNum(existing.score) && isNum(existing.cost)) {
            if (!includeFilled) return;
            bucket[eff] = { score: existing.score, cost: existing.cost };
          } else {
            bucket[eff] = { score: null, cost: null };
          }
          cells++;
        });
        if (Object.keys(bucket).length) results[b.id] = bucket;
      });

      if (cells) out.models.push({ id: m.id, name: m.name, results: results });
    });

    return out;
  }

  /* Tab-separated variant: easier to paste into / fill out of a spreadsheet. */
  function stubTsv(ds) {
    var rows = [['model_id', 'model_name', 'benchmark_id', 'benchmark', 'effort', 'score', 'cost_per_task_usd']];
    stub(ds, false).models.forEach(function (m) {
      Object.keys(m.results).forEach(function (bid) {
        var bl = (ds.benchmarkById[bid] || {}).label || bid;
        Object.keys(m.results[bid]).forEach(function (eff) {
          rows.push([m.id, m.name, bid, bl, eff, '', '']);
        });
      });
    });
    return rows.map(function (r) {
      return r.map(function (c) {
        c = c === null || c === undefined ? '' : String(c);
        return /[\t\n"]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join('\t');
    }).join('\n');
  }

  AA.data = {
    load: load,
    stub: stub,
    stubTsv: stubTsv,
    sortEfforts: sortEfforts,
    effortLabel: effortLabel,
    effortShort: effortShort,
    effortIndex: effortIndex,
    EFFORT_ORDER: EFFORT_ORDER
  };

})(window.AA = window.AA || {});