## options/options.js
```js
(async function() {
  const providerEl = document.getElementById('provider');
  const apikeyEl = document.getElementById('apikey');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('save');

  const saved = await browser.storage.local.get(['provider', 'apikey']);
  providerEl.value = saved.provider || 'none';
  apikeyEl.value = saved.apikey || '';

  saveBtn.addEventListener('click', async () => {
    await browser.storage.local.set({ provider: providerEl.value, apikey: apikeyEl.value });
    statusEl.textContent = 'Saved!';
    setTimeout(() => (statusEl.textContent = ''), 1200);
  });
})();
```

---
