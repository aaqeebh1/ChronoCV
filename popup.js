// popup.js

// Set up PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

const cvFileInput = document.getElementById("cvFile");
const uploadButton = document.getElementById("uploadButton");
const cvTextDisplay = document.getElementById("cvTextDisplay");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

// Elements for dropdown tagging
const taggingControls = document.getElementById("taggingControls");
const tagDropdown = document.getElementById("tagDropdown");
const applyTagButton = document.getElementById("applyTagButton");
const clearTagButton = document.getElementById("clearTagButton"); // New button

const taggedDataDisplay = document.getElementById("taggedDataDisplay");

// New elements for copy dropdowns
const fillControls = document.getElementById("fillControls");
const fillTagDropdown = document.getElementById("fillTagDropdown");
const copySelectedButton = document.getElementById("copySelectedButton");
const multiEntrySelectContainer = document.getElementById(
  "multiEntrySelectContainer"
);
const fillMultiEntryDropdown = document.getElementById(
  "fillMultiEntryDropdown"
);
const removeMultiEntryItemButton = document.getElementById(
  "removeMultiEntryItemButton"
); // New button
const noTaggedDataMessage = document.getElementById("noTaggedDataMessage");

let extractedCVText = "";
let taggedData = {}; // Stores the manually tagged data

// Define tags that can have multiple entries
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
  }, 5000); // Hide after 5 seconds
}

/**
 * Hides the error message.
 */
function hideErrorMessage() {
  errorMessage.classList.add("hidden");
}

/**
 * Shows the loading indicator.
 */
function showLoading() {
  loadingIndicator.classList.remove("hidden");
  uploadButton.disabled = true;
  cvFileInput.disabled = true;
  hideErrorMessage();
  taggingControls.classList.add("hidden"); // Hide tagging controls during loading
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
  loadingIndicator.classList.add("hidden");
  uploadButton.disabled = false;
  cvFileInput.disabled = false;
  // Show tagging controls only if CV text is available
  if (extractedCVText) {
    taggingControls.classList.remove("hidden");
  }
}

/**
 * Parses a PDF file and extracts text.
 * @param {File} file - The PDF file to parse.
 * @returns {Promise<string>} A promise that resolves with the extracted text.
 */
async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

/**
 * Parses a DOCX file and extracts text.
 * @param {File} file - The DOCX file to parse.
 * @returns {Promise<string>} A promise that resolves with the extracted text.
 */
async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value; // The raw text
}

/**
 * Parses a TXT file and extracts text.
 * @param {File} file - The TXT file to parse.
 * @returns {Promise<string>} A promise that resolves with the extracted text.
 */
function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

/**
 * Handles the CV file upload and parsing.
 */
uploadButton.addEventListener("click", async () => {
  const file = cvFileInput.files[0];
  if (!file) {
    showErrorMessage("Please select a CV file to upload.");
    return;
  }

  showLoading();
  extractedCVText = ""; // Clear previous text

  try {
    const fileType = file.type;
    if (fileType === "application/pdf") {
      extractedCVText = await parsePdf(file);
    } else if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extractedCVText = await parseDocx(file);
    } else if (fileType === "text/plain") {
      extractedCVText = await parseTxt(file);
    } else {
      showErrorMessage(
        "Unsupported file type. Please upload a PDF, DOCX, or TXT file."
      );
      return;
    }
    cvTextDisplay.textContent = extractedCVText;
  } catch (error) {
    console.error("Error parsing CV:", error);
    showErrorMessage(
      "Failed to parse CV. Please try again or use a different file."
    );
  } finally {
    hideLoading(); // This will now also show tagging controls if parsing was successful
  }
});

/**
 * Handles text selection and tagging from the dropdown, and automatically saves the data.
 */
applyTagButton.addEventListener("click", () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  const tag = tagDropdown.value;

  if (!selectedText) {
    showErrorMessage(
      'Please select some text in the "Extracted CV Text" area before tagging.'
    );
    return;
  }
  if (!tag) {
    showErrorMessage("Please select a tag from the dropdown.");
    return;
  }

  // Check if the tag is a multi-entry tag
  if (MULTI_ENTRY_TAGS.includes(tag)) {
    if (!taggedData[tag]) {
      // If it's a multi-entry tag and doesn't exist, initialize as an array
      taggedData[tag] = [selectedText];
    } else if (Array.isArray(taggedData[tag])) {
      // Check for duplicates before adding
      if (taggedData[tag].includes(selectedText)) {
        showErrorMessage(`"${selectedText}" is already added to ${tag}.`);
        return; // Do not add duplicate
      }
      // If it's an array, push the new entry
      taggedData[tag].push(selectedText);
    } else {
      // If it previously was a single entry, convert to array and add new entry
      // Check for duplicates before converting and adding
      if (taggedData[tag] === selectedText) {
        showErrorMessage(`"${selectedText}" is already added to ${tag}.`);
        return; // Do not add duplicate
      }
      taggedData[tag] = [taggedData[tag], selectedText];
    }
  } else {
    // For single-entry tags, overwrite the value
    taggedData[tag] = selectedText;
  }

  displayTaggedData(); // Update display
  saveTaggedData(); // Automatically save
  tagDropdown.value = ""; // Reset dropdown after tagging
});

/**
 * Handles clearing the data for a selected tag.
 */
clearTagButton.addEventListener("click", () => {
  const tagToClear = tagDropdown.value;
  if (!tagToClear) {
    showErrorMessage("Please select a tag to clear from the dropdown.");
    return;
  }

  // Using confirm for simplicity, consider a custom modal for production
  if (confirm(`Are you sure you want to clear all data for "${tagToClear}"?`)) {
    delete taggedData[tagToClear];
    displayTaggedData();
    saveTaggedData();
    tagDropdown.value = ""; // Reset dropdown after clearing
    clearTagButton.disabled = true; // Disable the button after clearing
  }
});

// Enable/disable clearTagButton based on tagDropdown selection
tagDropdown.addEventListener("change", () => {
  if (tagDropdown.value) {
    clearTagButton.disabled = false;
  } else {
    clearTagButton.disabled = true;
  }
});

/**
 * Displays the currently tagged data in JSON format.
 */
function displayTaggedData() {
  // Reverted to JSON.stringify for displaying the raw data structure
  // This will show arrays for multi-entry tags as standard JSON arrays.
  taggedDataDisplay.textContent = JSON.stringify(taggedData, null, 2);
  updateFillButtons(); // Update form fill buttons when tagged data changes
}

/**
 * Saves the tagged data to Chrome local storage.
 * This function is now called automatically after tagging.
 */
function saveTaggedData() {
  chrome.storage.local.set({ cvTaggedData: taggedData }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving data:", chrome.runtime.lastError);
      showErrorMessage("Error saving tagged data.");
    } else {
      console.log("Tagged data saved automatically:", taggedData);
      // Optionally, show a subtle success message if needed, but not an alert
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
      displayTaggedData();
    }
  });
});

/**
 * Populates the primary tag dropdown and manages the visibility of copy controls.
 */
async function updateFillButtons() {
  fillTagDropdown.innerHTML =
    '<option value="">-- Select Field to Copy --</option>'; // Clear and reset
  multiEntrySelectContainer.classList.add("hidden"); // Hide secondary dropdown by default
  fillMultiEntryDropdown.innerHTML =
    '<option value="">-- Select Item --</option>'; // Clear secondary dropdown
  removeMultiEntryItemButton.disabled = true; // Disable remove button by default

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

  // Populate the primary dropdown with tagged data keys
  for (const tag in taggedData) {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    fillTagDropdown.appendChild(option);
  }

  // Get the current active tab to check its URL for copy button state
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
  multiEntrySelectContainer.classList.add("hidden"); // Hide secondary dropdown by default
  fillMultiEntryDropdown.innerHTML =
    '<option value="">-- Select Item --</option>'; // Clear secondary dropdown
  removeMultiEntryItemButton.disabled = true; // Disable remove button by default

  if (
    selectedTag &&
    MULTI_ENTRY_TAGS.includes(selectedTag) &&
    Array.isArray(taggedData[selectedTag])
  ) {
    // If it's a multi-entry tag, populate the secondary dropdown
    multiEntrySelectContainer.classList.remove("hidden");
    taggedData[selectedTag].forEach((item, index) => {
      const option = document.createElement("option");
      option.value = item; // The actual item text
      option.textContent = `${index + 1}: ${item.substring(0, 50)}${
        item.length > 50 ? "..." : ""
      }`; // Show first 50 chars
      fillMultiEntryDropdown.appendChild(option);
    });
  }
});

/**
 * Enables/disables the removeMultiEntryItemButton based on secondary dropdown selection.
 */
fillMultiEntryDropdown.addEventListener("change", () => {
  if (fillMultiEntryDropdown.value) {
    removeMultiEntryItemButton.disabled = false;
  } else {
    removeMultiEntryItemButton.disabled = true;
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

  // Using confirm for simplicity, consider custom modal for production
  if (
    confirm(
      `Are you sure you want to remove "${itemToRemove}" from "${selectedTag}"?`
    )
  ) {
    taggedData[selectedTag] = taggedData[selectedTag].filter(
      (item) => item !== itemToRemove
    );

    // If the array becomes empty, delete the tag entirely
    if (taggedData[selectedTag].length === 0) {
      delete taggedData[selectedTag];
    }

    displayTaggedData();
    saveTaggedData();
    // Reset dropdowns after removal
    fillTagDropdown.value = "";
    fillMultiEntryDropdown.innerHTML =
      '<option value="">-- Select Item --</option>';
    multiEntrySelectContainer.classList.add("hidden");
    removeMultiEntryItemButton.disabled = true;
  }
});

/**
 * Handles the click event for the main copy button.
 * Copies either the single value or the selected multi-entry item.
 */
copySelectedButton.addEventListener("click", async () => {
  // Add a quick check to ensure the button isn't disabled (should be handled by updateFillButtons)
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
    // If it's a multi-entry tag
    const selectedItem = fillMultiEntryDropdown.value;
    if (selectedItem) {
      valueToCopy = selectedItem; // Copy the specific selected item
    } else {
      // If no specific item is selected, copy all items joined by newlines
      valueToCopy = taggedData[selectedTag].join("\n");
      showErrorMessage(
        `No specific item selected for ${selectedTag}. Copying all entries.`
      );
    }
  } else {
    // For single-entry tags, copy the direct value
    valueToCopy = taggedData[selectedTag];
  }

  if (valueToCopy) {
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Defensive checks for activeTab and its URL
      if (!activeTab || !activeTab.id) {
        console.error("Active tab or tab ID is missing.");
        showErrorMessage(
          "Could not determine the active tab. Please ensure a tab is open."
        );
        return;
      }

      // Check for restricted URLs. It's crucial this check happens BEFORE executeScript.
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

      // If we've passed all checks, proceed with executing the script
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: copyToClipboard,
        args: [valueToCopy],
      });
      console.log(`Copied "${valueToCopy}" to clipboard.`);
      // Optionally, show a temporary success message
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // This catch block will primarily handle errors *other* than the chrome:// URL restriction,
      // as that should be caught by the explicit 'if' condition above.
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
    // Avoid scrolling to bottom
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

// Initial update of fill buttons on load
updateFillButtons();
