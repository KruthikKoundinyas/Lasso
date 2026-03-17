// background.js - Service Worker for Lasso Copy Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log("Lasso Copy installed");
  chrome.storage.local.set({
    lassoActive: false,
    copyCount: 0,
    settings: {
      showFloatingToolbar: true,
      copyFormat: "html",
      highlightColor: "#db5266",
    },
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "activateLasso") {
    // Get mode and format from message or use defaults
    const mode = message.mode || "rectangle";
    const format = message.format || "html";

    // Inject lasso into the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "startLasso", mode, format },
          (response) => {
            if (chrome.runtime.lastError) {
              // Content script may not be injected yet, inject it
              chrome.scripting
                .executeScript({
                  target: { tabId: tabs[0].id },
                  files: ["content/content.js"],
                })
                .then(() => {
                  chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: "startLasso", mode, format },
                    sendResponse,
                  );
                })
                .catch((err) => {
                  sendResponse({ success: false, error: err.message });
                });
            } else {
              sendResponse(response);
            }
          },
        );
      }
    });
    return true; // Keep message channel open
  }

  if (message.action === "copySuccess") {
    // Increment copy counter
    chrome.storage.local.get(["copyCount"], (result) => {
      chrome.storage.local.set({ copyCount: (result.copyCount || 0) + 1 });
    });

    // Show badge briefly
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.action.setBadgeText({ text: "Done! ", tabId: tabs[0].id });
        chrome.action.setBadgeBackgroundColor({
          color: "#10b981",
          tabId: tabs[0].id,
        });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tabs[0].id });
        }, 2000);
      }
    });
  }

  if (message.action === "getSettings") {
    chrome.storage.local.get(["settings", "copyCount"], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "saveSettings") {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle keyboard shortcut (optional)
chrome.commands &&
  chrome.commands.onCommand &&
  chrome.commands.onCommand.addListener((command) => {
    if (command === "activate-lasso") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "startLasso" });
        }
      });
    }
  });
