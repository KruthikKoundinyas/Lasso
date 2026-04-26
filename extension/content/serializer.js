// extension/content/serializer.js - Content serialization for Lasso Copy
// Supports HTML, Plain Text, Clean HTML, and Markdown output formats

// Tags to completely remove from HTML output
const REMOVE_TAGS = ['script', 'style', 'iframe', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed'];
// Event handler attributes to remove
const EVENT_HANDLERS = ['onclick', 'onchange', 'onmouseover', 'onmouseout', 'onload', 'onerror', 'onsubmit', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onkeypress'];

/**
 * Serialize selected elements to HTML (full fidelity - preserves original structure)
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} HTML string
 */
export function serializeHTML(elements) {
  if (!elements || elements.length === 0) return "";

  const container = document.createElement("div");

  elements.forEach((el) => {
    try {
      const clone = el.cloneNode(true);
      // Remove dangerous elements and event handlers
      sanitizeHTML(clone);
      container.appendChild(clone);
    } catch (e) {
      // Skip elements that can't be cloned
    }
  });

  return container.innerHTML;
}

/**
 * Sanitize HTML by removing scripts, styles, iframes, and event handlers
 * @param {Element} el - Element to sanitize
 */
function sanitizeHTML(el) {
  // Remove elements that should be stripped
  REMOVE_TAGS.forEach(tag => {
    const elements = el.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });
  
  // Also check the root element
  if (REMOVE_TAGS.includes(el.tagName.toLowerCase())) {
    el.remove();
    return;
  }
  
  // Remove event handler attributes
  const allElements = el.querySelectorAll('*');
  allElements.forEach(element => {
    EVENT_HANDLERS.forEach(attr => {
      element.removeAttribute(attr);
    });
  });
  
  // Check root element too
  EVENT_HANDLERS.forEach(attr => {
    el.removeAttribute(attr);
  });
}

/**
 * Serialize selected elements to Clean HTML (sanitized, no classes/ids/styles)
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} Clean HTML string
 */
export function serializeCleanHTML(elements) {
  if (!elements || elements.length === 0) return "";

  const container = document.createElement("div");

  elements.forEach((el) => {
    try {
      const clone = el.cloneNode(true);
      // First sanitize dangerous content
      sanitizeHTML(clone);
      // Then remove presentation attributes
      cleanHTML(clone);
      container.appendChild(clone);
    } catch (e) {
      // Skip elements that can't be cloned
    }
  });

  return container.innerHTML;
}

/**
 * Clean HTML by removing classes, ids, inline styles, and other non-semantic attributes
 * @param {Element} el - Element to clean
 */
function cleanHTML(el) {
  // Remove non-semantic attributes
  const removeAttrs = ['class', 'id', 'style', 'width', 'height', 'align', 'valign', 
    'bgcolor', 'background', 'color', 'font-size', 'font-family', 'border', 
    'cellpadding', 'cellspacing', 'summary', 'title', 'lang', 'dir'];
  
  const allElements = el.querySelectorAll('*');
  allElements.forEach(element => {
    removeAttrs.forEach(attr => {
      element.removeAttribute(attr);
    });
    // Remove data-* attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        element.removeAttribute(attr.name);
      }
    });
  });
  
  // Clean root element too
  removeAttrs.forEach(attr => el.removeAttribute(attr));
  Array.from(el.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      el.removeAttribute(attr.name);
    }
  });
}

/**
 * Serialize selected elements to plain text
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} Plain text string
 */
export function serializePlainText(elements) {
  if (!elements || elements.length === 0) return "";

  const parts = elements.map((el) => convertToPlainText(el));
  return parts.filter((text) => text.trim().length > 0).join("\n\n");
}

/**
 * Convert a DOM element to plain text
 * @param {Element} el - Element to convert
 * @returns {string} Plain text string
 */
function convertToPlainText(el) {
  const tagName = el.tagName.toLowerCase();

  switch (tagName) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return getTextContent(el);
    case "p":
    case "div":
    case "span":
    case "section":
    case "article":
    case "main":
    case "aside":
    case "header":
    case "footer":
    case "blockquote":
      return getTextContentWithInlineFormatting(el);
    case "br":
      return "\n";
    case "hr":
      return "\n---\n";
    case "ul":
    case "ol":
      return convertListToPlainText(el);
    case "li":
      // List items handled by convertListToPlainText
      return getTextContent(el);
    case "table":
      return convertTableToPlainText(el);
    case "pre":
      return el.textContent;
    case "code":
      return el.textContent;
    case "img": {
      const alt = el.getAttribute("alt");
      return alt ? `[Image: ${alt}]` : "";
    }
    case "figure": {
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption");
      let text = "";
      if (img) {
        const alt = img.getAttribute("alt");
        text = alt ? `[Image: ${alt}]` : "";
      }
      if (caption) {
        text += (text ? "\n" : "") + caption.textContent;
      }
      return text;
    }
    case "a": {
      const href = el.getAttribute("href") || "";
      const text = getTextContent(el).trim();
      return text + (href ? ` (${href})` : "");
    }
    case "strong":
    case "b":
    case "em":
    case "i":
    case "u":
      return getTextContent(el);
    default:
      return getTextContent(el);
  }
}

/**
 * Get text content with inline link formatting
 * @param {Element} el - Element
 * @returns {string} Text with links in parentheses
 */
function getTextContentWithInlineFormatting(el) {
  let result = "";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while ((node = walker.nextNode())) {
    let text = node.textContent;
    // Check if parent is a link
    const parent = node.parentElement;
    if (parent && parent.tagName.toLowerCase() === "a") {
      const href = parent.getAttribute("href") || "";
      const linkText = text.trim();
      if (linkText && href) {
        text = linkText + ` (${href})`;
      }
    }
    result += text;
  }
  return result.trim();
}

/**
 * Convert a list element to plain text with bullet points
 * @param {Element} el - List element
 * @returns {string} Plain text list
 */
function convertListToPlainText(el) {
  const items = el.querySelectorAll(":scope > li");
  if (items.length === 0) return "";

  const lines = [];
  items.forEach((item) => {
    // Get text content, handling nested lists recursively
    let text = "";
    const childLists = item.querySelectorAll("ul, ol");
    
    // Get text without the nested list content first
    let itemContent = "";
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      // Skip text nodes that are inside nested lists
      let parent = node.parentElement;
      let skip = false;
      while (parent) {
        if (parent === item) break;
        if (parent.tagName && ["UL", "OL"].includes(parent.tagName)) {
          skip = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!skip) {
        itemContent += node.textContent;
      }
    }
    
    // Process inline formatting (links)
    const links = item.querySelectorAll("a");
    links.forEach(link => {
      const href = link.getAttribute("href");
      const text = link.textContent.trim();
      if (href && text) {
        itemContent = itemContent.replace(text, text + ` (${href})`);
      }
    });
    
    lines.push("* " + itemContent.trim());
    
    // Handle nested lists
    const nestedUl = item.querySelector(":scope > ul");
    const nestedOl = item.querySelector(":scope > ol");
    if (nestedUl) {
      lines.push(convertListToPlainText(nestedUl));
    }
    if (nestedOl) {
      lines.push(convertListToPlainText(nestedOl));
    }
  });

  return lines.join("\n");
}

/**
 * Convert a table to plain text
 * @param {Element} table - Table element
 * @returns {string} Plain text table
 */
function convertTableToPlainText(table) {
  const rows = table.querySelectorAll("tr");
  if (rows.length === 0) return "";

  const lines = [];
  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
    lines.push(cellTexts.join(" | "));
  });

  return lines.join("\n");
}

/**
 * Serialize selected elements to Markdown
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} Markdown string
 */
export function serializeMarkdown(elements) {
  if (!elements || elements.length === 0) return "";

  const parts = elements.map((el) => convertToMarkdown(el));
  return parts.join("\n\n");
}

/**
 * Convert a DOM element to Markdown
 * @param {Element} el - Element to convert
 * @returns {string} Markdown string
 */
function convertToMarkdown(el) {
  const tagName = el.tagName.toLowerCase();

  switch (tagName) {
    case "h1":
      return `# ${getTextContentWithMarkdown(el)}`;
    case "h2":
      return `## ${getTextContentWithMarkdown(el)}`;
    case "h3":
      return `### ${getTextContentWithMarkdown(el)}`;
    case "h4":
      return `#### ${getTextContentWithMarkdown(el)}`;
    case "h5":
      return `##### ${getTextContentWithMarkdown(el)}`;
    case "h6":
      return `###### ${getTextContentWithMarkdown(el)}`;
    case "p":
      // Preserve inline formatting in paragraphs
      return convertInlineToMarkdown(el);
    case "br":
      return "\n";
    case "hr":
      return "\n---\n";
    case "ul":
      return convertList(el, "ul");
    case "ol":
      return convertList(el, "ol");
    case "li":
      return getTextContentWithMarkdown(el);
    case "table":
      return convertTable(el);
    case "blockquote":
      return convertBlockquote(el);
    case "pre":
      return `\`\`\`\n${el.textContent}\n\`\`\``;
    case "code":
      return `\`${el.textContent}\``;
    case "img":
      return convertImage(el);
    case "figure":
      return convertFigure(el);
    case "a":
      return convertLink(el);
    case "strong":
    case "b":
      return `**${getTextContentWithMarkdown(el)}**`;
    case "em":
    case "i":
      return `*${getTextContentWithMarkdown(el)}*`;
    case "u":
      return `_${getTextContentWithMarkdown(el)}_`;
    case "section":
    case "article":
    case "div":
    case "span":
    case "main":
    case "aside":
    case "header":
    case "footer":
      return getTextContentWithMarkdown(el);
    default:
      return getTextContentWithMarkdown(el);
  }
}

/**
 * Get text content with inline Markdown formatting applied
 * @param {Element} el - Element
 * @returns {string} Text with Markdown formatting
 */
function getTextContentWithMarkdown(el) {
  // For elements without complex children, process inline formatting
  return convertInlineToMarkdown(el);
}

/**
 * Convert inline elements (strong, a, em, etc.) to Markdown
 * @param {Element} el - Element to process
 * @returns {string} Text with inline Markdown
 */
function convertInlineToMarkdown(el) {
  // If element has no children with inline formatting, just return textContent
  const hasInlineElements = el.querySelector("strong, b, em, i, a, code, u, span");
  
  if (!hasInlineElements) {
    return el.textContent || "";
  }
  
  // Process the element, converting inline elements
  let result = "";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let node;
  
  while ((node = walker.nextNode())) {
    let text = node.textContent;
    const parent = node.parentElement;
    
    if (parent) {
      const tag = parent.tagName.toLowerCase();
      switch (tag) {
        case "strong":
        case "b":
          text = `**${text}**`;
          break;
        case "em":
        case "i":
          text = `*${text}*`;
          break;
        case "a":
          const href = parent.getAttribute("href") || "";
          text = `[${text}](${href})`;
          break;
        case "code":
          text = `\`${text}\``;
          break;
        case "u":
          text = `_${text}_`;
          break;
      }
    }
    result += text;
  }
  
  return result.trim();
}

/**
 * Get text content of an element, preserving whitespace
 * @param {Element} el - Element
 * @returns {string} Text content
 */
function getTextContent(el) {
  return el.textContent || "";
}

/**
 * Convert a list element to Markdown
 * @param {Element} el - List element
 * @param {string} type - 'ul' or 'ol'
 * @returns {string} Markdown list
 */
function convertList(el, type) {
  const items = el.querySelectorAll(":scope > li");
  if (items.length === 0) return "";

  const lines = [];
  items.forEach((item, index) => {
    const prefix = type === "ol" ? `${index + 1}.` : "-";
    const text = getTextContent(item).trim();
    lines.push(`${prefix} ${text}`);
  });

  return lines.join("\n");
}

/**
 * Convert a table element to Markdown
 * @param {Element} table - Table element
 * @returns {string} Markdown table
 */
function convertTable(table) {
  const rows = table.querySelectorAll("tr");
  if (rows.length === 0) return "";

  const markdownRows = [];
  let isFirstRow = true;

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    if (cells.length === 0) return;

    const cellContents = Array.from(cells).map((cell) => {
      let text = getTextContent(cell).trim();
      // Escape pipe characters
      text = text.replace(/\|/g, "\\|");
      return text;
    });

    const rowMarkdown = `| ${cellContents.join(" | ")} |`;
    markdownRows.push(rowMarkdown);

    // Add header separator after first row
    if (isFirstRow) {
      const separators = cellContents.map(() => "---");
      markdownRows.push(`| ${separators.join(" | ")} |`);
      isFirstRow = false;
    }
  });

  return markdownRows.join("\n");
}

/**
 * Convert a blockquote to Markdown
 * @param {Element} blockquote - Blockquote element
 * @returns {string} Markdown blockquote
 */
function convertBlockquote(blockquote) {
  const text = getTextContent(blockquote);
  const lines = text.split("\n");
  return lines.map((line) => `> ${line}`).join("\n");
}

/**
 * Convert an image to Markdown
 * @param {Element} img - Image element
 * @returns {string} Markdown image
 */
function convertImage(img) {
  const src = img.getAttribute("src") || "";
  const alt = img.getAttribute("alt") || "image";
  return `![${alt}](${src})`;
}

/**
 * Convert a figure to Markdown
 * @param {Element} figure - Figure element
 * @returns {string} Markdown figure
 */
function convertFigure(figure) {
  const img = figure.querySelector("img");
  const caption = figure.querySelector("figcaption");

  let markdown = "";

  if (img) {
    markdown += convertImage(img);
  }

  if (caption) {
    markdown += `\n*${getTextContent(caption)}*`;
  }

  return markdown;
}

/**
 * Convert a link to Markdown
 * @param {Element} a - Anchor element
 * @returns {string} Markdown link
 */
function convertLink(a) {
  const href = a.getAttribute("href") || "";
  const text = getTextContent(a).trim();

  if (!href) return text;
  return `[${text}](${href})`;
}

/**
 * Serialize selected elements with metadata
 * @param {Element[]} elements - Elements to serialize
 * @param {Object} options - Serialization options
 * @returns {Object} Serialized content object
 */
export function serializeWithOptions(elements, options = {}) {
  return {
    html: serializeHTML(elements),
    cleanHTML: serializeCleanHTML(elements),
    text: serializePlainText(elements),
    markdown: serializeMarkdown(elements),
    count: elements.length,
    timestamp: Date.now(),
  };
}
