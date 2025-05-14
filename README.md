# timedtext-formatter

A module for splitting timed text into captions with intelligent line breaks for better readability.

## Installation

```bash
npm install timedtext-formatter
```

## Usage

```typescript
import { annotateTokens, type Token } from 'timedtext-formatter';

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

## Demo

A demo of this module is available at [GitHub Pages](https://yourusername.github.io/timedtext-formatter/). 
