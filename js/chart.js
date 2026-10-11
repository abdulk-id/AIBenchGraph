/* =============================================================================
   chart.js — the scatter plot. One point per model x reasoning effort,
   points of one model joined by a line, model names in a right-hand gutter.

   The plot always fills the space it is given: no scrolling, no zoom, no pan.

   x = cost per task (USD)   y = score
   ========================================================================== */
(function (AA) {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var F = AA.scale;

    var COLORS = [
        "#ff8a65",
        "#82b1ff",
        "#69f0ae",
        "#ffd54f",
        "#ce93d8",
        "#4dd0e1",
        "#f48fb1",
        "#a5d6a7",
        "#9fa8da",
        "#80cbc4",
        "#ffab91",
        "#b39ddb",
        "#e5c07b",
        "#98c1d9",
        "#c3e88d",
        "#f78c6c",
    ];

    function el(name, attrs, parent) {
        var n = document.createElementNS(NS, name);
        for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }

    function clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    }

    /* Stable per-name colour so a model's line keeps its colour as the data grows. */
    function colorFor(name) {
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
        return COLORS[h % COLORS.length];
    }

    AA.colorFor = colorFor;

    /* Models added through the panel get a "+" so they are never mistaken for
       entries that are really in data/models.js. */
    function labelFor(m) {
        return (m.added ? "+ " : "") + m.name;
    }

    AA.createChart = function (root, opts) {
        opts = opts || {};

        var svg = el("svg");
        var gGrid = el("g", {}, svg);
        var gAxis = el("g", {}, svg);
        var gPareto = el("g", {}, svg);
        var gModels = el("g", {}, svg);
        var gNames = el("g", {}, svg);
        var gMsg = el("g", {}, svg);
        root.appendChild(svg);

        var cfg = null;
        var cur = null; /* domain currently plotted */
        var xs = F.linear(),
            ys = F.linear();
        var plot = { left: 48, right: 0, top: 12, bottom: 0, width: 0, height: 0 };
        var placed = [];

        /* --------------------------------------------------------------- domains */

        /* Extent of whatever is currently plotted. */
        function domain(models) {
            var costs = [],
                scores = [];
            models.forEach(function (m) {
                m.points.forEach(function (p) {
                    scores.push(p.score);
                    if (p.cost > 0 || cfg.scale === "linear") costs.push(p.cost);
                });
            });
            if (!scores.length) return null;

            var y0 = Math.min.apply(null, scores);
            var y1 = Math.max.apply(null, scores);
            var ypad = (y1 - y0) * 0.08 || 1;

            var x0, x1;
            if (!costs.length) {
                x0 = 0;
                x1 = 1;
            } else if (cfg.scale === "log") {
                var lo = Math.min.apply(null, costs);
                var hi = Math.max.apply(null, costs);
                x0 = Math.pow(10, Math.floor(Math.log10(Math.max(lo, 1e-9))));
                x1 = Math.pow(10, Math.ceil(Math.log10(hi * 1.05)));
                if (!(x1 > x0)) x1 = x0 * 10;
            } else {
                var c0 = Math.min.apply(null, costs),
                    c1 = Math.max.apply(null, costs);
                var cpad = (c1 - c0) * 0.06 || c1 * 0.2 || 1;
                x0 = Math.max(0, c0 - cpad);
                x1 = c1 + cpad;
                if (!(x1 > x0)) x1 = x0 + 1;
            }

            return { x0: x0, x1: x1, y0: y0 - ypad, y1: y1 + ypad };
        }

        /* Gutter on the right sized to the longest model name.
       Returns null while the container has no size yet — the resize observer
       calls back as soon as it does. */
        function layout() {
            var w = root.clientWidth;
            var h = root.clientHeight;
            if (w < 80 || h < 80) return null;

            var longest = 0;
            cfg.models.forEach(function (m) {
                longest = Math.max(longest, labelFor(m).length);
            });
            var gutter = Math.min(230, Math.max(90, longest * 6.6 + 26));

            var left = 46,
                right = 14,
                top = 14,
                bottomMargin = 40;
            var height = h - bottomMargin - top;
            var width = Math.max(40, w - gutter - left - right);
            plot = {
                left: left,
                top: top,
                right: left + width /* the scale range and the grid must agree */,
                bottom: top + height,
                width: width,
                height: height,
            };
            svg.setAttribute("viewBox", "0 0 " + w + " " + h);
            return { w: w, h: h };
        }

        /* Zero-cost points have no place on a log axis; hold them at the left edge. */
        function clampCost(p) {
            return cfg.scale === "log" && cur ? Math.max(p.cost, cur.x0) : p.cost;
        }

        function radius(p) {
            return p.effort ? Math.min(8, 2.8 + 0.9 * AA.data.effortIndex(p.effort)) : 3.6;
        }

        /* -------------------------------------------------------------- render */

        function render() {
            if (!cfg) return;
            var size = layout();
            if (!size) return; /* not laid out yet; the observer will call again */

            clear(gGrid);
            clear(gAxis);
            clear(gPareto);
            clear(gModels);
            clear(gNames);
            clear(gMsg);

            if (!cfg.models.length) {
                el("text", { x: size.w / 2, y: size.h / 2, class: "empty" }, gMsg).textContent =
                    cfg.empty || "No models.";
                return;
            }

            var d = domain(cfg.models);
            if (!d) return;
            cur = d;

            xs = (cfg.scale === "log" ? F.log() : F.linear()).domain(d.x0, d.x1).range(plot.left, plot.right);
            ys = F.linear().domain(d.y0, d.y1).range(plot.bottom, plot.top);

            drawAxes(d);
            if (cfg.pareto) drawPareto();
            drawModels();
        }

        function drawAxes(d) {
            var L = plot.left,
                T = plot.top,
                W = plot.width,
                H = plot.height;

            var yticks = F.linearTicks(d.y0, d.y1, Math.max(3, Math.round(H / 62)));
            var xticks =
                cfg.scale === "log"
                    ? F.logTicks(d.x0, d.x1)
                    : F.linearTicks(d.x0, d.x1, Math.max(3, Math.round(W / 120)));

            yticks.forEach(function (t) {
                var py = Math.round(ys(t)) + 0.5;
                el("line", { x1: L, x2: L + W, y1: py, y2: py, class: "grid h" }, gGrid);
                el("text", { x: L - 10, y: py + 3.5, class: "axis", "text-anchor": "end" }, gAxis).textContent = F.num(
                    t,
                    t % 1 === 0 ? 0 : 1,
                );
            });

            xticks.forEach(function (t) {
                var px = Math.round(xs(t)) + 0.5;
                el("line", { x1: px, x2: px, y1: T, y2: T + H, class: "grid" }, gGrid);
                el("text", { x: px, y: T + H + 18, class: "axis mid" }, gAxis).textContent = F.usdAxis(t);
            });

            el("text", { x: L, y: T - 3, class: "axis-name" }, gAxis).textContent = cfg.axis || "Score";
            el(
                "text",
                {
                    x: L + W / 2,
                    y: T + H + 34,
                    class: "axis-title",
                    "text-anchor": "middle",
                },
                gAxis,
            ).textContent = "Cost per task (USD, " + cfg.scale + " scale)";
        }

        /* Points no cheaper model already beats on score. */
        function frontier() {
            var all = [];
            cfg.models.forEach(function (m) {
                m.points.forEach(function (p) {
                    all.push(p);
                });
            });
            all.sort(function (a, b) {
                return a.cost - b.cost || b.score - a.score;
            });
            var best = -Infinity,
                out = [];
            all.forEach(function (p) {
                if (p.score > best + 1e-9) {
                    best = p.score;
                    out.push(p);
                }
            });
            return out;
        }

        function drawPareto() {
            var line = frontier();
            if (line.length < 2) return;
            el(
                "polyline",
                {
                    points: line
                        .map(function (p) {
                            return xs(clampCost(p)) + "," + ys(p.score);
                        })
                        .join(" "),
                    class: "pareto",
                },
                gPareto,
            );
        }

        function drawModels() {
            placed = [];
            var labels = [];
            var hover = cfg.hover;

            cfg.models.forEach(function (m) {
                var color = colorFor(m.name);
                var dim = hover && hover !== m.name;

                var pts = m.points.map(function (p) {
                    return { x: xs(clampCost(p)), y: ys(p.score), p: p };
                });

                if (pts.length > 1) {
                    el(
                        "polyline",
                        {
                            points: pts
                                .map(function (q) {
                                    return q.x + "," + q.y;
                                })
                                .join(" "),
                            class: "link",
                            stroke: color,
                            "stroke-width": hover === m.name ? 2.2 : 1.4,
                            opacity: dim ? 0.12 : 0.85,
                        },
                        gModels,
                    );
                }

                pts.forEach(function (q) {
                    placed.push({ x: q.x, y: q.y, p: q.p, name: m.name, provider: m.provider, color: color });
                    el(
                        "circle",
                        {
                            cx: q.x,
                            cy: q.y,
                            r: radius(q.p),
                            fill: color,
                            opacity: dim ? 0.15 : 1,
                            class: "pt",
                        },
                        gModels,
                    );
                });

                /* anchor the name on the model's right-most point */
                var anchor = pts.reduce(function (a, b) {
                    return b.x > a.x ? b : a;
                });
                labels.push({
                    name: labelFor(m),
                    raw: m.name,
                    color: color,
                    x: anchor.x,
                    y: anchor.y,
                    dim: dim,
                });
            });

            drawNames(labels);
        }

        /* Names sit in the right gutter, nudged apart so they never overlap. */
        function drawNames(labels) {
            var gap = 17;
            var top = plot.top,
                bottom = plot.bottom;
            var x = plot.right + 16;

            labels.sort(function (a, b) {
                return a.y - b.y;
            });

            /* push down, then pull back up if we ran past the bottom */
            var y = top;
            labels.forEach(function (l) {
                l.ly = Math.max(y, Math.min(l.y, bottom));
                y = l.ly + gap;
            });
            var overflow = y - gap - bottom;
            if (overflow > 0) {
                labels.forEach(function (l) {
                    l.ly = Math.max(top, l.ly - overflow);
                });
            }

            labels.forEach(function (l) {
                if (Math.abs(l.ly - l.y) > 1.5) {
                    el(
                        "line",
                        {
                            x1: l.x + 5,
                            y1: l.y,
                            x2: x - 6,
                            y2: l.ly,
                            class: "leader",
                            opacity: l.dim ? 0.3 : 0.9,
                        },
                        gNames,
                    );
                }
                var t = el(
                    "text",
                    {
                        x: x,
                        y: l.ly,
                        class: "name" + (l.dim ? " dim" : cfg.hover === l.raw ? " hot" : ""),
                        fill: l.dim ? null : l.color,
                    },
                    gNames,
                );
                t.textContent = l.name;
            });
        }

        /* -------------------------------------------------------------- tooltip */

        var tip = opts.tip;

        function showTip(hit, ev) {
            if (!tip) return;
            tip.innerHTML =
                '<div class="t-name">' +
                F.escapeHtml(hit.name) +
                "</div>" +
                (hit.provider
                    ? '<div class="t-effort">' +
                      F.escapeHtml(hit.provider) +
                      (hit.p.effort ? " · " + F.escapeHtml(AA.data.effortLabel(hit.p.effort)) : "") +
                      "</div>"
                    : "") +
                "<table><tr><td>Score</td><td>" +
                F.num(hit.p.score, 2) +
                "</td></tr>" +
                "<tr><td>Cost / task</td><td>" +
                F.usd(hit.p.cost) +
                "</td></tr></table>";

            tip.classList.add("on");
            var rect = root.getBoundingClientRect();
            var x = ev.clientX - rect.left;
            var y = ev.clientY - rect.top - 12;
            x = Math.min(rect.width - 80, Math.max(80, x));
            if (y - tip.offsetHeight < 0) y = ev.clientY - rect.top + tip.offsetHeight + 22;
            tip.style.left = x + "px";
            tip.style.top = y + "px";
        }

        function hideTip() {
            if (tip) tip.classList.remove("on");
        }

        function nearest(mx, my) {
            var best = null,
                bestD = 196;
            for (var i = 0; i < placed.length; i++) {
                var dx = placed[i].x - mx,
                    dy = placed[i].y - my;
                var d = dx * dx + dy * dy;
                if (d < bestD) {
                    bestD = d;
                    best = placed[i];
                }
            }
            return best;
        }

        function local(ev) {
            var r = root.getBoundingClientRect();
            return { x: ev.clientX - r.left, y: ev.clientY - r.top };
        }

        /* Hover only — the plot never scrolls, zooms or pans. */
        svg.addEventListener("pointermove", function (ev) {
            var p = local(ev);
            var hit = nearest(p.x, p.y);
            if (hit) {
                showTip(hit, ev);
                if (opts.onHover) opts.onHover(hit.name);
            } else {
                hideTip();
                if (opts.onHover) opts.onHover(null);
            }
        });

        svg.addEventListener("pointerleave", function () {
            hideTip();
            if (opts.onHover) opts.onHover(null);
        });

        /* Redraw straight away, never through requestAnimationFrame, and listen to
       window resize as well as ResizeObserver: neither rAF nor ResizeObserver
       notifications are delivered while a tab is in the background, which
       would otherwise leave the plot stuck at the size it was first drawn at. */
        if (window.ResizeObserver) new ResizeObserver(render).observe(root);
        window.addEventListener("resize", render);

        /* one more pass once styles and layout have definitely settled */
        if (document.readyState === "complete") render();
        else window.addEventListener("load", render);

        return {
            update: function (next) {
                cfg = next;
                render();
            },
        };
    };
})((window.AA = window.AA || {}));
