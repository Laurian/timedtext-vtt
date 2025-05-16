# timedtext-vtt

A module for splitting timed text into captions with intelligent line breaks for better readability.

## Installation

```bash
npm install timedtext-vtt
```

## Usage

```typescript
import { annotateTokens, type Token } from 'timedtext-vtt';

// Example token array
const tokens: Token[] = [
  {
    text: "Hello",
    start: 0,
    duration: 0.5,
    metadata: {}
  },
  {
    text: "world!",
    start: 0.5,
    duration: 0.5,
    metadata: {}
  }
  // ... more tokens
];

// Annotate tokens with metadata for caption splitting
const annotatedTokens = annotateTokens(tokens, 'en', 37, 42, 7, 2);

// The annotatedTokens now contain metadata helpful for splitting text
// into captions, including:
// - Line breaks
// - Subtitle breaks
// - Sentence boundaries
// - Punctuation information

// Generate VTT file from annotated tokens
import { generateVTT } from 'timedtext-vtt';

// Group tokens into blocks (e.g., by speaker or paragraph)
const blocks = [annotatedTokens];

// Generate VTT with default settings
const vtt = generateVTT(blocks);

// Or customize the VTT generation
const vtt = generateVTT(blocks, {
  karaoke: false, // Enable karaoke mode with timing for each word
  minReadingSpeed: 20, // Minimum reading speed in characters per second
  minLineDuration: 5/6 // Minimum duration for each line in seconds
});

// The generated VTT can be used with HTML5 video elements
const video = document.querySelector('video');
const track = document.createElement('track');
track.kind = 'subtitles';
track.label = 'English';
track.srclang = 'en';
track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
video.appendChild(track);
```

## API

### annotateTokens(paragraph, language, minChars, maxChars, maxDuration, maxGap)

Annotates tokens with metadata useful for caption splitting.

- `paragraph`: An array of `Token` objects
- `language`: Language code (default: 'en')
- `minChars`: Minimum characters per line (default: 37)
- `maxChars`: Maximum characters per line (default: 42)
- `maxDuration`: Maximum duration for a subtitle (default: 7 seconds)
- `maxGap`: Maximum gap between tokens (default: 2 seconds)

### generateVTT(blocks, options)

Generates a WebVTT file from annotated token blocks.

- `blocks`: An array of token arrays, where each inner array represents a block (e.g., by speaker or paragraph)
- `options`: Optional configuration object
  - `karaoke`: Enable karaoke mode with timing for each word (default: false)
  - `minReadingSpeed`: Minimum reading speed in characters per second (default: 20)
  - `minLineDuration`: Minimum duration for each line in seconds (default: 5/6)

Returns a string containing the WebVTT file content.

## Demo

A demo of this module is available at [GitHub Pages](https://laurian.github.io/timedtext-vtt/). 
