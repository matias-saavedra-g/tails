// ui.js

// ------------------ UI ------------------

// Function to create the custom icon element
function createIcon() {
    const icon = document.createElement('div');
    const iconPath = chrome.runtime.getURL('icons/icon128.png');

    icon.id = 'ai-tools-icon';
    icon.innerHTML = `<img src="${iconPath}" alt="AI Tools Icon"/>`;

    document.body.appendChild(icon);

    icon.addEventListener('click', () => {
        toggleUITools();
    });
}

// Function to toggle the tools UI
function toggleUITools() {
    let toolsUI = document.getElementById('ai-tools-menu');

    if (!toolsUI) {
        toolsUI = document.createElement('div');
        toolsUI.id = 'ai-tools-menu';

        toolsUI.innerHTML = `
            <div style="display: flex; align-items: center;">
                <h4 style="margin: 0;">TAILS</h4>
                <a href="https://github.com/matias-saavedra-g/tails" target="_blank" style="margin-left: 10px;">
                    <img src="${chrome.runtime.getURL('icons/icon128.png')}" alt="TAILS icon" style="height: 1.1em;"/>
                </a>
            </div>
            <p>Click on a prompt to paste it into the chat input.</p>
            <button id="minimize-tools-menu">-</button>
            <button id="close-tools-menu">×</button>
            <input id="new-prompt-name" placeholder="Prompt Name" />
            <textarea id="new-prompt" placeholder="Add a new prompt"></textarea>
            <button id="add-prompt">Add Prompt</button>
            <label style="display: flex; align-items: center; margin-top: 10px;">
                <input type="checkbox" id="auto-send-checkbox" style="margin-right: 5px;">
                Auto Send
            </label>
            <h5>Prompts</h5>
            <div id="prompt-list"></div>
        `;

        document.body.appendChild(toolsUI);

        document.getElementById('close-tools-menu').addEventListener('click', () => {
            removeAllAIToolsElements();
        });

        document.getElementById('minimize-tools-menu').addEventListener('click', () => {
            toolsUI.style.display = 'none';
        });

        document.getElementById('add-prompt').addEventListener('click', () => {
            addNewPrompt();
        });

        document.getElementById('auto-send-checkbox').addEventListener('change', (event) => {
            if (event.target.checked) {
                autoPastePrompts();
            }
        });
    }

    toolsUI.style.display = toolsUI.style.display === 'none' ? 'block' : 'none';
}

// Function to create a prompt element
function createPromptElement(promptName, promptText) {
    const promptElement = document.createElement('div');
    promptElement.className = 'prompt-item';

    const promptContent = document.createElement('span');
    promptContent.textContent = promptName;
    promptContent.style.flexGrow = '1';

    const renameButton = document.createElement('button');
    renameButton.textContent = 'Rename';
    renameButton.addEventListener('click', renamePrompt);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deletePrompt);

    promptElement.appendChild(promptContent);
    promptElement.appendChild(renameButton);
    promptElement.appendChild(deleteButton);

    promptElement.addEventListener('click', () => {
        pastePrompt(promptText);
    });

    return promptElement;
}

// Function to remove all elements with IDs containing 'ai-tools-'
function removeAllAIToolsElements() {
    const elements = document.querySelectorAll('[id*="ai-tools-"]');
    elements.forEach(element => element.remove());
}

// ------------------ Prompts ------------------

// Initialize UI on page load
window.addEventListener('load', () => {
    createIcon();
    toggleUITools();
    let toolsUI = document.getElementById('ai-tools-menu');
    toolsUI.style.display = 'none';
});