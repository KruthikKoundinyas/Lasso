// extension/content/ui/highlights.js - Element highlighting for Lasso Copy

import { state } from "../state.js";
import { hexToRgba } from "../utils/color.js";

const HIGHLIGHT_CLASS = "__lasso-highlight";

/**
 * Create the highlight layer container
 * @returns {HTMLDivElement} The highlight layer
 */
export function createHighlightLayer() {
  const layer = document.createElement("div");
  layer.id = "__lasso-highlight-layer";
  layer.className = "__lasso-highlight-layer";

  document.body.appendChild(layer);
  return layer;
}

/**
 * Remove the highlight layer
 */
export function removeHighlightLayer() {
  if (state.elements.highlightLayer) {
    state.elements.highlightLayer.remove();
    state.elements.highlightLayer = null;
  }
}

/**
 * Render highlights on selected elements
 * @param {Element[]} elements - Elements to highlight
 */
export function renderHighlights(elements) {
  // Create or get highlight layer
  if (!state.elements.highlightLayer) {
    state.elements.highlightLayer = createHighlightLayer();
  }

  const layer = state.elements.highlightLayer;

  // Clear existing highlights
  layer.innerHTML = "";

  if (!elements || elements.length === 0) return;

  const settings = state.settings;
  const bgColor = hexToRgba(
    settings.highlightColor,
    settings.highlightOpacity || 0.3,
  );
  const borderColor = settings.borderColor || settings.highlightColor;
  const borderWidth = settings.borderWidth || 2;

  elements.forEach((el) => {
    const highlight = createHighlight(el, bgColor, borderColor, borderWidth);
    if (highlight) {
      layer.appendChild(highlight);
    }
  });
}

/**
 * Create a highlight overlay for an element
 * @param {Element} el - Element to highlight
 * @param {string} bgColor - Background color
 * @param {string} borderColor - Border color
 * @param {number} borderWidth - Border width
 * @returns {HTMLDivElement|null} Highlight element
 */
function createHighlight(el, bgColor, borderColor, borderWidth) {
  try {
    const rect = el.getBoundingClientRect();

    // Skip elements with no dimensions
    if (rect.width < 1 || rect.height < 1) return null;

    const highlight = document.createElement("div");
    highlight.className = HIGHLIGHT_CLASS;
    highlight.style.left = `${rect.left + window.scrollX}px`;
    highlight.style.top = `${rect.top + window.scrollY}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.backgroundColor = bgColor;
    highlight.style.border = `${borderWidth}px solid ${borderColor}`;

    return highlight;
  } catch (e) {
    return null;
  }
}

/**
 * Clear all highlights
 */
export function clearHighlights() {
  if (state.elements.highlightLayer) {
    state.elements.highlightLayer.innerHTML = "";
  }
}

/**
 * Update highlight positions (useful after scroll)
 * @param {Element[]} elements - Elements to re-highlight
 */
export function updateHighlightPositions(elements) {
  renderHighlights(elements);
}
