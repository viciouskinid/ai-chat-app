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

    this.addMessage(message, 'user');
    this.streamingIndicator.classList.add('active');

    try {
      const selectedModel = this.modelSelect.value;

      // Log the full response object for inspection
      const response = await puter.ai.chat(message, {
        model: selectedModel,
        stream: true,
      });

      // Log the raw response to console for inspection
      console.log('[Puter.js Raw Response]', response);

      let aiResponse = '';
      let chunkCount = 0;
      const aiMessageElement = this.addMessage('', 'ai', true);
      const contentDiv = aiMessageElement.querySelector('.message-content');
      
      // Create inspector to show raw chunks
      const inspectorDiv = document.createElement('div');
      inspectorDiv.className = 'inspector';
      inspectorDiv.innerHTML = `
        <button class="inspector-toggle" type="button">
          ▸ Show Raw Response
        </button>
        <div class="inspector-content"></div>
      `;
      aiMessageElement.appendChild(inspectorDiv);

      const toggleBtn = inspectorDiv.querySelector('.inspector-toggle');
      const inspectorContent = inspectorDiv.querySelector('.inspector-content');
      
      toggleBtn.addEventListener('click', () => {
        inspectorDiv.classList.toggle('open');
        toggleBtn.textContent = inspectorDiv.classList.contains('open')
          ? '▾ Hide Raw Response'
          : '▸ Show Raw Response';
      });

      // Stream processing
      for await (const part of response) {
        chunkCount++;
        // Show raw chunk data (truncated for display)
        const chunkPreview = JSON.stringify(part).slice(0, 300);
        inspectorContent.textContent += `[Chunk ${chunkCount}] ${chunkPreview}${chunkPreview.length >= 300 ? '...' : ''}\n\n`;

        if (part?.text) {
          aiResponse += part.text;
          contentDiv.textContent = aiResponse;
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }

      // Final summary in inspector
      inspectorContent.textContent += `--- Stream Complete ---\nTotal chunks: ${chunkCount}\nFinal text length: ${aiResponse.length} chars`;

    } catch (error) {
      console.error('AI Chat Error:', error);
      this.addMessage(`Error: ${error.message || 'Please try again.'}`, 'ai');
    } finally {
      this.streamingIndicator.classList.remove('active');
      this.sendButton.disabled = false;
      this.isProcessing = false;
      this.chatInput.focus();
    }
  }

  addMessage(content, sender, isStreaming = false) {
    const welcome = document.getElementById('welcomeMessage');
    if (welcome) welcome.remove();

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
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    return messageDiv;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AIChatApplication();
});
