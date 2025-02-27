// 存储内容脚本注入状态
const injectedTabs = new Map();

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    injectedTabs.delete(tabId);
  }
});

// 监听标签页移除
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// 注入内容脚本
async function injectContentScript(tabId) {
  if (injectedTabs.has(tabId)) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    
    // 等待内容脚本回复而不是使用固定时间
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('内容脚本加载超时'));
      }, 2000); // 2秒超时，比100ms更宽松
      
      const listener = function(request, sender) {
        if (request.action === 'contentScriptLoaded' && sender.tab.id === tabId) {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(listener);
          injectedTabs.set(tabId, true);
          resolve();
        }
      };
      
      chrome.runtime.onMessage.addListener(listener);
    });
  } catch (error) {
    console.error('注入内容脚本失败:', error);
    throw error;
  }
}

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener(() => {
  // 设置默认配置
  chrome.storage.sync.get({
    apiType: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    openrouteKey: '',
    openrouteModel: 'gpt-3.5-turbo'
  }, (items) => {
    chrome.storage.sync.set(items);
  });
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    handleAnalysis(request, sender, sendResponse);
    return true;
  }
});

// 处理分析请求
async function handleAnalysis(request, sender, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || !tabs[0]) {
      throw new Error('未找到活动标签页');
    }
    
    const activeTab = tabs[0];
    
    // 确保内容脚本已注入
    await injectContentScript(activeTab.id);
    
    // 获取页面数据
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(activeTab.id, {action: 'getPageData'}, resolve);
    });
    
    if (!response || !response.data) {
      throw new Error('获取页面数据失败');
    }
    
    // 构建提示词
    const prompt = buildPrompt(response.data, request.analysisType, request.customPrompt);
    
    // 调用相应的API
    if (request.apiType === 'ollama') {
      callOllamaAPI(request.apiSettings, prompt, sendResponse);
    } else {
      callOpenRouteAPI(request.apiSettings, prompt, sendResponse);
    }
    
    return true; // 保持消息通道开放
  } catch (error) {
    sendResponse({error: error.message});
    return false;
  }
}

// API调用改进 - 添加重试逻辑
function callOllamaAPI(settings, prompt, sendResponse) {
  const maxRetries = 2;
  let retryCount = 0;
  
  function attemptFetch() {
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
        // 针对不同状态码的处理
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        } else if (response.status >= 500) {
          throw new Error('Ollama服务器错误: ' + response.status);
        } else {
          throw new Error('Ollama API请求失败: ' + response.statusText);
        }
      }
      return response.json();
    })
    .then(data => {
      sendResponse({result: data.response});
    })
    .catch(error => {
      // 对某些错误类型进行重试
      if (retryCount < maxRetries && 
          (error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('500'))) {
        retryCount++;
        console.log(`重试API调用 (${retryCount}/${maxRetries})...`);
        setTimeout(attemptFetch, 1000); // 1秒后重试
      } else {
        sendResponse({error: error.message});
      }
    });
  }
  
  attemptFetch();
}

// 调用OpenRoute API
function callOpenRouteAPI(settings, prompt, sendResponse) {
  const maxRetries = 2;
  let retryCount = 0;
  
  function attemptFetch() {
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
        if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试');
        } else if (response.status >= 500) {
          throw new Error('OpenRoute服务器错误: ' + response.status);
        } else {
          throw new Error('OpenRoute API请求失败: ' + response.statusText);
        }
      }
      return response.json();
    })
    .then(data => {
      sendResponse({result: data.choices[0].message.content});
    })
    .catch(error => {
      if (retryCount < maxRetries && 
          (error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('500'))) {
        retryCount++;
        console.log(`重试API调用 (${retryCount}/${maxRetries})...`);
        setTimeout(attemptFetch, 1000);
      } else {
        sendResponse({error: error.message});
      }
    });
  }
  
  attemptFetch();
}

// 提示词构建优化 - 将不同类型的提示词拆分为单独函数
function buildPrompt(pageData, analysisType, customPrompt) {
  const promptBuilders = {
    summary: (data) => 
      `请对以下网页内容进行简洁摘要（500字以内）：\n\n标题：${data.title}\n网址：${data.url}\n\n内容：${truncateText(data.content, 3000)}`,
    
    sentiment: (data) => 
      `请对以下网页内容进行情感分析，判断整体情感倾向（积极、消极或中性）并说明理由：\n\n标题：${data.title}\n网址：${data.url}\n\n内容：${truncateText(data.content, 3000)}`,
    
    keywords: (data) => 
      `请从以下网页内容中提取10个最重要的关键词或短语，并按重要性排序：\n\n标题：${data.title}\n网址：${data.url}\n\n内容：${truncateText(data.content, 3000)}`,
    
    scripts: (data) => {
      const scriptsSummary = data.scripts.map((script, index) => 
        `脚本 ${index+1}:\n源: ${script.src}\n类型: ${script.type}\n内容: ${truncateText(script.content, 500)}`
      ).join('\n\n');
      
      return `请分析以下网页脚本，识别它们的功能和可能的安全风险：\n\n网址：${data.url}\n\n${scriptsSummary}`;
    },
    
    security: (data) => 
      `请对以下网页内容和脚本进行安全分析，识别可能存在的安全问题（如跟踪器、不安全的行为等）：\n\n标题：${data.title}\n网址：${data.url}\n\n内容概要：${truncateText(data.content, 1000)}\n\n脚本数量：${data.scripts.length}`,
    
    error: (data) => {
      const errorsDetail = data.errors.length > 0 
        ? data.errors.map((error, index) => {
          if (error.type === 'broken_image') {
            return `错误 ${index+1}: 损坏的图片 - 源: ${error.src}, 替代文本: ${error.alt}`;
          } else if (error.type === 'console.error') {
            return `错误 ${index+1}: 控制台错误 - ${error.message} (${error.timestamp})`;
          } else {
            return `错误 ${index+1}: ${error.message} - 源: ${error.source || '未知'}, 行: ${error.lineno || '未知'}, 列: ${error.colno || '未知'} (${error.timestamp})`;
          }
        }).join('\n\n')
        : '未检测到明显错误';
      
      return `请分析以下网页的错误信息，提供可能的原因和修复建议：\n\n标题：${data.title}\n网址：${data.url}\n\n${errorsDetail}`;
    },
    
    attachments: (data) => {
      const attachmentsDetail = data.attachments.length > 0
        ? data.attachments.map((attachment, index) => 
          `附件 ${index+1}: [${attachment.type.toUpperCase()}] ${attachment.text} - ${attachment.url}`
        ).join('\n')
        : '未检测到附件';
      
      const tablesDetail = data.tables.length > 0
        ? data.tables.map((table, index) => {
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
      
      return `请为以下网页的附件和表格创建索引，并分析它们的内容和用途：\n\n标题：${data.title}\n网址：${data.url}\n\n附件列表:\n${attachmentsDetail}\n\n表格列表:\n${tablesDetail}`;
    },
    
    custom: (data, customPrompt) => 
      customPrompt + `\n\n标题：${data.title}\n网址：${data.url}\n\n内容：${truncateText(data.content, 3000)}`,
    
    default: (data) => 
      `请分析以下网页内容：\n\n标题：${data.title}\n网址：${data.url}\n\n内容：${truncateText(data.content, 3000)}`
  };
  
  // 使用对应类型的提示词构建函数，如果不存在则使用默认
  const builder = promptBuilders[analysisType] || promptBuilders.default;
  return builder(pageData, customPrompt);
}

// 辅助函数：截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...（内容已截断）';
} 