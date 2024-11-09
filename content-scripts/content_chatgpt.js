// content_chatgpt.js

// --------------------------------- UI Tools ---------------------------------

// Function to add a new prompt
function addNewPrompt() {
    const promptNameInput = document.getElementById('new-prompt-name');
    const promptInput = document.getElementById('new-prompt');
    if (promptNameInput.value.trim() !== '' && promptInput.value.trim() !== '') {
        addPrompt(promptNameInput.value, promptInput.value);
        promptNameInput.value = '';
        promptInput.value = '';
    }
}

// Function to add a prompt to the list and local storage
function addPrompt(promptName, promptText, newPrompt = true) {
    const promptElement = createPromptElement(promptName, promptText);

    const promptList = document.getElementById('prompt-list');
    promptList.appendChild(promptElement);

    if (newPrompt) {
        savePromptToStorage({ name: promptName, text: promptText });
    }
}

// Function to rename a prompt
function renamePrompt(event) {
    event.stopPropagation(); // Prevent the click event from triggering the pastePrompt function
    const promptElement = this.parentElement;
    const promptName = promptElement.querySelector('span').textContent.trim();
    const newPromptName = prompt(promptName, 'Enter new name for the prompt:');

    if (newPromptName && newPromptName.trim() !== '') {
        promptElement.querySelector('span').textContent = newPromptName.trim();

        // Update prompt in local storage
        let prompts = JSON.parse(localStorage.getItem('ai-tools-prompts')) || [];
        prompts = prompts.map((p) => {
            if (p.name.trim() === promptName) {
                return { name: newPromptName.trim(), text: p.text };
            }
            return p;
        });
        localStorage.setItem('ai-tools-prompts', JSON.stringify(prompts));
    }
}

// Function to delete a prompt
function deletePrompt(event) {
    event.stopPropagation(); // Prevent the click event from triggering the pastePrompt function
    const promptElement = this.parentElement;
    const promptName = promptElement.querySelector('span').textContent.trim();

    promptElement.remove();

    // Remove prompt from local storage
    let prompts = JSON.parse(localStorage.getItem('ai-tools-prompts')) || [];
    prompts = prompts.filter((p) => p.name.trim() !== promptName);
    localStorage.setItem('ai-tools-prompts', JSON.stringify(prompts));
}

// Function to paste a prompt into the chat input
function pastePrompt(prompt) {
    const chatInput = document.querySelector("#prompt-textarea > p");
    if (chatInput) {
        chatInput.innerHTML = prompt;
        chatInput.parentElement.focus();
    }
}

// Function to save a prompt to local storage
function savePromptToStorage(prompt) {
    let prompts = JSON.parse(localStorage.getItem('ai-tools-prompts')) || [];
    prompts.push(prompt);
    localStorage.setItem('ai-tools-prompts', JSON.stringify(prompts));
}

// Load prompts from local storage and display them
function loadPromptsFromStorage() {
    let prompts = localStorage.getItem('ai-tools-prompts');
    if (prompts) {
        try {
            prompts = JSON.parse(prompts);
            if (!Array.isArray(prompts)) {
                prompts = [];
            }
        } catch (e) {
            console.error('Error parsing prompts from local storage:', e);
            prompts = [];
        }
    } else {
        prompts = [];
    }

    prompts.forEach((prompt) => {
        addPrompt(prompt.name, prompt.text, false); // Use addPrompt function to add each prompt
    });
}

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
    }

    toolsUI.style.display = toolsUI.style.display === 'none' ? 'block' : 'none';
}

// Function to paste a default prompt into the chat input
function pasteDefaultPrompt() {
    const defaultPrompt = "Eres un INSERTAR_ROL. LO_QUE_SE_PIDE, de acuerdo con DETALLES_Y_CONTEXTO. Entrégame la información en FORMATO_DE_SALIDA."; // Define your default prompt here
    const chatInput = document.querySelector("#prompt-textarea > p");
    if (chatInput) {
        chatInput.innerHTML = defaultPrompt;
        chatInput.parentElement.focus();
    }
}

// --------------------------------- ChatGPT Queue ---------------------------------

// Queue to hold prompts
let promptQueue = [];
let isGenerating = false;

// Function to monitor the output generation
function monitorGeneration() {
    const observer = new MutationObserver(() => {
        const stopButton = document.querySelector('button[data-testid="stop-button"]');
        const sendButton = document.querySelector('button[data-testid="send-button"]');

        if (stopButton) {
            // ChatGPT is generating
            isGenerating = true;
            console.log('ChatGPT is generating...');
        } else if (sendButton && isGenerating) {
            // Generation completed
            isGenerating = false;
            console.log('ChatGPT generation completed.');
            processNextPrompt();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Function to handle new prompt submission when Enter is pressed
function handleEnterPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        const stopButton = document.querySelector('button[data-testid="stop-button"]');
        const chatInput = document.querySelector('#prompt-textarea > p');

        if (chatInput.firstChild.textContent !== "" || stopButton) {
            // ChatGPT is generating
            event.preventDefault();
            if (chatInput && chatInput.textContent !== '') {
                const newPrompt = chatInput.textContent;
                promptQueue.push(newPrompt);
                console.log('New prompt added to the queue:', newPrompt);
                chatInput.innerHTML = ''; // Clear the main input window
                const inputEvent = new Event('input', { bubbles: true });
                chatInput.parentElement.dispatchEvent(inputEvent);
                displayQueue();
            }
        } else {
            console.log('Nothing to do here');
        }
    }
}

// Function to wait for send button to be ready
async function waitForSendButton(maxAttempts = 20) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (sendButton && !sendButton.disabled) {
            console.log('Send button ready after', attempts, 'attempts');
            return sendButton;
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms between checks
        attempts++;
    }
    throw new Error('Send button not ready after ' + maxAttempts + ' attempts');
}

// Updated processNextPrompt function
async function processNextPrompt() {
    if (promptQueue.length > 0) {
        const chatInput = document.querySelector('#prompt-textarea > p');
        
        if (chatInput && chatInput.textContent === '') {
            const nextPrompt = promptQueue.shift();
            console.log('Processing next prompt:', nextPrompt);
            pastePrompt(nextPrompt);
            
            const inputEvent = new Event('input', { bubbles: true });
            chatInput.dispatchEvent(inputEvent);
            chatInput.parentElement.focus();

            try {
                const sendButton = await waitForSendButton();
                sendButton.click();
                console.log('Send button clicked successfully');
            } catch (error) {
                console.error('Error with send button:', error);
                promptQueue.unshift(nextPrompt); // Put the prompt back in queue
            }

            displayQueue();
        } else {
            setTimeout(() => processNextPrompt(), 1000);
        }
    }
}

// Function to display the current queue visually
function displayQueue() {
    let queueContainer = document.getElementById('prompt-queue-container');

    if (!queueContainer) {
        queueContainer = document.createElement('div');
        queueContainer.id = 'prompt-queue-container';
        document.body.appendChild(queueContainer);
    }

    queueContainer.innerHTML = '<h4>Prompt Queue</h4>';

    if (promptQueue.length === 0) {
        queueContainer.remove();
    }

    promptQueue.forEach((prompt, index) => {
        const promptElement = document.createElement('div');
        promptElement.textContent = `${index + 1}. ${prompt}`;
        promptElement.className = 'queue-item';
        queueContainer.appendChild(promptElement);
    });
}

// --------------------------------- Event Listeners ---------------------------------

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'pasteDefaultPrompt') {
        pasteDefaultPrompt();
    } else if (message.action === 'showIcon') {
        createIcon();
        toggleUITools();
        loadPromptsFromStorage();
    }
});

// Run on page load
window.addEventListener('load', () => {
    createIcon();
    toggleUITools();
    loadPromptsFromStorage();
    // Start monitoring the output generation
    monitorGeneration();
});

// Attach event listener to capture Enter key
window.addEventListener('keydown', handleEnterPress);