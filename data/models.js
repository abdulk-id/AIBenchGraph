/* Merged copy of data/models.js — replaces the current file.
   Anything added through the + Model panel is included.
   Placeholder models are still here: delete the ones you don't want. */

window.AA_DATA = {
    "artificial_analysis_intelligence_index": {
        "label": "Artificial Analysis Intelligence Index",
        "short": "AA Intelligence Index",
        "axis": "Intelligence index",
        "unit": "index",
        "url": "https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index",
        "placeholder": true,
        "note": "Data entered manually. Not fetched from AAII",
        "models": {
            "Claude Opus 5.5": {
                "provider": "Anthropic",
                "max": {
                    "score": 58,
                    "cost": 5.98
                },
                "xhigh": {
                    "score": 56,
                    "cost": 3.46
                },
                "high": {
                    "score": 54,
                    "cost": 1.82
                },
                "medium": {
                    "score": 51,
                    "cost": 1.34
                },
                "low": {
                    "score": 42,
                    "cost": 0.55
                }
            },
            "Claude Sonnet 5.5": {
                "provider": "Anthropic",
                "max": {
                    "score": 56,
                    "cost": 5.46
                },
                "xhigh": {
                    "score": 52,
                    "cost": 2.01
                },
                "high": {
                    "score": 47,
                    "cost": 0.88
                },
                "medium": {
                    "score": 41,
                    "cost": 0.48
                },
                "low": {
                    "score": 36,
                    "cost": 0.35
                }
            },
            "Claude Haiku 5.5": {
                "provider": "Anthropic",
                "max": {
                    "score": 43,
                    "cost": 0.21
                },
                "xhigh": {
                    "score": 41,
                    "cost": 0.12
                },
                "high": {
                    "score": 38,
                    "cost": 0.08
                },
                "medium": {
                    "score": 34,
                    "cost": 0.05
                },
                "low": {
                    "score": 29,
                    "cost": 0.02
                }
            },
            "GPT-6 Luna": {
                "provider": "OpenAI",
                "max": {
                    "score": 38,
                    "cost": 0.07
                },
                "xhigh": {
                    "score": 35,
                    "cost": 0.04
                },
                "high": {
                    "score": 33,
                    "cost": 0.03
                },
                "medium": {
                    "score": 30,
                    "cost": 0.02
                },
                "low": {
                    "score": 22,
                    "cost": 0.01
                },
                "none": {
                    "score": 18,
                    "cost": 0.0045
                }
            },
            "MiMo-V2.6-Pro": {
                "provider": "Xiaomi",
                "score": 46,
                "cost": 0.13
            },
            "MiMo-V2.6-Flash": {
                "provider": "Xiaomi",
                "score": 38,
                "cost": 0.06
            },
            "GLM-5.3-Flash": {
                "provider": "Z AI",
                "score": 42,
                "cost": 0.25
            },
            "Qwen3.8 27B": {
                "provider": "Alibaba",
                "xhigh": {
                    "score": 34,
                    "cost": 1.01
                },
                "medium": {
                    "score": 28,
                    "cost": 1.13
                },
                "low": {
                    "score": 26,
                    "cost": 1.05
                },
                "none": {
                    "score": 20,
                    "cost": 2.49
                }
            },
            "Ling-3.0-flash-Fin": {
                "provider": "InclusionAI",
                "score": 23,
                "cost": 0
            },
            "Grok 4.7": {
                "provider": "SpaceXAI",
                "xhigh": {
                    "score": 46,
                    "cost": 3.74
                },
                "high": {
                    "score": 46,
                    "cost": 2.73
                },
                "low": {
                    "score": 42,
                    "cost": 1.25
                }
            },
            "Grok 4.6": {
                "provider": "SpacecXAI",
                "xhigh": {
                    "score": 44,
                    "cost": 1.75
                },
                "high": {
                    "score": 44,
                    "cost": 1.48
                },
                "medium": {
                    "score": 43,
                    "cost": 1.14
                },
                "low": {
                    "score": 35,
                    "cost": 0.38
                }
            },
            "GPT-5.6 Sol": {
                "provider": "OpenAI",
                "max": {
                    "score": 47,
                    "cost": 1.99
                },
                "xhigh": {
                    "score": 44,
                    "cost": 1.18
                },
                "high": {
                    "score": 42,
                    "cost": 0.81
                },
                "medium": {
                    "score": 39,
                    "cost": 0.5
                },
                "low": {
                    "score": 33,
                    "cost": 0.26
                }
            },
            "Muse Spark 1.3": {
                "provider": "Meta",
                "max": {
                    "score": 48,
                    "cost": 1.6
                },
                "xhigh": {
                    "score": 45,
                    "cost": 1.37
                }
            },
            "Kimi K3": {
                "provider": "Kimi",
                "max": {
                    "score": 44,
                    "cost": 2
                },
                "low": {
                    "score": 30,
                    "cost": 1.15
                }
            }
        }
    }
};
