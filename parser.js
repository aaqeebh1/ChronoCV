// parser.js

// Set up PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

const cvFileInput = document.getElementById("cvFile");
const uploadButton = document.getElementById("uploadButton");
const fileNameDisplay = document.getElementById("fileNameDisplay"); // New element for file name display
const chooseFileButton = document.getElementById("chooseFileButton"); // New element for custom button

const cvTextDisplay = document.getElementById("cvTextDisplay");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

// Elements for dropdown tagging
const taggingControls = document.getElementById("taggingControls");
const tagDropdown = document.getElementById("tagDropdown");
const applyTagButton = document.getElementById("applyTagButton");
const clearTagButton = document.getElementById("clearTagButton");

const taggedDataDisplay = document.getElementById("taggedDataDisplay");

let extractedCVText = "";
let taggedData = {}; // Stores the manually tagged data

// Define tags that can have multiple entries
const MULTI_ENTRY_TAGS = ["Skills", "Experience", "Education"];
// STRUCTURED_ENTRY_TAGS and related elements/logic are removed as per user request

/**
 * Displays an error message in the parser page.
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
  chooseFileButton.classList.add("opacity-50", "cursor-not-allowed"); // Disable custom button
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
  chooseFileButton.classList.remove("opacity-50", "cursor-not-allowed"); // Enable custom button
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

// Event listener for when a file is selected in the hidden input
cvFileInput.addEventListener("change", () => {
  if (cvFileInput.files.length > 0) {
    fileNameDisplay.textContent = cvFileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = "No file chosen";
  }
});

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

  // This logic is for non-structured multi-entry tags (like Skills) or single-entry tags
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
  const selectedTag = tagDropdown.value;
  if (selectedTag) {
    clearTagButton.disabled = false;
  } else {
    clearTagButton.disabled = true;
  }
});

/**
 * Displays the currently tagged data in JSON format.
 */
function displayTaggedData() {
  taggedDataDisplay.textContent = JSON.stringify(taggedData, null, 2);
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
    }
  });
}

/**
 * Loads tagged data from Chrome local storage when the parser page opens.
 */
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("cvTaggedData", (result) => {
    if (result.cvTaggedData) {
      taggedData = result.cvTaggedData;
      displayTaggedData();
    }
  });
});
