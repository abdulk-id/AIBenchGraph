/* =============================================================================
   DATA FILE — edit this by hand. No network calls are ever made.

   This file assigns a plain JSON object to window.AA_DATA. It is a .js file
   rather than .json only so that it still loads when index.html is opened
   straight from disk (browsers block fetch() and ES modules on file://).
   You can keep the identical content in a real .json file and load it with
   the Data → Load JSON file… button (or by dropping it on the page).

   ---------------------------------------------------------------------------
   SHAPE

   {
     meta:       { source, index_version, updated },          // shown in the header
     benchmarks: [ { id, label, group, unit, description } ],  // one tab each
     models:     [ {                                         // one scatter group each
       id:              "claude-opus-5-5",                    // unique, machine-friendly
       name:            "Claude Opus 5.5",                    // shown on the chart
       provider:        "Anthropic",
       release_date:    "2026-09-22",                         // YYYY-MM-DD, optional
       open_weights:    false,
       context_window:  1000000,
       pricing:         { input: 5, output: 25, cache_read: 0.5 },   // $/Mtok, optional,
                                                                     // tooltip only — the
                                                                     // x axis uses cost/task
       placeholder:     true,                                 // dashed outline + warning
       results: {
         "intelligence_index": {
           "high":     { score: 57.0, cost: 1.85 },            // reasoning variants …
           "low":      { score: 55.1, cost: 0.42 },
           "none":     { score: 41.2, cost: 0.07 }
         },
         "gpqa_diamond": {
           "default":  { score: 84.1, cost: 0.63 }            // … or a single value
         }
       }
     } ]
   }

   cost  = weighted average USD per task for THAT benchmark (AA's "cost per task")
   score = that benchmark's score (index points, %, or Elo, per `unit`)

   Reasoning-effort keys are free-form. Any of none / minimal / low / medium /
   high / xhigh / max sorts and sizes correctly; anything else still works and
   is appended in alphabetical order.
   ========================================================================== */

window.AA_DATA = {

  meta: {
    source: 'Artificial Analysis (values transcribed by hand)',
    index_version: 'Intelligence Index v4.3.2',
    updated: '2026-10-11',
    note: 'Contains PLACEHOLDER models only — replace them with real data.'
  },

  benchmarks: [
    {
      id: 'intelligence_index',
      label: 'Intelligence Index',
      group: 'Index',
      unit: 'index',
      description: 'Artificial Analysis Intelligence Index: a weighted average of 10 evaluations, scaled 0-100. ' +
        'Cost per task is the weighted average USD to complete one Intelligence Index task.'
    },
    {
      id: 'coding_agent_index',
      label: 'Coding Agent Index',
      group: 'Index',
      unit: 'index',
      description: 'Artificial Analysis Coding Agent Index, built from DeepSWE, Terminal-Bench and SWE-Atlas-QnA.'
    },
    {
      id: 'gpqa_diamond',
      label: 'GPQA Diamond',
      group: 'Science',
      unit: 'percent',
      description: 'GPQA Diamond: 198 graduate-level science questions. PhD experts score ~65%.'
    },
    {
      id: 'humanities_last_exam',
      label: "Humanity's Last Exam",
      group: 'Reasoning',
      unit: 'percent',
      description: "Humanity's Last Exam accuracy."
    },
    {
      id: 'scicode',
      label: 'SciCode',
      group: 'Science',
      unit: 'percent',
      description: 'SciCode: scientific code-generation benchmark.'
    },
    {
      id: 'mmlu_pro',
      label: 'MMLU-Pro',
      group: 'Knowledge',
      unit: 'percent',
      description: 'MMLU-Pro accuracy across 14 domains.'
    },
    {
      id: 'terminal_bench_hard',
      label: 'Terminal-Bench 4.0',
      group: 'Coding',
      unit: 'percent',
      description: 'Terminal-Bench 4.0: agentic terminal tasks.'
    },
    {
      id: 'livecodebench',
      label: 'LiveCodeBench',
      group: 'Coding',
      unit: 'percent',
      description: 'LiveCodeBench pass rate on competitive programming problems.'
    },
    {
      id: 'gdpval_aa',
      label: 'GDPval-AA',
      group: 'Business',
      unit: 'elo',
      description: 'GDPval-AA: long-horizon professional knowledge work, graded by frontier judges.'
    },
    {
      id: 'aa_lcr',
      label: 'AA-LCR',
      group: 'Long context',
      unit: 'percent',
      description: 'AA-LCR: long-context reasoning accuracy.'
    }
  ],

  /* ---------------------------------------------------------------------------
     PLACEHOLDER MODELS — invented numbers that only exist to show the chart
     working. Delete them (or overwrite them with real values) before reading
     anything into this chart.
     --------------------------------------------------------------------------- */
  models: [
    {
      id: 'placeholder-frontier-a',
      name: 'PLACEHOLDER Model A',
      provider: 'PLACEHOLDER Labs',
      release_date: '2026-05-14',
      open_weights: false,
      context_window: 1050000,
      pricing: { input: 3, output: 15, cache_read: 0.3 },
      placeholder: true,
      notes: 'Single reasoning effort — one score/price pair per benchmark.',
      results: {
        intelligence_index: { default: { score: 47.5, cost: 0.62 } },
        coding_agent_index: { default: { score: 58.2, cost: 1.10 } },
        gpqa_diamond:       { default: { score: 78.4, cost: 0.51 } },
        scicode:            { default: { score: 24.6, cost: 0.44 } },
        terminal_bench_hard:{ default: { score: 41.0, cost: 1.35 } }
      }
    },

    {
      id: 'placeholder-reasoner-b',
      name: 'PLACEHOLDER Reasoner B',
      provider: 'PLACEHOLDER Labs',
      release_date: '2026-08-02',
      open_weights: true,
      context_window: 262144,
      pricing: { input: 1.2, output: 6, cache_read: 0.12 },
      placeholder: true,
      notes: 'Four reasoning levels — shows how cost and score move with effort.',
      results: {
        intelligence_index: {
          high:   { score: 52.1, cost: 4.80 },
          medium: { score: 50.6, cost: 1.90 },
          low:    { score: 47.2, cost: 0.48 },
          none:   { score: 33.8, cost: 0.09 }
        },
        coding_agent_index: {
          high:   { score: 61.7, cost: 7.40 },
          medium: { score: 59.9, cost: 2.85 },
          low:    { score: 55.1, cost: 0.72 },
          none:   { score: 38.4, cost: 0.11 }
        },
        terminal_bench_hard: {
          high:   { score: 47.3, cost: 8.10 },
          medium: { score: 44.8, cost: 3.20 },
          low:    { score: 39.0, cost: 0.81 },
          none:   { score: 22.5, cost: 0.13 }
        },
        humanities_last_exam: {
          high:   { score: 28.4, cost: 5.60 },
          medium: { score: 24.1, cost: 2.20 },
          low:    { score: 18.7, cost: 0.55 },
          none:   { score: 9.3,  cost: 0.10 }
        },
        aa_lcr: {
          high:   { score: 82.0, cost: 4.10 },
          medium: { score: 79.4, cost: 1.60 },
          low:    { score: 74.2, cost: 0.39 }
        }
      }
    },

    {
      id: 'placeholder-small-c',
      name: 'PLACEHOLDER Small C',
      provider: 'PLACEHOLDER Open',
      release_date: '2026-02-27',
      open_weights: true,
      context_window: 131072,
      pricing: { input: 0.2, output: 0.6 },
      placeholder: true,
      notes: 'Cheap model — sits in the top-left of the scatter.',
      results: {
        intelligence_index: { default: { score: 28.4, cost: 0.034 } },
        gpqa_diamond:       { default: { score: 52.7, cost: 0.029 } },
        mmlu_pro:           { default: { score: 66.9, cost: 0.026 } },
        livecodebench:      { default: { score: 28.9, cost: 0.041 } }
      }
    }
  ]
};