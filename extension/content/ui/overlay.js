// extension/content/ui/overlay.js - Lasso selection overlay for Lasso Copy

import { state } from "../state.js";
import { hexToRgba } from "../utils/color.js";

/**
 * Create the overlay container that captures mouse events
 */
export function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "__lasso-overlay";
  overlay.className = "__lasso-overlay";

  // Create SVG element for freeform path
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "__lasso-svg";
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.className = "__lasso-svg";

  // Create path element
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.id = "__lasso-path";
  path.setAttribute("fill", hexToRgba(state.settings.highlightColor, 0.15));
  path.setAttribute(
    "stroke",
    state.settings.borderColor || state.settings.highlightColor,
  );
  path.setAttribute("stroke-width", state.settings.borderWidth || 2);
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");

  svg.appendChild(path);
  overlay.appendChild(svg);

  document.body.appendChild(overlay);

  state.elements.overlay = overlay;
  state.elements.lassoPath = path;
  state.elements.lassoSvg = svg;

  return overlay;
}

/**
 * Remove the overlay and lasso elements
 */
export function removeOverlay() {
  if (state.elements.overlay) {
    state.elements.overlay.remove();
    state.elements.overlay = null;
    state.elements.lassoPath = null;
    state.elements.lassoSvg = null;
  }
}

/**
 * Update the lasso path display with current path points
 */
export function updateLassoPath() {
  if (!state.elements.lassoPath) return;

  const points = state.pathPoints;

  if (points.length < 2) {
    state.elements.lassoPath.setAttribute("d", "");
    return;
  }

  // Build SVG path string
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  // Close the path back to start
  if (points.length > 2) {
    d += " Z";
  }

  state.elements.lassoPath.setAttribute("d", d);
}

/**
 * Hide the lasso path
 */
export function hideLassoRect() {
  if (state.elements.lassoPath) {
    state.elements.lassoPath.setAttribute("d", "");
  }
}

/**
 * Show the lasso path (after closing)
 */
export function showLassoPath() {
  updateLassoPath();
}

/**
 * Get the bounding box of the current path
 */
export function getPathBoundingBox() {
  const points = state.pathPoints;

  if (points.length === 0) {
    return null;
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
    width: maxX - minX,
    height: maxY - minY,
  };
}
