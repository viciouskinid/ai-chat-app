class AIChatApp {
  constructor() {
    this.chatMessages = document.getElementById('chatMessages');
    this.chatForm = document.getElementById('chatForm');
    this.chatInput = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.modelSelect = document.getElementById('modelSelect');
    this.streamingEl = document.getElementById('streamingIndicator');
    this.usageText = document.getElementById('usageText');
    this.refreshUsageBtn = document.getElementById('refreshUsageBtn');
    this.historyList = document.getElementById('historyList');
    this.sidebar = document.getElementById('sidebar');
    this.sidePanel = document.getElementById('sidePanel');
    this.codeContent = document.getElementById('codeContent');
    this.codeLanguage = document.getElementById('codeLanguage');
    this.logContent = document.getElementById('logContent');
    this.pastePreview = document.getElementById('pastePreview');
    this.pasteContent = document.getElementById('pasteContent');

    this.isProcessing = false;
    this.currentChatId = null;
    this.chats = JSON.parse(localStorage.getItem('puter-chats') || '{}');
    this.networkLog = [];
    this.pasteBuffer = '';

    this.init();
  }

  async init() {
    this.bindEvents();
    this.loadHistory();
    this.loadTheme();
    this.setupTextarea();
    this.setupNetworkInterceptor();

    const savedModel = localStorage.getItem('puter-model');
    if (savedModel) this.savedModel = savedModel;

    if (typeof puter === 'undefined') {
      this.modelSelect.innerHTML = '<option value="">Puter.js failed to load</option>';
      this.usageText.textContent = 'Puter.js unavailable';
      return;
    }

    let signedIn = false;
    try { signedIn = await puter.auth.isSignedIn(); } catch (e) { console.warn(e); }
    if (!signedIn) { this.showSignInPrompt(); return; }
    await this.afterSignIn();
  }

  bindEvents() {
    // Composer form submit (textarea + send button)
    const form = document.createElement('form');
    form.addEventListener('submit', e => { e.preventDefault(); this.handleSend(); });
    this.sendBtn.addEventListener('click', e => { e.preventDefault(); this.handleSend(); });

    this.refreshUsageBtn.addEventListener('click', () => this.loadUsage());
    document.getElementById('toggleSidebarBtn').addEventListener('click', () => this.sidebar.classList.toggle('hidden'));
    document.getElementById('toggleLogBtn').addEventListener('click', () => this.sidePanel.classList.toggle('hidden'));
    document.getElementById('closeSidePanelBtn').addEventListener('click', () => this.sidePanel.classList.add('hidden'));

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const tab = e.target.dataset.tab;
        document.getElementById('tab-code').style.display = tab === 'code' ? 'flex' : 'none';
        document.getElementById('tab-log').style.display = tab === 'log' ? 'flex' : 'none';
      });
    });

    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(this.codeContent.textContent);
      document.getElementById('copyCodeBtn').textContent = 'Copied!';
      setTimeout(() => document.getElementById('copyCodeBtn').textContent = 'Copy', 1500);
    });
    document.getElementById('copyLogBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(this.logContent.textContent);
      document.getElementById('copyLogBtn').textContent = 'Copied!';
      setTimeout(() => document.getElementById('copyLogBtn').textContent = 'Copy Log', 1500);
    });

    document.getElementById('newChatBtn').addEventListener('click', () => this.newChat());
    document.getElementById('clearPasteBtn').addEventListener('click', () => {
      this.pasteBuffer = '';
      this.pastePreview.classList.remove('active');
      this.chatInput.value = '';
      this.chatInput.focus();
    });

    this.modelSelect.addEventListener('change', () => localStorage.setItem('puter-model', this.modelSelect.value));

    this.chatInput.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 200) + 'px';
      this.sendBtn.disabled = this.chatInput.value.trim() === '' && !this.pasteBuffer;
    });

    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Claude-style paste: only intercept if text > 500 chars
    this.chatInput.addEventListener('paste', (e) => {
      const text = e.clipboardData.getData('text');
      if (text.length > 500) {
        e.preventDefault();
        this.pasteBuffer = text;
        this.pasteContent.textContent = text.substring(0, 800) + (text.length > 800 ? '…' : '');
        this.pastePreview.classList.add('active');
        this.chatInput.value = '';
        this.chatInput.focus();
        this.sendBtn.disabled = false;
      }
    });

    // Theme toggle
    document.getElementById('toggleThemeBtn').addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('puter-theme', next);
    });
  }

  loadTheme() {
    const saved = localStorage.getItem('puter-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }

  setupTextarea() {
    this.chatInput.style.height = 'auto';
  }

  setupNetworkInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      this.logNetwork('REQ', url, args[1]?.body);
      try {
        const response = await originalFetch(...args);
        const clone = response.clone();
        clone.text().then(text => this.logNetwork('RES', url, text));
        return response;
      } catch (err) {
        this.logNetwork('ERR', url, err.message);
        throw err;
      }
    };
  }

  logNetwork(type, url, data) {
    const entry = `[${new Date().toISOString()}] ${type} ${url}\n${data ? String(data).substring(0, 800) + (String(data).length > 800 ? '…' : '') : ''}\n\n`;
    this.networkLog.push(entry);
    this.logContent.textContent += entry;
    this.logContent.scrollTop = this.logContent.scrollHeight;
  }

  showSignInPrompt() {
    const welcome = document.getElementById('welcome');
    if (welcome) {
      welcome.innerHTML = `
        <h1>Sign in to chat</h1>
        <p>Connect your Puter account to use AI models.</p>
        <button id="signInBtn" style="margin-top:16px;padding:10px 24px;border:none;border-radius:20px;background:var(--accent);color:#fff;font-size:0.95rem;cursor:pointer;">Sign in with Puter</button>
      `;
      document.getElementById('signInBtn').addEventListener('click', () => this.handleSignIn());
    }
    this.usageText.textContent = 'Not signed in';
    this.chatInput.disabled = true;
    this.sendBtn.disabled = true;
  }

  async handleSignIn() {
    try {
      await puter.auth.signIn({ attempt_temp_user_creation: true });
      await this.afterSignIn();
    } catch (e) {
      console.error('Sign in failed', e);
      this.usageText.textContent = 'Sign in failed';
    }
  }

  async afterSignIn() {
    document.getElementById('welcome')?.remove();
    this.chatInput.disabled = false;
    this.sendBtn.disabled = true;
    try { await this.loadModels(); } catch (e) { console.error(e); }
    try { await this.loadUsage(); } catch (e) { console.error(e); }
  }

  async loadModels() {
    try {
      const models = await puter.ai.listModels();
      const list = Array.isArray(models) ? models : Object.values(models).flat().filter(Boolean);
      const names = list.map(m => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      this.modelSelect.innerHTML = '';
      if (names.length === 0) {
        this.modelSelect.innerHTML = '<option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>';
        return;
      }
      const unique = [...new Set(names)];
      unique.sort((a, b) => {
        if (a.includes('claude') && !b.includes('claude')) return -1;
        if (!a.includes('claude') && b.includes('claude')) return 1;
        return a.localeCompare(b);
      });
      unique.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        this.modelSelect.appendChild(opt);
      });
      if (this.savedModel && unique.includes(this.savedModel)) {
        this.modelSelect.value = this.savedModel;
      } else {
        const c = unique.find(n => n.includes('claude'));
        if (c) this.modelSelect.value = c;
      }
    } catch (e) {
      console.warn('listModels failed', e);
      this.modelSelect.innerHTML = '<option value="claude-sonnet-4-6">claude-sonnet-4-6</option>';
    }
  }

  async loadUsage() {
    try {
      const usage = await puter.auth.getMonthlyUsage();
      const info = usage?.allowanceInfo;
      if (!info) { this.usageText.textContent = 'Usage data unavailable'; return; }
      const total = info.monthUsageAllowance;
      const remaining = info.remaining;
      const usedPct = total > 0 ? ((total - remaining) / total * 100).toFixed(1) : '?';
      const totalUSD = (total / 1e8).toFixed(4);
      const remainUSD = (remaining / 1e8).toFixed(4);
      this.usageText.textContent = `Used ${usedPct}% · Remaining $${remainUSD} / $${totalUSD}`;
    } catch (e) {
      console.warn('getMonthlyUsage failed', e);
      this.usageText.textContent = 'Usage error';
    }
  }

  async handleSend() {
    if (this.isProcessing) return;
    let msg = this.chatInput.value.trim();
    if (this.pasteBuffer) {
      msg = this.pasteBuffer + (msg ? '\n\n' + msg : '');
      this.pasteBuffer = '';
      this.pastePreview.classList.remove('active');
    }
    if (!msg) return;

    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    this.sendBtn.disabled = true;
    this.isProcessing = true;
    this.streamingEl.classList.add('active');

    if (!this.currentChatId) {
      this.currentChatId = Date.now().toString();
      this.chats[this.currentChatId] = { title: msg.substring(0, 30), messages: [] };
    }

    this.addMessageToUI(msg, 'user');
    this.chats[this.currentChatId].messages.push({ role: 'user', content: msg });
    this.saveChats();

    const model = this.modelSelect.value || 'claude-sonnet-4-6';

    try {
      const response = await puter.ai.chat(msg, { model, stream: true });
      const aiEl = this.addMessageToUI('', 'ai');
      const contentEl = aiEl.querySelector('.message-content');
      let fullText = '';
      for await (const part of response) {
        if (part?.text) {
          fullText += part.text;
          contentEl.textContent = fullText;
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }
      this.chats[this.currentChatId].messages.push({ role: 'ai', content: fullText });
      this.saveChats();
      this.extractCodeToPanel(fullText);
    } catch (err) {
      console.error('Chat error', err);
      this.addMessageToUI(`Error: ${err.message || err}`, 'ai');
    } finally {
      this.streamingEl.classList.remove('active');
      this.sendBtn.disabled = this.chatInput.value.trim() === '' && !this.pasteBuffer;
      this.isProcessing = false;
      this.chatInput.focus();
      this.loadUsage();
    }
  }

  extractCodeToPanel(text) {
    const re = /```(\w*)\n([\s\S]*?)```/g;
    let match, lastCode = '', lastLang = 'text';
    while ((match = re.exec(text)) !== null) {
      lastLang = match[1] || 'text';
      lastCode = match[2];
    }
    if (lastCode) {
      this.codeLanguage.textContent = lastLang;
      this.codeContent.textContent = lastCode;
      this.sidePanel.classList.remove('hidden');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="code"]').classList.add('active');
      document.getElementById('tab-code').style.display = 'flex';
      document.getElementById('tab-log').style.display = 'none';
    }
  }

  addMessageToUI(text, sender) {
    document.getElementById('welcome')?.remove();
    const div = document.createElement('div');
    div.className = `message ${sender}-message`;
    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender === 'user' ? 'You' : 'Claude';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    div.appendChild(senderDiv);
    div.appendChild(contentDiv);
    this.chatMessages.appendChild(div);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return div;
  }

  newChat() {
    this.currentChatId = null;
    this.chatMessages.innerHTML = `
      <div class="welcome" id="welcome">
        <h1>Claude</h1>
        <p>How can I help you today?</p>
      </div>
    `;
    this.pasteBuffer = '';
    this.pastePreview.classList.remove('active');
    this.chatInput.value = '';
    this.sendBtn.disabled = true;
    this.loadHistory();
    this.chatInput.focus();
  }

  saveChats() {
    localStorage.setItem('puter-chats', JSON.stringify(this.chats));
    this.loadHistory();
  }

  loadHistory() {
    this.historyList.innerHTML = '';
    const sorted = Object.entries(this.chats).sort((a, b) => b[0] - a[0]);
    sorted.forEach(([id, chat]) => {
      const item = document.createElement('div');
      item.className = `history-item ${this.currentChatId === id ? 'active' : ''}`;
      item.textContent = chat.title || 'Untitled Chat';
      item.addEventListener('click', () => this.loadChat(id));
      this.historyList.appendChild(item);
    });
  }

  loadChat(id) {
    const chat = this.chats[id];
    if (!chat) return;
    this.currentChatId = id;
    this.chatMessages.innerHTML = '';
    chat.messages.forEach(msg => this.addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'ai'));
    this.loadHistory();
  }
}

document.addEventListener('DOMContentLoaded', () => new AIChatApp());
