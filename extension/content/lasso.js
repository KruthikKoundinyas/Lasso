// extension/content/lasso.js - Lasso selection logic for Lasso Copy

import { state, resetState } from "./state.js";
import {
  createOverlay,
  removeOverlay,
  updateLassoPath,
  hideLassoRect,
} from "./ui/overlay.js";
import {
  renderHighlights,
  clearHighlights,
  removeHighlightLayer,
} from "./ui/highlights.js";
import { showToolbar, removeToolbar } from "./ui/toolbar.js";
import { removeToastContainer } from "./ui/toast.js";
import {
  cacheCandidates,
  clearCandidates,
  detectElements,
} from "./detector.js";

let mouseDownHandler = null;
let mouseMoveHandler = null;
let mouseUpHandler = null;
let keyDownHandler = null;

/**
 * Minimum distance between path points to add a new point (pixels)
 */
const PATH_SAMPLE_DISTANCE = 8;

/**
 * Activate lasso mode
 */
export function activateLasso() {
  if (state.active) return;

  state.active = true;
  state.dragging = false;
  state.selectedElements = [];
  state.pathPoints = [];

  createOverlay();
  cacheCandidates();
  addEventListeners();
  showInstructionBanner();

  console.log("Lasso mode activated");
}

/**
 * Deactivate lasso mode
 */
export function deactivateLasso() {
  if (!state.active) return;

  removeEventListeners();
  removeOverlay();
  removeToolbar();
  clearHighlights();
  removeHighlightLayer();
  removeToastContainer();
  removeInstructionBanner();
  clearCandidates();
  resetState();

  console.log("Lasso mode deactivated");
}

/**
 * Add event listeners for lasso interaction
 */
function addEventListeners() {
  mouseDownHandler = handleMouseDown;
  mouseMoveHandler = handleMouseMove;
  mouseUpHandler = handleMouseUp;
  keyDownHandler = handleKeyDown;

  document.addEventListener("mousedown", mouseDownHandler, { capture: true });
  document.addEventListener("mousemove", mouseMoveHandler, { passive: true });
  document.addEventListener("mouseup", mouseUpHandler, { passive: true });
  document.addEventListener("keydown", keyDownHandler, { passive: true });
  window.addEventListener("beforeunload", deactivateLasso);
}

/**
 * Remove event listeners
 */
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
    document.removeEventListener("mouseup", mouseUpHandler, { passive: true });
    mouseUpHandler = null;
  }

  if (keyDownHandler) {
    document.removeEventListener("keydown", keyDownHandler, { passive: true });
    keyDownHandler = null;
  }

  window.removeEventListener("beforeunload", deactivateLasso);
}

/**
 * Handle mouse down event
 */
function handleMouseDown(e) {
  if (e.button !== 0) return;
  e.preventDefault();

  state.dragging = true;
  state.pathPoints = [{ x: e.clientX, y: e.clientY }];

  removeInstructionBanner();
  updateLassoPath();
}

/**
 * Handle mouse move event
 */
function handleMouseMove(e) {
  if (!state.dragging) return;

  const lastPoint = state.pathPoints[state.pathPoints.length - 1];
  const newPoint = { x: e.clientX, y: e.clientY };

  // Sample points at regular intervals for performance
  const distance = Math.sqrt(
    Math.pow(newPoint.x - lastPoint.x, 2) +
      Math.pow(newPoint.y - lastPoint.y, 2),
  );

  if (distance >= PATH_SAMPLE_DISTANCE) {
    state.pathPoints.push(newPoint);
    updateLassoPath();
    detectElements();
    renderHighlights(state.selectedElements);
  }
}

/**
 * Handle mouse up event
 */
function handleMouseUp() {
  if (!state.dragging) return;

  state.dragging = false;

  console.log("[Lasso Debug] handleMouseUp:", {
    pathPoints: state.pathPoints.length,
    selectedElements: state.selectedElements?.length,
  });

  // Need at least 3 points to form a closed polygon
  if (state.pathPoints.length >= 3 && state.selectedElements.length > 0) {
    console.log("[Lasso Debug] Showing toolbar with elements");
    showToolbar(state.selectedElements);
  } else {
    console.log("[Lasso Debug] No elements detected, clearing selection");
    hideLassoRect();
    clearHighlights();
  }
}

/**
 * Handle key down events
 */
function handleKeyDown(e) {
  if (e.key === "Escape") {
    deactivateLasso();
  }
}

/**
 * Show instruction banner
 */
function showInstructionBanner() {
  const banner = document.createElement("div");
  banner.id = "__lasso-banner";
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 24px;
    background: #1e1b4b;
    color: white;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    animation: __lasso-fadein 0.3s ease-out;
  `;
  banner.textContent =
    "Click and drag to draw selection area. Press Esc to cancel.";

  document.body.appendChild(banner);
  state.elements.instructionBanner = banner;
}

/**
 * Remove instruction banner
 */
function removeInstructionBanner() {
  if (state.elements.instructionBanner) {
    state.elements.instructionBanner.remove();
    state.elements.instructionBanner = null;
  }
}
