// extension/content/state.js - Centralized state management for Lasso Copy

/**
 * Application state for the Lasso Copy extension.
 * Manages lasso selection state, cached elements, settings, and UI references.
 */
export const state = {
  // Lasso activation state
  active: false,
  dragging: false,

  // Mouse/touch position tracking
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,

  // Path points for freeform lasso
  pathPoints: [],

  // Detected and selected elements
  selectedElements: [],

  // Cached candidate elements for performance (populated once on activation)
  candidates: [],

  // User settings
  settings: {
    highlightColor: "#db5266",
    highlightOpacity: 0.3,
    borderColor: "#db5266",
    borderWidth: 2,
    copyFormat: "html",
    showFloatingToolbar: true,
  },

  // UI element references (managed by ui modules)
  elements: {
    overlay: null,
    lassoRect: null,
    highlightLayer: null,
    floatingToolbar: null,
    instructionBanner: null,
    toastContainer: null,
  },
};

/**
 * Initialize state with default values and load settings from storage
 */
export async function initState() {
  try {
    const result = await chrome.storage.local.get("settings");
    if (result.settings) {
      Object.assign(state.settings, result.settings);
    }
  } catch (error) {
    console.warn("Could not load settings:", error);
  }
}

/**
 * Reset state to initial values (except settings)
 */
export function resetState() {
  state.active = false;
  state.dragging = false;
  state.startX = 0;
  state.startY = 0;
  state.currentX = 0;
  state.currentY = 0;
  state.pathPoints = [];
  state.selectedElements = [];
  state.candidates = [];
}

/**
 * Update a setting value
 */
export function updateSetting(key, value) {
  if (key in state.settings) {
    state.settings[key] = value;
    // Persist to storage
    chrome.storage.local.get("settings", (result) => {
      const settings = result.settings || {};
      settings[key] = value;
      chrome.storage.local.set({ settings });
    });
  }
}
