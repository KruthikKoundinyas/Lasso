// extension/content/clipboard.js - Clipboard operations for Lasso Copy

/**
 * Write HTML and plain text to clipboard
 * Uses the Clipboard API with multiple MIME types
 * @param {string} html - HTML content to copy
 * @param {string} plainText - Plain text fallback
 */
export async function writeHTML(html, plainText = "") {
  console.log("[Lasso Debug] writeHTML called, html length:", html?.length);

  // Convert HTML to plain text if not provided
  if (!plainText) {
    plainText = stripHTML(html);
  }

  try {
    // Try using Clipboard API with both HTML and plain text
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([plainText], { type: "text/plain" });

    console.log("[Lasso Debug] Attempting clipboard.write with ClipboardItem");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);
    console.log("[Lasso Debug] clipboard.write succeeded");
  } catch (error) {
    // Fallback: try plain text only
    console.warn(
      "[Lasso Debug] HTML clipboard failed, falling back to plain text:",
      error,
    );
    await writeText(plainText);
  }
}

/**
 * Write plain text to clipboard
 * @param {string} text - Plain text to copy
 */
export async function writeText(text) {
  console.log("[Lasso Debug] writeText called, length:", text?.length);
  try {
    await navigator.clipboard.writeText(text);
    console.log("[Lasso Debug] writeText succeeded");
  } catch (error) {
    // Final fallback: use execCommand
    console.warn("[Lasso Debug] writeText failed, trying fallback:", error);
    fallbackCopyText(text);
    throw error;
  }
}

/**
 * Write Markdown to clipboard as plain text
 * @param {string} markdown - Markdown content to copy
 */
export async function writeMarkdown(markdown) {
  await writeText(markdown);
}

/**
 * Strip HTML tags to get plain text
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
function stripHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

/**
 * Fallback copy method using deprecated execCommand
 * Used when Clipboard API fails
 * @param {string} text - Text to copy
 */
function fallbackCopyText(text) {
  console.log("[Lasso Debug] Using fallback copy method (execCommand)");
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    console.log("[Lasso Debug] execCommand copy succeeded");
  } catch (err) {
    console.error("[Lasso Debug] Fallback copy failed:", err);
  }

  document.body.removeChild(textarea);
}

/**
 * Check if clipboard API is available
 * @returns {boolean} True if clipboard API is available
 */
export function isClipboardSupported() {
  return !!(
    navigator.clipboard &&
    navigator.clipboard.write &&
    navigator.clipboard.writeText
  );
}

/**
 * Request clipboard permissions
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestClipboardPermission() {
  if (!navigator.permissions) return true;

  try {
    const result = await navigator.permissions.query({
      name: "clipboard-write",
    });
    return result.state === "granted";
  } catch (error) {
    // Permission query not supported, assume allowed
    return true;
  }
}
