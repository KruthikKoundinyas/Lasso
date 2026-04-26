// content.js - Lasso Copy Content Script
// Handles all in-page interaction: lasso drawing, element detection, copy

(function () {
  "use strict";

  // Prevent double-initialization
  if (window.__lassoCopyInitialized) return;
  window.__lassoCopyInitialized = true;

  // ─────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────
  let state = {
    active: false,
    dragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    pathPoints: [],
    selectedElements: [],
    settings: {
      mode: "rectangle",
      highlightColor: "#6366f1",
      copyFormat: "html",
    },
  };

  // DOM elements created by the extension
  let overlay = null;
  let lassoRect = null;
  let lassoPath = null;
  let floatingToolbar = null;
  let instructionBanner = null;
  let highlightLayer = null;

  // ─────────────────────────────────────────
  // INIT / TEARDOWN
  // ─────────────────────────────────────────
  function activate() {
    if (state.active) return;
    state.active = true;

    // Load settings
    chrome.storage.local.get(["settings"], (result) => {
      if (result.settings)
        state.settings = { ...state.settings, ...result.settings };
    });

    createOverlay();
    createHighlightLayer();
    showInstructionBanner();
    bindEvents();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "crosshair";
  }

  function deactivate() {
    if (!state.active) return;
    state.active = false;
    state.dragging = false;
    state.selectedElements = [];
    state.pathPoints = [];

    unbindEvents();
    removeOverlay();
    removeHighlights();
    removeFloatingToolbar();
    removeInstructionBanner();

    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }

  // ─────────────────────────────────────────
  // DOM CREATION
  // ─────────────────────────────────────────
  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "__lasso-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 2147483640;
      cursor: crosshair;
      background: transparent;
    `;

    lassoRect = document.createElement("div");
    lassoRect.id = "__lasso-rect";
    lassoRect.style.cssText = `
      position: absolute;
      border: 2px dashed #6366f1;
      background: rgba(99, 102, 241, 0.08);
      border-radius: 4px;
      pointer-events: none;
      display: none;
      box-shadow: 0 0 0 1px rgba(99,102,241,0.3);
      transition: background 0.1s ease;
    `;

    // Create SVG path for freeform lasso
    lassoPath = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lassoPath.id = "__lasso-path";
    lassoPath.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: none;
      z-index: 2147483641;
    `;

    const pathElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathElement.id = "__lasso-path-element";
    pathElement.setAttribute("stroke", "#6366f1");
    pathElement.setAttribute("stroke-width", "2");
    pathElement.setAttribute("fill", "rgba(99, 102, 241, 0.08)");
    pathElement.setAttribute("stroke-dasharray", "5,5");
    lassoPath.appendChild(pathElement);

    overlay.appendChild(lassoRect);
    overlay.appendChild(lassoPath);
    document.documentElement.appendChild(overlay);
  }

  function createHighlightLayer() {
    highlightLayer = document.createElement("div");
    highlightLayer.id = "__lasso-highlights";
    highlightLayer.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 2147483638;
    `;
    document.documentElement.appendChild(highlightLayer);
  }

  function showInstructionBanner() {
    instructionBanner = document.createElement("div");
    instructionBanner.id = "__lasso-banner";
    instructionBanner.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e1b4b;
      color: #e0e7ff;
      padding: 10px 20px;
      border-radius: 100px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 500;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 24px rgba(99,102,241,0.4), 0 1px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.01em;
      animation: __lasso-fadein 0.3s ease;
    `;
    instructionBanner.innerHTML = `
      <span>Click and drag to lasso content — <kbd style="background:rgba(255,255,255,0.15);padding:1px 6px;border-radius:4px;font-size:11px">Esc</kbd> to cancel</span>
    `;
    document.documentElement.appendChild(instructionBanner);
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      lassoRect = null;
      lassoPath = null;
    }
  }

  function removeHighlights() {
    if (highlightLayer) {
      highlightLayer.innerHTML = "";
      highlightLayer.remove();
      highlightLayer = null;
    }
  }

  function removeInstructionBanner() {
    if (instructionBanner) {
      instructionBanner.remove();
      instructionBanner = null;
    }
  }

  // ─────────────────────────────────────────
  // EVENT HANDLING
  // ─────────────────────────────────────────
  function bindEvents() {
    overlay.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove, { capture: true });
    document.addEventListener("mouseup", onMouseUp, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
  }

  function unbindEvents() {
    if (overlay) overlay.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove, { capture: true });
    document.removeEventListener("mouseup", onMouseUp, { capture: true });
    document.removeEventListener("keydown", onKeyDown, { capture: true });
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.currentX = e.clientX;
    state.currentY = e.clientY;
    state.pathPoints = [{ x: e.clientX, y: e.clientY }];

    // Check mode and show appropriate lasso element
    if (state.settings.mode === "freeform") {
      lassoPath.style.display = "block";
      lassoRect.style.display = "none";
    } else {
      lassoRect.style.display = "block";
      lassoRect.style.left = e.clientX + "px";
      lassoRect.style.top = e.clientY + "px";
      lassoRect.style.width = "0px";
      lassoRect.style.height = "0px";
    }

    removeFloatingToolbar();
    clearHighlights();
  }

  function onMouseMove(e) {
    if (!state.dragging) return;
    e.preventDefault();

    state.currentX = e.clientX;
    state.currentY = e.clientY;

    if (state.settings.mode === "freeform") {
      // Add point if far enough from last point
      const lastPoint = state.pathPoints[state.pathPoints.length - 1];
      const newPoint = { x: e.clientX, y: e.clientY };
      const distance = Math.sqrt(
        Math.pow(newPoint.x - lastPoint.x, 2) +
          Math.pow(newPoint.y - lastPoint.y, 2),
      );

      if (distance >= 8) {
        state.pathPoints.push(newPoint);
        updateLassoPath();
      }

      detectFreeformElements();
    } else {
      updateLassoRect();
      detectIntersectingElements();
    }

    renderHighlights();
  }

  function onMouseUp(e) {
    if (!state.dragging) return;
    e.preventDefault();
    state.dragging = false;

    // DEBUG
    console.log("[Lasso Debug] onMouseUp called");

    const bounds =
      state.settings.mode === "freeform"
        ? getFreeformBounds()
        : getLassoBounds();
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;

    console.log(
      "[Lasso Debug] bounds:",
      bounds,
      "width:",
      width,
      "height:",
      height,
    );

    if (width < 10 && height < 10) {
      // Too small — cancel
      console.log("[Lasso Debug] Selection too small");
      deactivate();
      return;
    }

    if (state.settings.mode === "freeform") {
      detectFreeformElements();
    } else {
      detectIntersectingElements();
    }

    console.log(
      "[Lasso Debug] Elements detected:",
      state.selectedElements.length,
    );

    if (state.selectedElements.length > 0) {
      console.log("[Lasso Debug] Showing toolbar");
      showFloatingToolbar(bounds);
      // Auto-copy with the selected format after a short delay
      const format = state.settings.copyFormat || "html";
      setTimeout(() => {
        copyContent(format);
      }, 100);
      // Hide the lasso elements, keep highlights
      lassoRect.style.display = "none";
      lassoPath.style.display = "none";
      // Remove overlay from DOM so toolbar is fully clickable
      if (overlay) {
        overlay.removeEventListener("mousedown", onMouseDown);
        overlay.remove();
        overlay = null;
      }
    } else {
      console.log("[Lasso Debug] No elements found in selection");
      showToast("No content found in selection", "warning");
      deactivate();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      deactivate();
    }
    // Handle Ctrl+C / Cmd+C for copying
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      if (state.selectedElements && state.selectedElements.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const format = state.settings.copyFormat || "html";
        copyContent(format);
      }
    }
  }

  // ─────────────────────────────────────────
  // LASSO GEOMETRY
  // ─────────────────────────────────────────
  function getLassoBounds() {
    return {
      left: Math.min(state.startX, state.currentX),
      top: Math.min(state.startY, state.currentY),
      right: Math.max(state.startX, state.currentX),
      bottom: Math.max(state.startY, state.currentY),
    };
  }

  function updateLassoRect() {
    const b = getLassoBounds();
    lassoRect.style.left = b.left + "px";
    lassoRect.style.top = b.top + "px";
    lassoRect.style.width = b.right - b.left + "px";
    lassoRect.style.height = b.bottom - b.top + "px";
  }

  // Freeform lasso functions
  function updateLassoPath() {
    if (!lassoPath || !state.pathPoints || state.pathPoints.length < 2) return;

    const pathElement = document.getElementById("__lasso-path-element");
    if (!pathElement) return;

    let d = "M " + state.pathPoints[0].x + " " + state.pathPoints[0].y;
    for (let i = 1; i < state.pathPoints.length; i++) {
      d += " L " + state.pathPoints[i].x + " " + state.pathPoints[i].y;
    }
    if (state.pathPoints.length > 2) {
      d += " Z";
    }
    pathElement.setAttribute("d", d);
  }

  function getCandidateElements() {
    return document.body.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, table, ul, ol, li, img, figure, blockquote, " +
        "pre, code, div, section, article, aside, header, footer, span, a, " +
        "strong, em, td, th, tr, thead, tbody, tfoot, dl, dt, dd, form, " +
        "input, textarea, select, button, video, audio, iframe, canvas, svg",
    );
  }

  function getFreeformBounds() {
    const points = state.pathPoints;
    if (!points || points.length === 0) {
      return { left: 0, top: 0, right: 0, bottom: 0 };
    }

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      left: minX,
      top: minY,
      right: maxX,
      bottom: maxY,
    };
  }

  function detectFreeformElements() {
    const points = state.pathPoints;

    if (!points || points.length < 3) {
      state.selectedElements = [];
      return [];
    }

    const bbox = getFreeformBounds();

    if (!bbox || bbox.right - bbox.left < 5 || bbox.bottom - bbox.top < 5) {
      state.selectedElements = [];
      return [];
    }

    // Get candidates
    const candidates = getCandidateElements();
    const found = [];
    const seen = new Set();

    for (const el of candidates) {
      if (seen.has(el)) continue;

      try {
        const rect = el.getBoundingClientRect();

        // Quick bounding box check first
        if (!bboxIntersect(bbox, rect)) continue;

        // Then do polygon intersection check
        if (polygonRectIntersect(points, rect)) {
          found.push(el);
          seen.add(el);
        }
      } catch (e) {
        // Element might be detached
      }
    }

    state.selectedElements = deduplicateElements(sortByDOMOrder(found));
    return state.selectedElements;
  }

  function sortByDOMOrder(elements) {
    return [].slice.call(elements).sort(function (a, b) {
      if (a.contains(b)) return -1;
      if (b.contains(a)) return 1;

      var rectA = a.getBoundingClientRect();
      var rectB = b.getBoundingClientRect();

      var verticalDiff = Math.abs(rectA.top - rectB.top);
      if (verticalDiff > 10) {
        return rectA.top - rectB.top;
      }

      return rectA.left - rectB.left;
    });
  }

  function bboxIntersect(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  function polygonRectIntersect(polygon, rect) {
    const rectPoints = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ];

    // Check if any polygon point is inside the rectangle
    for (const p of polygon) {
      if (pointInRect(p, rect)) return true;
    }

    // Check if any rectangle corner is inside the polygon
    for (const rp of rectPoints) {
      if (pointInPolygon(rp, polygon)) return true;
    }

    // Check if polygon edges intersect rectangle edges
    for (let k = 0; k < polygon.length; k++) {
      const p1 = polygon[k];
      const p2 = polygon[(k + 1) % polygon.length];

      for (let m = 0; m < 4; m++) {
        const r1 = rectPoints[m];
        const r2 = rectPoints[(m + 1) % 4];

        if (lineSegmentsIntersect(p1, p2, r1, r2)) return true;
      }
    }

    return false;
  }

  function pointInRect(point, rect) {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      if (
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  function lineSegmentsIntersect(p1, p2, p3, p4) {
    const denominator =
      (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

    if (denominator === 0) return false;

    const ua =
      ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
      denominator;
    const ub =
      ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) /
      denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  // ─────────────────────────────────────────
  // ELEMENT DETECTION
  // ─────────────────────────────────────────
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "META",
    "LINK",
    "HEAD",
  ]);
  const SKIP_IDS = new Set([
    "__lasso-overlay",
    "__lasso-highlights",
    "__lasso-toolbar",
    "__lasso-banner",
    "__lasso-toast",
  ]);

  function detectIntersectingElements() {
    const bounds = getLassoBounds();
    const candidates = document.body.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, table, ul, ol, li, img, figure, blockquote, " +
        "pre, code, div, section, article, aside, header, footer, span, a, " +
        "strong, em, td, th, tr, thead, tbody, tfoot, dl, dt, dd, form, " +
        "input, textarea, select, button, video, audio, iframe, canvas, svg",
    );

    console.log(
      "[Lasso Debug] detectIntersectingElements: bounds:",
      bounds,
      "candidates:",
      candidates.length,
    );

    const found = [];
    const seen = new Set();

    for (const el of candidates) {
      // Skip extension elements
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (SKIP_IDS.has(el.id)) continue;
      if (
        el.closest(
          "#__lasso-overlay, #__lasso-highlights, #__lasso-toolbar, #__lasso-banner",
        )
      )
        continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;

      if (rectsIntersect(bounds, rect)) {
        // Prefer leaf-level or meaningful containers
        if (!seen.has(el) && isUsefulElement(el, bounds)) {
          found.push(el);
          seen.add(el);
        }
      }
    }

    console.log("[Lasso Debug] Elements found after filtering:", found.length);

    state.selectedElements = deduplicateElements(found);
    console.log(
      "[Lasso Debug] Final selected elements:",
      state.selectedElements.length,
    );
  }

  function rectsIntersect(a, b) {
    return !(
      a.right <= b.left ||
      a.left >= b.right ||
      a.bottom <= b.top ||
      a.top >= b.bottom
    );
  }

  function isUsefulElement(el, bounds) {
    const rect = el.getBoundingClientRect();
    // Check meaningful overlap (at least 20% of element is in bounds OR element is small)
    const overlapLeft = Math.max(bounds.left, rect.left);
    const overlapTop = Math.max(bounds.top, rect.top);
    const overlapRight = Math.min(bounds.right, rect.right);
    const overlapBottom = Math.min(bounds.bottom, rect.bottom);

    if (overlapRight <= overlapLeft || overlapBottom <= overlapTop)
      return false;

    const overlapArea =
      (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
    const elArea = rect.width * rect.height;

    return elArea < 1 || overlapArea / elArea >= 0.15;
  }

  function deduplicateElements(elements) {
    // Remove elements that are ancestors of other selected elements
    const result = [];
    for (const el of elements) {
      const isAncestorOfAnother = elements.some(
        (other) => other !== el && el.contains(other),
      );
      // Keep if it's not a pure ancestor, OR if it's a structurally important container
      if (!isAncestorOfAnother) {
        result.push(el);
      } else {
        // Keep tables/lists even if they contain selected children
        const tag = el.tagName;
        if (
          ["TABLE", "UL", "OL", "DL", "FIGURE", "BLOCKQUOTE", "PRE"].includes(
            tag,
          )
        ) {
          // Only add if the whole element is in bounds
          const rect = el.getBoundingClientRect();
          const b = getLassoBounds();
          if (rectsIntersect(b, rect)) {
            result.push(el);
          }
        }
      }
    }
    return result;
  }

  // ─────────────────────────────────────────
  // HIGHLIGHT RENDERING
  // ─────────────────────────────────────────
  function clearHighlights() {
    if (highlightLayer) highlightLayer.innerHTML = "";
  }

  function renderHighlights() {
    clearHighlights();
    for (const el of state.selectedElements) {
      const rect = el.getBoundingClientRect();
      const highlight = document.createElement("div");
      highlight.style.cssText = `
        position: fixed;
        left: ${rect.left - 2}px;
        top: ${rect.top - 2}px;
        width: ${rect.width + 4}px;
        height: ${rect.height + 4}px;
        background: rgba(99, 102, 241, 0.12);
        border: 1.5px solid rgba(99, 102, 241, 0.6);
        border-radius: 3px;
        pointer-events: none;
        box-sizing: border-box;
      `;
      highlightLayer.appendChild(highlight);
    }
  }

  // ─────────────────────────────────────────
  // FLOATING TOOLBAR
  // ─────────────────────────────────────────
  function showFloatingToolbar(bounds) {
    removeFloatingToolbar();

    const count = state.selectedElements.length;
    floatingToolbar = document.createElement("div");
    floatingToolbar.id = "__lasso-toolbar";

    // Position: Fixed at bottom of screen for maximum visibility
    const toolbarHeight = 60;
    let toolbarTop = window.innerHeight - toolbarHeight - 20; // Always at bottom
    let toolbarLeft = window.innerWidth / 2; // Center horizontally

    console.log("[Lasso Debug] Toolbar position:", {
      toolbarTop,
      toolbarLeft,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      boundsBottom: bounds.bottom,
    });

    floatingToolbar.style.cssText = `
      position: fixed;
      left: ${toolbarLeft}px;
      top: ${toolbarTop}px;
      transform: translateX(-50%);
      background: #1e1b4b;
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 12px;
      padding: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: __lasso-toolbar-in 0.2s cubic-bezier(0.34,1.56,0.64,1);
    `;

    const countBadge = `
      <span style="
        color: #a5b4fc;
        font-size: 12px;
        font-weight: 600;
        padding: 0 8px;
        white-space: nowrap;
      ">${count} element${count !== 1 ? "s" : ""}</span>
    `;

    const divider = `<div style="width:1px;height:24px;background:rgba(255,255,255,0.1)"></div>`;

    // Get the selected format from settings (default to html)
    const format = state.settings.copyFormat || "html";

    // Configure first button based on format setting
    let firstButton, firstFormat;
    if (format === "markdown") {
      firstButton = `<button id="__lasso-btn-md" style="${btnStyle("#6366f1")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Copy Markdown
      </button>`;
      firstFormat = "markdown";
    } else if (format === "text") {
      firstButton = `<button id="__lasso-btn-text" style="${btnStyle("#6366f1")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        Copy Text
      </button>`;
      firstFormat = "text";
    } else if (format === "cleanHTML") {
      firstButton = `<button id="__lasso-btn-clean" style="${btnStyle("#6366f1")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
        Copy Clean
      </button>`;
      firstFormat = "cleanHTML";
    } else {
      firstButton = `<button id="__lasso-btn-html" style="${btnStyle("#6366f1")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
        Copy HTML
      </button>`;
      firstFormat = "html";
    }

    floatingToolbar.innerHTML = `
      ${countBadge}
      ${divider}
      ${firstButton}
      <button id="__lasso-btn-plain" style="${btnStyle("transparent")}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        Plain Text
      </button>
      ${divider}
      <button id="__lasso-btn-cancel" style="${btnStyle("transparent", true)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    // Ensure toolbar is clickable and on top
    floatingToolbar.style.pointerEvents = "auto";

    // Append to body instead of documentElement for better compatibility
    document.body.appendChild(floatingToolbar);

    // Add event listeners - first button uses the format from settings
    if (format === "markdown") {
      document
        .getElementById("__lasso-btn-md")
        .addEventListener("click", () => copyContent("markdown"));
    } else if (format === "text") {
      document
        .getElementById("__lasso-btn-text")
        .addEventListener("click", () => copyContent("text"));
    } else if (format === "cleanHTML") {
      document
        .getElementById("__lasso-btn-clean")
        .addEventListener("click", () => copyContent("cleanHTML"));
    } else {
      document
        .getElementById("__lasso-btn-html")
        .addEventListener("click", () => copyContent("html"));
    }
    document
      .getElementById("__lasso-btn-plain")
      .addEventListener("click", () => copyContent("text"));
    document
      .getElementById("__lasso-btn-cancel")
      .addEventListener("click", deactivate);
  }

  function btnStyle(bg, small = false) {
    return `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: ${bg === "transparent" ? "rgba(255,255,255,0.05)" : bg};
      color: ${bg === "transparent" ? "#c7d2fe" : "#fff"};
      border: 1px solid ${bg === "transparent" ? "rgba(255,255,255,0.1)" : "transparent"};
      border-radius: 8px;
      padding: ${small ? "6px" : "6px 12px"};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: all 0.15s;
      letter-spacing: 0.01em;
    `;
  }

  function removeFloatingToolbar() {
    if (floatingToolbar) {
      floatingToolbar.remove();
      floatingToolbar = null;
    }
  }

  // ─────────────────────────────────────────
  // CONTENT SERIALIZATION
  // ─────────────────────────────────────────
  function serializeHTML() {
    const container = document.createElement("div");

    for (const el of state.selectedElements) {
      const clone = el.cloneNode(true);

      // Clean extension artifacts from clone
      clone
        .querySelectorAll(
          "#__lasso-overlay, #__lasso-highlights, #__lasso-toolbar, #__lasso-banner, #__lasso-toast",
        )
        .forEach((n) => n.remove());

      // Inline critical computed styles for key elements
      inlineEssentialStyles(el, clone);

      container.appendChild(clone);
      container.appendChild(document.createTextNode("\n"));
    }

    return container.innerHTML;
  }

  function inlineEssentialStyles(original, clone) {
    const origChildren = original.querySelectorAll("*");
    const cloneChildren = clone.querySelectorAll("*");

    const STYLE_PROPS = [
      "fontWeight",
      "fontStyle",
      "textDecoration",
      "color",
      "backgroundColor",
      "fontSize",
      "fontFamily",
      "textAlign",
      "verticalAlign",
      "display",
    ];

    for (
      let i = 0;
      i < Math.min(origChildren.length, cloneChildren.length);
      i++
    ) {
      const origEl = origChildren[i];
      const cloneEl = cloneChildren[i];

      if (SKIP_TAGS.has(origEl.tagName)) continue;

      try {
        const computed = window.getComputedStyle(origEl);
        const styles = [];

        for (const prop of STYLE_PROPS) {
          const val = computed[prop];
          if (val && val !== "none" && val !== "normal" && val !== "auto") {
            const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
            styles.push(`${cssProp}:${val}`);
          }
        }

        if (styles.length > 0) {
          const existing = cloneEl.getAttribute("style") || "";
          cloneEl.setAttribute(
            "style",
            existing + (existing ? ";" : "") + styles.join(";"),
          );
        }
      } catch (e) {
        // Skip if getComputedStyle fails
      }
    }
  }

  function serializePlainText() {
    const parts = [];
    for (const el of state.selectedElements) {
      const text = convertToPlainText(el);
      if (text.trim()) parts.push(text.trim());
    }
    return parts.join("\n\n");
  }

  // Convert element to plain text with proper formatting
  function convertToPlainText(el) {
    if (!el) return "";

    const tagName = el.tagName ? el.tagName.toLowerCase() : "";

    console.log("[Lasso Debug] convertToPlainText for tag:", tagName);

    if (tagName === "ul" || tagName === "ol") {
      return convertListToPlainText(el);
    } else if (tagName === "table") {
      return convertTableToPlainText(el);
    } else if (tagName === "a") {
      const href = el.getAttribute("href") || "";
      const text = (el.textContent || "").trim();
      return text + (href ? ` (${href})` : "");
    } else if (tagName === "img") {
      const alt = el.getAttribute("alt");
      return alt ? `[Image: ${alt}]` : "";
    } else if (tagName === "figure") {
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption");
      let text = "";
      if (img) {
        const alt = img.getAttribute("alt");
        text = alt ? `[Image: ${alt}]` : "";
      }
      if (caption) {
        text += (text ? "\n" : "") + caption.textContent;
      }
      return text;
    }

    // For other elements, process inline links
    let result = "";
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    let node;
    while ((node = walker.nextNode())) {
      let text = node.textContent;
      const parent = node.parentElement;
      if (parent && parent.tagName && parent.tagName.toLowerCase() === "a") {
        const href = parent.getAttribute("href") || "";
        const linkText = text.trim();
        if (linkText && href) {
          text = linkText + ` (${href})`;
        }
      }
      result += text;
    }
    return result.trim();
  }

  function convertListToPlainText(listEl) {
    const items = listEl.querySelectorAll(":scope > li");
    if (items.length === 0) return "";

    const lines = [];
    items.forEach((item) => {
      let text = item.textContent.trim();
      // Handle nested lists
      const nestedUl = item.querySelector(":scope > ul");
      const nestedOl = item.querySelector(":scope > ol");
      if (nestedUl || nestedOl) {
        // Remove nested list content from parent item text
        const nestedContent = (nestedUl || nestedOl).textContent;
        text = text.replace(nestedContent, "").trim();
      }
      lines.push("* " + text);
    });
    return lines.join("\n");
  }

  function convertTableToPlainText(table) {
    const rows = table.querySelectorAll("tr");
    if (rows.length === 0) return "";

    const lines = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll("th, td");
      const cellTexts = Array.from(cells).map((cell) =>
        cell.textContent.trim(),
      );
      lines.push(cellTexts.join(" | "));
    });
    return lines.join("\n");
  }

  function serializeMarkdown() {
    const parts = [];
    for (const el of state.selectedElements) {
      let markdown = htmlToMarkdown(el);
      if (markdown.trim()) parts.push(markdown.trim());
    }
    return parts.join("\n\n");
  }

  // Simple HTML to Markdown converter - preserves inline formatting
  function htmlToMarkdown(element) {
    if (!element) return "";

    // Clone to avoid modifying original
    const clone = element.cloneNode(true);

    // First process code blocks (pre > code)
    const preBlocks = clone.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      const code = pre.querySelector("code");
      const text = code ? code.textContent : pre.textContent;
      pre.outerHTML = "```\n" + text.trim() + "\n```";
    });

    // Inline code - process before other inline elements
    const codeElements = clone.querySelectorAll("code");
    codeElements.forEach((code) => {
      if (!code.closest("pre")) {
        code.outerHTML = "`" + code.textContent + "`";
      }
    });

    // Headers
    const h1s = clone.querySelectorAll("h1");
    h1s.forEach((h) => (h.outerHTML = "# " + h.textContent + "\n"));

    const h2s = clone.querySelectorAll("h2");
    h2s.forEach((h) => (h.outerHTML = "## " + h.textContent + "\n"));

    const h3s = clone.querySelectorAll("h3");
    h3s.forEach((h) => (h.outerHTML = "### " + h.textContent + "\n"));

    const h4s = clone.querySelectorAll("h4");
    h4s.forEach((h) => (h.outerHTML = "#### " + h.textContent + "\n"));

    const h5s = clone.querySelectorAll("h5");
    h5s.forEach((h) => (h.outerHTML = "##### " + h.textContent + "\n"));

    const h6s = clone.querySelectorAll("h6");
    h6s.forEach((h) => (h.outerHTML = "###### " + h.textContent + "\n"));

    // Lists - process ordered first, then unordered
    const ols = clone.querySelectorAll("ol");
    ols.forEach((ol) => {
      const items = ol.querySelectorAll("li");
      let md = "";
      items.forEach((li, idx) => {
        md += idx + 1 + ". " + li.textContent + "\n";
      });
      ol.outerHTML = md;
    });

    const uls = clone.querySelectorAll("ul");
    uls.forEach((ul) => {
      const items = ul.querySelectorAll("li");
      let md = "";
      items.forEach((li) => {
        md += "- " + li.textContent + "\n";
      });
      ul.outerHTML = md;
    });

    // Blockquotes
    const blockquotes = clone.querySelectorAll("blockquote");
    blockquotes.forEach((bq) => {
      bq.outerHTML = "> " + bq.textContent;
    });

    // Horizontal rules
    const hrs = clone.querySelectorAll("hr");
    hrs.forEach((hr) => (hr.outerHTML = "---\n"));

    // Line breaks - convert br to newline
    const brs = clone.querySelectorAll("br");
    brs.forEach((br) => (br.outerHTML = "\n"));

    // Tables - basic support
    const tables = clone.querySelectorAll("table");
    tables.forEach((table) => {
      let md = "";
      const rows = table.querySelectorAll("tr");
      rows.forEach((tr, trIdx) => {
        const cells = tr.querySelectorAll("td, th");
        const cellTexts = Array.from(cells).map((c) => c.textContent.trim());
        md += "| " + cellTexts.join(" | ") + " |\n";
        // Add header separator after first row
        if (trIdx === 0) {
          md += "| " + cellTexts.map(() => "---").join(" | ") + " |\n";
        }
      });
      table.outerHTML = md;
    });

    // Images
    const imgs = clone.querySelectorAll("img");
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      img.outerHTML = "![" + alt + "](" + src + ")";
    });

    // For paragraphs, divs, spans, etc. - process inline formatting
    const containerTags = ["p", "div", "span", "td", "th", "li", "blockquote"];
    containerTags.forEach((tag) => {
      const elements = clone.querySelectorAll(tag);
      elements.forEach((el) => {
        el.outerHTML = processInlineFormatting(el);
      });
    });

    // Clean up extra whitespace but preserve newlines
    let result = clone.textContent;
    result = result.replace(/\n{3,}/g, "\n\n"); // Max 2 newlines

    return result.trim();
  }

  // Process inline formatting (bold, italic, links) while preserving text
  function processInlineFormatting(el) {
    let result = "";
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    let node;

    while ((node = walker.nextNode())) {
      let text = node.textContent;
      const parent = node.parentElement;

      if (parent) {
        const tag = parent.tagName.toLowerCase();
        switch (tag) {
          case "strong":
          case "b":
            text = "**" + text + "**";
            break;
          case "em":
          case "i":
            text = "*" + text + "*";
            break;
          case "a":
            const href = parent.getAttribute("href") || "";
            text = "[" + text + "](" + href + ")";
            break;
          case "code":
            if (!parent.closest("pre")) {
              text = "`" + text + "`";
            }
            break;
          case "u":
            text = "_" + text + "_";
            break;
        }
      }
      result += text;
    }
    return result;
  }

  // ─────────────────────────────────────────
  // CLIPBOARD
  // ─────────────────────────────────────────
  async function copyContent(format) {
    console.log("[Lasso Debug] copyContent called with format:", format);
    console.log(
      "[Lasso Debug] selectedElements:",
      state.selectedElements?.length,
    );
    
    // Debug: Log what's in selectedElements
    if (state.selectedElements && state.selectedElements.length > 0) {
      console.log("[Lasso Debug] First selected element:", state.selectedElements[0]);
      console.log("[Lasso Debug] First element tag:", state.selectedElements[0]?.tagName);
    }

    try {
      if (format === "html") {
        const html = serializeHTML();
        const text = serializePlainText();
        await writeToClipboard(html, text);
      } else if (format === "markdown") {
        const markdown = serializeMarkdown();
        console.log(
          "[Lasso Debug] serializeMarkdown result (first 200 chars):",
          markdown?.substring(0, 200),
        );
        await navigator.clipboard.writeText(markdown);
      } else {
        const text = serializePlainText();
        await navigator.clipboard.writeText(text);
      }

      // Notify background
      chrome.runtime.sendMessage({ action: "copySuccess" });

      // Visual feedback
      flashHighlights();
      let toastMsg = "Done!  Copied to clipboard";
      if (format === "html") toastMsg = "Done!  HTML copied to clipboard";
      else if (format === "markdown")
        toastMsg = "Done!  Markdown copied to clipboard";
      else toastMsg = "Done!  Text copied to clipboard";

      showToast(toastMsg, "success");

      setTimeout(deactivate, 1200);
    } catch (err) {
      console.error("Lasso Copy error:", err);
      // Fallback: execCommand
      try {
        let text = serializePlainText();
        if (format === "markdown") {
          text = serializeMarkdown();
        }
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        showToast("Done!  Copied (text fallback)", "success");
        setTimeout(deactivate, 1200);
      } catch (fallbackErr) {
        showToast("X Copy failed — check permissions", "error");
      }
    }
  }

  async function writeToClipboard(html, plainText) {
    // Ensure we have valid HTML
    if (!html || html.trim() === "") {
      console.warn("[Lasso] No HTML content to write");
      await navigator.clipboard.writeText(plainText || "");
      return;
    }
    
    // Ensure plainText fallback exists
    if (!plainText) {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      plainText = temp.textContent || temp.innerText || "";
      // Handle HTML entities that might not be decoded by textContent
      plainText = plainText.replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
    
    // Try Clipboard API with proper formatting
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        // Use plain text/html without extra wrapping - simpler and more compatible
        const htmlBlob = new Blob([html], { type: "text/html" });
        const textBlob = new Blob([plainText], { type: "text/plain" });
        
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob
          })
        ]);
        console.log("[Lasso] HTML clipboard write succeeded");
        return;
      } catch (htmlError) {
        console.warn("[Lasso] HTML clipboard failed:", htmlError.message);
        
        // Try writing formats separately (Safari/older browser fix)
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "text/html": htmlBlob })
          ]);
          await navigator.clipboard.write([
            new ClipboardItem({ "text/plain": textBlob })
          ]);
          console.log("[Lasso] Separate format writes succeeded");
          return;
        } catch (separateError) {
          console.warn("[Lasso] Separate writes also failed:", separateError.message);
        }
      }
    }
    
    // Fallback: try plain text only
    try {
      await navigator.clipboard.writeText(plainText);
      console.log("[Lasso] Fallback to plain text succeeded");
    } catch (textError) {
      // Final fallback: textarea method
      console.warn("[Lasso] writeText failed, trying textarea fallback:", textError);
      try {
        const ta = document.createElement("textarea");
        ta.value = plainText;
        ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        console.log("[Lasso] Textarea fallback succeeded");
      } catch (fallbackErr) {
        console.error("[Lasso] All clipboard methods failed:", fallbackErr);
      }
    }
  }

  function flashHighlights() {
    if (!highlightLayer) return;
    const highlights = highlightLayer.querySelectorAll("div");
    highlights.forEach((h) => {
      h.style.background = "rgba(16, 185, 129, 0.25)";
      h.style.borderColor = "rgba(16, 185, 129, 0.8)";
    });
  }

  // ─────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────
  function showToast(message, type = "info") {
    const existing = document.getElementById("__lasso-toast");
    if (existing) existing.remove();

    const colors = {
      success: { bg: "#065f46", border: "#10b981", text: "#d1fae5" },
      warning: { bg: "#78350f", border: "#f59e0b", text: "#fef3c7" },
      error: { bg: "#7f1d1d", border: "#ef4444", text: "#fee2e2" },
      info: { bg: "#1e1b4b", border: "#6366f1", text: "#e0e7ff" },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.id = "__lasso-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${c.bg};
      color: ${c.text};
      border: 1px solid ${c.border};
      padding: 10px 20px;
      border-radius: 100px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 600;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: __lasso-fadein 0.2s ease;
      white-space: nowrap;
    `;
    toast.textContent = message;
    document.documentElement.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "__lasso-fadeout 0.3s ease forwards";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ─────────────────────────────────────────
  // MESSAGE LISTENER
  // ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startLasso") {
      // Update state with mode and format from popup
      if (message.mode) {
        state.settings.mode = message.mode;
      }
      if (message.format) {
        state.settings.copyFormat = message.format;
      }
      activate();
      sendResponse({ success: true });
    }
    if (message.action === "stopLasso") {
      deactivate();
      sendResponse({ success: true });
    }
    return true;
  });
})();
