# Lasso Copy

A Chrome extension that lets you draw a freeform lasso around any webpage content to copy it as HTML, Markdown, or plain text.

## Features

- **Freeform Selection**: Draw any shape to select content
- **Multiple Export Formats**: Copy as HTML, Markdown, or plain text
- **Floating Toolbar**: Appears after selection with copy options
- **Real-time Highlighting**: See selected elements as you draw
- **Performance Optimized**: Caches elements for fast detection

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `extension` folder

## Usage

1. Click the extension icon in Chrome toolbar
2. Click "Start Selection"
3. Draw a lasso around content on the page
4. Choose Copy HTML, Copy Markdown, or Copy Text
5. Paste anywhere

### Keyboard Shortcuts

- `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`): Start lasso selection
- `Esc`: Cancel selection

## Project Structure

```
extension/
├── background.js        # Service worker
├── content.css         # Injected styles
├── manifest.json       # Extension manifest
├── content/
│   ├── content.js     # Entry point
│   ├── state.js       # State management
│   ├── lasso.js       # Selection logic
│   ├── detector.js    # Element detection
│   ├── serializer.js  # Export formats
│   ├── clipboard.js   # Clipboard operations
│   ├── ui/
│   │   ├── overlay.js    # Path rendering
│   │   ├── highlights.js # Element highlights
│   │   ├── toolbar.js    # Floating toolbar
│   │   └── toast.js      # Notifications
│   └── utils/
│       ├── dom.js     # DOM utilities
│       ├── rect.js    # Geometry
│       └── color.js   # Colors
└── popup/
    ├── popup.html    # Extension popup
    ├── popup.js      # Popup logic
    └── popup.css     # Popup styles
```

## Technologies

- Chrome Extension Manifest V3
- ES Modules
- SVG for path rendering
- Clipboard API

## License

MIT
