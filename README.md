# Puter.js AI Chat Application

A modern, responsive web application that leverages Puter.js to provide AI-powered chat functionality. Users can interact with various AI models including GPT-5 nano, Claude, and others through an intuitive interface.

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **AI Integration:** Puter.js SDK
- **Styling:** Modern CSS with Flexbox
- **Icons:** SVG-based UI elements

## Features
- Chat with multiple AI models (GPT-5 nano, Claude, etc.)
- Real-time streaming responses
- Clean, responsive user interface
- Message history display
- Model selection options

## Usage Instructions

1. **Open the Application**: Load the HTML file in your web browser
2. **Select AI Model**: Choose from available AI models (GPT-5 nano, Claude, Gemini, DeepSeek)
3. **Start Chatting**: Type your message in the input field and press Enter or click Send
4. **Real-time Responses**: Watch as AI responses stream in real-time
5. **Continue Conversation**: The chat maintains message history for context-aware responses

## Key Features Demonstrated

### Puter.js Integration

```javascript
// AI Chat with streaming
const response = await puter.ai.chat(message, { 
    model: selectedModel, 
    stream: true 
});

// Stream processing
for await (const part of response) {
    if (part?.text) {
        aiResponse += part.text;
        // Update UI in real-time
    }
}
```

### Responsive Design

- Mobile-friendly interface
- Adaptive message bubbles
- Smooth scrolling for chat history

### User Experience

- Real-time streaming responses
- Visual indicators for AI processing
- Clean, intuitive interface
- Model selection flexibility

## Additional Notes

### Prerequisites

- Modern web browser with JavaScript enabled
- Internet connection for Puter.js SDK and AI services
- Puter.com account (authentication handled automatically)

### Customization Options

- Easily modify CSS for different color schemes
- Add more AI models by extending the model selector
- Implement additional features like file uploads for AI analysis

### Error Handling

The application includes basic error handling for:
- Network connectivity issues
- AI service unavailability
- User input validation

## Credits

- **Puter.js SDK**: Provides seamless AI integration and cloud services
- **AI Models**: Powered by various providers including OpenAI, Anthropic, Google, and others
- **UI Design**: Modern, responsive design for optimal user experience

This application demonstrates the power of Puter.js for building AI-powered web applications without backend infrastructure. The user pays model ensures zero operational costs for developers while providing enterprise-grade AI capabilities.