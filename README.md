# Score vs. Price per Task

A single scatter plot of **benchmark score against cost per task** for LLMs, with one
tab per benchmark. Values are transcribed by hand from
[Artificial Analysis](https://artificialanalysis.ai).

No build step, no dependencies, and **no network calls at runtime** — the chart makes
everything from a JSON file you control.

```
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Prefer a server? `python3 -m http.server 8777` and visit
<http://localhost:8777/>. Either way it works.

---

## The chart

| | |
|---|---|
| **x** | cost per task in USD, log scale by default (switch to linear) |
| **y** | the selected benchmark's score |
| **dots** | one model × reasoning effort. Dot size grows with effort, so `low → high` reads directly |
| **lines between dots** | the reasoning-effort ladder of a single model: what the extra dollars buy |
| **dashed line** | Pareto frontier — nothing cheaper scores higher |
| **shaded corner** | the upper-left "most attractive quadrant" (cheaper than median, scores above median) |

- **Hover** a point for its score, cost per task, price per million tokens and release date.
- **Click** a point to pin the model: a panel below shows every effort level for the
  current benchmark plus its other benchmark scores. Other points dim.
- **Ctrl/⌘ + scroll** zooms, **drag** pans, **double-click** resets.
- **Labels** toggle names the frontier and the top scorers.
- **Table** shows the same rows as a sortable table, with *Behind frontier* (how many
  points of score a cheaper model already reached) and CSV/TSV export.

Filters: search, provider toggles, open-weights-only, released-before date.

`/` focuses search, `Esc` unpins.

---

## Adding data

Everything lives in **`data/models.js`**. It is a `.js` file (rather than `.json`)
only because browsers block `fetch()` on `file://`; the content is plain JSON and
you can keep a real `.json` copy and load it with **Data → Load JSON file…** or by
dropping it on the page.

```jsonc
window.AA_DATA = {
  meta: {
    source: "Artificial Analysis",
    index_version: "Intelligence Index v4.3.2",
    updated: "2026-10-11"
  },

  benchmarks: [            // one tab each
    { "id": "intelligence_index", "label": "Intelligence Index",
      "group": "Index", "unit": "index", "description": "…" },
    { "id": "gpqa_diamond", "label": "GPQA Diamond",
      "group": "Science", "unit": "percent", "description": "…" }
  ],

  models: [
    {
      "id": "claude-opus-5-5",          // unique
      "name": "Claude Opus 5.5",        // shown on the chart
      "provider": "Anthropic",
      "release_date": "2026-09-22",     // YYYY-MM-DD
      "open_weights": false,
      "context_window": 1000000,
      "pricing": { "input": 5, "output": 25, "cache_read": 0.5 },  // $/Mtok, tooltip only

      "results": {
        "intelligence_index": {
          "high": { "score": 57.0, "cost": 1.85 },   // reasoning variants …
          "low":  { "score": 55.1, "cost": 0.42 },
          "none": { "score": 41.2, "cost": 0.07 }
        },
        "gpqa_diamond": {
          "default": { "score": 84.1, "cost": 0.63 }  // … or one value
        }
      }
    }
  ]
};
```

**`score` and `cost` are the only required fields** of a data point.
`cost` is that benchmark's cost per task in USD — not price per token.
`pricing` is only shown in the tooltip and never drives the x axis.

### Reasoning efforts

The keys under a benchmark are reasoning-effort labels and are free-form.
These order and size correctly out of the box:

`none` · `minimal` · `low` · `medium` · `high` · `xhigh` · `max`

Anything else still works and is appended alphabetically. A model with one entry
(`default`) is drawn as a single dot with no effort label; a model with several is
drawn as a connected ladder. Both are equally valid — use whichever matches the model.

### Placeholder data

The shipped file contains three **invented** models marked `"placeholder": true`. They
exist only to prove the chart renders. The UI draws them with a dashed outline, shows a
count in the stats row and puts a warning banner at the top. Delete or overwrite them
before drawing any conclusion from the chart.

---

## Filling in a lot of numbers

Transcribing ~200 models × 5 efforts × 10 benchmarks by hand is the tedious part, so
the **Data** menu generates the empty grid for you:

| Action | Result |
|---|---|
| **Export missing data (JSON)** | Only the `(model × effort × benchmark)` cells that are still empty, as `{ score: null, cost: null }` — paste your numbers over the `null`s and merge back |
| **Export full template (JSON)** | Every cell, filled and empty, useful as a spreadsheet template |
| **Export missing data (TSV)** | Same grid as columns: `model_id, model_name, benchmark_id, benchmark, effort, score, cost_per_task_usd` — paste into a spreadsheet, fill, paste back |
| **Download current data (JSON)** | The whole dataset as it is right now, ready to keep as your master copy |
| **Load JSON file…** | Load an edited `.json` without touching the repo |
| **Reload data file** | Re-read `data/models.js` after editing it |

Bad entries do not break the page: anything that is not a finite, non-negative number
for both `score` and `cost` is skipped and listed in the warning banner.

---

## Layout

```
index.html          shell
styles.css          theme
data/models.js      ← your data
js/data.js          load, validate, normalise, generate data stubs
js/scale.js         log/linear scales, tick and money formatting
js/chart.js         the SVG scatter plot
js/table.js         sortable table + CSV/TSV
js/app.js           state, filters, toolbar
```

Plain ES5-ish scripts on a `window.AA` namespace, so the page works straight off disk
without a bundler or a server.