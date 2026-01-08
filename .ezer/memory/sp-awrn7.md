---
type: note
created: '2026-01-08T10:28:35.274Z'
---
## MVP Web UI Complete

### Features
- **Paste screen**: Instructions to press Cmd/Ctrl+V
- **Reading screen**: 
  * Large centered word display with ORP character highlighted in red
  * Play/Pause button to control playback
  * Restart button to go back to paste screen
  * Progress bar (clickable to seek)
  * Position counter (current / total words)
  * Status display (idle, playing, paused, complete)

### Tech Stack
- React 19 for UI
- Bun bundler for HTML/JS/CSS bundling
- Player class for playback engine
- Event-driven architecture with mitt
- Dark mode only with CSS variables

### CSS Variables System
Full theming support with CSS variables:
- Colors: backgrounds, text shades, accents, buttons
- Spacing: 8 scale levels
- Typography: font sizes and family
- Transitions and border radius

Users can write Stylus or plain CSS to override variables for custom themes.

### UX Highlights
- Auto-start on paste
- Fixed focal point for ORP character
- Click progress bar to seek
- Keyboard-less controls (buttons only for MVP)
- Responsive design
- High contrast dark theme optimized for reading

