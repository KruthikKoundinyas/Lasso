// extension/content/utils/color.js - Color utility functions

/**
 * Convert hex color to rgba
 * @param {string} hex - Hex color code (e.g., "#6366f1")
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
export function hexToRgba(hex, alpha = 1) {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  let r, g, b;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    return hex;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convert hex to RGB object
 * @param {string} hex - Hex color code
 * @returns {Object} RGB object {r, g, b}
 */
export function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");

  let r, g, b;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  }

  return { r, g, b };
}

/**
 * Convert RGB to hex
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color code
 */
export function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Lighten a hex color
 * @param {string} hex - Hex color code
 * @param {number} percent - Percentage to lighten (0-1)
 * @returns {string} Lightened hex color
 */
export function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);

  const r = rgb.r + (255 - rgb.r) * percent;
  const g = rgb.g + (255 - rgb.g) * percent;
  const b = rgb.b + (255 - rgb.b) * percent;

  return rgbToHex(r, g, b);
}

/**
 * Darken a hex color
 * @param {string} hex - Hex color code
 * @param {number} percent - Percentage to darken (0-1)
 * @returns {string} Darkened hex color
 */
export function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);

  const r = rgb.r * (1 - percent);
  const g = rgb.g * (1 - percent);
  const b = rgb.b * (1 - percent);

  return rgbToHex(r, g, b);
}

/**
 * Get contrasting text color (black or white) for a background
 * @param {string} hex - Background hex color
 * @returns {string} Contrasting color hex
 */
export function getContrastColor(hex) {
  const rgb = hexToRgb(hex);

  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Create CSS custom properties object for highlight colors
 * @param {Object} settings - Settings object with highlightColor
 * @returns {Object} CSS custom properties
 */
export function createHighlightStyles(settings) {
  const baseColor = settings.highlightColor || "#db5266";
  const opacity = settings.highlightOpacity || 0.3;
  const borderColor = settings.borderColor || baseColor;
  const borderWidth = settings.borderWidth || 2;

  return {
    "--lasso-highlight-bg": hexToRgba(baseColor, opacity),
    "--lasso-highlight-border": borderColor,
    "--lasso-highlight-border-width": `${borderWidth}px`,
  };
}
