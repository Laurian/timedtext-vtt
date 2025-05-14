import { annotateTokens, type Token, type TokenMetadata } from './annotator';

let paragraphs: Token[][] = [];
let minChars = 37;
let maxChars = 42;
let maxDuration = 7;
let maxGap = 2;
let karaoke = false;

// Load sample data
async function loadData() {
  try {
    const response = await window.fetch('/sample.json');
    const data = (await response.json()) as Token[][];

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

  // Display all paragraphs
  const paragraphsElement = document.querySelector<HTMLDivElement>('#paragraphs');
  paragraphsElement!.innerHTML = '';

  annotatedParagraphs.forEach(paragraph => {
    const paragraphElement = document.createElement('p');

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

      paragraphElement.appendChild(tokenSpan);
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
    paragraphsElement!.appendChild(paragraphElement);
  });
}

async function main() {
  await loadData();
  processData();
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
  processData();
});

const maxCharsInput = document.querySelector<HTMLInputElement>('#max-chars');
maxCharsInput?.addEventListener('change', () => {
  maxChars = parseInt(maxCharsInput.value);
  processData();
});

const maxDurationInput = document.querySelector<HTMLInputElement>('#max-duration');
maxDurationInput?.addEventListener('change', () => {
  maxDuration = parseInt(maxDurationInput.value);
  processData();
});

const maxGapInput = document.querySelector<HTMLInputElement>('#max-gap');
maxGapInput?.addEventListener('change', () => {
  maxGap = parseInt(maxGapInput.value);
  processData();
});

const karaokeCheckbox = document.querySelector<HTMLInputElement>('#karaoke');
karaokeCheckbox?.addEventListener('change', () => {
  karaoke = karaokeCheckbox.checked;
  processData();
});
