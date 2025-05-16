/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

export interface TokenMetadata {
  speaker?: string; // TODO: add speaker
  sos?: boolean; // Start of sentence
  eos?: boolean; // End of sentence
  epunct?: boolean; // Has punctuation at the end
  spunct?: boolean; // Has punctuation at the beginning
  mpunct?: boolean; // Has mid-sentence punctuation
  punct?: boolean; // Has punctuation
  cap?: boolean; // First letter is capitalized
  fcap?: boolean; // Word is fully capitalized
  break?: boolean; // Good point for line break
  chars?: number; // Number of characters since last break plus the length of the current token
  lineDuration?: number; // Duration from last break
  subtitleBreak?: boolean; // Good point for subtitle break
}

export interface Token {
  text: string;
  start: number;
  offset?: number;
  length?: number;
  duration: number;
  metadata: TokenMetadata;
}

/**
 * Adds metadata annotations to tokens that are useful for caption splitting
 */
export function annotateTokens(
  paragraph: Token[],
  language: string = 'en',
  minChars = 37,
  maxChars = 42,
  maxDuration = 7,
  maxGap = 2
): Token[] {
  // Use Unicode property escapes for punctuation detection
  const isStartPunct = (text: string) =>
    !!text
      .trim()
      .charAt(0)
      .match(/\p{General_Category=Open_Punctuation}/u);
  const isEndPunct = (text: string) =>
    !!text
      .trim()
      .charAt(text.trim().length - 1)
      .match(/\p{General_Category=Final_Punctuation}/u);

  // Additional punctuation patterns
  const isSentenceEnd = (text: string) =>
    !!text
      .trim()
      .charAt(text.trim().length - 1)
      .match(/[.!?]|\.\.\./);

  // Make a deep copy to avoid mutating the original
  const annotatedParagraph = structuredClone(paragraph);

  // First pass to add basic token-level annotations
  annotatedParagraph.forEach((token, index, tokens) => {
    const text = token.text;

    token.length = text.length;
    token.offset = tokens.slice(0, index).reduce((acc, t) => acc + t.text.length + 1, 0);

    // // Check for capitalization
    // if (text.length > 0) {
    //   token.metadata.cap = text[0] === text[0].toUpperCase() && text[0] !== text[0].toLowerCase();
    //   token.metadata.fcap = text === text.toUpperCase() && text.length > 1 && /[A-Z]/.test(text); // FIXME this is only for latin alphabet
    // }

    // Check for mid-sentence punctuation using Unicode property escapes
    const trimmedText = text.trim();
    token.metadata.mpunct =
      trimmedText.length > 0 &&
      !!trimmedText.charAt(trimmedText.length - 1).match(/[\p{Pc}\p{Pd}\p{Po}]/u);

    // Check for sentence-ending punctuation specifically
    token.metadata.epunct = isSentenceEnd(text) || isEndPunct(text);
    token.metadata.spunct = isStartPunct(text);

    if (token.metadata.epunct || token.metadata.spunct) {
      delete token.metadata.mpunct;
    }
    if (token.metadata.epunct || token.metadata.spunct || (token.metadata.mpunct ?? false)) {
      token.metadata.punct = true;
    }
  });

  const segmenter = new (Intl as any).Segmenter(language, { granularity: 'sentence' });
  const sentences = [
    ...segmenter.segment(paragraph.map(t => t.text).join(' '))[Symbol.iterator](),
  ].map(({ index, segment: text }) => ({
    index,
    length: text.length,
    text,
  }));

  sentences.forEach(sentence => {
    const token = annotatedParagraph.find(t => t.offset === sentence.index);
    if (token) {
      token.metadata.sos = true;
    }
    const lastToken = annotatedParagraph.find(
      t => (t.offset ?? 0) + (t.length ?? 0) === sentence.index + sentence.length
    );
    if (lastToken) {
      lastToken.metadata.eos = true;
    }
  });

  // Mark end of sentence tokens
  annotatedParagraph.forEach((token, index) => {
    if (index > 0 && (token.metadata.sos ?? false)) {
      annotatedParagraph[index - 1].metadata.eos = true;
    }
  });

  // initialize chars
  annotatedParagraph.forEach(token => {
    token.metadata.chars = (token.offset ?? 0) + (token.length ?? 0);
  });

  let i = 0;
  let prevI = -1;
  let sameICount = 0;

  while (i < annotatedParagraph.length) {
    if (i === prevI) {
      sameICount++;
      if (sameICount >= 5) {
        console.error(
          `Potential infinite loop detected at token: ${annotatedParagraph[i]?.text || i}`
        );
        break;
      }
    } else {
      sameICount = 0;
      prevI = i;
    }

    if (i === 0) {
      i++;
      continue;
    }
    const token = annotatedParagraph[i];
    const previousToken = annotatedParagraph[i - 1];
    const previousPreviousToken = annotatedParagraph?.[i - 2];

    // console.log(i, token.text, token.metadata.chars);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (token.metadata.chars && token.metadata.chars > minChars) {
      if (
        ((token.metadata.eos ?? false) || (token.metadata.punct ?? false)) &&
        token.metadata.chars <= maxChars
      ) {
        // if the token is a sentence end or punctuation, accept it
        token.metadata.break = true;
        if (i < annotatedParagraph.length - 1) {
          annotatedParagraph.slice(i + 1).forEach(t => {
            t.metadata.chars = (t.metadata.chars ?? 0) - (token.metadata.chars ?? 0) - 1;
          });
        }
      } else if (
        (previousPreviousToken?.metadata?.punct ?? false) ||
        (previousPreviousToken?.metadata?.eos ?? false)
      ) {
        // if the previous token has punctuation or is a sentence end, accept it
        previousPreviousToken.metadata.break = true;
        if (i < annotatedParagraph.length - 1) {
          annotatedParagraph.slice(i - 1).forEach(t => {
            t.metadata.chars =
              (t.metadata.chars ?? 0) - (previousPreviousToken.metadata.chars ?? 0) - 1;
          });
        }
        i--;
      } else {
        // split at the previous token
        previousToken.metadata.break = true;
        annotatedParagraph.slice(i).forEach(t => {
          t.metadata.chars = (t.metadata.chars ?? 0) - (previousToken.metadata.chars ?? 0) - 1;
        });
      }
    }
    i++;
  }

  annotatedParagraph.forEach((token, index) => {
    if (token.metadata.break ?? false) {
      const previousBreakIndex = annotatedParagraph
        .slice(0, index)
        .reverse()
        .findIndex(t => t.metadata.break);

      let tokensBetweenBreaks = annotatedParagraph.slice(index - previousBreakIndex, index);
      if (previousBreakIndex === -1) {
        tokensBetweenBreaks = annotatedParagraph.slice(0, index);
      }
      token.metadata.lineDuration = tokensBetweenBreaks.reduce((acc, t) => acc + t.duration, 0);
    }
  });

  // Add subtitle breaks for every second line break, with exceptions
  let lineBreakCount = 0;
  annotatedParagraph.forEach((token, index) => {
    if (token.metadata.break ?? false) {
      lineBreakCount++;

      const previousBreak = annotatedParagraph
        .slice(0, index)
        .reverse()
        .find(t => t.metadata.break);
      const previousBreakIndex = annotatedParagraph.findIndex(t => t === previousBreak);
      const previousBreakTime = previousBreak?.start ?? 0 + (previousBreak?.duration ?? 0);
      const currentBreakTime = annotatedParagraph[previousBreakIndex + 1]?.start ?? 0;

      const gap = currentBreakTime - previousBreakTime;

      const breakHere =
        previousBreak &&
        lineBreakCount % 2 === 1 &&
        ((previousBreak.metadata.lineDuration ?? 0) + (token.metadata.lineDuration ?? 0) >
          maxDuration ||
          gap > maxGap);
      if (lineBreakCount % 2 === 0 || (breakHere ?? false)) {
        token.metadata.subtitleBreak = true;
        if (breakHere ?? false) {
          lineBreakCount = 0;
        }
      }
    }
  });

  // mark the last token as a subtitle break if it's a sentence end
  const lastToken = annotatedParagraph[annotatedParagraph.length - 1];
  lastToken.metadata.break = true;
  lastToken.metadata.subtitleBreak = true;

  return annotatedParagraph;
}
