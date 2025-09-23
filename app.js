class AIChatApplication {
  constructor() {
    this.chatMessages = document.getElementById('chatMessages');
    this.chatForm = document.getElementById('chatForm');
    this.chatInput = document.getElementById('chatInput');
    this.sendButton = document.getElementById('sendButton');
    this.modelSelect = document.getElementById('modelSelect');
    this.streamingIndicator = document.getElementById('streamingIndicator');

    this.isProcessing = false;
    this.initEventListeners();
  }

  initEventListeners() {
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserMessage();
    });
  }

  async handleUserMessage() {
    if (this.isProcessing) return;

    const message = this.chatInput.value.trim();
    if (!message) return;

    this.chatInput.value = '';
    this.sendButton.disabled = true;
    this.isProcessing = true;

    // Add user message to chat
    this.addMessage(message, 'user');

    // Show streaming indicator
    this.streamingIndicator.classList.add('active');

    try {
      const selectedModel = this.modelSelect.value;

      // Use Puter.js AI chat with streaming
      const response = await puter.ai.chat(message, {
        model: selectedModel,
        stream: true,
      });

      let aiResponse = '';

      // Create AI message element for streaming
      const aiMessageElement = this.addMessage('', 'ai', true);

      // Stream the response
      for await (const part of response) {
        if (part?.text) {
          aiResponse += part.text;
          aiMessageElement.querySelector('.message-content').textContent =
            aiResponse;

          // Auto-scroll to bottom
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }
    } catch (error) {
      console.error('AI Chat Error:', error);
      this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
    } finally {
      this.streamingIndicator.classList.remove('active');
      this.sendButton.disabled = false;
      this.isProcessing = false;
      this.chatInput.focus();
    }
  }

  addMessage(content, sender, isStreaming = false) {
    // Remove welcome message if it exists
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender === 'user' ? 'You' : 'AI Assistant';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(contentDiv);
    this.chatMessages.appendChild(messageDiv);

    // Auto-scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    return messageDiv;
  }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AIChatApplication();
});
