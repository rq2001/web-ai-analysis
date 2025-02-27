// manifest.json - 浏览器扩展清单文件
{
  "manifest_version": 3,
  "name": "AI页面分析器",
  "version": "1.1",
  "description": "读取当前页面内容并使用AI (Ollama和OpenRoute)进行分析",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}

// popup.html - 扩展弹出界面
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI页面分析器</title>
  <style>
    body {
      width: 400px;
      font-family: Arial, sans-serif;
      padding: 10px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    select, button, input, textarea {
      padding: 8px;
      margin: 5px 0;
    }
    button {
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #3367d6;
    }
    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    #result {
      margin-top: 10px;
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      padding: 10px;
      white-space: pre-wrap;
    }
    .spinner {
      border: 4px solid rgba(0, 0, 0, 0.1);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border-left-color: #09f;
      animation: spin 1s linear infinite;
      display: none;
      margin: 10px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 10px;
    }
    .tab {
      padding: 8px 15px;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .tab.active {
      border: 1px solid #ddd;
      border-bottom-color: white;
      border-radius: 4px 4px 0 0;
      margin-bottom: -1px;
      background-color: #f9f9f9;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    #chat-container {
      display: flex;
      flex-direction: column;
      height: 350px;
    }
    #chat-messages {
      flex-grow: 1;
      overflow-y: auto;
      border: 1px solid #ddd;
      padding: 10px;
      margin-bottom: 10px;
      background-color: #f9f9f9;
    }
    .message {
      margin-bottom: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 80%;
    }
    .user-message {
      background-color: #DCF8C6;
      align-self: flex-end;
      margin-left: auto;
    }
    .ai-message {
      background-color: #FFFFFF;
      align-self: flex-start;
    }
    #chat-input-container {
      display: flex;
      gap: 5px;
    }
    #chat-input {
      flex-grow: 1;
      resize: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>AI页面分析器</h2>
    
    <div class="tabs">
      <div class="tab active" data-tab="settings">设置</div>
      <div class="tab" data-tab="analyzer">分析器</div>
      <div class="tab" data-tab="chat">对话</div>
    </div>
    
    <!-- 设置标签页 -->
    <div class="tab-content active" id="settings-tab">
      <label for="api-select">选择AI服务:</label>
      <select id="api-select">
        <option value="ollama">Ollama</option>
        <option value="openroute">OpenRoute</option>
      </select>
      
      <div id="ollama-settings">
        <label for="ollama-url">Ollama服务URL:</label>
        <input type="text" id="ollama-url" placeholder="http://localhost:11434" value="http://localhost:11434">
        
        <label for="ollama-model">Ollama模型:</label>
        <input type="text" id="ollama-model" placeholder="llama3" value="llama3">
      </div>
      
      <div id="openroute-settings" style="display:none;">
        <label for="openroute-key">OpenRoute API密钥:</label>
        <input type="password" id="openroute-key" placeholder="API密钥">
        
        <label for="openroute-model">OpenRoute模型:</label>
        <input type="text" id="openroute-model" placeholder="gpt-3.5-turbo" value="gpt-3.5-turbo">
      </div>
      
      <button id="save-settings-btn">保存设置</button>
    </div>
    
    <!-- 分析器标签页 -->
    <div class="tab-content" id="analyzer-tab">
      <label for="analysis-type">分析类型:</label>
      <select id="analysis-type">
        <option value="summary">页面摘要</option>
        <option value="sentiment">情感分析</option>
        <option value="keywords">关键词提取</option>
        <option value="scripts">脚本分析</option>
        <option value="security">安全检查</option>
        <option value="error">网页错误分析</option>
        <option value="attachments">附件及表格索引</option>
        <option value="custom">自定义分析</option>
      </select>
      
      <div id="custom-prompt-container" style="display:none;">
        <label for="custom-prompt">自定义提示词:</label>
        <textarea id="custom-prompt" rows="3" placeholder="输入自定义分析提示词..."></textarea>
      </div>
      
      <button id="analyze-btn">分析当前页面</button>
      
      <div class="spinner" id="loading-spinner"></div>
      
      <div id="result-container">
        <h3>分析结果:</h3>
        <div id="result">点击"分析当前页面"按钮开始分析。</div>
      </div>
    </div>
    
    <!-- 对话标签页 -->
    <div class="tab-content" id="chat-tab">
      <div id="chat-container">
        <div id="chat-messages">
          <div class="message ai-message">你好！我是AI助手，可以帮你分析当前页面或回答问题。</div>
        </div>
        <div id="chat-input-container">
          <textarea id="chat-input" rows="2" placeholder="输入你的问题..."></textarea>
          <button id="send-chat-btn">发送</button>
        </div>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>

// popup.js - 扩展弹出页面逻辑
document.addEventListener('DOMContentLoaded', function() {
  // 标签页切换功能
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // 移除所有活动状态
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 设置当前标签为活动状态
      this.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });

  // 加载保存的设置
  chrome.storage.local.get(['apiType', 'ollamaUrl', 'ollamaModel', 'openrouteKey', 'openrouteModel', 'chatHistory'], function(data) {
    if (data.apiType) {
      document.getElementById('api-select').value = data.apiType;
      toggleApiSettings(data.apiType);
    }
    if (data.ollamaUrl) document.getElementById('ollama-url').value = data.ollamaUrl;
    if (data.ollamaModel) document.getElementById('ollama-model').value = data.ollamaModel;
    if (data.openrouteKey) document.getElementById('openroute-key').value = data.openrouteKey;
    if (data.openrouteModel) document.getElementById('openroute-model').value = data.openrouteModel;
    
    // 加载聊天历史
    if (data.chatHistory && data.chatHistory.length > 0) {
      const chatMessagesContainer = document.getElementById('chat-messages');
      chatMessagesContainer.innerHTML = ''; // 清空默认消息
      
      data.chatHistory.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(msg.role === 'user' ? 'user-message' : 'ai-message');
        messageElement.textContent = msg.content;
        chatMessagesContainer.appendChild(messageElement);
      });
      
      // 滚动到最新消息
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
  });

  // API类型切换
  document.getElementById('api-select').addEventListener('change', function() {
    toggleApiSettings(this.value);
  });

  // 分析类型切换
  document.getElementById('analysis-type').addEventListener('change', function() {
    if (this.value === 'custom') {
      document.getElementById('custom-prompt-container').style.display = 'block';
    } else {
      document.getElementById('custom-prompt-container').style.display = 'none';
    }
  });

  // 保存设置
  document.getElementById('save-settings-btn').addEventListener('click', function() {
    const apiType = document.getElementById('api-select').value;
    const ollamaUrl = document.getElementById('ollama-url').value;
    const ollamaModel = document.getElementById('ollama-model').value;
    const openrouteKey = document.getElementById('openroute-key').value;
    const openrouteModel = document.getElementById('openroute-model').value;

    chrome.storage.local.set({
      apiType,
      ollamaUrl,
      ollamaModel,
      openrouteKey,
      openrouteModel
    }, function() {
      alert('设置已保存');
    });
  });

  // 分析按钮点击事件
  document.getElementById('analyze-btn').addEventListener('click', function() {
    analyzeCurrentPage();
  });
  
  // 聊天发送按钮事件
  document.getElementById('send-chat-btn').addEventListener('click', function() {
    sendChatMessage();
  });
  
  // 聊天输入框回车发送
  document.getElementById('chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  function toggleApiSettings(apiType) {
    if (apiType === 'ollama') {
      document.getElementById('ollama-settings').style.display = 'block';
      document.getElementById('openroute-settings').style.display = 'none';
    } else {
      document.getElementById('ollama-settings').style.display = 'none';
      document.getElementById('openroute-settings').style.display = 'block';
    }
  }
  
  function analyzeCurrentPage() {
    const apiType = document.getElementById('api-select').value;
    const analysisType = document.getElementById('analysis-type').value;
    const customPrompt = document.getElementById('custom-prompt').value;
    
    // 显示加载动画
    document.getElementById('loading-spinner').style.display = 'block';
    document.getElementById('result').textContent = '正在分析...';
    
    // 禁用分析按钮
    document.getElementById('analyze-btn').disabled = true;
    
    // 获取API设置
    let apiSettings = {};
    if (apiType === 'ollama') {
      apiSettings = {
        url: document.getElementById('ollama-url').value,
        model: document.getElementById('ollama-model').value
      };
    } else {
      apiSettings = {
        key: document.getElementById('openroute-key').value,
        model: document.getElementById('openroute-model').value
      };
    }
    
    // 发送消息给后台脚本进行分析
    chrome.runtime.sendMessage({
      action: 'analyze',
      apiType,
      apiSettings,
      analysisType,
      customPrompt
    }, function(response) {
      // 隐藏加载动画
      document.getElementById('loading-spinner').style.display = 'none';
      
      // 启用分析按钮
      document.getElementById('analyze-btn').disabled = false;
      
      if (response.error) {
        document.getElementById('result').textContent = '分析出错: ' + response.error;
      } else {
        document.getElementById('result').textContent = response.result;
      }
    });
  }
  
  function sendChatMessage() {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value.trim();
    
    if (!userMessage) return;
    
    // 添加用户消息到聊天界面
    addChatMessage(userMessage, 'user');
    
    // 清空输入框
    chatInput.value = '';
    
    // 显示AI正在输入
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'ai-message');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.textContent = '正在思考...';
    document.getElementById('chat-messages').appendChild(typingIndicator);
    
    // 获取页面数据和API设置
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, {action: 'getPageData'}, function(response) {
        const pageData = response.data;
        
        // 读取API设置
        chrome.storage.local.get(['apiType', 'ollamaUrl', 'ollamaModel', 'openrouteKey', 'openrouteModel', 'chatHistory'], function(data) {
          const apiType = data.apiType || 'ollama';
          let apiSettings = {};
          
          if (apiType === 'ollama') {
            apiSettings = {
              url: data.ollamaUrl || 'http://localhost:11434',
              model: data.ollamaModel || 'llama3'
            };
          } else {
            apiSettings = {
              key: data.openrouteKey || '',
              model: data.openrouteModel || 'gpt-3.5-turbo'
            };
          }
          
          // 构建聊天提示词
          const chatHistory = data.chatHistory || [];
          const prompt = buildChatPrompt(userMessage, pageData, chatHistory);
          
          // 调用AI API进行回复
          if (apiType === 'ollama') {
            callOllamaAPI(apiSettings, prompt, function(response) {
              // 删除正在输入指示器
              document.getElementById('typing-indicator').remove();
              
              if (response.error) {
                addChatMessage('抱歉，出现错误: ' + response.error, 'ai');
              } else {
                addChatMessage(response.result, 'ai');
                
                // 更新聊天历史
                updateChatHistory(userMessage, response.result);
              }
            });
          } else {
            callOpenRouteAPI(apiSettings, prompt, function(response) {
              // 删除正在输入指示器
              document.getElementById('typing-indicator').remove();
              
              if (response.error) {
                addChatMessage('抱歉，出现错误: ' + response.error, 'ai');
              } else {
                addChatMessage(response.result, 'ai');
                
                // 更新聊天历史
                updateChatHistory(userMessage, response.result);
              }
            });
          }
        });
      });
    });
  }
  
  function addChatMessage(message, role) {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(role === 'user' ? 'user-message' : 'ai-message');
    messageElement.textContent = message;
    chatMessagesContainer.appendChild(messageElement);
    
    // 滚动到最新消息
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }
  
  function updateChatHistory(userMessage, aiResponse) {
    chrome.storage.local.get(['chatHistory'], function(data) {
      let chatHistory = data.chatHistory || [];
      
      // 添加新消息
      chatHistory.push({role: 'user', content: userMessage});
      chatHistory.push({role: 'ai', content: aiResponse});
      
      // 限制历史记录长度，保留最近20条消息
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(chatHistory.length - 20);
      }
      
      // 保存更新后的历史记录
      chrome.storage.local.set({chatHistory: chatHistory});
    });
  }
  
  function buildChatPrompt(userMessage, pageData, chatHistory) {
    // 构建聊天历史上下文
    let contextHistory = '';
    if (chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI';
        contextHistory += `${role}: ${msg.content}\n`;
      });
    }
    
    // 构建带有页面上下文的提示词
    return `你是一个网页助手AI，可以帮助用户分析和理解当前浏览的网页。以下是当前页面的信息：
    
标题：${pageData.title}
网址：${pageData.url}

以下是之前的对话历史：
${contextHistory}

用户的最新问题是：${userMessage}

请根据页面内容和问题提供有帮助的回答。`;
  }
});

// 调用Ollama API的函数
function callOllamaAPI(settings, prompt, callback) {
  fetch(`${settings.url}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      prompt: prompt,
      stream: false
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Ollama API请求失败: ' + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    callback({result: data.response});
  })
  .catch(error => {
    callback({error: error.message});
  });
}

// 调用OpenRoute API的函数
function callOpenRouteAPI(settings, prompt, callback) {
  fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.key}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {role: "user", content: prompt}
      ]
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('OpenRoute API请求失败: ' + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    callback({result: data.choices[0].message.content});
  })
  .catch(error => {
    callback({error: error.message});
  });
}

// content.js - 内容脚本，运行在页面上下文中
// 监听来自扩展的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageData') {
    // 获取页面内容
    const pageData = {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText,
      html: document.documentElement.outerHTML,
      scripts: [],
      errors: [],
      attachments: [],
      tables: []
    };
    
    // 获取页面上的所有脚本
    const scriptElements = document.getElementsByTagName('script');
    for (let i = 0; i < scriptElements.length; i++) {
      const script = scriptElements[i];
      pageData.scripts.push({
        src: script.src || '内联脚本',
        content: script.innerHTML || '外部脚本',
        type: script.type || 'text/javascript'
      });
    }
    
    // 收集控制台错误（注意：这只能捕获扩展执行后的新错误）
    if (!window._errorCollectorInitialized) {
      window.addEventListener('error', function(event) {
        if (!window._collectedErrors) window._collectedErrors = [];
        window._collectedErrors.push({
          message: event.message,
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString()
        });
      });
      
      // 替换console.error以捕获错误日志
      const originalConsoleError = console.error;
      console.error = function() {
        if (!window._collectedErrors) window._collectedErrors = [];
        window._collectedErrors.push({
          type: 'console.error',
          message: Array.from(arguments).join(' '),
          timestamp: new Date().toISOString()
        });
        originalConsoleError.apply(console, arguments);
      };
      
      window._errorCollectorInitialized = true;
    }
    
    // 获取已收集的错误
    if (window._collectedErrors) {
      pageData.errors = window._collectedErrors;
    }
    
    // 检查明显的DOM错误
    const brokenImages = document.querySelectorAll('img[src]:not([src=""])');
    for (let i = 0; i < brokenImages.length; i++) {
      const img = brokenImages[i];
      if (img.naturalWidth === 0 && img.naturalHeight === 0 && !img.complete) {
        pageData.errors.push({
          type: 'broken_image',
          src: img.src,
          alt: img.alt || '无替代文本'
        });
      }
    }
    
    // 收集附件链接
    const attachmentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.txt'];
    const links = document.querySelectorAll('a[href]');
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const href = link.getAttribute('href').toLowerCase();
      
      // 检查链接是否指向附件
      if (attachmentExtensions.some(ext => href.endsWith(ext))) {
        pageData.attachments.push({
          url: link.href,
          text: link.textContent.trim(),
          type: href.split('.').pop()
        });
      }
    }
    
    // 收集表格
    const tables = document.querySelectorAll('table');
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableData = {
        id: table.id || `table-${i}`,
        caption: table.caption ? table.caption.textContent.trim() : '',
        headers: [],
        rowCount: table.rows.length,
        columnCount: 0,
        sample: []
      };
      
      // 获取表格标题
      const headerCells = table.querySelectorAll('th');
      if (headerCells.length > 0) {
        for (let j = 0; j < headerCells.length; j++) {
          tableData.headers.push(headerCells[j].textContent.trim());
        }
        tableData.columnCount = tableData.headers.length;
      } else if (table.rows.length > 0) {
        tableData.columnCount = table.rows[0].cells.length;
      }
      
      // 获取样本数据（最多5行）
      const maxRows = Math.min(5, table.rows.length);
      for (let j = 0; j < maxRows; j++) {
        const row = table.rows[j];
        const rowData = [];
        for (let k = 0; k < row.cells.length; k++) {
          rowData.push(row.cells[k].textContent.trim());
        }
        tableData.sample.push(rowData);
      }
      
      pageData.tables.push(tableData);
    }
    
    sendResponse({data: pageData});
  }
  return true;
});

// background.js - 后台服务工作线程
// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['content.js']
  });
});

// 监听来自弹出页面的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'analyze') {
    // 获取当前活动标签
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      // 从活动标签获取页面数据
      chrome.tabs.sendMessage(activeTab.id, {action: 'getPageData'}, function(response) {
        if (chrome.runtime.lastError) {
          sendResponse({error: '无法获取页面数据: ' + chrome.runtime.lastError.message});
          return;
        }
        
        const pageData = response.data;
        
        // 根据分析类型构建提示词
        let prompt = buildPrompt(pageData, request.analysisType, request.customPrompt);
        
        // 调用AI API进行分析
        if (request.apiType === 'ollama') {
          callOllamaAPI(request.apiSettings, prompt, sendResponse);
        } else {
          callOpenRouteAPI(request.apiSettings, prompt, sendResponse);
        }
      });
    });
    
    return true; // 保持消息通道开放
  }
});

// 构建不同类型分析的提示词
function buildPrompt(pageData, analysisType, customPrompt) {
  let prompt = '';
  
  switch (analysisType) {
    case 'summary':
      prompt = `请对以下网页内容进行简洁摘要（500字以内）：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n内容：${truncateText(pageData.content, 3000)}`;
      break;
    case 'sentiment':
      prompt = `请对以下网页内容进行情感分析，判断整体情感倾向（积极、消极或中性）并说明理由：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n内容：${truncateText(pageData.content, 3000)}`;
      break;
    case 'keywords':
      prompt = `请从以下网页内容中提取10个最重要的关键词或短语，并按重要性排序：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n内容：${truncateText(pageData.content, 3000)}`;
      break;
    case 'scripts':
      const scriptsSummary = pageData.scripts.map((script, index) => 
        `脚本 ${index+1}:\n源: ${script.src}\n类型: ${script.type}\n内容: ${truncateText(script.content, 500)}`
      ).join('\n\n');
      
      prompt = `请分析以下网页脚本，识别它们的功能和可能的安全风险：\n\n网址：${pageData.url}\n\n${scriptsSummary}`;
      break;
    case 'security':
      prompt = `请对以下网页内容和脚本进行安全分析，识别可能存在的安全问题（如跟踪器、不安全的行为等）：\n\n标题：${pageData.title}\n网址：${pageData.
      // background.js (continued from the provided code)

      prompt = `请对以下网页内容和脚本进行安全分析，识别可能存在的安全问题（如跟踪器、不安全的行为等）：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n网页内容摘要：${truncateText(pageData.content, 1500)}\n\n脚本信息：${pageData.scripts.length}个脚本`;
      break;
    case 'error':
      // 网页错误分析
      const errorsDetail = pageData.errors.length > 0 
        ? pageData.errors.map((error, index) => {
            if (error.type === 'broken_image') {
              return `错误 ${index+1}: 损坏的图片 - 源: ${error.src}, 替代文本: ${error.alt}`;
            } else if (error.type === 'console.error') {
              return `错误 ${index+1}: 控制台错误 - ${error.message} (${error.timestamp})`;
            } else {
              return `错误 ${index+1}: ${error.message} - 源: ${error.source || '未知'}, 行: ${error.lineno || '未知'}, 列: ${error.colno || '未知'} (${error.timestamp})`;
            }
          }).join('\n\n')
        : '未检测到明显错误';
      
      prompt = `请分析以下网页的错误信息，提供可能的原因和修复建议：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n${errorsDetail}`;
      break;
    case 'attachments':
      // 附件和表格索引
      const attachmentsDetail = pageData.attachments.length > 0
        ? pageData.attachments.map((attachment, index) => 
            `附件 ${index+1}: [${attachment.type.toUpperCase()}] ${attachment.text} - ${attachment.url}`
          ).join('\n')
        : '未检测到附件';
      
      const tablesDetail = pageData.tables.length > 0
        ? pageData.tables.map((table, index) => {
            let tableInfo = `表格 ${index+1}: ${table.caption || table.id}\n`;
            tableInfo += `行数: ${table.rowCount}, 列数: ${table.columnCount}\n`;
            tableInfo += `表头: ${table.headers.join(' | ')}\n`;
            tableInfo += `样本数据:\n`;
            
            table.sample.forEach((row, rowIndex) => {
              tableInfo += `  行 ${rowIndex+1}: ${row.join(' | ')}\n`;
            });
            
            return tableInfo;
          }).join('\n\n')
        : '未检测到表格';
      
      prompt = `请为以下网页的附件和表格创建索引，并分析它们的内容和用途：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n附件列表:\n${attachmentsDetail}\n\n表格列表:\n${tablesDetail}`;
      break;
    case 'custom':
      // 自定义分析
      prompt = customPrompt.replace('{title}', pageData.title)
                          .replace('{url}', pageData.url)
                          .replace('{content}', truncateText(pageData.content, 3000));
      break;
    default:
      prompt = `请分析以下网页内容：\n\n标题：${pageData.title}\n网址：${pageData.url}\n\n内容：${truncateText(pageData.content, 3000)}`;
    }

    return prompt;
    }

    // 截断文本以避免过长
    function truncateText(text, maxLength) {
    if (!text) return '';

    if (text.length <= maxLength) {
    return text;
    }

    return text.substring(0, maxLength) + '... (内容已截断)';
    }

    // 调用Ollama API的函数
    function callOllamaAPI(settings, prompt, callback) {
    fetch(`${settings.url}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      prompt: prompt,
      stream: false
    })
    })
    .then(response => {
    if (!response.ok) {
      throw new Error('Ollama API请求失败: ' + response.statusText);
    }
    return response.json();
    })
    .then(data => {
    callback({result: data.response});
    })
    .catch(error => {
    callback({error: error.message});
    });
    }

    // 调用OpenRoute API的函数
    function callOpenRouteAPI(settings, prompt, callback) {
    fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.key}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {role: "user", content: prompt}
      ]
    })
    })
    .then(response => {
    if (!response.ok) {
      throw new Error('OpenRoute API请求失败: ' + response.statusText);
    }
    return response.json();
    })
    .then(data => {
    callback({result: data.choices[0].message.content});
    })
    .catch(error => {
    callback({error: error.message});
    });
    }