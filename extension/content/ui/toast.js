// extension/content/ui/toast.js - Toast notifications for Lasso Copy

import { state } from "../state.js";

let toastContainer = null;

/**
 * Get or create the toast container
 * @returns {HTMLDivElement} Toast container
 */
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "__lasso-toast-container";
    toastContainer.className = "__lasso-toast-container";

    document.body.appendChild(toastContainer);
  }

  return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {Object} options - Toast options
 */
export function showToast(message, options = {}) {
  const container = getToastContainer();

  const toast = document.createElement("div");
  toast.className = "__lasso-toast";
  if (options.isError) {
    toast.classList.add("__lasso-toast-error");
  }
  toast.textContent = message;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Auto remove after duration
  const duration = options.duration || 2500;

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, duration);
}

/**
 * Show a success toast
 * @param {string} message - Message to display
 */
export function showSuccess(message) {
  showToast(message);
}

/**
 * Show an error toast
 * @param {string} message - Message to display
 */
export function showError(message) {
  showToast(message, { isError: true });
}

/**
 * Remove all toast notifications
 */
export function clearToasts() {
  if (toastContainer) {
    toastContainer.innerHTML = "";
  }
}

/**
 * Remove the toast container
 */
export function removeToastContainer() {
  if (toastContainer && toastContainer.parentNode) {
    toastContainer.parentNode.removeChild(toastContainer);
    toastContainer = null;
  }
}
