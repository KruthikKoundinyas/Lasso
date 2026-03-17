// extension/content/lasso-rect.js - Rectangle Lasso for Lasso Copy
// Standalone content script for rectangular selection mode

(function () {
  "use strict";

  // =====================
  // STATE
  // =====================
  var state = {
    active: false,
    dragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    pathPoints: [],
    selectedElements: [],
    candidates: [],
    selectionMode: "rectangle",
    hasActiveSelection: false,
    settings: {
      highlightColor: "#db5266",
      highlightOpacity: 0.3,
      borderColor: "#db5266",
      borderWidth: 2,
      copyFormat: "html",
    },
    elements: {},
  };

  // Store state globally for debugging
  window.__lassoState = state;

  // =====================
  // UTILITIES
  // =====================
  var CANDIDATE_SELECTOR =
    "p,h1,h2,h3,h4,h5,h6,table,thead,tbody,tr,th,td,ul,ol,li,img,figure,figcaption,blockquote,pre,code,section,article,aside,header,footer,main,div,span,a";

  function getCandidateElements() {
    return Array.from(document.querySelectorAll(CANDIDATE_SELECTOR));
  }

  function isVisibleElement(el) {
    var style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
    var rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return false;
    }
    return true;
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace(/^#/, "");
    var r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return hex;
    }
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  // =====================
  // RECTANGLE DETECTION
  // =====================
  function getRectangleBounds(startX, startY, currentX, currentY) {
    return {
      left: Math.min(startX, currentX),
      top: Math.min(startY, currentY),
      right: Math.max(startX, currentX),
      bottom: Math.max(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };
  }

  function rectIntersect(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  function detectElements() {
    var bounds = getRectangleBounds(
      state.startX,
      state.startY,
      state.currentX,
      state.currentY,
    );

    if (bounds.width < 5 || bounds.height < 5) {
      state.selectedElements = [];
      return [];
    }

    var candidates =
      state.candidates.length > 0 ? state.candidates : getCandidateElements();

    var found = [];
    var seen = {};

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (seen[el]) continue;

      try {
        var rect = el.getBoundingClientRect();
        if (rectIntersect(bounds, rect)) {
          found.push(el);
          seen[el] = true;
        }
      } catch (e) {
        // Element might be detached
      }
    }

    state.selectedElements = sortByDOMOrder(found);
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

  // =====================
  // CLIPBOARD
  // =====================
  function serializeHTML(elements) {
    var html = "";
    for (var i = 0; i < elements.length; i++) {
      html += elements[i].outerHTML;
    }
    return html;
  }

  function serializePlainText(elements) {
    var text = "";
    for (var i = 0; i < elements.length; i++) {
      text += elements[i].innerText + "\n";
    }
    return text.trim();
  }

  function serializeMarkdown(elements) {
    var md = "";
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var tag = el.tagName.toLowerCase();

      if (tag === "h1") {
        md += "# " + el.innerText + "\n\n";
      } else if (tag === "h2") {
        md += "## " + el.innerText + "\n\n";
      } else if (tag === "h3") {
        md += "### " + el.innerText + "\n\n";
      } else if (tag === "p") {
        md += el.innerText + "\n\n";
      } else if (tag === "li") {
        md += "- " + el.innerText + "\n";
      } else if (tag === "blockquote") {
        md += "> " + el.innerText + "\n\n";
      } else if (tag === "pre") {
        md += "```\n" + el.innerText + "\n```\n\n";
      } else {
        md += el.innerText + "\n";
      }
    }
    return md.trim();
  }

  async function writeHTML(html) {
    try {
      var blob = new Blob([html], { type: "text/html" });
      var textBlob = new Blob([html], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function writeText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function writeMarkdown(md) {
    return writeText(md);
  }

  // =====================
  // UI - OVERLAY
  // =====================
  function createOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "__lasso-overlay";
    overlay.style.cssText = [
      "position: fixed;",
      "top: 0;",
      "left: 0;",
      "width: 100vw;",
      "height: 100vh;",
      "z-index: 2147483645;",
      "cursor: crosshair;",
    ].join(" ");

    // SVG for path (hidden in rectangle mode but needed for structure)
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "__lasso-svg";
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = [
      "position: absolute;",
      "top: 0;",
      "left: 0;",
      "width: 100%;",
      "height: 100%;",
      "pointer-events: none;",
    ].join(" ");

    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = "__lasso-path";
    path.setAttribute("fill", hexToRgba(state.settings.highlightColor, 0.15));
    path.setAttribute(
      "stroke",
      state.settings.borderColor || state.settings.highlightColor,
    );
    path.setAttribute("stroke-width", state.settings.borderWidth || 2);
    svg.appendChild(path);

    // Div for rectangle mode
    var rect = document.createElement("div");
    rect.id = "__lasso-rect";
    rect.style.cssText = [
      "position: absolute;",
      "display: none;",
      "pointer-events: none;",
    ].join(" ");

    svg.appendChild(rect);
    overlay.appendChild(svg);
    document.body.appendChild(overlay);

    state.elements.overlay = overlay;
    state.elements.lassoPath = path;
    state.elements.lassoSvg = svg;
    state.elements.lassoRect = rect;

    return overlay;
  }

  function removeOverlay() {
    if (state.elements.overlay) {
      state.elements.overlay.remove();
      state.elements.overlay = null;
      state.elements.lassoPath = null;
      state.elements.lassoSvg = null;
      state.elements.lassoRect = null;
    }
  }

  function updateRectangle() {
    if (!state.elements.lassoRect) return;

    var bounds = getRectangleBounds(
      state.startX,
      state.startY,
      state.currentX,
      state.currentY,
    );

    if (bounds.width < 5 || bounds.height < 5) {
      state.elements.lassoRect.style.display = "none";
      return;
    }

    var bgColor = hexToRgba(state.settings.highlightColor, 0.15);
    var borderColor =
      state.settings.borderColor || state.settings.highlightColor;

    state.elements.lassoRect.style.cssText = [
      "display: block;",
      "left: " + bounds.left + "px;",
      "top: " + bounds.top + "px;",
      "width: " + bounds.width + "px;",
      "height: " + bounds.height + "px;",
      "background-color: " + bgColor + ";",
      "border: " +
        (state.settings.borderWidth || 2) +
        "px solid " +
        borderColor +
        ";",
      "border-radius: 4px;",
    ].join(" ");

    // Hide path
    if (state.elements.lassoPath) {
      state.elements.lassoPath.setAttribute("d", "");
    }
  }

  // =====================
  // UI - HIGHLIGHTS
  // =====================
  function createHighlightLayer() {
    var layer = document.createElement("div");
    layer.id = "__lasso-highlight-layer";
    layer.style.cssText = [
      "position: absolute;",
      "top: 0;",
      "left: 0;",
      "width: 100%;",
      "height: 100%;",
      "pointer-events: none;",
      "z-index: 2147483646;",
      "overflow: hidden;",
    ].join(" ");

    document.body.appendChild(layer);
    return layer;
  }

  function removeHighlightLayer() {
    if (state.elements.highlightLayer) {
      state.elements.highlightLayer.remove();
      state.elements.highlightLayer = null;
    }
  }

  function renderHighlights(elements) {
    if (!state.elements.highlightLayer) {
      state.elements.highlightLayer = createHighlightLayer();
    }

    var layer = state.elements.highlightLayer;
    layer.innerHTML = "";

    if (!elements || elements.length === 0) return;

    var bgColor = hexToRgba(
      state.settings.highlightColor,
      state.settings.highlightOpacity || 0.3,
    );
    var borderColor =
      state.settings.borderColor || state.settings.highlightColor;
    var borderWidth = state.settings.borderWidth || 2;

    for (var i = 0; i < elements.length; i++) {
      try {
        var el = elements[i];
        var rect = el.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) continue;

        var highlight = document.createElement("div");
        highlight.className = "__lasso-highlight";
        highlight.style.cssText = [
          "position: absolute;",
          "left: " + (rect.left + window.scrollX) + "px;",
          "top: " + (rect.top + window.scrollY) + "px;",
          "width: " + rect.width + "px;",
          "height: " + rect.height + "px;",
          "background-color: " + bgColor + ";",
          "border: " + borderWidth + "px solid " + borderColor + ";",
          "border-radius: 2px;",
          "box-sizing: border-box;",
          "pointer-events: none;",
        ].join(" ");

        layer.appendChild(highlight);
      } catch (e) {
        // Skip
      }
    }
  }

  function clearHighlights() {
    if (state.elements.highlightLayer) {
      state.elements.highlightLayer.innerHTML = "";
    }
  }

  // =====================
  // UI - TOAST
  // =====================
  var toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "__lasso-toast-container";
      toastContainer.style.cssText = [
        "position: fixed;",
        "bottom: 24px;",
        "left: 50%;",
        "transform: translateX(-50%);",
        "z-index: 2147483647;",
        "display: flex;",
        "flex-direction: column;",
        "gap: 8px;",
        "pointer-events: none;",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
      ].join(" ");

      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message) {
    var container = getToastContainer();

    var toast = document.createElement("div");
    toast.className = "__lasso-toast";

    var isSuccess =
      message.indexOf("Copied") === 0 || message.indexOf("OK") === 0;
    if (!isSuccess) {
      toast.classList.add("__lasso-toast-error");
    }

    // Background color using CSS variable fallback for standalone script
    var bgColor = isSuccess
      ? "var(--success, #10b981)"
      : "var(--danger, #ef4444)";

    toast.style.cssText = [
      "padding: 12px 20px;",
      "background: " + bgColor + ";",
      "color: white;",
      "border-radius: 8px;",
      "font-size: 14px;",
      "font-weight: 600;",
      "box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);",
      "opacity: 0;",
      "transform: translateY(12px);",
      "transition: all 0.25s ease-out;",
      "white-space: nowrap;",
    ].join(" ");

    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";

      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }, 2000);
  }

  // =====================
  // UI - TOOLBAR
  // =====================
  function showToolbar(selectedElements) {
    var elements = selectedElements || state.selectedElements;

    if (!elements || elements.length === 0) return;

    removeToolbar();

    var toolbar = createToolbar(elements);

    var bounds = getSelectionBounds(elements);
    if (bounds) {
      positionToolbar(toolbar, bounds);
    }

    document.body.appendChild(toolbar);
    state.elements.floatingToolbar = toolbar;

    requestAnimationFrame(function () {
      toolbar.classList.add("__lasso-toolbar-visible");
    });
  }

  function removeToolbar() {
    if (state.elements.floatingToolbar) {
      state.elements.floatingToolbar.remove();
      state.elements.floatingToolbar = null;
    }
  }

  function createToolbar(elements) {
    var toolbar = document.createElement("div");
    toolbar.id = "__lasso-toolbar";
    toolbar.className = "__lasso-toolbar";
    // Positioning and appearance - using CSS variable fallback for standalone script
    toolbar.style.cssText = [
      "position: absolute;",
      "display: flex;",
      "gap: 8px;",
      "padding: 8px 12px;",
      "background: var(--bg-soft, #1e223b);",
      "border: 1px solid var(--border, rgba(255,255,255,0.08));",
      "border-radius: 8px;",
      "box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);",
      "z-index: 2147483647;",
      "opacity: 0;",
      "transform: translateX(-50%) scale(0.95);",
      "transition: all 0.2s ease-out;",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
    ].join(" ");

    var buttonData = [
      { label: "Copy HTML", format: "html", className: "__lasso-btn-action" },
      { label: "Copy MD", format: "markdown", className: "__lasso-btn-action" },
      { label: "Copy Text", format: "text", className: "__lasso-btn-action" },
      {
        label: "✕",
        title: "Cancel",
        isCancel: true,
        className: "__lasso-btn-cancel",
      },
    ];

    for (var i = 0; i < buttonData.length; i++) {
      var data = buttonData[i];
      var button = createToolbarButton(data, elements);
      toolbar.appendChild(button);
    }

    return toolbar;
  }

  function createToolbarButton(data, elements) {
    var button = document.createElement("button");
    button.type = "button";
    button.title = data.title || data.label;
    button.className = data.className || "";

    // Background color using CSS variable fallback for standalone script
    var bgColor = data.isCancel
      ? "rgba(255, 255, 255, 0.08)"
      : "var(--primary, #db5266)";

    button.style.cssText = [
      "display: flex;",
      "align-items: center;",
      "gap: 6px;",
      "padding: 8px 14px;",
      "background: " + bgColor + ";",
      "color: white;",
      "border: none;",
      "border-radius: 6px;",
      "font-size: 13px;",
      "font-weight: 600;",
      "cursor: pointer;",
      "transition: all 0.15s ease;",
      "white-space: nowrap;",
      "font-family: inherit;",
    ].join(" ");

    button.textContent = data.label;

    if (data.isCancel) {
      button.addEventListener("click", handleCancel);
    } else {
      button.addEventListener(
        "click",
        (function (fmt) {
          return function () {
            handleCopy(elements, fmt);
          };
        })(data.format),
      );
    }

    return button;
  }

  function positionToolbar(toolbar, bounds) {
    var left = bounds.left + bounds.width / 2;
    var top = bounds.bottom + 12;

    var toolbarRect = toolbar.getBoundingClientRect();
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;

    if (left - toolbarRect.width / 2 < 10) {
      left = toolbarRect.width / 2 + 10;
    } else if (left + toolbarRect.width / 2 > viewportWidth - 10) {
      left = viewportWidth - toolbarRect.width / 2 - 10;
    }

    if (top + 40 > viewportHeight) {
      top = bounds.top - 12;
    }

    toolbar.style.left = left + "px";
    toolbar.style.top = top + "px";
  }

  function getSelectionBounds(elements) {
    if (!elements || elements.length === 0) return null;

    var minLeft = Infinity;
    var minTop = Infinity;
    var maxRight = -Infinity;
    var maxBottom = -Infinity;

    for (var i = 0; i < elements.length; i++) {
      try {
        var rect = elements[i].getBoundingClientRect();
        minLeft = Math.min(minLeft, rect.left);
        minTop = Math.min(minTop, rect.top);
        maxRight = Math.max(maxRight, rect.right);
        maxBottom = Math.max(maxBottom, rect.bottom);
      } catch (e) {
        // Skip
      }
    }

    if (minLeft === Infinity) return null;

    return {
      left: minLeft,
      top: minTop,
      right: maxRight,
      bottom: maxBottom,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
    };
  }

  async function handleCopy(elements, format) {
    try {
      var content = "";
      var success = false;

      switch (format) {
        case "html":
          content = serializeHTML(elements);
          success = await writeHTML(content);
          break;
        case "markdown":
          content = serializeMarkdown(elements);
          success = await writeMarkdown(content);
          break;
        case "text":
          content = serializePlainText(elements);
          success = await writeText(content);
          break;
      }

      if (success && content) {
        showToast("OK: Copied");
        try {
          chrome.runtime.sendMessage({ action: "copySuccess" });
        } catch (e) {}
      } else {
        showToast("Error: Copy failed");
      }

      removeToolbar();
      state.hasActiveSelection = true;
    } catch (error) {
      console.error("Copy failed:", error);
      showToast("Error: " + error.message);
    }
  }

  function handleCancel() {
    removeToolbar();
    clearHighlights();
    clearSelectionDisplay();
    state.active = false;
    state.dragging = false;
  }

  // =====================
  // COPY WITH CTRL+C
  // =====================
  function copySelection() {
    if (!state.hasActiveSelection || state.selectedElements.length === 0) {
      return false;
    }

    var format = state.settings.copyFormat || "html";
    var elements = state.selectedElements;

    var content = "";
    switch (format) {
      case "html":
        content = serializeHTML(elements);
        break;
      case "markdown":
        content = serializeMarkdown(elements);
        break;
      case "text":
        content = serializePlainText(elements);
        break;
    }

    if (!content) {
      showToast("Error: No content to copy");
      return false;
    }

    var copyFn =
      format === "html"
        ? writeHTML
        : format === "markdown"
          ? writeMarkdown
          : writeText;

    copyFn(content).then(function (success) {
      if (success) {
        showToast("OK: Copied");
        try {
          chrome.runtime.sendMessage({ action: "copySuccess" });
        } catch (e) {}
      } else {
        showToast("Error: Copy failed");
      }
    });

    return true;
  }

  // =====================
  // EVENT HANDLERS
  // =====================
  var mouseDownHandler = null;
  var mouseMoveHandler = null;
  var mouseUpHandler = null;
  var keyDownHandler = null;

  function addEventListeners() {
    mouseDownHandler = handleMouseDown;
    mouseMoveHandler = handleMouseMove;
    mouseUpHandler = handleMouseUp;
    keyDownHandler = handleKeyDown;

    document.addEventListener("mousedown", mouseDownHandler, { capture: true });
    document.addEventListener("mousemove", mouseMoveHandler, { passive: true });
    document.addEventListener("mouseup", mouseUpHandler, { passive: true });
    document.addEventListener("keydown", keyDownHandler, { capture: false });
    window.addEventListener("beforeunload", deactivateLasso);
  }

  function removeEventListeners() {
    if (mouseDownHandler) {
      document.removeEventListener("mousedown", mouseDownHandler, {
        capture: true,
      });
      mouseDownHandler = null;
    }
    if (mouseMoveHandler) {
      document.removeEventListener("mousemove", mouseMoveHandler, {
        passive: true,
      });
      mouseMoveHandler = null;
    }
    if (mouseUpHandler) {
      document.removeEventListener("mouseup", mouseUpHandler, {
        passive: true,
      });
      mouseUpHandler = null;
    }
    if (keyDownHandler) {
      document.removeEventListener("keydown", keyDownHandler, {
        capture: false,
      });
      keyDownHandler = null;
    }
    window.removeEventListener("beforeunload", deactivateLasso);
  }

  function clearSelectionDisplay() {
    state.pathPoints = [];
    state.selectedElements = [];
    state.hasActiveSelection = false;
    if (state.elements.lassoRect) {
      state.elements.lassoRect.style.display = "none";
    }
    if (state.elements.lassoPath) {
      state.elements.lassoPath.setAttribute("d", "");
    }
    if (state.elements.highlightLayer) {
      state.elements.highlightLayer.innerHTML = "";
    }
    if (state.elements.floatingToolbar) {
      state.elements.floatingToolbar.remove();
      state.elements.floatingToolbar = null;
    }
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;

    clearSelectionDisplay();

    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.currentX = e.clientX;
    state.currentY = e.clientY;
    state.hasActiveSelection = false;

    updateRectangle();
  }

  function handleMouseMove(e) {
    if (!state.dragging) return;

    state.currentX = e.clientX;
    state.currentY = e.clientY;

    updateRectangle();
    detectElements();
    renderHighlights(state.selectedElements);
  }

  function handleMouseUp() {
    if (!state.dragging) return;

    state.dragging = false;

    if (state.selectedElements.length > 0) {
      state.hasActiveSelection = true;
      showToolbar(state.selectedElements);
      showToast("Selected " + state.selectedElements.length + " elements");
    } else {
      if (state.elements.lassoRect) {
        state.elements.lassoRect.style.display = "none";
      }
      clearHighlights();
      showToast("No elements selected");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      deactivateLasso();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      var tag = e.target.tagName.toLowerCase();
      if (
        tag !== "input" &&
        tag !== "textarea" &&
        !e.target.isContentEditable
      ) {
        if (state.hasActiveSelection && state.selectedElements.length > 0) {
          e.preventDefault();
          copySelection();
        }
      }
    }
  }

  // =====================
  // BANNER
  // =====================
  function showInstructionBanner() {
    var banner = document.createElement("div");
    banner.id = "__lasso-banner";
    banner.style.cssText = [
      "position: fixed;",
      "top: 20px;",
      "left: 50%;",
      "transform: translateX(-50%);",
      "padding: 12px 16px;",
      "background: var(--bg-soft, #1e223b);",
      "color: white;",
      "border-radius: 8px;",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
      "font-size: 13px;",
      "box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);",
      "z-index: 2147483647;",
    ].join(" ");

    banner.textContent =
      "Rectangle Mode | Drag to select | Ctrl+C to copy | Esc to cancel";

    document.body.appendChild(banner);
    state.elements.instructionBanner = banner;
  }

  function removeInstructionBanner() {
    if (state.elements.instructionBanner) {
      state.elements.instructionBanner.remove();
      state.elements.instructionBanner = null;
    }
  }

  // =====================
  // ACTIVATE/DEACTIVATE
  // =====================
  function cacheCandidates() {
    var candidates = getCandidateElements();
    state.candidates = candidates.filter(isVisibleElement);
    return state.candidates;
  }

  function clearCandidates() {
    state.candidates = [];
  }

  function activateLasso() {
    console.log("activateLasso called, current state:", state.active);

    if (state.active) {
      clearSelectionDisplay();
    }

    state.active = true;
    state.dragging = false;
    state.hasActiveSelection = false;
    state.startX = 0;
    state.startY = 0;
    state.currentX = 0;
    state.currentY = 0;

    createOverlay();
    clearCandidates();
    cacheCandidates();
    addEventListeners();
    removeInstructionBanner();
    showInstructionBanner();

    console.log("Rectangle Lasso activated!");
  }

  function deactivateLasso() {
    if (!state.active) return;

    removeEventListeners();
    removeOverlay();
    removeToolbar();
    clearHighlights();
    removeHighlightLayer();
    if (toastContainer && toastContainer.parentNode) {
      toastContainer.parentNode.removeChild(toastContainer);
      toastContainer = null;
    }
    removeInstructionBanner();
    clearCandidates();
    clearSelectionDisplay();

    state.active = false;
    state.dragging = false;

    console.log("Rectangle Lasso deactivated");
  }

  // =====================
  // MESSAGE HANDLER
  // =====================
  function initMessageHandler() {
    chrome.runtime.onMessage.addListener(
      function (message, sender, sendResponse) {
        var handlers = {
          startLasso: function () {
            activateLasso();
            return { success: true, active: true };
          },
          stopLasso: function () {
            deactivateLasso();
            return { success: true, active: false };
          },
          getState: function () {
            return {
              success: true,
              active: state.active,
              dragging: state.dragging,
              selectedCount: state.selectedElements.length,
              selectionMode: state.selectionMode,
              hasSelection: state.hasActiveSelection,
            };
          },
          setFormat: function (msg) {
            if (msg.format) {
              state.settings.copyFormat = msg.format;
            }
            return { success: true, format: state.settings.copyFormat };
          },
        };

        var handler = handlers[message.action];
        if (handler) {
          return handler(message);
        }
        return false;
      },
    );
  }

  // =====================
  // INITIALIZATION
  // =====================
  function initialize() {
    try {
      // Load settings
      try {
        chrome.storage.local.get("settings", function (result) {
          if (result.settings) {
            Object.assign(state.settings, result.settings);
          }
        });
      } catch (e) {}

      initMessageHandler();
      console.log("Rectangle Lasso content script initialized");
    } catch (error) {
      console.error("Failed to initialize Rectangle Lasso:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  // Expose for debugging
  window.__lassoRect = {
    activate: activateLasso,
    deactivate: deactivateLasso,
    getState: function () {
      return state;
    },
  };
})();
