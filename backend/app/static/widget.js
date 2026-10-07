/*!
 * Smart Aqmola — встраиваемый виджет аналитики обращений.
 *
 * Использование на стороннем сайте:
 *
 *   <div id="smart-aqmola-widget"></div>
 *   <script src="https://<адрес-бэкенда>/widget.js"></script>
 *
 * Необязательные настройки — атрибутами data-* прямо на теге <script>
 * (или на самом <div>, если настройки должны отличаться для разных
 * виджетов на одной странице — см. ниже):
 *
 *   data-target="smart-aqmola-widget"   id контейнера (по умолчанию именно этот)
 *   data-lang="ru"                      "ru" | "kz" (по умолчанию "ru")
 *   data-charts="stats,operator,district,trend,category"   какие блоки показывать
 *   data-refresh="300"                  автообновление, сек (0 — выключено)
 *   data-theme="light"                  "light" | "dark"
 *   data-branding="true"                показывать мелкую подпись внизу
 *   data-api="https://..."              база API, если отличается от src скрипта
 *
 * Несколько виджетов на одной странице: добавьте атрибут
 * data-smart-aqmola-widget на каждый нужный <div> — настройки для
 * каждого берутся с его собственных data-*, с откатом на <script>.
 * Один и тот же <script> обслуживает их все.
 *
 * Наружу ничего, кроме window.SmartAqmolaWidget = { init, reload },
 * не публикуется — стили и разметка живут в Shadow DOM и не задевают
 * страницу партнёра.
 */
(function () {
    "use strict";

    var CURRENT_SCRIPT = document.currentScript;

    var ENDPOINT_PATH = "/widget-api/public/analytics-summary";

    var STATUS = {
        NEW: "Новое",
        PROGRESS: "В работе",
        CLOSED: "Закрыто"
    };

    var DISTRICT_COLORS = [
        "#2E7FC1", "#F4B740", "#79B93C",
        "#4FC8E8", "#E58F2A", "#9B6FD6", "#1B3768"
    ];

    var CATEGORY_COLORS = [
        "#F4B740", "#2E7FC1", "#4FC8E8",
        "#79B93C", "#E58F2A", "#1B3768", "#9B6FD6"
    ];

    var OPERATOR_COLORS = [
        "#2E7FC1", "#F4B740", "#79B93C", "#9B6FD6", "#E58F2A"
    ];

    var TEXT = {
        ru: {
            title: "Аналитика по обращениям",
            loading: "Загрузка данных...",
            error: "Не удалось загрузить аналитику",
            noData: "Пока нет данных",
            statTotal: "Всего обращений",
            statNew: "Новых",
            statProgress: "В работе",
            statClosed: "Закрыто",
            districtBarTitle: "Обращения по районам",
            operatorTitle: "Обращения по операторам связи",
            categoryTitle: "Обращения по категориям (ИИ-анализ)",
            trendTitle: "Динамика обращений",
            districtUnknown: "Не указан",
            operatorUnknown: "Не определён",
            categoryUnknown: "Не определено ИИ",
            totalLabel: "всего",
            branding: "Аналитика — Smart Aqmola"
        },
        kz: {
            title: "Өтініштер бойынша аналитика",
            loading: "Деректер жүктелуде...",
            error: "Аналитиканы жүктеу мүмкін болмады",
            noData: "Әзірге деректер жоқ",
            statTotal: "Барлық өтініштер",
            statNew: "Жаңа",
            statProgress: "Жұмыста",
            statClosed: "Жабық",
            districtBarTitle: "Аудандар бойынша өтініштер",
            operatorTitle: "Байланыс операторлары бойынша өтініштер",
            categoryTitle: "Санаттар бойынша өтініштер (ЖИ талдауы)",
            trendTitle: "Өтініштер динамикасы",
            districtUnknown: "Көрсетілмеген",
            operatorUnknown: "Анықталмаған",
            categoryUnknown: "ЖИ анықтамады",
            totalLabel: "барлығы",
            branding: "Аналитика — Smart Aqmola"
        }
    };

    var CSS = "" +
        ":host, .saq-root { box-sizing: border-box; }" +
        ".saq-root * { box-sizing: border-box; }" +
        ".saq-root {" +
        "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;" +
        "  color: var(--saq-text, #1B2733);" +
        "  width: 100%;" +
        "}" +
        ".saq-root.saq-dark {" +
        "  --saq-text: #E7EDF3;" +
        "  --saq-card-bg: #1E2732;" +
        "  --saq-card-border: #2C3844;" +
        "  --saq-muted: #93A2B1;" +
        "  --saq-track: #2C3844;" +
        "}" +
        ".saq-root.saq-light {" +
        "  --saq-text: #1B2733;" +
        "  --saq-card-bg: #FFFFFF;" +
        "  --saq-card-border: #E4E9EF;" +
        "  --saq-muted: #6B7A88;" +
        "  --saq-track: #EEF2F6;" +
        "}" +
        ".saq-title {" +
        "  font-size: 15px; font-weight: 600; margin: 0 0 12px;" +
        "}" +
        ".saq-status {" +
        "  padding: 20px 0; text-align: center; color: var(--saq-muted);" +
        "  font-size: 13px;" +
        "}" +
        ".saq-error { color: #D14343; }" +
        ".saq-stats {" +
        "  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));" +
        "  gap: 10px; margin-bottom: 16px;" +
        "}" +
        "@media (max-width: 560px) { .saq-stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }" +
        ".saq-stat-card {" +
        "  background: var(--saq-card-bg); border: 1px solid var(--saq-card-border);" +
        "  border-radius: 10px; padding: 12px 14px;" +
        "}" +
        ".saq-stat-value { font-size: 22px; font-weight: 700; line-height: 1.2; }" +
        ".saq-stat-label { font-size: 12px; color: var(--saq-muted); margin-top: 2px; }" +
        ".saq-panels {" +
        "  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;" +
        "}" +
        "@media (max-width: 680px) { .saq-panels { grid-template-columns: 1fr; } }" +
        ".saq-panel-full { grid-column: 1 / -1; }" +
        ".saq-panel {" +
        "  background: var(--saq-card-bg); border: 1px solid var(--saq-card-border);" +
        "  border-radius: 10px; padding: 14px 16px;" +
        "}" +
        ".saq-panel h4 {" +
        "  font-size: 13px; font-weight: 600; margin: 0 0 12px; color: var(--saq-text);" +
        "}" +
        ".saq-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }" +
        ".saq-bar-label {" +
        "  width: 34%; max-width: 140px; font-size: 12px; color: var(--saq-muted);" +
        "  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" +
        "}" +
        ".saq-bar-track {" +
        "  flex: 1; background: var(--saq-track); border-radius: 6px; height: 10px; overflow: hidden;" +
        "}" +
        ".saq-bar-fill { height: 100%; border-radius: 6px; }" +
        ".saq-bar-value { width: 30px; text-align: right; font-size: 12px; color: var(--saq-muted); }" +
        ".saq-donut-wrap { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }" +
        ".saq-legend { list-style: none; margin: 0; padding: 0; font-size: 12px; flex: 1; min-width: 140px; }" +
        ".saq-legend li { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }" +
        ".saq-legend-label { flex: 1; color: var(--saq-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }" +
        ".saq-legend-pct { color: var(--saq-muted); font-weight: 600; }" +
        ".saq-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }" +
        ".saq-donut-total { font-size: 22px; font-weight: 700; fill: var(--saq-text); }" +
        ".saq-donut-total-label {" +
        "  font-size: 8px; fill: var(--saq-muted); letter-spacing: 0.5px; text-transform: uppercase;" +
        "}" +
        ".saq-axis-label { fill: var(--saq-muted); font-size: 10px; }" +
        ".saq-grid-line { stroke: var(--saq-card-border); stroke-width: 1; }" +
        ".saq-trend-dot {" +
        "  fill: var(--saq-card-bg); stroke: #2E7FC1; stroke-width: 2; cursor: pointer;" +
        "}" +
        ".saq-html-tooltip {" +
        "  position: absolute; display: none; pointer-events: none;" +
        "  transform: translate(-85%, 0);" +
        "  background: var(--saq-text); color: var(--saq-card-bg);" +
        "  font-size: 13px; font-weight: 700; line-height: 1;" +
        "  padding: 6px 11px; border-radius: 6px; white-space: nowrap; z-index: 2;" +
        "}" +
        ".saq-footer {" +
        "  margin-top: 10px; text-align: right; font-size: 11px;" +
        "}" +
        ".saq-footer a { color: var(--saq-muted); text-decoration: none; }" +
        ".saq-footer a:hover { text-decoration: underline; }";

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (key) {
                if (key === "class") {
                    node.className = attrs[key];
                } else if (key === "html") {
                    node.textContent = attrs[key];
                } else if (key === "style") {
                    node.setAttribute("style", attrs[key]);
                } else {
                    node.setAttribute(key, attrs[key]);
                }
            });
        }
        (children || []).forEach(function (child) {
            if (child) node.appendChild(child);
        });
        return node;
    }

    function svgEl(tag, attrs) {
        var node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (key) {
                node.setAttribute(key, attrs[key]);
            });
        }
        return node;
    }

    function readConfig(scriptTag, divTag) {
        function attr(name, fallback) {
            var fromDiv = divTag && divTag.getAttribute("data-" + name);
            if (fromDiv !== null && fromDiv !== undefined && fromDiv !== "") {
                return fromDiv;
            }
            var fromScript = scriptTag && scriptTag.getAttribute("data-" + name);
            if (fromScript !== null && fromScript !== undefined && fromScript !== "") {
                return fromScript;
            }
            return fallback;
        }

        var scriptOrigin = "";
        try {
            scriptOrigin = new URL(scriptTag.src, window.location.href).origin;
        } catch (e) {
            scriptOrigin = "";
        }

        var chartsRaw = attr("charts", "stats,operator,district,trend,category");
        var charts = chartsRaw.split(",").map(function (s) {
            return s.trim();
        }).filter(Boolean);

        return {
            lang: (attr("lang", "ru") === "kz") ? "kz" : "ru",
            apiBase: attr("api", scriptOrigin),
            refreshSeconds: parseInt(attr("refresh", "300"), 10) || 0,
            theme: (attr("theme", "dark") === "light") ? "light" : "dark",
            branding: attr("branding", "true") !== "false",
            charts: charts
        };
    }

    function aggregateByStatus(items) {
        var counts = { total: items.length, newCount: 0, progress: 0, closed: 0 };
        items.forEach(function (item) {
            if (item.status === STATUS.NEW) counts.newCount++;
            else if (item.status === STATUS.PROGRESS) counts.progress++;
            else if (item.status === STATUS.CLOSED) counts.closed++;
        });
        return counts;
    }

    function aggregateByField(items, field, unknownLabel, limit) {
        var counts = {};
        items.forEach(function (item) {
            var label = item[field] || unknownLabel;
            counts[label] = (counts[label] || 0) + 1;
        });
        return Object.keys(counts)
            .map(function (label) {
                return { label: label, value: counts[label] };
            })
            .sort(function (a, b) {
                return b.value - a.value;
            })
            .slice(0, limit || 6);
    }

    function aggregateDailyTrend(items, days) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var buckets = {};
        var order = [];
        for (var i = days - 1; i >= 0; i--) {
            var d = new Date(today);
            d.setDate(today.getDate() - i);
            var key = d.toISOString().slice(0, 10);
            buckets[key] = 0;
            order.push(key);
        }

        items.forEach(function (item) {
            if (item.created_date && Object.prototype.hasOwnProperty.call(buckets, item.created_date)) {
                buckets[item.created_date]++;
            }
        });

        return order.map(function (key) {
            return { date: key, value: buckets[key] };
        });
    }

    function formatDayLabel(dateStr) {
        var parts = dateStr.split("-");
        return parts[2] + "." + parts[1];
    }

    function renderStatCards(t, counts) {
        var items = [
            { value: counts.total, label: t.statTotal },
            { value: counts.newCount, label: t.statNew },
            { value: counts.progress, label: t.statProgress },
            { value: counts.closed, label: t.statClosed }
        ];

        var wrap = el("div", { class: "saq-stats" });
        items.forEach(function (item) {
            wrap.appendChild(el("div", { class: "saq-stat-card" }, [
                el("div", { class: "saq-stat-value", html: String(item.value) }),
                el("div", { class: "saq-stat-label", html: item.label })
            ]));
        });
        return wrap;
    }

    function renderBarPanel(title, data, colors, noDataText) {
        var panel = el("div", { class: "saq-panel" }, [
            el("h4", { html: title })
        ]);

        if (!data.length) {
            panel.appendChild(el("div", { class: "saq-status", html: noDataText }));
            return panel;
        }

        var max = Math.max.apply(null, data.map(function (d) { return d.value; }));

        data.forEach(function (item, index) {
            var pct = Math.max(4, Math.round((item.value / max) * 100));
            var color = colors[index % colors.length];

            panel.appendChild(el("div", { class: "saq-bar-row" }, [
                el("span", { class: "saq-bar-label", title: item.label, html: item.label }),
                el("div", { class: "saq-bar-track" }, [
                    el("div", { class: "saq-bar-fill", style: "width:" + pct + "%;background:" + color })
                ]),
                el("span", { class: "saq-bar-value", html: String(item.value) })
            ]));
        });

        return panel;
    }

    function renderDonutPanel(title, data, colors, noDataText, totalLabel) {
        var panel = el("div", { class: "saq-panel" }, [
            el("h4", { html: title })
        ]);

        if (!data.length) {
            panel.appendChild(el("div", { class: "saq-status", html: noDataText }));
            return panel;
        }

        var total = data.reduce(function (sum, d) { return sum + d.value; }, 0);
        var size = 120;
        var radius = 46;
        var cx = size / 2;
        var cy = size / 2;
        var strokeWidth = 18;
        var circumference = 2 * Math.PI * radius;

        var svg = svgEl("svg", {
            viewBox: "0 0 " + size + " " + size,
            width: size,
            height: size
        });

        var offset = 0;
        data.forEach(function (item, index) {
            var fraction = total ? item.value / total : 0;
            var dash = fraction * circumference;
            var circle = svgEl("circle", {
                cx: cx, cy: cy, r: radius,
                fill: "none",
                stroke: colors[index % colors.length],
                "stroke-width": strokeWidth,
                "stroke-dasharray": dash + " " + (circumference - dash),
                "stroke-dashoffset": -offset,
                transform: "rotate(-90 " + cx + " " + cy + ")"
            });
            svg.appendChild(circle);
            offset += dash;
        });

        // Число в центре доната — сам круг квадратный (120×120,
        // ширина = высота), масштаб равномерный, поэтому обычный
        // SVG-текст тут не искажается (в отличие от графика
        // динамики, у него ширина/высота разные).
        var totalNumber = svgEl("text", {
            x: cx, y: cy - 2, "text-anchor": "middle", class: "saq-donut-total"
        });
        totalNumber.textContent = String(total);
        svg.appendChild(totalNumber);

        var totalCaption = svgEl("text", {
            x: cx, y: cy + 12, "text-anchor": "middle", class: "saq-donut-total-label"
        });
        totalCaption.textContent = totalLabel;
        svg.appendChild(totalCaption);

        var wrap = el("div", { class: "saq-donut-wrap" }, [svg]);

        var legend = el("ul", { class: "saq-legend" });
        data.forEach(function (item, index) {
            var pct = total ? Math.round((item.value / total) * 100) : 0;
            legend.appendChild(el("li", {}, [
                el("span", {
                    class: "saq-dot",
                    style: "background:" + colors[index % colors.length]
                }),
                el("span", { class: "saq-legend-label", title: item.label, html: item.label }),
                el("span", { class: "saq-legend-pct", html: pct + "%" })
            ]));
        });
        wrap.appendChild(legend);

        panel.appendChild(wrap);
        return panel;
    }

    function renderTrendPanel(title, data, noDataText) {
        var panel = el("div", { class: "saq-panel" }, [
            el("h4", { html: title })
        ]);

        var hasAny = data.some(function (d) { return d.value > 0; });
        if (!hasAny) {
            panel.appendChild(el("div", { class: "saq-status", html: noDataText }));
            return panel;
        }

        var width = 900, height = 220;
        var padLeft = 32, padRight = 14, padTop = 16, padBottom = 26;
        var innerWidth = width - padLeft - padRight;
        var innerHeight = height - padTop - padBottom;

        var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.value; })));
        var stepX = innerWidth / Math.max(1, data.length - 1);

        function xAt(i) { return padLeft + i * stepX; }
        function yAt(v) { return padTop + innerHeight * (1 - v / max); }

        var points = data.map(function (d, i) {
            return { x: xAt(i), y: yAt(d.value), value: d.value, date: d.date };
        });

        var linePoints = points.map(function (p) {
            return p.x.toFixed(1) + "," + p.y.toFixed(1);
        }).join(" ");

        var areaPoints =
            points[0].x.toFixed(1) + "," + (height - padBottom) + " " +
            linePoints + " " +
            points[points.length - 1].x.toFixed(1) + "," + (height - padBottom);

        var gradientId = "saqTrendFill" + Math.random().toString(36).slice(2, 8);

        var svg = svgEl("svg", {
            viewBox: "0 0 " + width + " " + height,
            width: "100%",
            height: height,
            preserveAspectRatio: "none"
        });

        var defs = svgEl("defs", {});
        var gradient = svgEl("linearGradient", { id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" });
        gradient.appendChild(svgEl("stop", { offset: "0%", "stop-color": "#4FC8E8", "stop-opacity": "0.5" }));
        gradient.appendChild(svgEl("stop", { offset: "100%", "stop-color": "#2E7FC1", "stop-opacity": "0" }));
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Горизонтальные линии сетки + подписи значений слева —
        // без этого "просто линия в воздухе" плохо читается.
        [0, 0.25, 0.5, 0.75, 1].forEach(function (fraction) {
            var y = padTop + innerHeight * fraction;
            var value = Math.round(max * (1 - fraction));

            svg.appendChild(svgEl("line", {
                x1: padLeft, x2: width - padRight, y1: y, y2: y,
                class: "saq-grid-line"
            }));

            var label = svgEl("text", {
                x: padLeft - 6, y: y + 3,
                "text-anchor": "end",
                class: "saq-axis-label"
            });
            label.textContent = String(value);
            svg.appendChild(label);
        });

        svg.appendChild(svgEl("polygon", {
            points: areaPoints,
            fill: "url(#" + gradientId + ")",
            stroke: "none"
        }));

        svg.appendChild(svgEl("polyline", {
            points: linePoints,
            fill: "none",
            stroke: "#2E7FC1",
            "stroke-width": "2.4",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));

        // Больше подписей дат снизу, чем раньше, но не на каждую
        // точку — иначе на 30 днях подписи налезут друг на друга.
        var labelEvery = Math.max(1, Math.ceil(data.length / 10));

        // Тултип — обычный HTML-элемент поверх SVG, а не текст внутри
        // самого SVG: у графика viewBox растянут под широкую панель
        // (900 условных единиц), а панель теперь вдвое уже — из-за
        // неравномерного масштабирования (preserveAspectRatio="none")
        // текст внутри SVG в такой ситуации у части браузеров рисуется
        // нечитаемым или вовсе пропадает. HTML-слой этой проблемы не
        // знает, плюс даёт нормальную тень/шрифт без лишних плясок.
        var tooltip = el("div", { class: "saq-html-tooltip" });

        points.forEach(function (p, i) {
            if (i % labelEvery === 0 || i === points.length - 1) {
                var dateLabel = svgEl("text", {
                    x: p.x, y: height - 8,
                    "text-anchor": "middle",
                    class: "saq-axis-label"
                });
                dateLabel.textContent = formatDayLabel(p.date);
                svg.appendChild(dateLabel);
            }

            var dot = svgEl("circle", {
                cx: p.x, cy: p.y, r: 3.5,
                class: "saq-trend-dot"
            });

            // Проценты по X (совпадают с шириной SVG — она всегда
            // 100% контейнера) и пиксели по Y (высота SVG задана
            // фиксированной, 1 юнит viewBox = 1px, без масштабирования).
            var leftPct = (p.x / width) * 100;

            dot.addEventListener("mouseenter", function () {
                dot.setAttribute("r", "6");
                tooltip.style.left = leftPct + "%";
                tooltip.style.top = (p.y + 14) + "px";
                tooltip.textContent = String(p.value);
                tooltip.style.display = "block";
            });
            dot.addEventListener("mouseleave", function () {
                dot.setAttribute("r", "3.5");
                tooltip.style.display = "none";
            });

            svg.appendChild(dot);
        });

        var wrap = el("div", { style: "position:relative; width:100%; overflow: visible;" }, [svg, tooltip]);
        panel.appendChild(wrap);
        return panel;
    }

    function renderContent(t, config, items) {
        var frag = document.createDocumentFragment();

        if (config.charts.indexOf("stats") !== -1) {
            frag.appendChild(renderStatCards(t, aggregateByStatus(items)));
        }

        var panels = el("div", { class: "saq-panels" });
        var anyPanel = false;

        // Порядок вставки = порядок в сетке 2×2: слева-направо,
        // сверху-вниз. Ряд 1: пирог по районам | бары по районам.
        // Ряд 2: динамика | бары по категориям.
        var districtData = null;
        if (config.charts.indexOf("district") !== -1) {
            districtData = aggregateByField(items, "district", t.districtUnknown, 6);
        }

        if (config.charts.indexOf("operator") !== -1) {
            // Приоритет — тому, что человек указал сам при создании
            // обращения (item.operator); ИИ-классификация (item.ai_operator)
            // подключается только если ручное значение не задано.
            var operatorData = aggregateByField(
                items.map(function (item) {
                    return { operatorLabel: item.operator || item.ai_operator || null };
                }),
                "operatorLabel",
                t.operatorUnknown,
                6
            );
            panels.appendChild(renderDonutPanel(t.operatorTitle, operatorData, OPERATOR_COLORS, t.noData, t.totalLabel));
            anyPanel = true;
        }

        if (config.charts.indexOf("district") !== -1) {
            panels.appendChild(renderBarPanel(t.districtBarTitle, districtData, DISTRICT_COLORS, t.noData));
            anyPanel = true;
        }

        if (config.charts.indexOf("trend") !== -1) {
            var trendData = aggregateDailyTrend(items, 30);
            panels.appendChild(renderTrendPanel(t.trendTitle, trendData, t.noData));
            anyPanel = true;
        }

        if (config.charts.indexOf("category") !== -1) {
            var categoryData = aggregateByField(items, "ai_category", t.categoryUnknown, 6);
            panels.appendChild(renderBarPanel(t.categoryTitle, categoryData, CATEGORY_COLORS, t.noData));
            anyPanel = true;
        }

        if (anyPanel) {
            frag.appendChild(panels);
        }

        if (config.branding) {
            frag.appendChild(el("div", { class: "saq-footer" }, [
                el("a", {
                    href: "https://smartaqmola.kz",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    html: t.branding
                })
            ]));
        }

        return frag;
    }

    function buildShell(container, config) {
        var root = container.shadowRoot || container.attachShadow({ mode: "open" });
        root.innerHTML = "";

        var style = document.createElement("style");
        style.textContent = CSS;
        root.appendChild(style);

        var t = TEXT[config.lang];

        var rootEl = el("div", {
            class: "saq-root " + (config.theme === "dark" ? "saq-dark" : "saq-light")
        });
        rootEl.appendChild(el("div", { class: "saq-title", html: t.title }));

        var bodyEl = el("div", { class: "saq-body" });
        rootEl.appendChild(bodyEl);

        root.appendChild(rootEl);

        return { bodyEl: bodyEl, t: t };
    }

    function runWidget(container, config) {
        var shell = buildShell(container, config);
        var bodyEl = shell.bodyEl;
        var t = shell.t;

        function showLoading() {
            bodyEl.innerHTML = "";
            bodyEl.appendChild(el("div", { class: "saq-status", html: t.loading }));
        }

        function showError() {
            bodyEl.innerHTML = "";
            bodyEl.appendChild(el("div", { class: "saq-status saq-error", html: t.error }));
        }

        function showData(items) {
            bodyEl.innerHTML = "";
            bodyEl.appendChild(renderContent(t, config, items));
        }

        function load(isFirstLoad) {
            if (isFirstLoad) showLoading();

            var url = config.apiBase.replace(/\/+$/, "") + ENDPOINT_PATH;

            var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
            var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

            fetch(url, {
                credentials: "omit",
                signal: controller ? controller.signal : undefined
            })
                .then(function (response) {
                    if (!response.ok) throw new Error("HTTP " + response.status);
                    return response.json();
                })
                .then(function (items) {
                    if (timeoutId) clearTimeout(timeoutId);
                    showData(Array.isArray(items) ? items : []);
                })
                .catch(function () {
                    if (timeoutId) clearTimeout(timeoutId);
                    // При автообновлении молча оставляем предыдущие данные
                    // на экране вместо мигания ошибкой, если это не самая
                    // первая загрузка.
                    if (isFirstLoad) showError();
                });
        }

        load(true);

        if (config.refreshSeconds > 0) {
            setInterval(function () { load(false); }, config.refreshSeconds * 1000);
        }
    }

    function initOne(container, scriptTag) {
        if (!container || container.__saqInitialized) return;
        container.__saqInitialized = true;
        var config = readConfig(scriptTag, container);
        runWidget(container, config);
    }

    function init() {
        var script = CURRENT_SCRIPT || document.querySelector("script[src*='widget.js']");

        var defaultTargetId = (script && script.getAttribute("data-target")) || "smart-aqmola-widget";
        var byId = document.getElementById(defaultTargetId);
        if (byId) initOne(byId, script);

        var others = document.querySelectorAll("[data-smart-aqmola-widget]");
        for (var i = 0; i < others.length; i++) {
            if (others[i] !== byId) initOne(others[i], script);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.SmartAqmolaWidget = {
        init: init,
        reload: function () {
            var nodes = document.querySelectorAll(
                "#smart-aqmola-widget, [data-smart-aqmola-widget]"
            );
            for (var i = 0; i < nodes.length; i++) {
                nodes[i].__saqInitialized = false;
            }
            init();
        }
    };
})();
