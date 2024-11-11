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

// Function to paste a default prompt into the chat input
function pasteDefaultPrompt() {
    const defaultPrompt = "Eres un INSERTAR_ROL. LO_QUE_SE_PIDE, de acuerdo con DETALLES_Y_CONTEXTO. Entrégame la información en FORMATO_DE_SALIDA."; // Define your default prompt here
    const chatInput = document.querySelector("#prompt-textarea > p");
    if (chatInput) {
        chatInput.innerHTML = defaultPrompt;
        chatInput.parentElement.focus();
    }
}

// Function to automatically paste prompts into the chat input
async function autoPastePrompts() {
    const autoSendCheckbox = document.getElementById('auto-send-checkbox');
    const chatInput = document.querySelector("#prompt-textarea > p");
    if (autoSendCheckbox.checked) {
        const promptList = document.getElementById('prompt-list');
        const prompts = promptList.querySelectorAll('.prompt');

        prompts.forEach((prompt) => {
            const promptText = prompt.querySelector('span').textContent;
            pastePrompt(promptText);
            const inputEvent = new Event('input', { bubbles: true });
            chatInput.dispatchEvent(inputEvent);
            chatInput.parentElement.focus();
        });

        if (chatInput && chatInput.textContent === '') {   
            try {
                const sendButton = await waitForSendButton();
                sendButton.click();
                console.log('Send button clicked successfully');
            } catch (error) {
                console.error('Error with send button:', error);
            }
    
            displayQueue();
        } else {
            setTimeout(() => autoPastePrompts(), 1000);
        }
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

    // Create the queue container if it doesn't exist
    if (!queueContainer) {
        queueContainer = document.createElement('div');
        queueContainer.id = 'prompt-queue-container';
        document.body.appendChild(queueContainer);
    }

    // Clear the queue container
    queueContainer.innerHTML = '<h4>Prompt Queue</h4>';

    // Remove the queue container if the queue is empty
    if (promptQueue.length === 0) {
        queueContainer.remove();
    }

    // Add each prompt to the queue container
    promptQueue.forEach((prompt, index) => {
        const promptElement = document.createElement('div');
        promptElement.textContent = `${index + 1}. ${prompt}`;
        promptElement.className = 'queue-item';
        queueContainer.appendChild(promptElement);
    });

    // Add a badge indicating the number of prompts in the queue at the top left corner of the queue container
    let queueBadge = document.getElementById('prompt-queue-badge');
    if (!queueBadge) {
        queueBadge = document.createElement('span');
        queueBadge.id = 'prompt-queue-badge';
        queueContainer.appendChild(queueBadge);
    }
    queueBadge.textContent = promptQueue.length;

    // Add a button to clear the queue
    let clearButton = document.getElementById('clear-queue-button');
    if (!clearButton) {
        clearButton = document.createElement('button');
        clearButton.id = 'clear-queue-button';
        clearButton.textContent = 'Clear Queue';
        clearButton.addEventListener('click', () => {
            promptQueue = [];
            displayQueue();
        });
        queueContainer.appendChild(clearButton);
    }
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