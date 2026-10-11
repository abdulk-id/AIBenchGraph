/* =============================================================================
   scale.js — tiny dependency-free scale + tick helpers.

   x is cost per task (spans several decades, so log is the default)
   y is score (always linear)
   ========================================================================== */
(function (AA) {
    "use strict";

    /* -------------------------------------------------------------- scales */

    function linear() {
        var d0 = 0,
            d1 = 1,
            r0 = 0,
            r1 = 1;

        function scale(v) {
            if (d1 === d0) return (r0 + r1) / 2;
            return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
        }

        scale.domain = function (a, b) {
            if (arguments.length === 2) {
                d0 = a;
                d1 = b;
            }
            return scale;
        };
        scale.range = function (a, b) {
            if (arguments.length === 2) {
                r0 = a;
                r1 = b;
            }
            return scale;
        };
        scale.invert = function (p) {
            return d0 + ((p - r0) / (r1 - r0)) * (d1 - d0);
        };
        return scale;
    }

    function log() {
        var l0 = 0,
            l1 = 1,
            r0 = 0,
            r1 = 1;

        function scale(v) {
            var t;
            if (v <= 0) {
                t = -Infinity; /* clamp to the floor */
            } else {
                t = (Math.log(v) - l0) / (l1 - l0);
            }
            if (t === -Infinity) t = -0.25;
            if (!isFinite(t)) t = 1.25;
            return r0 + t * (r1 - r0);
        }

        scale.domain = function (a, b) {
            if (arguments.length === 2) {
                a = Math.max(a, 1e-9);
                b = Math.max(b, 1e-9);
                l0 = Math.log(a);
                l1 = Math.log(b);
            }
            return scale;
        };
        scale.range = function (a, b) {
            if (arguments.length === 2) {
                r0 = a;
                r1 = b;
            }
            return scale;
        };
        scale.invert = function (p) {
            var t = l0 + ((p - r0) / (r1 - r0)) * (l1 - l0);
            return Math.exp(t);
        };
        return scale;
    }

    /* ---------------------------------------------------------------- ticks */

    function niceStep(span, target) {
        var raw = Math.abs(span) / Math.max(target, 1);
        var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
        var norm = raw / mag;
        var step = norm >= 7 ? 10 : norm >= 3 ? 5 : norm >= 1.5 ? 2 : 1;
        return step * mag;
    }

    function linearTicks(d0, d1, count) {
        count = count || 6;
        if (!(d1 > d0)) return [d0];
        var step = niceStep(d1 - d0, count);
        var start = Math.ceil(d0 / step) * step;
        var out = [];
        for (var v = start; v <= d1 + step * 1e-6; v += step) {
            out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
            if (out.length > 200) break;
        }
        return out;
    }

    /* 1 / 2 / 5 per decade, so the axis reads as money. */
    function logTicks(d0, d1) {
        if (!(d1 > d0) || d0 <= 0) return [];
        var out = [];
        var k0 = Math.floor(Math.log10(d0));
        var k1 = Math.ceil(Math.log10(d1));
        var mantissas = [1, 2, 5];

        for (var k = k0; k <= k1 && out.length < 60; k++) {
            for (var i = 0; i < mantissas.length; i++) {
                var v = mantissas[i] * Math.pow(10, k);
                if (v >= d0 && v <= d1) out.push(v);
            }
        }
        return out;
    }

    /* ------------------------------------------------------------ formatting */

    function trimZeros(s) {
        return s.indexOf(".") < 0 ? s : s.replace(/0+$/, "").replace(/\.$/, "");
    }

    function isNum(v) {
        return typeof v === "number" && isFinite(v);
    }

    function round(v, places) {
        var f = Math.pow(10, places);
        return trimZeros((Math.round(v * f) / f).toFixed(places));
    }

    /* Cost per task: spans ~$0.005 to ~$500, so precision scales with magnitude.
   Never shows fewer than 2 decimals, never pads meaningless ones. */
    function usd(v) {
        if (v === null || v === undefined || !isFinite(v)) return "—";
        if (v === 0) return "$0";
        var a = Math.abs(v);
        if (a >= 1000) return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
        if (a < 0.01) return "$" + v.toPrecision(2);

        var places = a >= 1 ? 2 : a >= 0.1 ? 3 : 4;
        var s = v.toFixed(places);
        if (places > 2) {
            s = s.replace(/0+$/, "");
            if (s.indexOf(".") < 0) s += ".00";
            else if (s.split(".")[1].length < 2) s += "0";
        }
        return "$" + s;
    }

    function usdAxis(v) {
        if (v === null || v === undefined || !isFinite(v)) return "";
        if (v === 0) return "$0";
        var a = Math.abs(v);
        if (a >= 1000) return "$" + trimZeros((v / 1000).toFixed(a >= 10000 ? 0 : 1)) + "k";
        if (a >= 1) return "$" + round(v, a >= 20 ? 0 : 2);
        if (a < 0.01) return "$" + trimZeros(v.toPrecision(2));
        return "$" + round(v, a >= 0.1 ? 2 : 3);
    }

    function num(v, places) {
        if (v === null || v === undefined || !isFinite(v)) return "—";
        return Number(v).toFixed(places === undefined ? 1 : places);
    }

    function tokens(n) {
        if (!isNum(n)) return null;
        if (n >= 1e6) return trimZeros((n / 1e6).toFixed(2)) + "M";
        if (n >= 1e3) return trimZeros((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + "k";
        return String(n);
    }

    function date(iso) {
        if (!iso) return "—";
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
        if (!m) return iso;
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return m[3] + " " + months[+m[2] - 1] + " " + m[1];
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    AA.scale = {
        linear: linear,
        log: log,
        linearTicks: linearTicks,
        logTicks: logTicks,
        niceStep: niceStep,
        usd: usd,
        usdAxis: usdAxis,
        num: num,
        tokens: tokens,
        date: date,
        escapeHtml: escapeHtml,
    };
})((window.AA = window.AA || {}));
