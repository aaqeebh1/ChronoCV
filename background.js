chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fillName",
    title: "Fill Name",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillEmail",
    title: "Fill Email",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillPhone",
    title: "Fill Phone",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillAddress",
    title: "Fill Address",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillSkills",
    title: "Fill Skills",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillExperience",
    title: "Fill Experience",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillEducation",
    title: "Fill Education",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillSummary",
    title: "Fill Summary",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillLinkedIn",
    title: "Fill LinkedIn",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillWebsite",
    title: "Fill Website",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillGithub",
    title: "Fill Github",
    contexts: ["editable"],
  });
  chrome.contextMenus.create({
    id: "fillOther",
    title: "Fill Other",
    contexts: ["editable"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("fill") && info.editable) {
    const tag = info.menuItemId.replace("fill", "");
    chrome.storage.local.get("cvTaggedData", (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error retrieving data:", chrome.runtime.lastError);
        return;
      }
      const taggedData = result.cvTaggedData || {};
      const valueToFill = taggedData[tag];

      if (valueToFill) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            function: fillInputField,
            args: [valueToFill],
          })
          .then(() => {
            console.log(`Filled ${tag} with: ${valueToFill}`);
          })
          .catch((error) => {
            console.error(`Failed to fill ${tag}:`, error);
          });
      } else {
        console.warn(`No data found for tag: ${tag}`);
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: showNotification,
          args: [
            `No CV data found for "${tag}". Please tag it in the extension popup.`,
          ],
        });
      }
    });
  }
});

/**
 * Function to be injected into the content script to fill an input field.
 * This function must be self-contained.
 * @param {string} value - The value to fill into the input field.
 */
function fillInputField(value) {
  const activeElement = document.activeElement;
  if (
    activeElement &&
    (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
  ) {
    activeElement.value = value;
    // Dispatch input and change events to trigger any frameworks listening for changes
    activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    activeElement.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    console.warn("No active input or textarea element to fill.");
    try {
      document.execCommand("insertText", false, value);
    } catch (e) {
      console.error("Could not fill field using execCommand:", e);
    }
  }
}

/**
 * Function to be injected into the content script to show a temporary notification.
 * @param {string} message - The message to display.
 */
function showNotification(message) {
  const notificationDiv = document.createElement("div");
  notificationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #333;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    `;
  notificationDiv.textContent = message;
  document.body.appendChild(notificationDiv);

  setTimeout(() => {
    notificationDiv.style.opacity = "1";
  }, 100);

  setTimeout(() => {
    notificationDiv.style.opacity = "0";
    notificationDiv.addEventListener("transitionend", () =>
      notificationDiv.remove()
    );
  }, 3000);
}
