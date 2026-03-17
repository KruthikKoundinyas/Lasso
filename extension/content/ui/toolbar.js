// extension/content/ui/toolbar.js - Floating toolbar for Lasso Copy

import { state } from "../state.js";
import {
  serializeHTML,
  serializePlainText,
  serializeMarkdown,
} from "../serializer.js";
import { writeHTML, writeText, writeMarkdown } from "../clipboard.js";
import { showToast } from "./toast.js";
import { clearHighlights } from "./highlights.js";

const TOOLBAR_ID = "__lasso-toolbar";

/**
 * Show the floating toolbar with copy options
 * @param {Element[]} selectedElements - Elements selected by lasso
 */
export function showToolbar(selectedElements) {
  // Use state.selectedElements if not provided
  const elements = selectedElements || state.selectedElements;

  console.log("[Lasso Debug] showToolbar called, elements:", elements?.length);

  if (!elements || elements.length === 0) {
    console.log("[Lasso Debug] No elements to copy!");
    return;
  }

  // Remove existing toolbar if present
  removeToolbar();

  const toolbar = createToolbar(elements);

  // Position toolbar near the selection
  const bounds = getSelectionBounds(elements);
  if (bounds) {
    positionToolbar(toolbar, bounds);
  }

  document.body.appendChild(toolbar);
  state.elements.floatingToolbar = toolbar;

  // Add animation class after render
  requestAnimationFrame(() => {
    toolbar.classList.add("__lasso-toolbar-visible");
  });
}

/**
 * Remove the floating toolbar
 */
export function removeToolbar() {
  if (state.elements.floatingToolbar) {
    state.elements.floatingToolbar.remove();
    state.elements.floatingToolbar = null;
  }
}

/**
 * Create the toolbar element
 * @param {Element[]} elements - Selected elements
 * @returns {HTMLDivElement} Toolbar element
 */
function createToolbar(elements) {
  const toolbar = document.createElement("div");
  toolbar.id = TOOLBAR_ID;
  toolbar.className = "__lasso-toolbar";

  // Create buttons
  const buttonData = [
    {
      label: "Copy HTML",
      onClick: () => handleCopy(elements, "html"),
      className: "__lasso-btn-action",
    },
    {
      label: "Copy Markdown",
      onClick: () => handleCopy(elements, "markdown"),
      className: "__lasso-btn-action",
    },
    {
      label: "Copy Text",
      onClick: () => handleCopy(elements, "text"),
      className: "__lasso-btn-action",
    },
    {
      label: "✕",
      title: "Cancel",
      onClick: handleCancel,
      className: "__lasso-btn-cancel",
    },
  ];

  buttonData.forEach((data) => {
    const button = createToolbarButton(data);
    toolbar.appendChild(button);
  });

  return toolbar;
}

/**
 * Create a toolbar button
 * @param {Object} data - Button data
 * @returns {HTMLButtonElement} Button element
 */
function createToolbarButton({ label, title, onClick, className }) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = title || label;
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

/**
 * Position the toolbar relative to selection bounds
 * @param {HTMLDivElement} toolbar - Toolbar element
 * @param {Object} bounds - Selection bounds
 */
function positionToolbar(toolbar, bounds) {
  // Position below the selection, centered horizontally
  let left = bounds.left + bounds.width / 2;
  let top = bounds.bottom + 12;

  // Adjust if toolbar would go off screen
  const toolbarRect = toolbar.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Keep toolbar within horizontal bounds
  if (left - toolbarRect.width / 2 < 10) {
    left = toolbarRect.width / 2 + 10;
  } else if (left + toolbarRect.width / 2 > viewportWidth - 10) {
    left = viewportWidth - toolbarRect.width / 2 - 10;
  }

  // If toolbar would go below viewport, show above selection
  if (top + 40 > viewportHeight) {
    top = bounds.top - 12;
  }

  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
}

/**
 * Get the bounding box of selected elements
 * @param {Element[]} elements - Selected elements
 * @returns {Object|null} Bounds object
 */
function getSelectionBounds(elements) {
  if (!elements || elements.length === 0) return null;

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  elements.forEach((el) => {
    try {
      const rect = el.getBoundingClientRect();
      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    } catch (e) {
      // Element might be detached
    }
  });

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

/**
 * Handle copy action
 * @param {Element[]} elements - Elements to copy
 * @param {string} format - Format type: 'html', 'markdown', 'text'
 */
async function handleCopy(elements, format) {
  // DEBUG: Log what we received
  console.log("[Lasso Debug] handleCopy called:", {
    elementsCount: elements?.length,
    format,
    firstElement: elements?.[0]?.tagName,
  });

  try {
    let content;

    switch (format) {
      case "html":
        content = serializeHTML(elements);
        console.log(
          "[Lasso Debug] serializeHTML result:",
          content?.substring(0, 100),
        );
        await writeHTML(content);
        showToast("Copied as HTML");
        break;

      case "markdown":
        content = serializeMarkdown(elements);
        console.log(
          "[Lasso Debug] serializeMarkdown result:",
          content?.substring(0, 100),
        );
        await writeMarkdown(content);
        showToast("Copied as Markdown");
        break;

      case "text":
        content = serializePlainText(elements);
        console.log(
          "[Lasso Debug] serializePlainText result:",
          content?.substring(0, 100),
        );
        await writeText(content);
        showToast("Copied as Plain Text");
        break;
    }

    console.log("[Lasso Debug] Copy completed successfully");

    // Notify background script
    try {
      chrome.runtime.sendMessage({ action: "copySuccess" });
    } catch (e) {
      // Background might not be available
    }

    // Clean up UI
    removeToolbar();
    clearHighlights();

    // Deactivate lasso
    state.active = false;
    state.dragging = false;
  } catch (error) {
    console.error("Copy failed:", error);
    showToast("Copy failed: " + error.message);
  }
}

/**
 * Handle cancel action
 */
function handleCancel() {
  removeToolbar();
  clearHighlights();
  state.active = false;
  state.dragging = false;
  state.selectedElements = [];
}
