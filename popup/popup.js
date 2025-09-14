## popup/popup.js
```js
import { summarizeExtractive } from "../summarizers/extractive.js";
import { summarizeAbstractive, canUseTransformers } from "../summarizers/abstractive.js";

const btn = document.getElementById('summarize');
const output = document.getElementById('output');
const modeSel = document.getElementById('mode');
const lenSel = document.getElementById('length');
const meta = document.getElementById('meta');

function lengthToParams(len) {
  switch (len) {
    case 'short': return { maxSentences: 4, minSentenceLength: 30, max_new_tokens: 100, min_length: 40 };
    case 'long': return { maxSentences: 10, minSentenceLength: 30, max_new_tokens: 220, min_length: 80 };
    default: return { maxSentences: 6, minSentenceLength: 30, max_new_tokens: 160, min_length: 60 };
  }
}

async function loadExtractionFromTab() {
  const data = await browser.storage.session.get('lastExtraction');
  if (data?.lastExtraction) return data.lastExtraction;
  // Fallback: pull now
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({ title: document.title, url: location.href, content: document.body.innerText })
  });
  return result;
}

async function ensureModeAvailability() {
  if (modeSel.value === 'abstractive' && !(await canUseTransformers())) {
    alert('Abstractive mode requires bundling vendor/transformers.min.js. Falling back to Extractive.');
    modeSel.value = 'extractive';
  }
}

btn.addEventListener('click', async () => {
  btn.disabled = true; output.value = 'Summarizing…';
  try {
    await ensureModeAvailability();
    const { title, url, content } = await loadExtractionFromTab();
    const { maxSentences, minSentenceLength, max_new_tokens, min_length } = lengthToParams(lenSel.value);

    let summary = '';
    if (modeSel.value === 'abstractive' && await canUseTransformers()) {
      summary = await summarizeAbstractive(content, { max_new_tokens, min_length });
    } else {
      summary = summarizeExtractive(content, { maxSentences, minSentenceLength });
    }

    output.value = summary;
    meta.textContent = `${title || ''} — ${new URL(url).hostname}`;
  } catch (e) {
    console.error(e);
    output.value = 'Failed to summarize this page.';
  } finally {
    btn.disabled = false;
  }
});

// Options link
const openOptions = document.getElementById('openOptions');
openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});
```

---
