// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const showIconButton = document.getElementById('show-icon');
    const storedPromptsContainer = document.getElementById('stored-prompts');
    const noPromptsMessage = document.getElementById('no-prompts');

    // Load stored prompts from local storage and display them
    const prompts = JSON.parse(localStorage.getItem('ai-tools-prompts')) || [];

    if (prompts.length > 0) {
        noPromptsMessage.style.display = 'none';
        prompts.forEach((prompt) => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt-item';
            promptElement.textContent = prompt.name;
            promptElement.addEventListener('click', () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'pastePrompt',
                        promptText: prompt.text
                    });
                });
            });
            storedPromptsContainer.appendChild(promptElement);
        });
    } else {
        noPromptsMessage.style.display = 'block';
    }

    // Add event listener for showing the icon
    showIconButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'showIcon' });
        });
    });

    // Refresh prompts when the popup is opened
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes['ai-tools-prompts']) {
            window.location.reload();
        }
    });
});
