# Contributing to Lasso Copy

Thank you for your interest in contributing!

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/lasso-copy-extension.git
cd lasso-copy-extension

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click Load unpacked
# 4. Select extension folder
```

## Code Style

- Use ES modules with imports/exports
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Use consistent naming conventions

## Commit Messages

Use conventional commit format:

| Type | Description |
|------|-------------|
| `fix:` | Bug fixes |
| `feat:` | New features |
| `new:` | Initial implementation of something |
| `add:` | Adding new files or resources |
| `upd:` | Updating existing functionality |
| `ref:` | Code refactoring |
| `chore:` | Maintenance tasks |
| `docs:` | Documentation changes |
| `initial:` | Initial commit |

Examples:
```
fix: resolve selection not clearing on escape
feat: add snap-to-element selection
add: new utils/color.js module
upd: improve polygon intersection performance
ref: extract serialization logic
```

## Testing

Test your changes on various websites:
- News articles
- Documentation pages
- E-commerce sites
- Social media pages

## Future Ideas

### High Priority
- **Snap-to-element selection**: Snap lasso path to element boundaries
- **Smart article detection**: Auto-detect main content areas
- **Table to CSV export**: Extract tables as CSV format
- **JSON export**: Structured JSON output

### Medium Priority
- **Keyboard shortcuts**: Quick keys for copy formats
- **Selection grouping**: Group by articles, cards, tables
- **History**: Undo/redo selections
- **Templates**: Save common selections

### Lower Priority
- **Large page support**: Virtualized detection for heavy pages
- **Cross-tab sessions**: Continue selection across tabs
- **Cloud sync**: Sync settings across devices
- **Browser actions**: Context menu integration

## Reporting Issues

When reporting bugs, please include:
- Chrome version
- Operating system
- Steps to reproduce
- Sample URL if applicable

## Feature Requests

Open an issue with:
- Clear description
- Use case explanation
- Mockup or example (optional)
