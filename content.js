console.log("CV Form Filler content script loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillField") {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA")
    ) {
      activeElement.value = request.value;
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
});
