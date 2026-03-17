// extension/content/serializer.js - Content serialization for Lasso Copy
// Supports HTML, Plain Text, and Markdown output formats

/**
 * Serialize selected elements to HTML
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} HTML string
 */
export function serializeHTML(elements) {
  if (!elements || elements.length === 0) return "";

  const container = document.createElement("div");

  elements.forEach((el) => {
    try {
      container.appendChild(el.cloneNode(true));
    } catch (e) {
      // Skip elements that can't be cloned
    }
  });

  return container.innerHTML;
}

/**
 * Serialize selected elements to plain text
 * @param {Element[]} elements - Elements to serialize
 * @returns {string} Plain text string
 */
export function serializePlainText(elements) {
  if (!elements || elements.length === 0) return "";

  return elements
    .map((el) => el.innerText || el.textContent || "")
    .filter((text) => text.trim().length > 0)
    .join("\n\n");
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
      return `# ${getTextContent(el)}`;
    case "h2":
      return `## ${getTextContent(el)}`;
    case "h3":
      return `### ${getTextContent(el)}`;
    case "h4":
      return `#### ${getTextContent(el)}`;
    case "h5":
      return `##### ${getTextContent(el)}`;
    case "h6":
      return `###### ${getTextContent(el)}`;
    case "p":
      return getTextContent(el);
    case "br":
      return "\n";
    case "hr":
      return "\n---\n";
    case "ul":
      return convertList(el, "ul");
    case "ol":
      return convertList(el, "ol");
    case "li":
      return getTextContent(el);
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
      return `**${getTextContent(el)}**`;
    case "em":
    case "i":
      return `*${getTextContent(el)}*`;
    case "u":
      return `<u>${getTextContent(el)}</u>`;
    case "section":
    case "article":
    case "div":
    case "span":
    case "main":
    case "aside":
    case "header":
    case "footer":
      return getTextContent(el);
    default:
      return getTextContent(el);
  }
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
    text: serializePlainText(elements),
    markdown: serializeMarkdown(elements),
    count: elements.length,
    timestamp: Date.now(),
  };
}
