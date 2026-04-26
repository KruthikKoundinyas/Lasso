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
    
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
        console.log("[Lasso Debug] clipboard.write succeeded");
        return;
      } catch (clipError) {
        // Some browsers fail with both types - try writing separately
        console.warn("[Lasso Debug] Combined write failed, trying separate writes:", clipError.message);
        
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "text/html": htmlBlob })
          ]);
          await navigator.clipboard.write([
            new ClipboardItem({ "text/plain": textBlob })
          ]);
          console.log("[Lasso Debug] Separate writes succeeded");
          return;
        } catch (separateError) {
          console.warn("[Lasso Debug] Separate writes also failed:", separateError.message);
        }
      }
    }
  } catch (error) {
    console.warn("[Lasso Debug] HTML clipboard failed:", error);
  }
  
  // Fallback: try plain text only
  await writeText(plainText);
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
 * @returns {Promise<boolean>} Success status
 */
function fallbackCopyText(text) {
  return new Promise((resolve) => {
    console.log("[Lasso Debug] Using fallback copy method (execCommand)");
    
    // Try textarea approach first (works for plain text)
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.width = "500px";
    textarea.style.height = "200px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let success = false;
    try {
      success = document.execCommand("copy");
      console.log("[Lasso Debug] execCommand copy succeeded:", success);
    } catch (err) {
      console.error("[Lasso Debug] Fallback copy failed:", err);
    }

    document.body.removeChild(textarea);
    resolve(success);
  });
}

/**
 * Fallback method for rich HTML content using selection API
 * This is more reliable for HTML than plain textarea
 * @param {string} html - HTML content
 * @param {string} plainText - Plain text fallback
 * @returns {Promise<boolean>} Success status
 */
export async function fallbackCopyHTML(html, plainText) {
  console.log("[Lasso Debug] Using HTML fallback method (selection API)");
  
  // Create a temporary container with the HTML
  const container = document.createElement("div");
  container.innerHTML = html;
  
  // Style the container to preserve formatting
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "auto";
  container.style.height = "auto";
  container.style.maxWidth = "10000px";
  container.style.overflow = "visible";
  container.style.whiteSpace = "pre-wrap";
  container.style.wordWrap = "break-word";
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  
  document.body.appendChild(container);
  
  try {
    // Select the content
    const range = document.createRange();
    range.selectNodeContents(container);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Copy to clipboard
    const success = document.execCommand("copy");
    console.log("[Lasso Debug] Selection-based copy result:", success);
    
    selection.removeAllRanges();
    
    if (success) {
      // Also write plain text to clipboard after HTML
      // Some apps need both formats
      try {
        await navigator.clipboard.writeText(plainText || "");
      } catch (e) {
        // Ignore - HTML copy succeeded
      }
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("[Lasso Debug] HTML fallback failed:", err);
    return false;
  } finally {
    document.body.removeChild(container);
  }
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
