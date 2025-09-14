## background.js
```js
// background.js (MV3 service worker)
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "ai-summarize",
    title: "Summarize with AI",
    contexts: ["page", "selection"]
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "ai-summarize") return;
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise((resolve) => {
          document.dispatchEvent(new CustomEvent("__AISUMMARIZER_REQUEST__"));
          const handler = (e) => {
            document.removeEventListener("__AISUMMARIZER_RESPONSE__", handler);
            resolve({
              title: document.title,
              url: location.href,
              content: e.detail?.content || document.body.innerText
            });
          };
          document.addEventListener("__AISUMMARIZER_RESPONSE__", handler, { once: true });
        });
      }
    });

    // Open popup and send payload
    await browser.storage.session.set({ lastExtraction: result });
    await browser.action.openPopup();
  } catch (e) {
    console.error(e);
  }
});
```

---
