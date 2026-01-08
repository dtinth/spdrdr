---
type: note
created: '2026-01-08T09:57:27.017Z'
---
## Terminal CLI Implementation Complete

### Features
- **Read from stdin**: Accepts plain text from pipe
- **--wpm FLAG**: Override reading speed (default 300)
- **--json FLAG**: Output slide data as JSON instead of playing
- **Terminal display**: Clear screen, center word, highlight ORP character
- **Top-level await**: Clean async code with Bun

### Usage Examples
```
echo "The quick brown fox." | bun app/cli.ts
echo "The quick brown fox." | bun app/cli.ts --wpm 500
echo "The quick brown fox." | bun app/cli.ts --json | jq '.[] | .word'
```

### Implementation Notes
- Uses util.parseArgs for flag parsing
- Bun.stdin.stream() for reading input
- ANSI escape codes for terminal control
- Word display: centered both horizontally and vertically
- ORP character shown in reverse video (\u001B[1;7m)
- Dynamic screen sizing with process.stdout.rows/columns

### Code Flow
1. Parse command line args with parseArgs()
2. Read all stdin with top-level await
3. Parse plain text → Document
4. Compile → Slide[] with timing config
5. If --json: output JSON and exit
6. Else: loop through slides, display, wait for duration

