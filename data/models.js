/*
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
*/

window.AA_DATA = {
    artificial_analysis_intelligence_index: {
        label: "Artificial Analysis Intelligence Index",
        short: "AA Intelligence Index",
        axis: "Intelligence index",
        unit: "index",
        url: "https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index",
        placeholder: true,
        note: "Data entered manually. Not fetched from AAII",
        models: {
            "Claude Opus 5.5": {
                provider: "Anthropic",
                max: {
                    score: 58,
                    cost: 5.98,
                },
                xhigh: {
                    score: 56,
                    cost: 3.46,
                },
                high: {
                    score: 54,
                    cost: 1.82,
                },
                medium: {
                    score: 51,
                    cost: 1.34,
                },
                low: {
                    score: 42,
                    cost: 0.55,
                },
            },
            "Claude Sonnet 5.5": {
                provider: "Anthropic",
                max: {
                    score: 56,
                    cost: 5.46,
                },
                xhigh: {
                    score: 52,
                    cost: 2.01,
                },
                high: {
                    score: 47,
                    cost: 0.88,
                },
                medium: {
                    score: 41,
                    cost: 0.48,
                },
                low: {
                    score: 36,
                    cost: 0.35,
                },
            },
            "Claude Haiku 5.5": {
                provider: "Anthropic",
                max: {
                    score: 43,
                    cost: 0.21,
                },
                xhigh: {
                    score: 41,
                    cost: 0.12,
                },
                high: {
                    score: 38,
                    cost: 0.08,
                },
                medium: {
                    score: 34,
                    cost: 0.05,
                },
                low: {
                    score: 29,
                    cost: 0.02,
                },
            },
            "GPT-6 Luna": {
                provider: "OpenAI",
                max: {
                    score: 38,
                    cost: 0.07,
                },
                xhigh: {
                    score: 35,
                    cost: 0.04,
                },
                high: {
                    score: 33,
                    cost: 0.03,
                },
                medium: {
                    score: 30,
                    cost: 0.02,
                },
                low: {
                    score: 22,
                    cost: 0.01,
                },
                none: {
                    score: 18,
                    cost: 0.0045,
                },
            },
            "MiMo-V2.6-Pro": {
                provider: "Xiaomi",
                score: 46,
                cost: 0.13,
            },
            "MiMo-V2.6-Flash": {
                provider: "Xiaomi",
                score: 38,
                cost: 0.06,
            },
            "GLM-5.3-Flash": {
                provider: "Z AI",
                score: 42,
                cost: 0.25,
            },
            "Qwen3.8 27B": {
                provider: "Alibaba",
                xhigh: {
                    score: 34,
                    cost: 1.01,
                },
                medium: {
                    score: 28,
                    cost: 1.13,
                },
                low: {
                    score: 26,
                    cost: 1.05,
                },
                none: {
                    score: 20,
                    cost: 2.49,
                },
            },
            "Ling-3.0-flash-Fin": {
                provider: "InclusionAI",
                score: 23,
                cost: 0,
            },
            "Grok 4.7": {
                provider: "SpaceXAI",
                xhigh: {
                    score: 46,
                    cost: 3.74,
                },
                high: {
                    score: 46,
                    cost: 2.73,
                },
                low: {
                    score: 42,
                    cost: 1.25,
                },
            },
        },
    },
};
