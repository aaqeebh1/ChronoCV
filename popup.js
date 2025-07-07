// popup.js

const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const openParserButton = document.getElementById("openParserButton");

const fillControls = document.getElementById("fillControls");
const fillTagDropdown = document.getElementById("fillTagDropdown");
const multiEntrySelectContainer = document.getElementById(
  "multiEntrySelectContainer"
);
const fillMultiEntryDropdown = document.getElementById(
  "fillMultiEntryDropdown"
);
const removeMultiEntryItemButton = document.getElementById(
  "removeMultiEntryItemButton"
);
const noTaggedDataMessage = document.getElementById("noTaggedDataMessage");
const taggedDataPreview = document.getElementById("taggedDataPreview");

const copySelectedButton = document.getElementById("copySelectedButton");

let taggedData = {};
const MULTI_ENTRY_TAGS = ["Skills", "Experience", "Education"];

/**
 * Displays an error message in the popup.
 * @param {string} message - The error message to display.
 */
function showErrorMessage(message) {
  errorText.textContent = message;
  errorMessage.classList.remove("hidden");
  setTimeout(() => {
    errorMessage.classList.add("hidden");
  }, 5000);
}

/**
 * Hides the error message.
 */
function hideErrorMessage() {
  errorMessage.classList.add("hidden");
}

/**
 * Opens the dedicated parser.html page in a new tab.
 */
openParserButton.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("parser.html") });
});

/**
 * Displays the currently tagged data in a formatted way in the preview area.
 * If a specific tag and optionally an item are provided, only that data is shown.
 * @param {string} [tagToDisplay] - Optional tag name to display.
 * @param {string} [itemToDisplay] - Optional specific item from a multi-entry tag to display.
 */
function displayTaggedDataPreview(tagToDisplay, itemToDisplay = null) {
  if (!taggedDataPreview) {
    console.error("Error: 'taggedDataPreview' element not found in the DOM.");
    return;
  }

  if (Object.keys(taggedData).length === 0) {
    taggedDataPreview.innerHTML =
      "Select a field below to preview its tagged data."; // Use innerHTML
    return;
  }

  if (!tagToDisplay) {
    taggedDataPreview.innerHTML =
      "Select a field above to preview its tagged data."; // Use innerHTML
    return;
  }

  const data = taggedData[tagToDisplay];
  let formattedHtml = ""; // Changed to formattedHtml

  if (data) {
    if (MULTI_ENTRY_TAGS.includes(tagToDisplay) && Array.isArray(data)) {
      if (itemToDisplay !== null && data.includes(itemToDisplay)) {
        formattedHtml += `<strong>${tagToDisplay} :</strong><br>`; // Use strong and br
        formattedHtml += `<span>${itemToDisplay}</span>`; // Use span
      } else {
        formattedHtml += `<strong>${tagToDisplay}:</strong><br>`; // Use strong and br
        formattedHtml += `<ul>`; // Start unordered list
        data.forEach((item) => {
          formattedHtml += `<li>${item}</li>`; // List item
        });
        formattedHtml += `</ul>`; // End unordered list
      }
    } else {
      formattedHtml += `<strong>${tagToDisplay}:</strong><br>`; // Use strong and br
      formattedHtml += `<span>${data}</span>`; // Use span
    }
  } else {
    formattedHtml = `No data tagged for "<strong>${tagToDisplay}</strong>".`; // Use strong
  }

  taggedDataPreview.innerHTML = formattedHtml; // Use innerHTML
}

/**
 * Saves the tagged data to Chrome local storage.
 */
function saveTaggedData() {
  chrome.storage.local.set({ cvTaggedData: taggedData }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving data:", chrome.runtime.lastError);
      showErrorMessage("Error saving tagged data.");
    } else {
      console.log("Tagged data saved automatically:", taggedData);
    }
  });
}

/**
 * Loads tagged data from Chrome local storage when the popup opens.
 */
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("cvTaggedData", (result) => {
    if (result.cvTaggedData) {
      taggedData = result.cvTaggedData;
    }
    displayTaggedDataPreview();
    updateFillButtons();
  });
});

/**
 * Populates the primary tag dropdown and manages the visibility of copy controls.
 */
async function updateFillButtons() {
  fillTagDropdown.innerHTML =
    '<option value="">-- Select Field to Copy --</option>';
  multiEntrySelectContainer.classList.add("hidden");
  fillMultiEntryDropdown.innerHTML =
    '<option value="">-- Select Item --</option>';
  removeMultiEntryItemButton.disabled = true;

  if (Object.keys(taggedData).length === 0) {
    noTaggedDataMessage.classList.remove("hidden");
    fillTagDropdown.disabled = true;
    copySelectedButton.disabled = true;
    return;
  } else {
    noTaggedDataMessage.classList.add("hidden");
    fillTagDropdown.disabled = false;
    copySelectedButton.disabled = false;
  }

  for (const tag in taggedData) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    fillTagDropdown.appendChild(option);
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const isRestrictedUrl =
    activeTab &&
    activeTab.url &&
    (activeTab.url.startsWith("chrome://") ||
      activeTab.url.startsWith("about:"));

  if (isRestrictedUrl) {
    copySelectedButton.disabled = true;
    copySelectedButton.classList.add("opacity-50", "cursor-not-allowed");
    copySelectedButton.title =
      "Cannot copy to clipboard on chrome:// or about: URLs";
  } else {
    copySelectedButton.disabled = false;
    copySelectedButton.classList.remove("opacity-50", "cursor-not-allowed");
    copySelectedButton.title = "";
  }
}

/**
 * Handles selection in the primary fill tag dropdown.
 * Populates secondary dropdown if the selected tag is multi-entry.
 */
fillTagDropdown.addEventListener("change", () => {
  const selectedTag = fillTagDropdown.value;
  multiEntrySelectContainer.classList.add("hidden");
  fillMultiEntryDropdown.innerHTML =
    '<option value="">-- Select Item --</option>';
  removeMultiEntryItemButton.disabled = true;

  displayTaggedDataPreview(selectedTag);

  if (
    selectedTag &&
    MULTI_ENTRY_TAGS.includes(selectedTag) &&
    Array.isArray(taggedData[selectedTag])
  ) {
    multiEntrySelectContainer.classList.remove("hidden");
    taggedData[selectedTag].forEach((item, index) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = `${index + 1}: ${item.substring(0, 50)}${
        item.length > 50 ? "..." : ""
      }`;
      fillMultiEntryDropdown.appendChild(option);
    });
  }
});

/**
 * Enables/disables the removeMultiEntryItemButton based on secondary dropdown selection.
 */
fillMultiEntryDropdown.addEventListener("change", () => {
  const selectedTag = fillTagDropdown.value;
  const selectedItem = fillMultiEntryDropdown.value;

  if (selectedItem) {
    removeMultiEntryItemButton.disabled = false;
    displayTaggedDataPreview(selectedTag, selectedItem);
  } else {
    removeMultiEntryItemButton.disabled = true;
    displayTaggedDataPreview(selectedTag);
  }
});

/**
 * Handles removing a selected item from a multi-entry tag.
 */
removeMultiEntryItemButton.addEventListener("click", () => {
  const selectedTag = fillTagDropdown.value;
  const itemToRemove = fillMultiEntryDropdown.value;

  if (!selectedTag || !itemToRemove) {
    showErrorMessage("Please select both a tag and an item to remove.");
    return;
  }

  if (
    !MULTI_ENTRY_TAGS.includes(selectedTag) ||
    !Array.isArray(taggedData[selectedTag])
  ) {
    showErrorMessage(
      "Selected tag is not a multi-entry tag or has no items to remove."
    );
    return;
  }

  if (
    confirm(
      `Are you sure you want to remove "${itemToRemove}" from "${selectedTag}"?`
    )
  ) {
    taggedData[selectedTag] = taggedData[selectedTag].filter(
      (item) => item !== itemToRemove
    );

    if (taggedData[selectedTag].length === 0) {
      delete taggedData[selectedTag];
    }

    displayTaggedDataPreview(fillTagDropdown.value);
    saveTaggedData();
    fillTagDropdown.value = "";
    fillMultiEntryDropdown.innerHTML =
      '<option value="">-- Select Item --</option>';
    multiEntrySelectContainer.classList.add("hidden");
    removeMultiEntryItemButton.disabled = true;
    updateFillButtons();
  }
});

/**
 * Handles the click event for the main copy button.
 * Copies either the single value or the selected multi-entry item.
 */
copySelectedButton.addEventListener("click", async () => {
  if (copySelectedButton.disabled) {
    console.warn("Copy button was clicked but is disabled. Preventing action.");
    showErrorMessage("Copy function is disabled for this page.");
    return;
  }

  const selectedTag = fillTagDropdown.value;
  let valueToCopy = "";

  if (!selectedTag) {
    showErrorMessage("Please select a field to copy from the dropdown.");
    return;
  }

  if (
    MULTI_ENTRY_TAGS.includes(selectedTag) &&
    Array.isArray(taggedData[selectedTag])
  ) {
    const selectedItem = fillMultiEntryDropdown.value;
    if (selectedItem) {
      valueToCopy = selectedItem;
    } else {
      valueToCopy = taggedData[selectedTag].join("\n");
      showErrorMessage(
        `No specific item selected for ${selectedTag}. Copying all entries.`
      );
    }
  } else {
    valueToCopy = taggedData[selectedTag];
  }

  if (valueToCopy) {
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab || !activeTab.id) {
        console.error("Active tab or tab ID is missing.");
        showErrorMessage(
          "Could not determine the active tab. Please ensure a tab is open."
        );
        return;
      }

      if (
        activeTab.url &&
        (activeTab.url.startsWith("chrome://") ||
          activeTab.url.startsWith("about:"))
      ) {
        console.warn(
          "Attempted to copy on a restricted Chrome internal page:",
          activeTab.url
        );
        showErrorMessage(
          "Cannot copy to clipboard on this type of page (e.g., Chrome internal pages or about:blank)."
        );
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: copyToClipboard,
        args: [valueToCopy],
      });
      console.log(`Copied "${valueToCopy}" to clipboard.`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      if (
        error.message &&
        error.message.includes("Cannot access a chrome:// URL")
      ) {
        showErrorMessage("Failed to copy. This is a restricted Chrome page.");
      } else if (error.message && error.message.includes("No tab with id")) {
        showErrorMessage("Failed to copy. Active tab not found or accessible.");
      } else {
        showErrorMessage(
          "Failed to copy to clipboard. Ensure you are on a valid webpage and the extension has permission."
        );
      }
    }
  } else {
    showErrorMessage("No data available to copy for the selected field.");
  }
});

/**
 * Function to be injected into the content script to copy text to clipboard.
 * This function must be self-contained and passed to chrome.scripting.executeScript.
 * @param {string} text - The text to copy.
 */
function copyToClipboard(text) {
  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      const msg = successful ? "successful" : "unsuccessful";
      console.log("Fallback: Copying text command was " + msg);
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () {
        console.log("Async: Copying to clipboard was successful!");
      },
      function (err) {
        console.error("Async: Could not copy text: ", err);
        fallbackCopyTextToClipboard(text);
      }
    );
  } else {
    fallbackCopyTextToClipboard(text);
  }
}
