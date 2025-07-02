// content.js
// This script runs on every page.

// You can add listeners here if you want content script to directly interact with pages.
// For now, most of the form-filling logic is handled by the background script
// using chrome.scripting.executeScript, which injects functions directly into the page's context.

console.log("CV Form Filler content script loaded.");

// Example: Listen for messages from the background script (if needed for more complex interactions)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillField") {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      activeElement.value = request.value;
      // Dispatch events to simulate user input for frameworks
      activeElement.dispatchEvent(new Event("input", { bubbles: true }));
      activeElement.dispatchEvent(new Event("change", { bubbles: true }));
      sendResponse({ success: true });
    } else {
      console.warn("No active input/textarea found to fill.");
      sendResponse({
        success: false,
        message: "No active input/textarea found.",
      });
    }
  }
  // You could add more actions here, e.g., to highlight fields, etc.
});
