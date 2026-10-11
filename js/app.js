/* =============================================================================
   app.js — tabs, search, and the handful of toggles.
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

    var chart = null;

    function $(id) {
        return document.getElementById(id);
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
    };

    function current() {
        var list = S.ds ? S.ds.sources : [];
        for (var i = 0; i < list.length; i++) if (list[i].id === S.sourceId) return list[i];
        return list[0] || null;
    }

    function models() {
        var src = current();
        if (!src) return [];
        if (!S.search) return src.models;
        var q = S.search.toLowerCase();
        return src.models.filter(function (m) {
            return (m.name + " " + (m.provider || "")).toLowerCase().indexOf(q) >= 0;
        });
    }

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
                    AA.scale.escapeHtml(s.id) +
                    '">' +
                    "<b>" +
                    AA.scale.escapeHtml(s.label) +
                    "</b>" +
                    "<span>" +
                    s.models.length +
                    "</span></button>"
                );
            })
            .join("");
    }

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
                ? '<a href="' + AA.scale.escapeHtml(src.url) + '" target="_blank" rel="noreferrer">Data source</a>'
                : "";
    }

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

    document.addEventListener("keydown", function (ev) {
        if (ev.key === "/" && document.activeElement !== dom.search) {
            ev.preventDefault();
            dom.search.focus();
            dom.search.select();
        } else if (ev.key === "Escape") {
            dom.search.value = "";
            S.search = "";
            refresh();
            dom.search.blur();
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

    load();
})((window.AA = window.AA || {}));
