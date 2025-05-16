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
const annotatedTokens = annotateTokens(
  tokens,
  'en',    // Language code for sentence segmentation (e.g. 'en', 'fr', 'es')
  37,      // Minimum characters per line before attempting a line break
  42,      // Maximum characters per line before forcing a line break
  7,       // Maximum duration in seconds for a single caption/cue
  2        // Maximum gap in seconds between lines before splitting into separate captions
);

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
const vtt = generateVTT(blocks, 
  false, // karaoke: mode with timing for each word
  20, // Minimum reading speed in characters per second
  5/6 // Minimum duration for each line in seconds
);

// The generated VTT can be used with HTML5 video elements
const video = document.querySelector('video');
const track = document.createElement('track');
track.kind = 'subtitles';
track.label = 'English';
track.srclang = 'en';
track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
video.appendChild(track);
```

## Demo

A demo of this module is available at [GitHub Pages](https://laurian.github.io/timedtext-vtt/).
