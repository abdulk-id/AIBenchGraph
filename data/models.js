/* Merged copy of data/models.js — replaces the current file.
   Anything added through the + Model panel is included.
   Placeholder models are still here: delete the ones you don't want. */

window.AA_DATA = {
    artificial_analysis_intelligence_index: {
        label: "Artificial Analysis Intelligence Index v5",
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
                    cost: 10.04,
                },
                xhigh: {
                    score: 57,
                    cost: 6.05,
                },
                high: {
                    score: 52,
                    cost: 3.46,
                },
                medium: {
                    score: 48,
                    cost: 2.45,
                },
                low: {
                    score: 35,
                    cost: 0.98,
                },
            },
            "Claude Sonnet 5.5": {
                provider: "Anthropic",
                max: {
                    score: 54,
                    cost: 10.02,
                },
                xhigh: {
                    score: 50,
                    cost: 4.09,
                },
                high: {
                    score: 41,
                    cost: 1.64,
                },
                medium: {
                    score: 30,
                    cost: 0.78,
                },
                low: {
                    score: 25,
                    cost: 0.51,
                },
            },
            "Claude Haiku 5.5": {
                provider: "Anthropic",
                max: {
                    score: 36,
                    cost: 0.41,
                },
                xhigh: {
                    score: 34,
                    cost: 0.25,
                },
                high: {
                    score: 30,
                    cost: 0.16,
                },
                medium: {
                    score: 25,
                    cost: 0.09,
                },
                low: {
                    score: 19,
                    cost: 0.04,
                },
            },
            "Claude Fable 5.1": {
                provider: "Anthropic",
                max: {
                    score: 49,
                    cost: 13.04,
                },
                xhigh: {
                    score: 50,
                    cost: 10.89,
                },
                high: {
                    score: 47,
                    cost: 7.56,
                },
                medium: {
                    score: 43,
                    cost: 5.58,
                },
                low: {
                    score: 38,
                    cost: 4.49,
                },
            },
            "GPT-6.1 Sol": {
                provider: "OpenAI",
                max: {
                    score: 55,
                    cost: 1.27,
                },
                xhigh: {
                    score: 52,
                    cost: 0.76,
                },
                high: {
                    score: 50,
                    cost: 0.59,
                },
                medium: {
                    score: 46,
                    cost: 0.36,
                },
                low: {
                    score: 35,
                    cost: 0.16,
                },
            },
            "GPT-6.1 Terra": {
                provider: "OpenAI",
                max: {
                    score: 51,
                    cost: 0.96,
                },
                xhigh: {
                    score: 45,
                    cost: 0.4,
                },
                high: {
                    score: 42,
                    cost: 0.26,
                },
                medium: {
                    score: 38,
                    cost: 0.17,
                },
                low: {
                    score: 29,
                    cost: 0.07,
                },
                none: {
                    score: 30,
                    cost: 0.23,
                },
            },
            "GPT-6 Luna": {
                provider: "OpenAI",
                max: {
                    score: 28,
                    cost: 0.15,
                },
                xhigh: {
                    score: 23,
                    cost: 0.1,
                },
                high: {
                    score: 21,
                    cost: 0.07,
                },
                medium: {
                    score: 18,
                    cost: 0.04,
                },
                low: {
                    score: 10,
                    cost: 0.01,
                },
                none: {
                    score: 9,
                    cost: 0.07,
                },
            },
            "GPT-6 Astra": {
                provider: "OpenAI",
                max: {
                    score: 57,
                    cost: 6.24,
                },
                xhigh: {
                    score: 55,
                    cost: 3.66,
                },
                high: {
                    score: 55,
                    cost: 3.24,
                },
                medium: {
                    score: 51,
                    cost: 2.73,
                },
                low: {
                    score: 43,
                    cost: 1.42,
                },
            },
            "MiMo-V2.6-Pro": {
                provider: "Xiaomi",
                score: 30,
                cost: 0.26,
            },
            "MiMo-V2.6-Flash": {
                provider: "Xiaomi",
                score: 27,
                cost: 0.13,
            },
            "Grok 4.7": {
                provider: "SpaceXAI",
                xhigh: {
                    score: 34,
                    cost: 7.51,
                },
                high: {
                    score: 35,
                    cost: 6.18,
                },
                low: {
                    score: 31,
                    cost: 2.92,
                },
            },
            "Qwen3.8 27B": {
                provider: "Alibaba",
                xhigh: {
                    score: 20,
                    cost: 3.53,
                },
            },
            "Gemini 3.8 Flash": {
                provider: "Google",
                high: {
                    score: 31,
                    cost: 3.84,
                },
                medium: {
                    score: 30,
                    cost: 6.26,
                },
            },
            "Gemini 4 Argon": {
                provider: "Google",
                high: {
                    score: 50,
                    cost: 7.77,
                },
            },
            "Muse Wonder": {
                provider: "Meta",
                max: {
                    score: 43,
                    cost: 6.95,
                },
            },
            "Muse Spark 1.3": {
                provider: "Meta",
                max: {
                    score: 36,
                    cost: 2.39,
                },
            },
        },
    },
};
