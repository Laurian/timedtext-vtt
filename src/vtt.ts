import type { Token } from './annotator';

export function generateVTT(blocks: Token[][], karaoke = false) {
  const vtt = ['WEBVTT', '', 'Kind: captions', 'Language: en-US', '', ''];

  let k = 1;

  blocks.forEach((tokens: Token[]) => {
    const lines: Token[][] = [];
    let currentLine: Token[] = [];

    tokens.forEach((token: Token) => {
      currentLine.push(token);
      if (token.metadata.break ?? false) {
        lines.push(currentLine);
        currentLine = [];
      }
    });

    console.log({ lines });

    const cues: Token[][][] = [];
    let currentCue: Token[][] = [];
    lines.forEach((line: Token[]) => {
      currentCue.push(line);
      if (line.some((token: Token) => token.metadata.subtitleBreak ?? false)) {
        cues.push(currentCue);
        currentCue = [];
      }
    });

    console.log({ cues });

    cues.forEach((cue: Token[][]) => {
      const tokens = cue.flat();
      const start = tokens[0].start;
      const end = tokens[tokens.length - 1].start + tokens[tokens.length - 1].duration;
      vtt.push(`${k++}\n${formatSeconds(start)} --> ${formatSeconds(end)} line:85%`);
      cue.forEach((line: Token[]) => {
        vtt.push(
          line
            .map((token: Token) =>
              karaoke ? `<${formatSeconds(token.start)}><ruby>${token.text}</ruby>` : token.text
            )
            .join(' ')
        );
      });
      vtt.push('');
    });
  });

  return vtt.join('\n');
}

const formatSeconds = (seconds: number): string =>
  seconds
    ? new Date(parseFloat(seconds.toFixed(3)) * 1000).toISOString().substring(11, 23)
    : '00:00:00:000';
