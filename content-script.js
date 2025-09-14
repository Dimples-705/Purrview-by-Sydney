## content-script.js
```js
// content-script.js
// Uses Mozilla Readability to extract article content
(function () {
  async function extract() {
    try {
      const doc = new DOMParser().parseFromString(document.documentElement.outerHTML, "text/html");
      const reader = new Readability(doc);
      const article = reader.parse();
      const content = article?.textContent?.trim() || document.body.innerText;
      return {
        title: article?.title || document.title,
        byline: article?.byline || "",
        url: location.href,
        content
      };
    } catch (err) {
      console.warn("Readability failed, falling back.", err);
      return { title: document.title, url: location.href, content: document.body.innerText };
    }
  }

  document.addEventListener("__AISUMMARIZER_REQUEST__", async () => {
    const result = await extract();
    document.dispatchEvent(new CustomEvent("__AISUMMARIZER_RESPONSE__", { detail: { content: result.content } }));
  });
})();
```

---

## vendor/Readability.js
> Drop in the official Readability.js from Mozilla here. Get it from the Readability repository and save as `vendor/Readability.js`. (License: Apache-2.0)

---

## summarizers/extractive.js (free, offline default)
```js
// summarizers/extractive.js
// Lightweight TextRank-inspired extractive summarizer (no external services)
export function summarizeExtractive(rawText, { maxSentences = 6, minSentenceLength = 40 } = {}) {
  if (!rawText) return "";

  // Basic cleanup
  const text = rawText
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();

  // Split into sentences (naïve but effective)
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9\"\'\(\[])/)
    .filter((s) => s.length >= Math.max(20, minSentenceLength))
    .slice(0, 2000); // hard cap

  if (sentences.length <= maxSentences) return sentences.join(" ");

  // Tokenize & normalize
  const stop = new Set("a,an,the,of,to,in,for,on,at,by,from,and,or,as,is,are,was,were,be,been,with,that,this,these,those,it,its,into,over,after,before,about,than,then,so,if,while,not,no,can,could,should,would,may,might,do,does,did,but,which,who,whom,whose,when,where,why,how".split(","));

  const toks = sentences.map((s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !stop.has(w)));

  // Build TF vectors
  const tf = toks.map((arr) => {
    const m = new Map();
    arr.forEach((w) => m.set(w, (m.get(w) || 0) + 1));
    return m;
  });

  // IDF
  const df = new Map();
  tf.forEach((m) => {
    for (const k of m.keys()) df.set(k, (df.get(k) || 0) + 1);
  });
  const N = tf.length;
  const idf = new Map(Array.from(df, ([k, v]) => [k, Math.log(1 + N / v)]));

  // Cosine similarity between sentence vectors
  function sim(i, j) {
    const mi = tf[i], mj = tf[j];
    let num = 0, d1 = 0, d2 = 0;
    for (const [k, v] of mi) {
      const vi = v * (idf.get(k) || 0);
      const vj = (mj.get(k) || 0) * (idf.get(k) || 0);
      num += vi * vj;
      d1 += vi * vi;
    }
    for (const [k, v] of mj) {
      const vv = v * (idf.get(k) || 0);
      d2 += vv * vv;
    }
    return num / (Math.sqrt(d1) * Math.sqrt(d2) + 1e-9);
  }

  // Build graph & PageRank
  const n = sentences.length;
  const edges = Array.from({ length: n }, () => new Map());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = sim(i, j);
      if (s > 0) {
        edges[i].set(j, s);
        edges[j].set(i, s);
      }
    }
  }
  let rank = new Float64Array(n).fill(1 / n);
  const d = 0.85, iters = 30;
  for (let t = 0; t < iters; t++) {
    const next = new Float64Array(n).fill((1 - d) / n);
    for (let i = 0; i < n; i++) {
      let outSum = 0; for (const v of edges[i].values()) outSum += v;
      for (const [j, w] of edges[i]) {
        next[j] += d * (outSum ? (rank[i] * (w / outSum)) : 0);
      }
    }
    rank = next;
  }

  // Pick top sentences in original order
  const idx = Array.from(rank.map((r, i) => [i, r]))
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSentences)
    .map(([i]) => i)
    .sort((a, b) => a - b);

  return idx.map((i) => sentences[i]).join(" ");
}
```

---

