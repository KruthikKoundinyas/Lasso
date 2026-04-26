// popup.js — Lasso Copy Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-lasso");
  const statusMsg = document.getElementById("status-msg");
  const statCopies = document.getElementById("stat-copies");
  const settingToolbar = document.getElementById("setting-toolbar");

  // Mode buttons
  const modeFreeform = document.getElementById("mode-freeform");
  const modeRectangle = document.getElementById("mode-rectangle");

  // Format buttons
  const formatHtml = document.getElementById("format-html");
  const formatCleanHtml = document.getElementById("format-clean-html");
  const formatMarkdown = document.getElementById("format-markdown");
  const formatText = document.getElementById("format-text");

  // Load settings and stats
  chrome.storage.local.get(["settings", "copyCount"], (result) => {
    if (result.copyCount !== undefined) {
      statCopies.textContent = result.copyCount;
    } else {
      statCopies.textContent = "0";
    }

    if (result.settings) {
      // Load toolbar setting
      if (settingToolbar) {
        settingToolbar.checked = result.settings.showFloatingToolbar !== false;
      }

      // Load mode selection
      if (result.settings.mode === "freeform") {
        modeFreeform.classList.add("active");
        modeRectangle.classList.remove("active");
      } else {
        modeRectangle.classList.add("active");
        modeFreeform.classList.remove("active");
      }

      // Load format selection
      if (result.settings.format === "markdown") {
        formatMarkdown.classList.add("active");
        formatHtml.classList.remove("active");
        formatCleanHtml.classList.remove("active");
        formatText.classList.remove("active");
      } else if (result.settings.format === "text") {
        formatText.classList.add("active");
        formatHtml.classList.remove("active");
        formatCleanHtml.classList.remove("active");
        formatMarkdown.classList.remove("active");
      } else if (result.settings.format === "cleanHTML") {
        formatCleanHtml.classList.add("active");
        formatHtml.classList.remove("active");
        formatMarkdown.classList.remove("active");
        formatText.classList.remove("active");
      } else {
        formatHtml.classList.add("active");
        formatCleanHtml.classList.remove("active");
        formatMarkdown.classList.remove("active");
        formatText.classList.remove("active");
      }
    }
  });

  // Helper to get current selections
  function getSelections() {
    const mode = modeRectangle.classList.contains("active")
      ? "rectangle"
      : "freeform";
    let format = "html";
    if (formatMarkdown.classList.contains("active")) format = "markdown";
    else if (formatText.classList.contains("active")) format = "text";
    else if (formatCleanHtml && formatCleanHtml.classList.contains("active")) format = "cleanHTML";

    return { mode, format };
  }

  // Mode button click handlers
  modeFreeform.addEventListener("click", () => {
    modeFreeform.classList.add("active");
    modeRectangle.classList.remove("active");
    saveSettings();
  });

  modeRectangle.addEventListener("click", () => {
    modeRectangle.classList.add("active");
    modeFreeform.classList.remove("active");
    saveSettings();
  });

  // Format button click handlers
  formatHtml.addEventListener("click", () => {
    formatHtml.classList.add("active");
    if (formatCleanHtml) formatCleanHtml.classList.remove("active");
    formatMarkdown.classList.remove("active");
    formatText.classList.remove("active");
    saveSettings();
  });

  if (formatCleanHtml) {
    formatCleanHtml.addEventListener("click", () => {
      formatCleanHtml.classList.add("active");
      formatHtml.classList.remove("active");
      formatMarkdown.classList.remove("active");
      formatText.classList.remove("active");
      saveSettings();
    });
  }

  formatMarkdown.addEventListener("click", () => {
    formatMarkdown.classList.add("active");
    formatHtml.classList.remove("active");
    if (formatCleanHtml) formatCleanHtml.classList.remove("active");
    formatText.classList.remove("active");
    saveSettings();
  });

  formatText.addEventListener("click", () => {
    formatText.classList.add("active");
    formatHtml.classList.remove("active");
    if (formatCleanHtml) formatCleanHtml.classList.remove("active");
    formatMarkdown.classList.remove("active");
    saveSettings();
  });

  // Save settings to storage
  function saveSettings() {
    chrome.storage.local.get(["settings"], (result) => {
      const settings = result.settings || {};
      const selections = getSelections();
      settings.mode = selections.mode;
      settings.format = selections.format;
      if (settingToolbar) {
        settings.showFloatingToolbar = settingToolbar.checked;
      }
      chrome.storage.local.set({ settings });
    });
  }

  // Start lasso button
  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    startBtn.style.opacity = "0.7";
    statusMsg.textContent = "Click the page to start lasso...";

    // Save current settings before activating
    saveSettings();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showError("No active tab found");
        return;
      }

      const tab = tabs[0];

      // Can't inject into chrome:// pages
      if (
        tab.url &&
        (tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://") ||
          tab.url.startsWith("edge://"))
      ) {
        showError("Can't use on browser pages");
        return;
      }

      // Get current selections
      const selections = getSelections();

      // Send message to background to activate lasso with current settings
      chrome.runtime.sendMessage(
        {
          action: "activateLasso",
          mode: selections.mode,
          format: selections.format,
        },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            // Try direct injection as fallback
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                files: ["content/content.js"],
              },
              () => {
                // Send startLasso with mode and format
                chrome.tabs.sendMessage(
                  tab.id,
                  {
                    action: "startLasso",
                    mode: selections.mode,
                    format: selections.format,
                  },
                  () => {
                    // Close popup after activating
                    setTimeout(() => window.close(), 100);
                  },
                );
              },
            );
            return;
          }

          if (response && response.success) {
            statusMsg.classList.add("status-success");
            statusMsg.textContent = " Lasso active on page!";
            setTimeout(() => window.close(), 500);
          } else {
            showError("Could not activate");
          }
        },
      );
    });
  });

  // Settings
  if (settingToolbar) {
    settingToolbar.addEventListener("change", () => {
      saveSettings();
    });
  }

  function showError(msg) {
    startBtn.disabled = false;
    startBtn.style.opacity = "1";
    statusMsg.classList.add("status-error");
    statusMsg.textContent = msg;
    setTimeout(() => {
      statusMsg.textContent = "";
      statusMsg.classList.remove("status-error");
      statusMsg.classList.add("status-success");
    }, 3000);
  }
});
