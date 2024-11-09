// background.js

// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
    console.log('TAILS extension installed or updated.');

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'pastePrompt',
            title: 'Paste AI Prompt',
            contexts: ['editable']
        });
    });
});

// Listen for context menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'pastePrompt') {
        // Send a message to the content script to paste the prompt
        chrome.tabs.sendMessage(tab.id, { action: 'pasteDefaultPrompt' });
    }
});