// parser.js

// Set up PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

const cvFileInput = document.getElementById("cvFile");
const uploadButton = document.getElementById("uploadButton");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const chooseFileButton = document.getElementById("chooseFileButton");

const cvTextDisplay = document.getElementById("cvTextDisplay");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

const taggingControls = document.getElementById("taggingControls");
const tagDropdown = document.getElementById("tagDropdown");
const applyTagButton = document.getElementById("applyTagButton");
const clearTagButton = document.getElementById("clearTagButton");

const taggedDataDisplay = document.getElementById("taggedDataDisplay");

// Manual link input fields
const linkedInInput = document.getElementById("linkedInInput");
const githubInput = document.getElementById("githubInput");
const websiteInput = document.getElementById("websiteInput");
const directLinkInputSection = document.getElementById(
  "directLinkInputSection"
);

// New custom tag input fields
const customTagNameInput = document.getElementById("customTagNameInput");
const customTagValueInput = document.getElementById("customTagValueInput");
const customTagInputSection = document.getElementById("customTagInputSection");

let extractedCVText = "";
let taggedData = {}; // Stores the manually tagged data

const MULTI_ENTRY_TAGS = [
  "Skills",
  "Experience",
  "Education",
  "Projects",
  "Awards",
  "Certifications",
  "Languages",
  "Links",
];
const LINK_GROUP_TAG = "Links";
const OTHER_TAG = "Other";

/**
 * Displays an error message in the parser page.
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
 * Shows the loading indicator.
 */
function showLoading() {
  loadingIndicator.classList.remove("hidden");
  uploadButton.disabled = true;
  cvFileInput.disabled = true;
  chooseFileButton.classList.add("opacity-50", "cursor-not-allowed");
  hideErrorMessage();
  taggingControls.classList.add("hidden");
  directLinkInputSection.classList.add("hidden"); // Hide direct link inputs during loading
  customTagInputSection.classList.add("hidden"); // Hide custom tag inputs during loading
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
  loadingIndicator.classList.add("hidden");
  uploadButton.disabled = false;
  cvFileInput.disabled = false;
  chooseFileButton.classList.remove("opacity-50", "cursor-not-allowed");
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
 * @returns {Promise<string>} A promise that resolves with the extracted raw text.
 */
async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
  return result.value;
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
 * Attempts to auto-detect common links (LinkedIn, Github, Website) from raw text
 * and pre-fill the manual input fields.
 * @param {string} text - The full extracted CV text.
 */
function autoDetectAndFillLinkInputs(text) {
  // Clear previous values in manual inputs
  linkedInInput.value = "";
  githubInput.value = "";
  websiteInput.value = "";
  customTagNameInput.value = "";
  customTagValueInput.value = "";

  // LinkedIn
  const linkedinRegex =
    /(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(?:\/?))/i;
  const foundLinkedIn = text.match(linkedinRegex);
  if (foundLinkedIn && foundLinkedIn[0]) {
    linkedInInput.value = foundLinkedIn[0];
  }

  // Github
  const githubRegex =
    /(https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+(?:\/?))/i;
  const foundGithub = text.match(githubRegex);
  if (foundGithub && foundGithub[0]) {
    githubInput.value = foundGithub[0];
  }

  // General Website (prioritize if not already LinkedIn/Github)
  const websiteRegex =
    /(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i;
  const foundWebsite = text.match(websiteRegex);
  if (foundWebsite && foundWebsite[0]) {
    const url = foundWebsite[0];
    if (!url.includes("linkedin.com") && !url.includes("github.com")) {
      websiteInput.value = url;
    }
  }
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
  // taggedData = {}; // REMOVED: Do NOT clear taggedData on upload, let it persist from storage
  displayTaggedData(); // Clear the display immediately (reflects empty or loaded data)

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
    autoDetectAndFillLinkInputs(extractedCVText); // Auto-fill manual link inputs
    saveTaggedData(); // Save the (potentially updated) tagged data
  } catch (error) {
    console.error("Error parsing CV:", error);
    showErrorMessage(
      "Failed to parse CV. Please try again or use a different file. Error: " +
        error.message
    );
  } finally {
    hideLoading();
  }
});

/**
 * Handles text selection and tagging from the dropdown, and automatically saves the data.
 * Prioritizes manual input fields for specific tags.
 */
applyTagButton.addEventListener("click", () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  const tag = tagDropdown.value;

  if (!tag) {
    showErrorMessage("Please select a tag from the dropdown.");
    return;
  }

  let valueToTag = selectedText; // Default to selected text

  if (tag === LINK_GROUP_TAG) {
    // For 'Links' tag, collect values from all link inputs
    const links = [];
    if (linkedInInput.value.trim())
      links.push({ type: "LinkedIn", url: linkedInInput.value.trim() });
    if (githubInput.value.trim())
      links.push({ type: "Github", url: githubInput.value.trim() });
    if (websiteInput.value.trim())
      links.push({ type: "Website", url: websiteInput.value.trim() });

    if (links.length === 0 && !selectedText) {
      showErrorMessage(
        "Please enter a link in the direct input fields or select text from the CV."
      );
      return;
    } else if (links.length > 0) {
      // If manual links are entered, use them. If text is also selected, add it as a generic link.
      if (selectedText) {
        // Check if selectedText is a URL, if so, add as generic link
        const isSelectedTextLink =
          selectedText.startsWith("http://") ||
          selectedText.startsWith("https://");
        if (isSelectedTextLink) {
          links.push({ type: "Other Link", url: selectedText });
        } else {
          showErrorMessage(
            'Selected text is not a valid URL for "Links" tag when direct inputs are used.'
          );
          return;
        }
      }
      valueToTag = links; // Store as an array of objects
    } else {
      // Only selectedText is available
      const isSelectedTextLink =
        selectedText.startsWith("http://") ||
        selectedText.startsWith("https://");
      if (isSelectedTextLink) {
        valueToTag = [{ type: "Other Link", url: selectedText }];
      } else {
        showErrorMessage('Selected text is not a valid URL for "Links" tag.');
        return;
      }
    }
  } else if (tag === OTHER_TAG) {
    // For 'Other' tag, use custom name and value
    const customTagName = customTagNameInput.value.trim();
    const customTagValue = customTagValueInput.value.trim();

    if (!customTagName || !customTagValue) {
      showErrorMessage("Please enter both a custom tag name and a value.");
      return;
    }
    // Store 'Other' as a single entry, but its value is an object
    taggedData[customTagName] = customTagValue; // Store directly under custom name
    // No need to set taggedData[OTHER_TAG]
    displayTaggedData();
    saveTaggedData();
    customTagNameInput.value = "";
    customTagValueInput.value = "";
    tagDropdown.value = "";
    return; // Exit early as we've handled saving for 'Other'
  } else if (!selectedText) {
    showErrorMessage(
      'Please select some text in the "Extracted CV Text" area before tagging.'
    );
    return;
  }

  if (MULTI_ENTRY_TAGS.includes(tag) && tag !== LINK_GROUP_TAG) {
    // Apply to other multi-entry tags
    if (!taggedData[tag]) {
      taggedData[tag] = [valueToTag];
    } else if (Array.isArray(taggedData[tag])) {
      if (!taggedData[tag].includes(valueToTag)) {
        taggedData[tag].push(valueToTag);
      } else {
        showErrorMessage(`"${valueToTag}" is already added to ${tag}.`);
        return;
      }
    } else {
      taggedData[tag] = [taggedData[tag], valueToTag];
    }
  } else if (tag === LINK_GROUP_TAG) {
    // For 'Links' tag, always add to an array of link objects
    if (!taggedData[tag]) {
      taggedData[tag] = [];
    }
    // Ensure valueToTag is an array of objects for 'Links'
    if (Array.isArray(valueToTag)) {
      valueToTag.forEach((linkObj) => {
        // Prevent duplicate links based on URL
        if (
          !taggedData[tag].some(
            (existingLink) => existingLink.url === linkObj.url
          )
        ) {
          taggedData[tag].push(linkObj);
        } else {
          showErrorMessage(`Link "${linkObj.url}" is already added to ${tag}.`);
        }
      });
    } else {
      // Fallback if somehow a single link string came through
      const isLink =
        typeof valueToTag === "string" &&
        (valueToTag.startsWith("http://") || valueToTag.startsWith("https://"));
      if (
        isLink &&
        !taggedData[tag].some((existingLink) => existingLink.url === valueToTag)
      ) {
        taggedData[tag].push({ type: "Other Link", url: valueToTag });
      } else if (isLink) {
        showErrorMessage(`Link "${valueToTag}" is already added to ${tag}.`);
      }
    }
  } else {
    taggedData[tag] = valueToTag;
  }

  displayTaggedData();
  saveTaggedData();
  tagDropdown.value = "";

  // Clear the specific manual input field if its content was used
  linkedInInput.value = "";
  githubInput.value = "";
  websiteInput.value = "";
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

  if (confirm(`Are you sure you want to clear all data for "${tagToClear}"?`)) {
    if (MULTI_ENTRY_TAGS.includes(tagToClear)) {
      // For 'Links', clear all sub-links
      if (tagToClear === LINK_GROUP_TAG) {
        taggedData[tagToClear] = [];
      } else {
        taggedData[tagToClear] = [];
      }
    } else {
      delete taggedData[tagToClear];
    }
    displayTaggedData();
    saveTaggedData();
    tagDropdown.value = "";
    clearTagButton.disabled = true;
  }
});

// Enable/disable clearTagButton and show/hide direct link input section based on tagDropdown selection
tagDropdown.addEventListener("change", () => {
  const selectedTag = tagDropdown.value;
  // Check if the selected tag has data, either as a string or a non-empty array
  const hasData =
    taggedData[selectedTag] &&
    (Array.isArray(taggedData[selectedTag])
      ? taggedData[selectedTag].length > 0
      : taggedData[selectedTag] !== "");

  clearTagButton.disabled = !(selectedTag && hasData);

  // Hide all special input sections first
  directLinkInputSection.classList.add("hidden");
  customTagInputSection.classList.add("hidden");

  // Show relevant section based on selected tag
  if (selectedTag === LINK_GROUP_TAG) {
    directLinkInputSection.classList.remove("hidden");
  } else if (selectedTag === OTHER_TAG) {
    customTagInputSection.classList.remove("hidden");
  }
});

/**
 * Displays the currently tagged data in a user-friendly format.
 */
function displayTaggedData() {
  let formattedHtml = "";

  if (Object.keys(taggedData).length === 0) {
    taggedDataDisplay.innerHTML = "No data tagged yet.";
    return;
  }

  for (const tag in taggedData) {
    if (Object.prototype.hasOwnProperty.call(taggedData, tag)) {
      const data = taggedData[tag];
      formattedHtml += `<h3 class="text-lg font-semibold mt-4 mb-2">${tag}:</h3>`;

      if (tag === LINK_GROUP_TAG && Array.isArray(data)) {
        formattedHtml += `<ul>`;
        data.forEach((linkObj) => {
          // Assuming linkObj is { type: 'LinkedIn', url: '...' } or { type: 'Other Link', url: '...' }
          if (linkObj.url) {
            formattedHtml += `<li><strong>${linkObj.type}:</strong> <a href="${linkObj.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${linkObj.url}</a></li>`;
          }
        });
        formattedHtml += `</ul>`;
      } else if (Array.isArray(data)) {
        formattedHtml += `<ul>`;
        data.forEach((item) => {
          const isLink =
            typeof item === "string" &&
            (item.startsWith("http://") || item.startsWith("https://"));
          if (isLink) {
            formattedHtml += `<li><a href="${item}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${item}</a></li>`;
          } else {
            formattedHtml += `<li>${item}</li>`;
          }
        });
        formattedHtml += `</ul>`;
      } else {
        const isLink =
          typeof data === "string" &&
          (data.startsWith("http://") || data.startsWith("https://"));
        if (isLink) {
          formattedHtml += `<p><a href="${data}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${data}</a></p>`;
        } else {
          formattedHtml += `<p>${data}</p>`;
        }
      }
    }
  }
  taggedDataDisplay.innerHTML = formattedHtml;
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
