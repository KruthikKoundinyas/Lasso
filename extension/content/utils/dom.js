// extension/content/utils/dom.js - DOM utility functions

/**
 * CSS selector for elements that can be captured by the lasso
 */
export const CANDIDATE_SELECTOR = 
  "p,h1,h2,h3,h4,h5,h6,h7,table,thead,tbody,tr,th,td,ul,ol,li,img,figure,figcaption,blockquote,pre,code,section,article,aside,header,footer,main,div,span,a,em,strong,b,i,u";

/**
 * Get all candidate elements that can be selected by the lasso
 * @returns {Element[]} Array of candidate elements
 */
export function getCandidateElements() {
  return Array.from(document.querySelectorAll(CANDIDATE_SELECTOR));
}

/**
 * Check if an element is visible and has meaningful content
 * @param {Element} el - The element to check
 * @returns {boolean} True if element should be included in selection
 */
export function isVisibleElement(el) {
  const style = window.getComputedStyle(el);
  
  // Check if hidden
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  
  // Check if has dimensions
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return false;
  }
  
  return true;
}

/**
 * Find the closest scrollable ancestor of an element
 * @param {Element} el - The element to find ancestor for
 * @returns {Element|null} The scrollable element or null
 */
export function getScrollableAncestor(el) {
  let current = el.parentElement;
  
  while (current) {
    const style = window.getComputedStyle(current);
    const overflow = style.overflow + style.overflowX + style.overflowY;
    
    if (overflow.includes("auto") || overflow.includes("scroll")) {
      return current;
    }
    
    current = current.parentElement;
  }
  
  return document.documentElement;
}

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {string|Element|Array} children - Child content
 * @returns {Element} Created element
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") {
      el.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue;
      });
    } else {
      el.setAttribute(key, value);
    }
  });
  
  if (children) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof Element) {
          el.appendChild(child);
        }
      });
    } else if (typeof children === "string") {
      el.innerHTML = children;
    } else if (children instanceof Element) {
      el.appendChild(children);
    }
  }
  
  return el;
}

/**
 * Remove an element from the DOM if it exists
 * @param {Element|null} el - Element to remove
 */
export function removeElement(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Check if an element contains another element
 * @param {Element} container - Container element
 * @param {Element} contained - Element to check
 * @returns {boolean} True if contained is within container
 */
export function containsElement(container, contained) {
  try {
    return container.contains(contained);
  } catch (e) {
    return false;
  }
}

/**
 * Get all unique ancestor elements between root and target
 * @param {Element} root - Root element
 * @param {Element} target - Target element
 * @returns {Element[]} Array of ancestor elements
 */
export function getAncestorsBetween(root, target) {
  const ancestors = [];
  let current = target.parentElement;
  
  while (current && current !== root) {
    ancestors.push(current);
    current = current.parentElement;
  }
  
  return ancestors;
}
