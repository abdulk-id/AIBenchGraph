/* =============================================================================
   table.js — sortable, exportable view of whatever is currently plotted.
   ========================================================================== */
(function (AA) {
  'use strict';

  var F = AA.scale;

  var COLUMNS = [
    { key: 'modelName', label: 'Model', left: true, get: function (p) { return p.modelName; },
      cell: function (p) {
        return '<span class="swatch" style="background:' + F.escapeHtml(p.color) + '"></span>' +
          F.escapeHtml(p.modelName);
      } },
    { key: 'provider', label: 'Provider', left: true, get: function (p) { return p.provider; } },
    { key: 'effort', label: 'Effort', left: true, get: function (p) { return p.effortIndex; },
      cell: function (p) { return '<span class="effort">' + F.escapeHtml(p.effort === 'default' ? '—' : p.effortLabel) + '</span>'; } },
    { key: 'score', label: 'Score', get: function (p) { return p.score; },
      cell: function (p) { return F.num(p.score, 2); } },
    { key: 'cost', label: 'Cost / task', get: function (p) { return p.cost; },
      cell: function (p) { return F.usd(p.cost); } },
    { key: 'efficiency', label: 'Score per $1', get: function (p) { return p.cost > 0 ? p.score / p.cost : -1; },
      cell: function (p) { return p.cost > 0 ? F.num(p.score / p.cost, 2) : '—'; } },
    { key: 'gap', label: 'Behind frontier', get: function (p) { return p.gap; },
      cell: function (p) { return p.gap === null ? 'on frontier' : F.num(-p.gap, 2) + ' pts'; } },
    { key: 'releaseDate', label: 'Released', left: true, get: function (p) { return p.releaseDate || ''; },
      cell: function (p) { return F.date(p.releaseDate); } }
  ];

  AA.createTable = function (root, handlers) {
    handlers = handlers || {};

    var sortKey = 'score';
    var sortDir = -1;
    var rows = [];

    function decorate(points) {
      /* "behind frontier": how many points of score a cheaper-or-equal model
         still reaches. Null means the point is on the Pareto frontier. */
      var asc = points.slice().sort(function (a, b) { return a.cost - b.cost || b.score - a.score; });
      var best = -Infinity;
      var gap = {};
      asc.forEach(function (p) {
        if (p.score > best + 1e-9) { best = p.score; gap[p.key] = null; }
        else gap[p.key] = best - p.score;
      });
      return points.map(function (p) { return Object.assign({}, p, { gap: gap[p.key], color: p.color }); });
    }

    function update(points, opts) {
      rows = decorate(points);
      var col = COLUMNS.filter(function (c) { return c.key === sortKey; })[0] || COLUMNS[0];
      rows.sort(function (a, b) {
        var va = col.get(a), vb = col.get(b);
        if (typeof va === 'string' || typeof vb === 'string') {
          return String(va).localeCompare(String(vb)) * sortDir;
        }
        return (va - vb) * sortDir;
      });
      render(opts || {});
    }

    function render(opts) {
      var html = '<table class="data"><thead><tr>';

      COLUMNS.forEach(function (c) {
        var arrow = c.key === sortKey ? '<span class="arrow">' + (sortDir < 0 ? ' ▼' : ' ▲') + '</span>' : '';
        html += '<th data-key="' + c.key + '" class="' + (c.left ? 'left' : '') + '">' + c.label + arrow + '</th>';
      });
      html += '</tr></thead><tbody>';

      if (!rows.length) {
        html += '<tr><td colspan="' + COLUMNS.length + '" class="left muted">No rows match the current filters.</td></tr>';
      } else {
        rows.forEach(function (p) {
          var cls = [];
          if (p.modelId === opts.selectedModelId) cls.push('cur');
          if (p.pareto) cls.push('pareto');
          if (p.placeholder) cls.push('placeholder');
          html += '<tr data-model="' + F.escapeHtml(p.modelId) + '" class="' + cls.join(' ') + '">';
          COLUMNS.forEach(function (c) {
            var cell = c.cell ? c.cell(p) : F.escapeHtml(c.get(p));
            html += '<td class="' + (c.left ? 'left' : '') + '">' + cell + '</td>';
          });
          html += '</tr>';
        });
      }
      html += '</tbody></table>';
      root.innerHTML = html;
    }

    root.addEventListener('click', function (ev) {
      var th = ev.target.closest('th[data-key]');
      if (th) {
        var k = th.getAttribute('data-key');
        if (k === sortKey) sortDir = -sortDir;
        else { sortKey = k; sortDir = (k === 'modelName' || k === 'provider' || k === 'effort' || k === 'releaseDate') ? 1 : -1; }
        if (handlers.onSort) handlers.onSort(sortKey, sortDir);
        return;
      }
      var tr = ev.target.closest('tr[data-model]');
      if (tr && handlers.onSelect) handlers.onSelect(tr.getAttribute('data-model'));
    });

    return {
      update: update,
      rows: function () { return rows; },
      setSort: function (k, d) { sortKey = k; sortDir = d; },
      tsv: function () {
        var head = COLUMNS.map(function (c) { return c.label; });
        var body = rows.map(function (p) {
          return COLUMNS.map(function (c) {
            var v = c.key === 'gap'
              ? (p.gap === null ? 'on frontier' : (-p.gap).toFixed(2))
              : (c.cell ? stripTags(c.cell(p)) : c.get(p));
            return String(v).replace(/[\t\n]/g, ' ');
          });
        });
        return [head].concat(body).map(function (r) {
          return r.map(function (v) { return /[\t"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join('\t');
        }).join('\n');
      }
    };

    function stripTags(s) { return String(s).replace(/<[^>]*>/g, '').trim(); }
  };

})(window.AA = window.AA || {});