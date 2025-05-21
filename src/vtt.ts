import TC, { type FRAMERATE } from 'smpte-timecode';
import type { Token } from './annotator';

export function generateVTT(
  blocks: Token[][],
  karaoke = false,
  minReadingSpeed = 20,
  minLineDuration = 5 / 6
) {
  const vtt = ['WEBVTT', '', 'Kind: captions', 'Language: en-US', '', ''];

  let k = 1;

  blocks.forEach((tokens: Token[], j) => {
    const lines: Token[][] = [];
    let currentLine: Token[] = [];

    const nextBlock = blocks[j + 1];
    const nextBlockStart = nextBlock?.[0]?.start ?? Number.MAX_SAFE_INTEGER;

    tokens.forEach((token: Token) => {
      currentLine.push(token);
      if (token.metadata.break ?? false) {
        lines.push(currentLine);
        currentLine = [];
      }
    });

    // console.log({ lines });

    const cues: Token[][][] = [];
    let currentCue: Token[][] = [];
    lines.forEach((line: Token[]) => {
      currentCue.push(line);
      if (line.some((token: Token) => token.metadata.subtitleBreak ?? false)) {
        cues.push(currentCue);
        currentCue = [];
      }
    });

    // console.log({ cues });

    cues.forEach((cue: Token[][], i) => {
      const tokens = cue.flat();
      const lineCount = cue.length;
      // console.group(tokens.map(t => t.text).join(' '));
      const start = tokens[0].start;

      const minEnd = tokens[tokens.length - 1].start + tokens[tokens.length - 1].duration;
      let end = minEnd;
      let maxEnd = Math.min(minEnd + 7, nextBlockStart);

      if (i < cues.length - 1) {
        const nextCue = cues[i + 1].flat();
        // console.log({ nextCue, nextStart: nextCue[0]?.start, cue });
        maxEnd = Math.min(nextCue[0]?.start ?? nextBlockStart, maxEnd);
      }

      const chars = tokens.reduce((acc, token) => acc + token.text.length, 0);
      const minDuration = chars / minReadingSpeed;

      if (end - start < minDuration || end - start < lineCount * minLineDuration) {
        const delta =
          end - start < minDuration ? minDuration - (end - start) : lineCount * minLineDuration;
        if (delta > 0 && end + delta < maxEnd) {
          end += delta;
          // console.log({ delta, end, minEnd, maxEnd, minDuration, cue });
        } else if (delta > 0) {
          // console.log({ end, maxEnd, cue });
          end = maxEnd;
        }
      }

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
      // console.groupEnd();
    });
  });

  const vttString = vtt.join('\n');
  console.log({ blocks, vttString });
  return vttString;
}

// const formatSeconds = (seconds: number): string =>
//   seconds
//     ? new Date(parseFloat(seconds.toFixed(3)) * 1000).toISOString().substring(11, 23)
//     : '00:00:00:000';

const timecode = ({
  seconds = 0,
  frameRate = 1000,
  dropFrame,
  partialTimecode = false,
  offset = 0,
}: {
  seconds: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  frameRate: FRAMERATE | number;
  dropFrame?: boolean;
  partialTimecode: boolean;
  offset: number | string;
}): string => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  let tc = TC(
    (seconds || 0) * (frameRate as number),
    frameRate as FRAMERATE,
    dropFrame
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ).toString() as string;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    tc = TC((seconds || 0) * (frameRate as number), frameRate as FRAMERATE, dropFrame)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      .add(new TC(offset, frameRate as FRAMERATE, dropFrame))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .toString() as string;
  } catch (error) {
    console.log('offset', error);
  }

  // hh:mm:ss
  if (partialTimecode) return tc.split(':').slice(0, 3).join(':');

  // hh:mm:ss.mmmm
  if (frameRate === 1000) {
    // eslint-disable-next-line prefer-const
    let [hh, mm, ss, mmm] = tc.split(':');
    if (mmm.length === 4) mmm = mmm.slice(1, 3);
    if (mmm.length === 1) return `${hh}:${mm}:${ss}.${mmm}00`;
    if (mmm.length === 2) return `${hh}:${mm}:${ss}.${mmm}0`;
    tc = `${hh}:${mm}:${ss}.${mmm}`;
  }

  return tc;
};

const formatSeconds = (seconds: number): string => {
  if (seconds === undefined) return '00:00:00:000';
  return timecode({
    seconds,
    frameRate: 1000,
    partialTimecode: false,
    offset: 0,
  });
};
