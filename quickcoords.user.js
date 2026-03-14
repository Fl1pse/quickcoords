// ==UserScript==
// @name         QuickCoords
// @name:ru      БыстрыеКорды
// @namespace    http://tampermonkey.net/
// @version      2.5.3
// @description  A compact tool for saving coordinates and instantly jumping to them on PixelPlanet.
// @description:ru Компактный инструмент для сохранения координат и мгновенного перехода к ним на PixelPlanet.
// @author       Flips
// @match        https://pixelplanet.fun/*
// @match        https://fuckyouarkeros.fun/*
// @match        https://pixeldays.ru/*
// @match        https://pixeldays.xyz/*
// @icon         https://images.icon-icons.com/2248/PNG/512/message_arrow_right_icon_136413.png
// @grant        none
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/569509/QuickCoords.user.js
// @updateURL https://update.greasyfork.org/scripts/569509/QuickCoords.meta.js
// ==/UserScript==

(function() {
    'use strict';
    let wasDragging = false;
    const uiContainer = document.querySelector("#ui") || document.querySelector("#root") || document.body;
    const PANEL_TRANSITION = "width 0.2s ease, height 0.2s ease, padding 0.2s ease";
    const CANVAS_NAMES = {
        d: "Earth",
        s: "Minimap",
        m: "Moon",
        v: "3D Canvas",
        c: "Coronavirus",
        t: "Top10",
        l: "2bit",
        w: "1bit",
        y: "PixelZone",
        z: "PixelCanvas"
    };
    // ──────────────────────────────────────────────
    // Тема панели
    // ──────────────────────────────────────────────
    const THEMES = {
        light: {
            bg: "rgba(230,230,230,0.85)",
            color: "black",
            border: "1px solid black",
            inputBg: "white",
            inputColor: "black",
            inputBorder: "1px solid #888",
            btnBg: "#eee",
            btnColor: "black",
            btnBorder: "1px solid #888",
            listBg: "rgba(255,255,255,0.4)",
            emojiBtnBg: "white",
            emojiBtnBorder: "1px solid #888"
        },
        dark: {
            bg: "rgba(51, 51, 51, 0.88)",
            color: "#e0e0e0",
            border: "1px solid #000000",
            inputBg: "#2a2a38",
            inputColor: "#e0e0e0",
            inputBorder: "1px solid #555",
            btnBg: "#3a3a4a",
            btnColor: "#e0e0e0",
            btnBorder: "1px solid #555",
            listBg: "rgba(20,20,30,0.6)",
            emojiBtnBg: "#333333",
            emojiBtnBorder: "1px solid #555"
        }
    };
    let currentTheme = localStorage.getItem("quickcoords_theme") || "light";
    const styleId = "quickcoords-theme-styles";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    function applyTheme(themeName) {
        const th = THEMES[themeName];
        if (!th) return;
        panel.style.background = th.bg;
        panel.style.color = th.color;
        panel.style.border = th.border;
        const nameInput = document.getElementById("qc_name");
        if (nameInput) {
            nameInput.style.background = th.inputBg;
            nameInput.style.color = th.inputColor;
            nameInput.style.border = th.inputBorder;
        }
        const saveBtn = document.getElementById("qc_save");
        if (saveBtn) {
            saveBtn.style.background = th.btnBg;
            saveBtn.style.color = th.btnColor;
            saveBtn.style.border = th.btnBorder;
        }
        const list = document.getElementById("qc_list");
        if (list) {
            list.style.background = th.listBg;
        }
        styleEl.textContent = `
            #qc_list button,
            #qc_list button[data-go],
            #qc_list button[data-copy],
            #qc_list button[data-del],
            #qc_list button.emoji-btn {
                background: ${th.btnBg};
                color: ${th.btnColor};
                border: ${th.btnBorder};
            }
            #qc_list button[data-copy] {
                background: ${themeName === "dark" ? "#555" : "#666"};
            }
            #qc_list button[data-del] {
                background: ${themeName === "dark" ? "#733" : "#a33"};
            }
            #qc_list button.emoji-btn {
                background: ${th.emojiBtnBg};
                border: ${th.emojiBtnBorder};
            }
            #qc_version {
                font-size: 11px;
                opacity: 0.7;
                margin-left: 8px;
                pointer-events: none;
                color: inherit;
            }
        `;
    }
    // ──────────────────────────────────────────────
    // Создание панели
    // ──────────────────────────────────────────────
    const panel = document.createElement("div");
    panel.id = "quickcoords_panel";
    panel.style.position = "fixed";
    panel.style.padding = "10px";
    panel.style.borderRadius = "6px";
    panel.style.zIndex = "1";
    panel.style.fontSize = "14px";
    panel.style.width = "260px";
    panel.style.userSelect = "none";
    panel.style.resize = "none";
    panel.style.overflow = "hidden";
    panel.style.transition = PANEL_TRANSITION;
    panel.innerHTML = `
        <div id="qc_header" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; white-space:nowrap; position:relative;">
            <div style="display:flex; align-items:center;">
                <span id="qc_title">📍 QuickCoords</span>
                <span id="qc_version">by Flips v2.5.3</span>
            </div>
            <button id="qc_theme_toggle" title="Переключить тему" style="
                background: rgba(0,0,0,0.25);
                color: inherit;
                border: none;
                border-radius: 4px;
                width: 28px;
                height: 28px;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: auto;
            ">🌙</button>
        </div>
        <div id="qc_content" style="opacity:1; transition: opacity 0.2s ease;">
            <input id="qc_name" placeholder="Name" style="width:100%; margin-top:5px;">
            <button id="qc_save" style="width:100%; margin-top:5px;">Save</button>
            <div id="qc_list" style="margin-top:10px; max-height:250px; overflow-y:auto;"></div>
        </div>
        <div id="qc_resize" style="
            width:16px;
            height:16px;
            position:absolute;
            right:2px;
            bottom:2px;
            cursor:se-resize;
            background:
                linear-gradient(135deg, transparent 0%, transparent 40%, #888 40%, #888 50%, transparent 50%) no-repeat,
                linear-gradient(135deg, transparent 0%, transparent 60%, #888 60%, #888 70%, transparent 70%) no-repeat,
                linear-gradient(135deg, transparent 0%, transparent 80%, #888 80%, #888 90%, transparent 90%) no-repeat;
            background-size: 100% 100%;
        "></div>
    `;
    uiContainer.appendChild(panel);
    applyTheme(currentTheme);
    document.getElementById("qc_theme_toggle").innerText = currentTheme === "dark" ? "☀️" : "🌙";
    // ──────────────────────────────────────────────
    // Остальные функции (без изменений)
    // ──────────────────────────────────────────────
    const savedPos = JSON.parse(localStorage.getItem("quick_coords_panel_pos") || "{}");
    panel.style.top = savedPos.top || "100px";
    panel.style.left = savedPos.left || "10px";
    const savedSize = JSON.parse(localStorage.getItem("quick_coords_panel_size") || "{}");
    if (savedSize.width) panel.style.width = savedSize.width;
    if (savedSize.height) panel.style.height = savedSize.height;
    const savedState = localStorage.getItem("quick_coords_panel_state") || "show";
    if (savedState === "hide") collapsePanelInstant();
    function collapsePanelInstant() {
        const content = document.getElementById("qc_content");
        content.style.display = "none";
        content.style.opacity = "0";
        panel.style.width = "37px";
        panel.style.height = "37px";
        panel.style.padding = "0px";
        const header = document.getElementById("qc_header");
        header.style.width = "37px";
        header.style.height = "37px";
        header.style.justifyContent = "center";
        document.getElementById("qc_title").innerText = "📍";
        document.getElementById("qc_version").style.display = "none";
        document.getElementById("qc_resize").style.display = "none";
        document.getElementById("qc_theme_toggle").style.display = "none";
    }
    function collapsePanel() {
        const content = document.getElementById("qc_content");
        content.style.opacity = "0";
        setTimeout(() => {
            content.style.display = "none";
        }, 200);
        panel.style.width = "37px";
        panel.style.height = "37px";
        panel.style.padding = "0px";
        const header = document.getElementById("qc_header");
        header.style.width = "37px";
        header.style.height = "37px";
        header.style.justifyContent = "center";
        document.getElementById("qc_title").innerText = "📍";
        document.getElementById("qc_version").style.display = "none";
        document.getElementById("qc_resize").style.display = "none";
        document.getElementById("qc_theme_toggle").style.display = "none";
    }
    function expandPanel() {
        const content = document.getElementById("qc_content");
        content.style.display = "block";
        content.style.opacity = "0";
        requestAnimationFrame(() => {
            content.style.opacity = "1";
        });
        const size = JSON.parse(localStorage.getItem("quick_coords_panel_size") || "{}");
        if (size.width) panel.style.width = size.width;
        if (size.height) panel.style.height = size.height;
        panel.style.padding = "10px";
        const header = document.getElementById("qc_header");
        header.style.width = "100%";
        header.style.height = "auto";
        header.style.justifyContent = "space-between";
        document.getElementById("qc_title").innerText = "📍 QuickCoords";
        document.getElementById("qc_version").style.display = "inline";
        document.getElementById("qc_resize").style.display = "block";
        document.getElementById("qc_theme_toggle").style.display = "flex";
    }
    document.getElementById("qc_theme_toggle").onclick = (e) => {
        e.stopPropagation();
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("quickcoords_theme", currentTheme);
        applyTheme(currentTheme);
        document.getElementById("qc_theme_toggle").innerText = currentTheme === "dark" ? "☀️" : "🌙";
        updateList();
    };
    let saved = JSON.parse(localStorage.getItem("quick_coords") || "{}");
    const EMOJIS = ["🏠","⭐","🎯","🧱","📍","🔥","⚔️","🛡️","🚩"];
    let openEmojiPopup = null;
    function getCurrentCoords() {
        let hash = window.location.hash.replace('#', '');
        let parts = hash.split(',');
        let canvas = parts[0] || "d";
        if (parts.length < 4) return { canvas, x: 0, y: 0, zoom: 42 };
        return {
            canvas,
            x: parseInt(parts[1]),
            y: parseInt(parts[2]),
            zoom: parseInt(parts[3])
        };
    }
    function createEmojiPopup(targetButton, name) {
        if (openEmojiPopup) openEmojiPopup.remove();
        const th = THEMES[currentTheme];
        const popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.background = currentTheme === "dark" ? "#2a2a38" : "white";
        popup.style.color = currentTheme === "dark" ? "#e0e0e0" : "black";
        popup.style.border = th.emojiBtnBorder;
        popup.style.padding = "5px";
        popup.style.borderRadius = "6px";
        popup.style.display = "grid";
        popup.style.gridTemplateColumns = "repeat(3, 32px)";
        popup.style.gridGap = "4px";
        popup.style.zIndex = "9999";
        EMOJIS.forEach(e => {
            const btn = document.createElement("div");
            btn.innerText = e;
            btn.style.width = "32px";
            btn.style.height = "32px";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.justifyContent = "center";
            btn.style.fontSize = "20px";
            btn.style.border = th.emojiBtnBorder;
            btn.style.borderRadius = "6px";
            btn.style.background = th.emojiBtnBg;
            btn.style.cursor = "pointer";
            btn.onclick = () => {
                saved[name].emoji = e;
                localStorage.setItem("quick_coords", JSON.stringify(saved));
                updateList();
                popup.remove();
                openEmojiPopup = null;
            };
            popup.appendChild(btn);
        });
        document.body.appendChild(popup);
        const rect = targetButton.getBoundingClientRect();
        popup.style.left = rect.left + "px";
        popup.style.top = (rect.bottom + 4) + "px";
        openEmojiPopup = popup;
    }
    function updateList() {
        const list = document.getElementById("qc_list");
        list.innerHTML = "";
        for (let name in saved) {
            const { canvas, x, y, zoom, emoji } = saved[name];
            const link = `https://${location.host}/#${canvas},${x},${y},${zoom}`;
            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "10px";
            const label = document.createElement("div");
            label.innerText = CANVAS_NAMES[canvas] || canvas;
            label.style.fontSize = "10px";
            label.style.opacity = "0.7";
            label.style.marginLeft = "4px";
            label.style.marginBottom = "2px";
            const item = document.createElement("div");
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.gap = "4px";
            const emojiBtn = document.createElement("button");
            emojiBtn.innerText = emoji || "?";
            emojiBtn.className = "emoji-btn";
            emojiBtn.style.width = "32px";
            emojiBtn.style.height = "32px";
            emojiBtn.style.display = "flex";
            emojiBtn.style.alignItems = "center";
            emojiBtn.style.justifyContent = "center";
            emojiBtn.style.fontSize = "20px";
            emojiBtn.style.padding = "0";
            emojiBtn.style.borderRadius = "6px";
            emojiBtn.style.cursor = "pointer";
            emojiBtn.onclick = (e) => {
                e.stopPropagation();
                if (openEmojiPopup) {
                    openEmojiPopup.remove();
                    openEmojiPopup = null;
                    return;
                }
                createEmojiPopup(emojiBtn, name);
            };
            const nameBtn = document.createElement("button");
            nameBtn.innerText = name;
            nameBtn.style.flex = "1 1 auto";
            nameBtn.style.minWidth = "0";
            nameBtn.style.overflow = "hidden";
            nameBtn.style.whiteSpace = "nowrap";
            nameBtn.style.textOverflow = "ellipsis";
            nameBtn.setAttribute("data-go", name);
            const copyBtn = document.createElement("button");
            copyBtn.innerText = "Copy";
            copyBtn.style.flex = "0 0 40%";
            copyBtn.setAttribute("data-copy", link);
            const delBtn = document.createElement("button");
            delBtn.innerText = "✖";
            delBtn.style.flex = "0 0 20%";
            delBtn.setAttribute("data-del", name);
            item.appendChild(emojiBtn);
            item.appendChild(nameBtn);
            item.appendChild(copyBtn);
            item.appendChild(delBtn);
            wrapper.appendChild(label);
            wrapper.appendChild(item);
            list.appendChild(wrapper);
        }
    }
    updateList();
    document.addEventListener("click", (e) => {
        if (openEmojiPopup && !openEmojiPopup.contains(e.target)) {
            openEmojiPopup.remove();
            openEmojiPopup = null;
        }
    });
    document.getElementById("qc_save").onclick = () => {
        const name = document.getElementById("qc_name").value.trim();
        if (!name) return alert("Enter a name");
        const { canvas, x, y, zoom } = getCurrentCoords();
        saved[name] = { canvas, x, y, zoom, emoji: null };
        localStorage.setItem("quick_coords", JSON.stringify(saved));
        updateList();
    };
    function jumpTo(canvas, x, y, zoom) {
        window.location.hash = `#${canvas},0,0,1`;
        setTimeout(() => {
            window.location.hash = `#${canvas},${x},${y},${zoom}`;
        }, 50);
    }
    document.getElementById("qc_list").onclick = (e) => {
        const go = e.target.getAttribute("data-go");
        const del = e.target.getAttribute("data-del");
        const copy = e.target.getAttribute("data-copy");
        if (go) {
            const { canvas, x, y, zoom } = saved[go];
            jumpTo(canvas, x, y, zoom);
        }
        if (del) {
            delete saved[del];
            localStorage.setItem("quick_coords", JSON.stringify(saved));
            updateList();
        }
        if (copy) {
            navigator.clipboard.writeText(copy).then(() => {
                e.target.innerText = "Copied!";
                setTimeout(() => { e.target.innerText = "Copy"; }, 1000);
            });
        }
    };
    document.getElementById("qc_header").onclick = (e) => {
        if (e.target.id === "qc_theme_toggle") return;
        if (wasDragging) return;
        const content = document.getElementById("qc_content");
        if (content.style.display === "none") {
            expandPanel();
            localStorage.setItem("quick_coords_panel_state", "show");
        } else {
            collapsePanel();
            localStorage.setItem("quick_coords_panel_state", "hide");
        }
    };
    let isDragging = false, offsetX = 0, offsetY = 0;
    panel.addEventListener("mousedown", (e) => {
        if (["qc_save","qc_name","qc_resize","qc_theme_toggle"].includes(e.target.id)) return;
        wasDragging = false;
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
    });
    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            wasDragging = true;
            const newLeft = (e.clientX - offsetX) + "px";
            const newTop = (e.clientY - offsetY) + "px";
            panel.style.left = newLeft;
            panel.style.top = newTop;
            localStorage.setItem("quick_coords_panel_pos", JSON.stringify({ left: newLeft, top: newTop }));
        }
    });
    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
    const resizeEl = document.getElementById("qc_resize");
    let isResizing = false, startW, startH, startX, startY;
    resizeEl.addEventListener("mousedown", (e) => {
        if (document.getElementById("qc_content").style.display === "none") return;
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = parseInt(window.getComputedStyle(panel).width);
        startH = parseInt(window.getComputedStyle(panel).height);
        panel.style.transition = "none";
    });
    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        const newW = startW + (e.clientX - startX);
        const newH = startH + (e.clientY - startY);
        panel.style.width = Math.max(180, newW) + "px";
        panel.style.height = Math.max(120, newH) + "px";
        if (document.getElementById("qc_content").style.display !== "none") {
            localStorage.setItem("quick_coords_panel_size", JSON.stringify({
                width: panel.style.width,
                height: panel.style.height
            }));
        }
    });
    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            panel.style.transition = PANEL_TRANSITION;
        }
    });
})();
