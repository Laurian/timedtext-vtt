/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { annotateTokens, type Token, type TokenMetadata } from './annotator';
import { generateVTT } from './vtt';
let paragraphs: Token[][] = [];
let minChars = 37;
let maxChars = 42;
let maxDuration = 7;
let maxGap = 2;
let karaoke = false;
let minReadingSpeed = 20;
let minLineDuration = 0.83;

let videoSrc = '';
const vttVersions: string[] = [];
let vtt = '';
// Load sample data
async function loadData() {
  try {
    const response = await window.fetch('./sample.json');
    const {
      metadata: { src },
      segments,
    } = (await response.json()) as {
      metadata: { src: string };
      segments: {
        blocks: {
          metadata: { speaker: string };
          tokens: { text: string; start: number; end: number }[];
        }[];
      }[];
    };

    videoSrc = src;

    const data = segments[0].blocks.map(({ metadata: { speaker }, tokens }) =>
      tokens.map(({ text, start, end }) => {
        const duration = end - start;
        return {
          text,
          start,
          duration,
          metadata: {
            speaker,
          } as TokenMetadata,
        } as Token;
      })
    );

    paragraphs = data;
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function processData() {
  // Annotate all paragraphs
  const annotatedParagraphs = paragraphs.map(paragraph =>
    annotateTokens(paragraph, 'en', minChars, maxChars, maxDuration, maxGap)
  );
  console.log(annotatedParagraphs);
  vtt = generateVTT(annotatedParagraphs, karaoke, minReadingSpeed, minLineDuration);
  vttVersions.push(vtt);
  console.log(vtt);

  // Display all paragraphs
  const paragraphsElement = document.querySelector<HTMLDivElement>('#paragraphs');
  paragraphsElement!.innerHTML = '';

  annotatedParagraphs.forEach(paragraph => {
    const wrapperElement = document.createElement('div');
    wrapperElement.classList.add('paragraphBlock');
    const paragraphElement = document.createElement('p');
    // const asideElement = document.createElement('aside');
    // asideElement.innerText = 'aaa';
    wrapperElement.appendChild(paragraphElement);
    // wrapperElement.appendChild(asideElement);

    const firstToken = paragraph[0];
    const start = firstToken.start;
    const speaker = firstToken.metadata.speaker;
    if (speaker !== undefined && speaker !== '') {
      paragraphElement.setAttribute('data-speaker', speaker);
    }
    if (start !== undefined) {
      paragraphElement.setAttribute('data-start', start.toString());
    }

    paragraph.forEach(token => {
      const tokenSpan = document.createElement('span');
      tokenSpan.style.display = 'inline-block';

      const ruby = document.createElement('ruby');
      const text = document.createTextNode(token.text);
      const rt = document.createElement('rt');

      // Create annotation text showing metadata
      const annotations: string[] = [];
      for (const key in token.metadata) {
        if (
          Object.prototype.hasOwnProperty.call(token.metadata, key) &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          (token.metadata[key as keyof TokenMetadata] ?? false)
        ) {
          if (key === 'chars' || key === 'lineDuration') {
            annotations.push(token.metadata[key as keyof TokenMetadata]?.toString() ?? '');
          } else {
            annotations.push(key);
            tokenSpan.classList.add(key);
          }
        }
      }

      rt.textContent = annotations.join(', ');

      ruby.appendChild(text);
      ruby.appendChild(rt);
      tokenSpan.appendChild(ruby);
      tokenSpan.setAttribute('title', annotations.join(', '));
      tokenSpan.setAttribute('data-start', token.start.toString());

      paragraphElement.appendChild(tokenSpan);

      tokenSpan.addEventListener('click', ({ target }) => {
        const start = (target as HTMLElement).closest('span')?.getAttribute('data-start');
        const videoElement = document.querySelector<HTMLVideoElement>('#video video');
        if (videoElement && start != null) {
          videoElement.currentTime = parseFloat(start);
        }
      });

      if (token.metadata.break ?? false) {
        paragraphElement.appendChild(document.createElement('br'));

        // Add subtitle break indicator
        if (token.metadata.subtitleBreak ?? false) {
          const subtitleBreakIndicator = document.createElement('hr');
          subtitleBreakIndicator.className = 'subtitle-break';
          paragraphElement.appendChild(subtitleBreakIndicator);
        }
      } else {
        paragraphElement.appendChild(document.createTextNode(' '));
      }
      // paragraphElement.appendChild(document.createTextNode(' '));
    });

    paragraphElement.classList.add('paragraph');
    paragraphsElement!.appendChild(wrapperElement);
  });
}

function renderVideo() {
  const videoWrapperElement = document.querySelector<HTMLDivElement>('#video');
  videoWrapperElement!.innerHTML = '';

  const videoElement = document.createElement('video');
  videoElement.src = videoSrc;
  videoElement.controls = true;
  const vttUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  // videoElement.addTextTrack('subtitles', 'Subtitles', vttUrl);

  const trackElement = document.createElement('track');
  trackElement.src = vttUrl;
  trackElement.default = true;
  trackElement.kind = 'subtitles';
  trackElement.srclang = 'en';
  trackElement.label = 'Subtitles';

  videoElement.appendChild(trackElement);
  videoWrapperElement!.appendChild(videoElement);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const hls = new window.Hls();
  hls.loadSource(videoSrc);
  hls.attachMedia(videoElement);
}

function updateVideoTrack() {
  const videoElement = document.querySelector<HTMLVideoElement>('#video video');
  if (videoElement) {
    // Remove all existing tracks
    while (videoElement.firstChild) {
      videoElement.removeChild(videoElement.firstChild);
    }

    // Add new track with updated VTT
    const vttUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    const trackElement = document.createElement('track');
    trackElement.src = vttUrl;
    trackElement.default = true;
    trackElement.kind = 'subtitles';
    trackElement.srclang = 'en';
    trackElement.label = 'Subtitles';
    videoElement.appendChild(trackElement);
  }
}

async function main() {
  await loadData();
  processData();
  renderVideo();
  const videoElement = document.querySelector<HTMLVideoElement>('#video video');
  if (videoElement) {
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      videoElement.textTracks[i].mode = 'showing';
    }
  }
}

function reload() {
  processData();
  updateVideoTrack();
  const videoElement = document.querySelector<HTMLVideoElement>('#video video');
  if (videoElement) {
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      videoElement.textTracks[i].mode = 'showing';
    }
  }
  showDiff();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

const showAnnotationsCheckbox = document.querySelector<HTMLInputElement>('#show-annotations');
showAnnotationsCheckbox?.addEventListener('change', () => {
  const paragraphsElement = document.querySelector<HTMLDivElement>('#paragraphs');
  paragraphsElement?.classList.toggle('show-annotations', showAnnotationsCheckbox.checked);
});

const minCharsInput = document.querySelector<HTMLInputElement>('#min-chars');
minCharsInput?.addEventListener('change', () => {
  minChars = parseInt(minCharsInput.value);
  reload();
});

const maxCharsInput = document.querySelector<HTMLInputElement>('#max-chars');
maxCharsInput?.addEventListener('change', () => {
  maxChars = parseInt(maxCharsInput.value);
  reload();
});

const maxDurationInput = document.querySelector<HTMLInputElement>('#max-duration');
maxDurationInput?.addEventListener('change', () => {
  maxDuration = parseInt(maxDurationInput.value);
  reload();
});

const maxGapInput = document.querySelector<HTMLInputElement>('#max-gap');
maxGapInput?.addEventListener('change', () => {
  maxGap = parseInt(maxGapInput.value);
  reload();
});

const karaokeCheckbox = document.querySelector<HTMLInputElement>('#karaoke');
karaokeCheckbox?.addEventListener('change', () => {
  karaoke = karaokeCheckbox.checked;
  reload();
});

// const reloadVideoButton = document.querySelector<HTMLButtonElement>('#reload-video');
// reloadVideoButton?.addEventListener('click', () => {
//   const videoWrapper = document.querySelector<HTMLDivElement>('#video');
//   if (videoWrapper) {
//     videoWrapper.innerHTML = '';
//   }
//   processData();
//   renderVideo();
//   const videoElement = document.querySelector<HTMLVideoElement>('#video video');
//   if (videoElement) {
//     for (let i = 0; i < videoElement.textTracks.length; i++) {
//       videoElement.textTracks[i].mode = 'showing';
//     }
//   }
// });

const minReadingSpeedInput = document.querySelector<HTMLInputElement>('#min-reading-speed');
minReadingSpeedInput?.addEventListener('change', () => {
  minReadingSpeed = parseInt(minReadingSpeedInput.value);
  reload();
});

const minLineDurationInput = document.querySelector<HTMLInputElement>('#min-line-duration');
minLineDurationInput?.addEventListener('change', () => {
  minLineDuration = parseFloat(minLineDurationInput.value);
  reload();
});

function showDiff() {
  // const diffContainer = document.querySelector<HTMLDivElement>('#diff-container');
  // diffContainer!.innerHTML = '';
  // // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  // const diff = window.jsdifflib.buildView({
  //   baseText: vttVersions[0],
  //   newText: vttVersions[1],
  //   // set the display titles for each resource
  //   baseTextName: 'Base Text',
  //   newTextName: 'New Text',
  //   contextSize: 10,
  //   //set inine to true if you want inline
  //   //rather than side by side diff
  //   inline: true,
  // });
  // diffContainer!.appendChild(diff);
}
