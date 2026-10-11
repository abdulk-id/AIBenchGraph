# AIBenchGraph

One graph: **cost per task** (x) against **benchmark score** (y), with a tab per
benchmark. Values are entered by hand — no network calls, no build step, no
dependencies.

```
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

## Adding a model

Press **+ Model**. Name it, optionally give a provider, then fill in a score and a
cost per task. Tick *another effort level* for each reasoning setting — leave the
effort as `single` if the model has just one score.

Added models are kept in this browser's local storage and drawn with a **`+`** in
front of the name, so they are never mistaken for entries that are really in
`data/models.js`. The panel lists them underneath with a `✕` each, and:

- **Download data/models.js** writes the whole dataset — the file's models plus
  yours — as a `models.js` you can drop in to replace `data/models.js`. After
  that the entries are real file entries and lose the `+`.
- **Clear all** removes the local additions and leaves the file untouched.

Until you download, additions only exist in that one browser. `Esc` closes the
panel.

## The data

Everything is in **`data/models.js`**. The top level is one object per benchmark;
each becomes a tab and holds its own models.

```js
window.AA_DATA = {
    artificial_analysis_intelligence_index: {
        label: "Artificial Analysis Intelligence Index",
        axis: "Intelligence index", // y-axis title
        unit: "index", // index | percent | elo
        url: "https://artificialanalysis.ai/…", // optional, links the footer
        note: "…", // optional, shown in the footer
        placeholder: true, // flags the data as not real

        models: {
            "GPT-5.6 Sol": { score: 58.9, cost: 1.2 }, // one score, one price

            "Claude Opus 5.5": {
                // one per effort level
                high: { score: 58.0, cost: 1.85 },
                medium: { score: 56.4, cost: 0.61 },
                low: { score: 54.9, cost: 0.21 },
                none: { score: 44.2, cost: 0.04 },
            },
        },
    },
};
```

- `cost` is **USD per task for that benchmark** — not price per token.
- `score` is whatever that benchmark measures: index points, %, Elo.
- Effort keys are free-form. These order and size themselves correctly:
  `none, minimal, low, medium, high, xhigh, max`. Anything else still works.
- `provider` on a model is optional and only shows on hover.

**Adding another benchmark** — just add another top-level entry with the same
shape. It becomes its own tab:

```js
'gpqa_diamond': {
  label: 'GPQA Diamond',
  axis:  'Accuracy (%)',
  models: { 'Claude Opus 5.5': { score: 88.1, cost: 1.40 } }
}
```

Entries that aren't a pair of finite numbers are skipped and listed in the console
rather than breaking the chart.

## Layout

- **Top strip** — benchmark tabs only.
- **Sidebar** — search box, then the model list, then `+ Model` across the full
  width at the bottom. The add form opens upwards from that button.
- **Below the plot** — Log/Linear and the Pareto line toggle on the left, the
  data note and source link on the right.

## Showing and hiding models

The sidebar lists every model for the current benchmark — the file's entries and
anything added in this browser — with a checkbox each. Untick to drop a model from
the plot; the header shows `N of M` and **hide all / show all** resets in one click.
The Pareto line is drawn through whichever models are currently shown.

The search box filters the sidebar and the plot together, and never hides a model
from the sidebar itself, so a ticked-off model is always one click away.

Ticking the box is remembered per browser, so a reload leaves the Pareto line
where you put it. The show/hide selection is per session.

## Reading the graph

- Each **line** is one model; each dot is a reasoning effort, growing with effort.
  A steep ladder means the extra money buys real intelligence; a flat one doesn't.
- **Pareto line** — nothing cheaper scores higher. Drawn through the models that
  are currently shown.
- Hover a dot for the exact score and cost; hovering a model dims the rest.
- Search box filters model and provider. `/` focuses it, `Esc` clears it.

The plot always fills the window — there is no scrolling, zooming or panning.

## Files

```
index.html        shell
styles.css
data/models.js    ← the data
js/data.js        read + validate the data file
js/scale.js       log/linear scales, tick and money formatting
js/chart.js       the plot
js/app.js         tabs, search, toggles, add-model panel
```
