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

    this.isProcessing = false;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadModels();
    await this.loadUsage();
  }

  bindEvents() {
    this.chatForm.addEventListener('submit', e => {
      e.preventDefault();
      this.handleSend();
    });
    this.refreshUsageBtn.addEventListener('click', () => this.loadUsage());
  }

  async loadModels() {
    try {
      const models = await puter.ai.listModels();
      const list = Array.isArray(models)
        ? models
        : Object.values(models).flat().filter(Boolean);
      const names = list.map(m => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);

      this.modelSelect.innerHTML = '';
      if (names.length === 0) {
        this.modelSelect.innerHTML = '<option value="claude-sonnet-4-6">Claude Sonnet 4.6 (fallback)</option>';
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
      const claudeOpt = unique.find(n => n.includes('claude'));
      if (claudeOpt) this.modelSelect.value = claudeOpt;
    } catch (e) {
      console.warn('listModels failed, using fallback', e);
      this.modelSelect.innerHTML = `
        <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
        <option value="gpt-5-nano">gpt-5-nano</option>
      `;
    }
  }

  async loadUsage() {
    try {
      const usage = await puter.auth.getMonthlyUsage();
      const info = usage?.allowanceInfo;
      if (!info) {
        this.usageText.textContent = 'Usage data unavailable';
        return;
      }
      const total = info.monthUsageAllowance;
      const remaining = info.remaining;
      const usedPct = total > 0 ? ((total - remaining) / total * 100).toFixed(1) : '?';
      const totalUSD = (total / 1e8).toFixed(4);
      const remainUSD = (remaining / 1e8).toFixed(4);
      this.usageText.textContent = `Used ${usedPct}% · Remaining $${remainUSD} / $${totalUSD}`;
    } catch (e) {
      console.warn('getMonthlyUsage failed', e);
      this.usageText.textContent = 'Usage error (check console)';
    }
  }

  async handleSend() {
    if (this.isProcessing) return;
    const msg = this.chatInput.value.trim();
    if (!msg) return;

    this.chatInput.value = '';
    this.sendBtn.disabled = true;
    this.isProcessing = true;
    this.streamingEl.classList.add('active');

    this.addMessage(msg, 'user');
    const model = this.modelSelect.value || 'claude-sonnet-4-6';

    try {
      const response = await puter.ai.chat(msg, { model, stream: true });
      console.log('[Raw response]', response);

      const aiEl = this.addMessage('', 'ai');
      const contentEl = aiEl.querySelector('.message-content');
      const inspector = this.createInspector(aiEl);

      let fullText = '';
      let chunkCount = 0;

      for await (const part of response) {
        chunkCount++;
        inspector.contentEl.textContent += `[chunk ${chunkCount}] ${JSON.stringify(part).slice(0, 280)}\n\n`;

        if (part?.text) {
          fullText += part.text;
          contentEl.textContent = fullText;
          this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
      }
      inspector.contentEl.textContent += `--- done, ${chunkCount} chunks, ${fullText.length} chars ---`;
    } catch (err) {
      console.error('Chat error', err);
      this.addMessage(`Error: ${err.message || err}`, 'ai');
    } finally {
      this.streamingEl.classList.remove('active');
      this.sendBtn.disabled = false;
      this.isProcessing = false;
      this.chatInput.focus();
    }
  }

  createInspector(parentEl) {
    const wrap = document.createElement('div');
    wrap.className = 'inspector';
    wrap.innerHTML = `
      <button class="inspector-toggle" type="button">▸ Show raw response</button>
      <div class="inspector-content"></div>
    `;
    parentEl.appendChild(wrap);
    const btn = wrap.querySelector('.inspector-toggle');
    const contentEl = wrap.querySelector('.inspector-content');
    btn.addEventListener('click', () => {
      wrap.classList.toggle('open');
      btn.textContent = wrap.classList.contains('open')
        ? '▾ Hide raw response'
        : '▸ Show raw response';
    });
    return { contentEl };
  }

  addMessage(text, sender) {
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `message ${sender}-message`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'message-sender';
    senderDiv.textContent = sender === 'user' ? 'You' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;

    div.appendChild(senderDiv);
    div.appendChild(contentDiv);
    this.chatMessages.appendChild(div);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    return div;
  }
}

document.addEventListener('DOMContentLoaded', () => new AIChatApp());