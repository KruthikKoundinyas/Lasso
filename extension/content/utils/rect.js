// extension/content/utils/rect.js - Rectangle and geometry utility functions

/**
 * Get the bounding rectangle for the lasso selection
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} currentX - Current X coordinate
 * @param {number} currentY - Current Y coordinate
 * @returns {DOMRect} Bounding rectangle
 */
export function getLassoBounds(startX, startY, currentX, currentY) {
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const right = Math.max(startX, currentX);
  const bottom = Math.max(startY, currentY);
  
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
  };
}

/**
 * Check if two rectangles intersect
 * @param {DOMRect|Object} a - First rectangle
 * @param {DOMRect|Object} b - Second rectangle
 * @returns {boolean} True if rectangles intersect
 */
export function rectIntersect(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

/**
 * Check if a rectangle fully contains another
 * @param {DOMRect|Object} container - Container rectangle
 * @param {DOMRect|Object} contained - Rectangle to check
 * @returns {boolean} True if container contains contained
 */
export function rectContains(container, contained) {
  return (
    contained.left >= container.left &&
    contained.right <= container.right &&
    contained.top >= container.top &&
    contained.bottom <= container.bottom
  );
}

/**
 * Calculate the intersection percentage between two rectangles
 * @param {DOMRect|Object} a - First rectangle
 * @param {DOMRect|Object} b - Second rectangle
 * @returns {number} Percentage of overlap (0-1)
 */
export function rectIntersectionPercent(a, b) {
  const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  
  const intersectionArea = xOverlap * yOverlap;
  const aArea = a.width * a.height;
  
  if (aArea === 0) return 0;
  
  return intersectionArea / aArea;
}

/**
 * Get the bounding box of multiple elements
 * @param {Element[]} elements - Array of DOM elements
 * @returns {Object|null} Combined bounding box or null if no elements
 */
export function getElementsBoundingBox(elements) {
  if (!elements || elements.length === 0) return null;
  
  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    minLeft = Math.min(minLeft, rect.left);
    minTop = Math.min(minTop, rect.top);
    maxRight = Math.max(maxRight, rect.right);
    maxBottom = Math.max(maxBottom, rect.bottom);
  });
  
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
 * Convert client coordinates to viewport-relative coordinates
 * @param {number} x - Client X
 * @param {number} y - Client Y
 * @returns {Object} Viewport-relative coordinates
 */
export function toViewportCoords(x, y) {
  return {
    x: x + window.scrollX,
    y: y + window.scrollY,
  };
}

/**
 * Get the center point of a rectangle
 * @param {DOMRect|Object} rect - Rectangle
 * @returns {Object} Center point {x, y}
 */
export function getRectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Check if a point is inside a rectangle
 * @param {DOMRect|Object} rect - Rectangle
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if point is inside rectangle
 */
export function pointInRect(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
