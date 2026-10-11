/* =============================================================================
   DATA — edit this by hand. Nothing is fetched; the chart only reads this file.

   Top level = one entry per benchmark/source. Each one becomes a tab, and every
   model inside it is plotted as cost-per-task (x) against score (y).

   A model is either

     "GPT-5.6 Sol": { score: 58.9, cost: 1.20 }          // one score, one price

   or one entry per reasoning effort

     "Claude Opus 5.5": {
       high:   { score: 58.0, cost: 1.85 },
       medium: { score: 56.4, cost: 0.61 },
       low:    { score: 54.9, cost: 0.21 },
       none:   { score: 44.2, cost: 0.04 }
     }

   Effort keys are free-form. These order and size correctly out of the box:
   none, minimal, low, medium, high, xhigh, max. Anything else still works.

   `cost` is USD per task for THAT benchmark (not price per token).
   `score` is that benchmark's score: index points, %, Elo — whatever it uses.

   Optional per source:  url, note, placeholder
   Optional per model:  provider (shown on hover)

   To add a second benchmark, add another top-level entry — it becomes its own
   tab, exactly like this one.
   ========================================================================== */

window.AA_DATA = {

  'artificial_analysis_intelligence_index': {
    label: 'Artificial Analysis Intelligence Index',
    short: 'AA Intelligence Index',
    axis: 'Intelligence index',
    unit: 'index',
    url: 'https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index',
    placeholder: true,
    note: 'PLACEHOLDER DATA — invented numbers, replace before drawing conclusions.',

    models: {

      'PLACEHOLDER Frontier A': {
        provider: 'Frontier Labs',
        score: 47.5, cost: 0.62
      },

      'PLACEHOLDER Frontier A (reasoning)': {
        provider: 'Frontier Labs',
        high:   { score: 49.8, cost: 2.40 },
        medium: { score: 48.9, cost: 0.88 },
        low:    { score: 46.1, cost: 0.24 },
        none:   { score: 32.4, cost: 0.05 }
      },

      'PLACEHOLDER Middle B': {
        provider: 'Middle Labs',
        high:   { score: 44.6, cost: 4.10 },
        medium: { score: 43.0, cost: 1.45 },
        low:    { score: 40.2, cost: 0.31 },
        none:   { score: 29.8, cost: 0.06 }
      },

      'PLACEHOLDER Middle C': {
        provider: 'Middle Labs',
        high:   { score: 41.2, cost: 1.05 },
        low:    { score: 37.5, cost: 0.19 },
        none:   { score: 26.1, cost: 0.04 }
      },

      'PLACEHOLDER Small D': {
        score: 28.4, cost: 0.034
      },

      'PLACEHOLDER Small E': {
        provider: 'Open Labs',
        high:   { score: 33.6, cost: 0.42 },
        none:   { score: 21.7, cost: 0.02 }
      },

      'PLACEHOLDER Cheap F': {
        score: 17.9, cost: 0.0035
      },

      'PLACEHOLDER Frontier G': {
        provider: 'Frontier Labs',
        high:   { score: 56.9, cost: 18.00 },
        medium: { score: 55.1, cost: 5.60 },
        low:    { score: 52.2, cost: 1.30 },
        none:   { score: 38.7, cost: 0.14 }
      },

      'PLACEHOLDER Open H': {
        provider: 'Open Labs',
        high:   { score: 44.9, cost: 3.20 },
        medium: { score: 43.3, cost: 1.10 },
        low:    { score: 40.6, cost: 0.26 }
      }
    }
  }

  /* -----------------------------------------------------------------------
     A second benchmark would look like this:

  'gpqa_diamond': {
    label: 'GPQA Diamond',
    axis: 'Accuracy (%)',
    unit: 'percent',
    url: 'https://artificialanalysis.ai/evaluations/gpqa-diamond-benchmark',
    models: {
      'Claude Opus 5.5': { score: 88.1, cost: 1.40 },
      'GPT-5.6 Sol':     { high: { score: 89.4, cost: 2.10 }, low: { score: 86.2, cost: 0.44 } }
    }
  }
  ----------------------------------------------------------------------- */
};