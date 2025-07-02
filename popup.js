// popup.js

// Set up PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

const cvFileInput = document.getElementById("cvFile");
const uploadButton = document.getElementById("uploadButton");
const cvTextDisplay = document.getElementById("cvTextDisplay");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const tagButtons = document.querySelectorAll(".tag-button");
const saveTagsButton = document.getElementById("saveTagsButton");
const taggedDataDisplay = document.getElementById("taggedDataDisplay");
const fillButtonsContainer = document.getElementById("fillButtonsContainer");

let extractedCVText = "";
let taggedData = {}; // Stores the manually tagged data

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
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
  loadingIndicator.classList.add("hidden");
  uploadButton.disabled = false;
  cvFileInput.disabled = false;
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
    hideLoading();
  }
});

/**
 * Handles text selection and tagging.
 */
tagButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    const tag = button.dataset.tag;

    if (selectedText && tag) {
      taggedData[tag] = selectedText;
      displayTaggedData();
    } else {
      showErrorMessage(
        'Please select some text in the "Extracted CV Text" area before tagging.'
      );
    }
  });
});

/**
 * Displays the currently tagged data.
 */
function displayTaggedData() {
  taggedDataDisplay.textContent = JSON.stringify(taggedData, null, 2);
  updateFillButtons(); // Update form fill buttons when tagged data changes
}

/**
 * Saves the tagged data to Chrome local storage.
 */
saveTagsButton.addEventListener("click", () => {
  if (Object.keys(taggedData).length === 0) {
    showErrorMessage("No data has been tagged to save.");
    return;
  }
  chrome.storage.local.set({ cvTaggedData: taggedData }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving data:", chrome.runtime.lastError);
      showErrorMessage("Error saving tagged data.");
    } else {
      console.log("Tagged data saved:", taggedData);
      // Optionally, show a success message
    }
  });
});

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
 * Updates the form filling buttons based on the tagged data.
 */
function updateFillButtons() {
  fillButtonsContainer.innerHTML = ""; // Clear existing buttons
  if (Object.keys(taggedData).length === 0) {
    fillButtonsContainer.innerHTML =
      '<p class="text-gray-600 text-sm">Upload and tag a CV to enable form filling options.</p>';
    return;
  }

  for (const tag in taggedData) {
    const value = taggedData[tag];
    const button = document.createElement("button");
    button.className =
      "fill-button bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-md shadow-sm transition duration-150 ease-in-out";
    button.textContent = `Copy ${tag}`;
    button.dataset.tag = tag;
    button.dataset.value = value; // Store the value to be copied

    button.addEventListener("click", async () => {
      try {
        // Use chrome.scripting to execute a script in the active tab
        await chrome.scripting.executeScript({
          target: {
            tabId: (
              await chrome.tabs.query({ active: true, currentWindow: true })
            )[0].id,
          },
          function: copyToClipboard,
          args: [value], // Pass the value to the injected function
        });
        console.log(`Copied "${value}" to clipboard.`);
        // Optionally, show a temporary success message
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        showErrorMessage(
          "Failed to copy to clipboard. Ensure you are on a valid webpage."
        );
      }
    });
    fillButtonsContainer.appendChild(button);
  }
}

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
