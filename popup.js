document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const apiSelect = document.getElementById('api-select');
  const ollamaSettings = document.getElementById('ollama-settings');
  const openrouteSettings = document.getElementById('openroute-settings');
  const analysisType = document.getElementById('analysis-type');
  const customPromptContainer = document.getElementById('custom-prompt-container');
  const customPrompt = document.getElementById('custom-prompt');
  const analyzeBtn = document.getElementById('analyze-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resultDiv = document.getElementById('result');
  const loadingSpinner = document.getElementById('loading-spinner');
  const chatInput = document.getElementById('chat-input');
  const sendChatBtn = document.getElementById('send-chat-btn');
  const chatMessages = document.getElementById('chat-messages');
  
  // 标签页切换功能
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 获取目标标签页ID
      const targetId = this.getAttribute('data-tab');
      
      // 移除所有标签和内容的active类
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 激活当前标签和对应内容
      this.classList.add('active');
      document.getElementById(`${targetId}-tab`).classList.add('active');
    });
  });
  
  // 加载保存的设置
  loadSettings();
  
  // API类型切换事件
  apiSelect.addEventListener('change', function() {
    ollamaSettings.style.display = 'none';
    openrouteSettings.style.display = 'none';
    document.getElementById('custom-settings').style.display = 'none';
    
    if (this.value === 'ollama') {
      ollamaSettings.style.display = 'block';
    } else if (this.value === 'openroute') {
      openrouteSettings.style.display = 'block';
    } else if (this.value === 'custom') {
      document.getElementById('custom-settings').style.display = 'block';
    }
  });
  
  // 分析类型切换事件
  analysisType.addEventListener('change', function() {
    if (this.value === 'custom') {
      customPromptContainer.style.display = 'block';
    } else {
      customPromptContainer.style.display = 'none';
    }
  });
  
  // 保存设置按钮点击事件
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // 分析按钮点击事件
  analyzeBtn.addEventListener('click', analyzePage);
  
  // 聊天发送按钮事件
  sendChatBtn.addEventListener('click', sendChatMessage);
  
  // 聊天输入框回车发送
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // 加载保存的设置
  function loadSettings() {
    chrome.storage.sync.get([
      'apiType',
      'ollamaUrl',
      'ollamaModel',
      'openrouteKey',
      'openrouteModel',
      'customUrl',
      'customKey',
      'customModel',
      'customHeaders',
      'customBodyTemplate',
      'customResponsePath',
      'chatHistory'
    ], function(items) {
      if (items.apiType) {
        apiSelect.value = items.apiType;
        apiSelect.dispatchEvent(new Event('change'));
      }
      if (items.ollamaUrl) {
        document.getElementById('ollama-url').value = items.ollamaUrl;
      }
      if (items.ollamaModel) {
        document.getElementById('ollama-model').value = items.ollamaModel;
      }
      if (items.openrouteKey) {
        document.getElementById('openroute-key').value = items.openrouteKey;
      }
      if (items.openrouteModel) {
        document.getElementById('openroute-model').value = items.openrouteModel;
      }
      // 加载自定义服务设置
      if (items.customUrl) {
        document.getElementById('custom-url').value = items.customUrl;
      }
      if (items.customKey) {
        document.getElementById('custom-key').value = items.customKey;
      }
      if (items.customModel) {
        document.getElementById('custom-model').value = items.customModel;
      }
      if (items.customHeaders) {
        document.getElementById('custom-headers').value = items.customHeaders;
      }
      if (items.customBodyTemplate) {
        document.getElementById('custom-body-template').value = items.customBodyTemplate;
      }
      if (items.customResponsePath) {
        document.getElementById('custom-response-path').value = items.customResponsePath;
      }
      
      // 加载聊天历史
      if (items.chatHistory && items.chatHistory.length > 0) {
        chatMessages.innerHTML = '';
        items.chatHistory.forEach(msg => {
          addChatMessage(msg.content, msg.role);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  }
  
  // 保存设置
  function saveSettings() {
    const settings = {
      apiType: apiSelect.value,
      ollamaUrl: document.getElementById('ollama-url').value,
      ollamaModel: document.getElementById('ollama-model').value,
      openrouteKey: document.getElementById('openroute-key').value,
      openrouteModel: document.getElementById('openroute-model').value,
      // 保存自定义服务设置
      customUrl: document.getElementById('custom-url').value,
      customKey: document.getElementById('custom-key').value,
      customModel: document.getElementById('custom-model').value,
      customHeaders: document.getElementById('custom-headers').value,
      customBodyTemplate: document.getElementById('custom-body-template').value,
      customResponsePath: document.getElementById('custom-response-path').value
    };
    
    chrome.storage.sync.set(settings, function() {
      if (chrome.runtime.lastError) {
        showResult('保存设置失败: ' + chrome.runtime.lastError.message, true);
      } else {
        showResult('设置已保存', false);
      }
    });
  }
  
  // 分析当前页面
  function analyzePage() {
    analyzeBtn.disabled = true;
    loadingSpinner.style.display = 'block';
    showResult('正在分析...', false);
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        showResult('获取当前标签页失败: ' + chrome.runtime.lastError.message, true);
        resetUI();
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        showResult('未找到当前标签页', true);
        resetUI();
        return;
      }
      
      const activeTab = tabs[0];
      
      // 准备API设置
      const apiSettings = {
        type: apiSelect.value
      };
      
      if (apiSelect.value === 'ollama') {
        apiSettings.url = document.getElementById('ollama-url').value;
        apiSettings.model = document.getElementById('ollama-model').value;
      } else if (apiSelect.value === 'openroute') {
        apiSettings.key = document.getElementById('openroute-key').value;
        apiSettings.model = document.getElementById('openroute-model').value;
      } else if (apiSelect.value === 'custom') {
        apiSettings.url = document.getElementById('custom-url').value;
        apiSettings.key = document.getElementById('custom-key').value;
        apiSettings.model = document.getElementById('custom-model').value;
        apiSettings.headers = document.getElementById('custom-headers').value;
        apiSettings.bodyTemplate = document.getElementById('custom-body-template').value;
        apiSettings.responsePath = document.getElementById('custom-response-path').value;
      }
      
      if (!validateSettings(apiSettings)) {
        resetUI();
        return;
      }
      
      chrome.runtime.sendMessage({
        action: 'analyze',
        apiType: apiSettings.type,
        apiSettings: apiSettings,
        analysisType: analysisType.value,
        customPrompt: customPrompt.value
      }, function(response) {
        if (chrome.runtime.lastError) {
          showResult('分析请求失败: ' + chrome.runtime.lastError.message, true);
        } else if (response.error) {
          showResult('分析错误: ' + response.error, true);
        } else {
          showResult(response.result, false);
        }
        resetUI();
      });
    });
  }
  
  // 发送聊天消息
  function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // 添加用户消息到聊天窗口
    addChatMessage(message, 'user');
    
    // 清空输入框
    chatInput.value = '';
    
    // 添加正在输入指示器
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message ai-message';
    typingIndicator.textContent = '正在思考...';
    typingIndicator.id = 'typing-indicator';
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 获取页面数据和API设置
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(activeTab.id, {action: 'getPageData'}, function(response) {
        const pageData = response.data;
        
        // 读取API设置
        chrome.storage.sync.get([
          'apiType',
          'ollamaUrl',
          'ollamaModel',
          'openrouteKey',
          'openrouteModel',
          'chatHistory'
        ], function(data) {
          const apiType = data.apiType || 'ollama';
          let apiSettings = {};
          
          if (apiType === 'ollama') {
            apiSettings = {
              url: data.ollamaUrl || 'http://localhost:11434',
              model: data.ollamaModel || 'llama3'
            };
          } else if (apiType === 'openroute') {
            apiSettings = {
              key: data.openrouteKey || '',
              model: data.openrouteModel || 'gpt-3.5-turbo'
            };
          } else if (apiType === 'custom') {
            apiSettings = {
              url: data.customUrl || '',
              key: data.customKey || '',
              model: data.customModel || '',
              headers: data.customHeaders || '{}',
              bodyTemplate: data.customBodyTemplate || '',
              responsePath: data.customResponsePath || ''
            };
          }
          
          // 构建聊天提示词
          const chatHistory = data.chatHistory || [];
          const prompt = buildChatPrompt(message, pageData, chatHistory);
          
          // 调用AI API
          if (apiType === 'ollama') {
            callOllamaAPI(apiSettings, prompt, function(response) {
              // 删除正在输入指示器
              document.getElementById('typing-indicator').remove();
              
              if (response.error) {
                addChatMessage('抱歉，我遇到了问题: ' + response.error, 'ai');
              } else {
                addChatMessage(response.result, 'ai');
                updateChatHistory(message, response.result);
              }
            });
          } else if (apiType === 'openroute') {
            callOpenRouteAPI(apiSettings, prompt, function(response) {
              // 删除正在输入指示器
              document.getElementById('typing-indicator').remove();
              
              if (response.error) {
                addChatMessage('抱歉，我遇到了问题: ' + response.error, 'ai');
              } else {
                addChatMessage(response.result, 'ai');
                updateChatHistory(message, response.result);
              }
            });
          } else if (apiType === 'custom') {
            callCustomAPI(apiSettings, prompt, function(response) {
              // 删除正在输入指示器
              document.getElementById('typing-indicator').remove();
              
              if (response.error) {
                addChatMessage('抱歉，我遇到了问题: ' + response.error, 'ai');
              } else {
                addChatMessage(response.result, 'ai');
                updateChatHistory(message, response.result);
              }
            });
          }
        });
      });
    });
  }
  
  // 添加聊天消息到界面
  function addChatMessage(message, role) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + (role === 'user' ? 'user-message' : 'ai-message');
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    
    // 滚动到最新消息
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // 更新聊天历史
  function updateChatHistory(userMessage, aiResponse) {
    chrome.storage.sync.get(['chatHistory'], function(data) {
      let chatHistory = data.chatHistory || [];
      
      // 添加新消息
      chatHistory.push(
        {role: 'user', content: userMessage},
        {role: 'ai', content: aiResponse}
      );
      
      // 限制历史记录长度（保留最新的20条消息）
      if (chatHistory.length > 40) {
        chatHistory = chatHistory.slice(-40);
      }
      
      // 保存更新后的历史记录
      chrome.storage.sync.set({chatHistory: chatHistory});
    });
  }
  
  // 构建聊天提示词
  function buildChatPrompt(userMessage, pageData, chatHistory) {
    // 构建聊天历史上下文
    let contextHistory = '';
    if (chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-6); // 只使用最近的3轮对话
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI';
        contextHistory += `${role}: ${msg.content}\n`;
      });
    }
    
    // 构建带有页面上下文的提示词
    return `你是一个网页助手AI，可以帮助用户分析和理解当前浏览的网页。以下是当前页面的信息：

标题：${pageData.title}
网址：${pageData.url}
内容摘要：${truncateText(pageData.content, 1000)}

最近的对话历史：
${contextHistory}

用户的新问题：${userMessage}

请根据页面内容和问题提供有帮助的回答。`;
  }
  
  // 验证API设置
  function validateSettings(settings) {
    if (settings.type === 'ollama') {
      if (!settings.url) {
        showResult('请输入Ollama服务URL', true);
        return false;
      }
      if (!settings.model) {
        showResult('请输入Ollama模型名称', true);
        return false;
      }
    } else if (settings.type === 'openroute') {
      if (!settings.key) {
        showResult('请输入OpenRoute API密钥', true);
        return false;
      }
      if (!settings.model) {
        showResult('请输入OpenRoute模型名称', true);
        return false;
      }
    } else if (settings.type === 'custom') {
      if (!settings.url) {
        showResult('请输入自定义API端点URL', true);
        return false;
      }
      if (!settings.bodyTemplate) {
        showResult('请输入请求体模板', true);
        return false;
      }
      try {
        JSON.parse(settings.headers || '{}');
      } catch (e) {
        showResult('自定义请求头格式无效', true);
        return false;
      }
      try {
        JSON.parse(settings.bodyTemplate);
      } catch (e) {
        showResult('请求体模板格式无效', true);
        return false;
      }
    }
    return true;
  }
  
  // 显示结果
  function showResult(message, isError) {
    resultDiv.textContent = message;
    resultDiv.style.color = isError ? 'red' : 'black';
  }
  
  // 重置UI状态
  function resetUI() {
    analyzeBtn.disabled = false;
    loadingSpinner.style.display = 'none';
  }
  
  // 截断文本以避免超过API限制
  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...（内容已截断）';
  }
  
  // 调用Ollama API
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
  
  // 调用OpenRoute API
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
  
  // 调用自定义API
  function callCustomAPI(settings, prompt, callback) {
    try {
      const headers = JSON.parse(settings.headers || '{}');
      let bodyTemplate = JSON.parse(settings.bodyTemplate);
      
      // 替换模板中的变量
      const bodyStr = JSON.stringify(bodyTemplate)
        .replace(/\$model/g, settings.model)
        .replace(/\$prompt/g, prompt)
        .replace(/\$key/g, settings.key);
      
      const body = JSON.parse(bodyStr);
      
      fetch(settings.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('API请求失败: ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        // 从响应中提取内容
        const paths = settings.responsePath.split('.');
        let result = data;
        for (const path of paths) {
          const arrayMatch = path.match(/(\w+)\[(\d+)\]/);
          if (arrayMatch) {
            // 处理数组访问，如 choices[0]
            const [_, name, index] = arrayMatch;
            result = result[name][parseInt(index)];
          } else {
            result = result[path];
          }
        }
        callback({result});
      })
      .catch(error => {
        callback({error: error.message});
      });
    } catch (error) {
      callback({error: '调用自定义API时出错: ' + error.message});
    }
  }
}); 