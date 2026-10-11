/* =============================================================================
   data.js — read the data file into the shape the chart wants.

   window.AA_DATA = {
     <sourceId>: {
       label, axis, unit, url, note, placeholder,
       models: { "<model name>": { score, cost } | { <effort>: { score, cost } } }
     }
   }
   ========================================================================== */
(function (AA) {
    "use strict";

    var EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];

    var EFFORT_LABELS = {
        none: "Non-reasoning",
        minimal: "Minimal",
        low: "Low",
        medium: "Medium",
        high: "High",
        xhigh: "Extra high",
        max: "Max",
    };

    function isNum(v) {
        return typeof v === "number" && isFinite(v);
    }

    function effortIndex(k) {
        var i = EFFORT_ORDER.indexOf(k);
        return i < 0 ? EFFORT_ORDER.length + 1 : i;
    }

    function effortLabel(k) {
        return (
            EFFORT_LABELS[k] ||
            String(k)
                .replace(/[-_]+/g, " ")
                .replace(/\b[a-z]/g, function (c) {
                    return c.toUpperCase();
                })
        );
    }

    function load(raw) {
        var warnings = [];
        var sources = [];

        if (!raw || typeof raw !== "object") {
            throw new Error("data/models.js did not set window.AA_DATA to an object.");
        }

        Object.keys(raw).forEach(function (id) {
            var src = raw[id];
            if (!src || typeof src !== "object" || !src.models) {
                warnings.push(id + ": no `models` object, skipped.");
                return;
            }

            var models = [];

            Object.keys(src.models).forEach(function (name) {
                var entry = src.models[name];
                if (!entry || typeof entry !== "object") {
                    warnings.push(name + ": not an object, skipped.");
                    return;
                }

                var points = [];

                /* A model with a top-level score/cost is a single point; otherwise every
           object-valued key is a reasoning effort. */
                if (isNum(entry.score) || isNum(entry.cost)) {
                    if (!isNum(entry.score) || !isNum(entry.cost)) {
                        warnings.push(name + ": needs both `score` and `cost`, skipped.");
                        return;
                    }
                    points.push({ effort: "", score: entry.score, cost: entry.cost });
                } else {
                    Object.keys(entry).forEach(function (k) {
                        var c = entry[k];
                        if (!c || typeof c !== "object") return;
                        if (!isNum(c.score) || !isNum(c.cost)) {
                            warnings.push(name + " (" + k + "): needs both `score` and `cost`, skipped.");
                            return;
                        }
                        points.push({ effort: k, score: c.score, cost: c.cost });
                    });
                    points.sort(function (a, b) {
                        return effortIndex(a.effort) - effortIndex(b.effort);
                    });
                }

                if (!points.length) {
                    warnings.push(name + ": no usable values, skipped.");
                    return;
                }

                models.push({
                    name: name,
                    provider: typeof entry.provider === "string" ? entry.provider : null,
                    points: points,
                    raw: entry,
                });
            });

            if (!models.length) {
                warnings.push(id + ": no models with usable values.");
                return;
            }

            sources.push({
                id: id,
                label: src.label || id,
                short: src.short || src.label || id,
                axis: src.axis || src.label || "Score",
                unit: src.unit || "",
                url: src.url || null,
                note: src.note || null,
                placeholder: !!src.placeholder,
                models: models,
                raw: src,
            });
        });

        if (!sources.length) throw new Error("No usable sources in window.AA_DATA.");

        return { sources: sources, warnings: warnings };
    }

    AA.data = { load: load, effortLabel: effortLabel, effortIndex: effortIndex, isNum: isNum };
})((window.AA = window.AA || {}));
