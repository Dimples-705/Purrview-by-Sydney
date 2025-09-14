## summarizers/abstractive.js (optional, in‑browser Transformers)
```js
// summarizers/abstractive.js
// Uses Transformers.js (Xenova) to run an abstractive summarizer fully in-browser (no server, free),
// if vendor/transformers.min.js is present. Models are downloaded on first run and cached by the browser.

export async function canUseTransformers() {
  return typeof window !== 'undefined' && !!window.transformers;
}

export async function summarizeAbstractive(text, {
  model = 'Xenova/distilbart-cnn-6-6', // compact, high quality
  max_new_tokens = 160,
  min_length = 60,
  chunk_chars = 3000
} = {}) {
  if (!text?.trim()) return '';
  if (!(await canUseTransformers())) throw new Error('Transformers.js not available');

  const pipe = await window.transformers.pipeline('summarization', model);

  // Chunk long text, summarize chunks, then summarize the concatenated summaries
  const chunks = chunkText(text, chunk_chars);
  const partials = [];
  for (const c of chunks) {
    const out = await pipe(c, { max_new_tokens, min_length });
    partials.push(out[0].summary_text || out[0].generated_text || '');
  }
  const joined = partials.join('\n');
  const final = await pipe(joined, { max_new_tokens: Math.max(120, Math.round(max_new_tokens * 0.8)), min_length: Math.max(40, Math.round(min_length * 0.8)) });
  return final[0].summary_text || final[0].generated_text || joined;
}

function chunkText(t, size) {
  const arr = [];
  let i = 0;
  while (i < t.length) {
    arr.push(t.slice(i, i + size));
    i += size;
  }
  return arr;
}
```

---
