/* =============================================================================
   app.js — tabs, search, toggles, and the "add model" panel.

   data/models.js stays the source of truth. Anything added through the panel
   lives in localStorage (marked "+" on the chart) until you download a merged
   copy of the data file and drop it back in.
   ========================================================================== */
(function (AA) {
    "use strict";

    var S = {
        ds: null,
        sourceId: null,
        search: "",
        pareto: true,
        scale: "log",
        hover: null,
    };

    var STORE = "aibenchgraph.v1.";
    var chart = null;

    function $(id) {
        return document.getElementById(id);
    }

    function esc(s) {
        return AA.scale.escapeHtml(s);
    }

    var dom = {
        tabs: $("tabs"),
        search: $("search"),
        pareto: $("pareto"),
        scaleLog: $("scaleLog"),
        scaleLinear: $("scaleLinear"),
        chart: $("chart"),
        note: $("note"),
        src: $("src"),
        tip: $("tip"),
        addBtn: $("addBtn"),
        panel: $("addPanel"),
        apTitle: $("apTitle"),
        apName: $("apName"),
        apProvider: $("apProvider"),
        apRows: $("apRows"),
        apErr: $("apErr"),
        apLocal: $("apLocal"),
        apLocalList: $("apLocalList"),
    };

    /* --------------------------------------------------------- local store */

    function readLocal(sourceId) {
        try {
            var raw = window.localStorage.getItem(STORE + sourceId);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function writeLocal(sourceId, list) {
        try {
            window.localStorage.setItem(STORE + sourceId, JSON.stringify(list));
            return true;
        } catch (e) {
            return false; /* private mode / file:// restrictions */
        }
    }

    function addedModels() {
        var src = current();
        if (!src) return [];
        return readLocal(src.id).map(function (m) {
            return {
                name: m.name,
                provider: m.provider || null,
                points: m.points || [],
                added: true,
            };
        });
    }

    /* File models plus anything added here; an added model of the same name
       replaces the one from the file. */
    function models(sourceId) {
        var id = sourceId || (current() || {}).id;
        if (!id) return [];

        var file = [];
        for (var i = 0; i < (S.ds ? S.ds.sources.length : 0); i++) {
            if (S.ds.sources[i].id === id) file = S.ds.sources[i].models;
        }

        var list = file.slice();
        readLocal(id).forEach(function (a) {
            var m = { name: a.name, provider: a.provider || null, points: a.points || [], added: true };
            var at = list.findIndex(function (x) {
                return x.name === m.name;
            });
            if (at >= 0) list[at] = m;
            else list.push(m);
        });

        if (!S.search) return list;
        var q = S.search.toLowerCase();
        return list.filter(function (m) {
            return (m.name + " " + (m.provider || "")).toLowerCase().indexOf(q) >= 0;
        });
    }

    function current() {
        var list = S.ds ? S.ds.sources : [];
        for (var i = 0; i < list.length; i++) if (list[i].id === S.sourceId) return list[i];
        return list[0] || null;
    }

    /* --------------------------------------------------------------- tabs */

    function buildTabs() {
        if (!S.ds) {
            dom.tabs.innerHTML = "";
            return;
        }
        dom.tabs.innerHTML = S.ds.sources
            .map(function (s) {
                return (
                    '<button type="button" class="tab' +
                    (s.id === S.sourceId ? " on" : "") +
                    '" data-id="' +
                    esc(s.id) +
                    '"><b>' +
                    esc(s.label) +
                    "</b><span>" +
                    models(s.id).length +
                    "</span></button>"
                );
            })
            .join("");
    }

    /* ------------------------------------------------------------- render */

    function refresh() {
        var src = current();
        var list = models();

        chart.update({
            models: list,
            axis: src ? src.axis : "Score",
            scale: S.scale,
            pareto: S.pareto,
            hover: S.hover,
            empty: !S.ds
                ? "No data loaded — data/models.js did not set window.AA_DATA."
                : list.length
                  ? 'No models match "' + S.search + '".'
                  : "No models in " + (src ? src.label : "this source") + ".",
        });

        dom.note.textContent = "";
        dom.note.className = "";
        if (src && src.note) {
            dom.note.textContent = src.note;
            if (src.placeholder) dom.note.className = "warn";
        }

        dom.src.innerHTML =
            src && src.url
                ? '<a href="' + esc(src.url) + '" target="_blank" rel="noreferrer">Data source</a>'
                : "";

        renderLocalList();
    }

    /* ---------------------------------------------------------- add panel */

    var EFFORTS = ["", "none", "minimal", "low", "medium", "high", "xhigh", "max"];

    function rowMarkup(value) {
        var v = value || {};
        var opts = EFFORTS.map(function (e) {
            return (
                '<option value="' +
                e +
                '"' +
                (e === (v.effort || "") ? " selected" : "") +
                ">" +
                (e === "" ? "single" : AA.data.effortLabel(e)) +
                "</option>"
            );
        }).join("");

        return (
            '<div class="ap-row">' +
            '<select class="ap-eff">' +
            opts +
            "</select>" +
            '<input class="ap-score" type="text" inputmode="decimal" placeholder="' +
            (v.score === undefined ? "score" : v.score) +
            '" value="' +
            (v.score === undefined ? "" : v.score) +
            '" />' +
            '<input class="ap-cost" type="text" inputmode="decimal" placeholder="' +
            (v.cost === undefined ? "USD" : v.cost) +
            '" value="' +
            (v.cost === undefined ? "" : v.cost) +
            '" />' +
            '<button type="button" class="ap-del" title="Remove">&times;</button>' +
            "</div>"
        );
    }

    function addRow(values) {
        var row = document.createElement("div");
        row.innerHTML = rowMarkup(values);
        dom.apRows.appendChild(row.firstChild);
    }

    function readRows() {
        var rows = Array.prototype.slice.call(dom.apRows.querySelectorAll(".ap-row"));
        var out = [];
        var err = null;

        rows.forEach(function (row) {
            var effort = row.querySelector(".ap-eff").value;
            var score = row.querySelector(".ap-score").value.trim();
            var cost = row.querySelector(".ap-cost").value.trim();

            if (score === "" && cost === "") return; /* blank row, ignore */

            var s = Number(score);
            var c = Number(cost);
            if (score === "" || cost === "" || !isFinite(s) || !isFinite(c)) {
                err = err || "Every row needs a score and a cost.";
                return;
            }
            if (c < 0) {
                err = err || "Cost per task cannot be negative.";
                return;
            }
            if (out.some(function (p) {
                return p.effort === effort;
            })) {
                err = err || 'Two rows use the same effort — pick "single" for a model with one value.';
                return;
            }
            out.push({ effort: effort, score: s, cost: c });
        });

        return { points: out, err: err };
    }

    function showErr(msg) {
        dom.apErr.textContent = msg || "";
        dom.apErr.hidden = !msg;
    }

    function resetForm() {
        dom.apName.value = "";
        dom.apProvider.value = "";
        dom.apRows.innerHTML = "";
        addRow();
        showErr("");
    }

    function openPanel() {
        dom.panel.hidden = false;
        dom.addBtn.classList.add("on");
        var src = current();
        dom.apTitle.textContent = src ? "Add to " + (src.short || src.label) : "Add model";
        if (!dom.apRows.children.length) resetForm();
        dom.apName.focus();
    }

    function closePanel() {
        dom.panel.hidden = true;
        dom.addBtn.classList.remove("on");
    }

    function submitModel(ev) {
        ev.preventDefault();
        var name = dom.apName.value.trim();
        var provider = dom.apProvider.value.trim();

        if (!name) return showErr("Give the model a name.");

        var r = readRows();
        if (r.err) return showErr(r.err);
        if (!r.points.length) return showErr("Fill in at least one score and cost.");

        var src = current();
        var list = readLocal(src.id);

        list = list.filter(function (m) {
            return m.name !== name;
        });
        list.push({ name: name, provider: provider, points: r.points });

        if (!writeLocal(src.id, list)) {
            return showErr(
                "This browser is blocking local storage, so the model would vanish on reload. " +
                    "Add it to data/models.js by hand instead."
            );
        }

        resetForm();
        S.hover = null;
        buildTabs();
        refresh();
        openPanel();
    }

    function removeLocal(name) {
        var src = current();
        writeLocal(
            src.id,
            readLocal(src.id).filter(function (m) {
                return m.name !== name;
            })
        );
        S.hover = null;
        buildTabs();
        refresh();
    }

    function renderLocalList() {
        var list = addedModels();
        dom.apLocal.hidden = !list.length;
        if (!list.length) {
            dom.apLocalList.innerHTML = "";
            return;
        }
        dom.apLocalList.innerHTML = list
            .map(function (m) {
                return (
                    '<div class="ap-local-item"><span title="' +
                    esc(m.name) +
                    '">' +
                    esc(m.name) +
                    "</span>" +
                    '<button type="button" data-rm="' +
                    esc(m.name) +
                    '" title="Remove">&times;</button></div>'
                );
            })
            .join("");
    }

    /* Reconstruct the whole data file, file entries plus additions, so the
       result can replace data/models.js as-is. */
    function downloadMerged() {
        var out = {};

        S.ds.sources.forEach(function (src) {
            var srcOut = {};
            Object.keys(src.raw).forEach(function (k) {
                if (k !== "models") srcOut[k] = src.raw[k];
            });

            var fileModels = {};
            models().forEach(function (m) {
                fileModels[m.name] = m.added ? entryFor(m) : m.raw;
            });
            srcOut.models = fileModels;
            out[src.id] = srcOut;
        });

        var text =
            "/* Merged copy of data/models.js — replaces the current file.\n" +
            "   Anything added through the + Model panel is included.\n" +
            "   Placeholder models are still here: delete the ones you don't want. */\n\n" +
            "window.AA_DATA = " +
            JSON.stringify(out, null, 4) +
            ";\n";

        var blob = new Blob([text], { type: "text/javascript" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "models.js";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    /* { name: { score, cost } } or { name: { high: {...}, low: {...} } } */
    function entryFor(m) {
        var entry = {};
        if (m.provider) entry.provider = m.provider;
        if (m.points.length === 1 && !m.points[0].effort) {
            entry.score = m.points[0].score;
            entry.cost = m.points[0].cost;
            return entry;
        }
        m.points.forEach(function (p) {
            var key = p.effort || "default";
            entry[key] = { score: p.score, cost: p.cost };
        });
        return entry;
    }

    /* ---------------------------------------------------------------- load */

    function load() {
        var ds;
        try {
            ds = AA.data.load(window.AA_DATA);
        } catch (err) {
            S.ds = null;
            buildTabs();
            dom.note.textContent = err.message;
            dom.note.className = "warn";
            refresh();
            return;
        }
        S.ds = ds;
        if (
            !ds.sources.some(function (s) {
                return s.id === S.sourceId;
            })
        ) {
            S.sourceId = ds.sources[0].id;
        }
        if (ds.warnings.length) console.warn("data:", ds.warnings.join("\n"));
        buildTabs();
        refresh();
    }

    /* ------------------------------------------------------------- events */

    dom.tabs.addEventListener("click", function (ev) {
        var t = ev.target.closest(".tab");
        if (!t) return;
        S.sourceId = t.getAttribute("data-id");
        S.hover = null;
        buildTabs();
        refresh();
    });

    var debounce;
    dom.search.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            S.search = dom.search.value.trim();
            S.hover = null;
            refresh();
        }, 120);
    });

    dom.pareto.addEventListener("change", function () {
        S.pareto = dom.pareto.checked;
        refresh();
    });

    dom.scaleLog.addEventListener("click", function () {
        S.scale = "log";
        dom.scaleLog.classList.add("on");
        dom.scaleLinear.classList.remove("on");
        refresh();
    });

    dom.scaleLinear.addEventListener("click", function () {
        S.scale = "linear";
        dom.scaleLinear.classList.add("on");
        dom.scaleLog.classList.remove("on");
        refresh();
    });

    dom.addBtn.addEventListener("click", function () {
        if (dom.panel.hidden) openPanel();
        else closePanel();
    });

    $("addClose").addEventListener("click", closePanel);
    $("apCancel").addEventListener("click", closePanel);
    $("apAddRow").addEventListener("click", function () {
        addRow();
    });

    dom.panel.addEventListener("submit", submitModel);

    dom.panel.addEventListener("click", function (ev) {
        var del = ev.target.closest(".ap-del");
        if (del) {
            var row = del.closest(".ap-row");
            if (dom.apRows.children.length > 1) row.remove();
            else {
                row.querySelector(".ap-score").value = "";
                row.querySelector(".ap-cost").value = "";
            }
            return;
        }
        var rm = ev.target.closest("[data-rm]");
        if (rm) removeLocal(rm.getAttribute("data-rm"));
    });

    $("apExport").addEventListener("click", downloadMerged);

    $("apClear").addEventListener("click", function () {
        var src = current();
        writeLocal(src.id, []);
        S.hover = null;
        buildTabs();
        refresh();
    });

    document.addEventListener("keydown", function (ev) {
        if (ev.key === "/" && document.activeElement !== dom.search) {
            ev.preventDefault();
            dom.search.focus();
            dom.search.select();
        } else if (ev.key === "Escape") {
            if (!dom.panel.hidden) closePanel();
            else {
                dom.search.value = "";
                S.search = "";
                refresh();
                dom.search.blur();
            }
        }
    });

    chart = AA.createChart(dom.chart, {
        tip: dom.tip,
        onHover: function (name) {
            if (name === S.hover) return;
            S.hover = name;
            refresh();
        },
    });

    resetForm();
    load();
})((window.AA = window.AA || {}));