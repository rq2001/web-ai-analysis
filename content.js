// 通知background.js内容脚本已加载
chrome.runtime.sendMessage({ action: 'contentScriptLoaded' });

// 初始化错误收集器
function initializeErrorCollector() {
  if (window._errorCollectorInitialized) {
    return;
  }

  window._collectedErrors = [];
  
  // 监听JavaScript运行时错误
  window.addEventListener('error', function(event) {
    window._collectedErrors.push({
      type: 'runtime_error',
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
    
    // 限制错误收集数量
    if (window._collectedErrors.length > 50) {
      window._collectedErrors = window._collectedErrors.slice(-50);
    }
  });

  // 替换console.error以捕获错误日志
  const originalConsoleError = console.error;
  console.error = function() {
    window._collectedErrors.push({
      type: 'console.error',
      message: Array.from(arguments).join(' '),
      timestamp: new Date().toISOString()
    });
    
    // 限制错误收集数量
    if (window._collectedErrors.length > 50) {
      window._collectedErrors = window._collectedErrors.slice(-50);
    }
    
    originalConsoleError.apply(console, arguments);
  };

  window._errorCollectorInitialized = true;
}

// 收集页面数据 - 优化版本
function collectPageData() {
  const pageData = {
    url: window.location.href,
    title: document.title,
    content: document.body.innerText,
    scripts: [],
    errors: window._collectedErrors || [],
    attachments: [],
    tables: []
  };

  try {
    // 收集脚本信息 - 限制数量和大小
    const maxScripts = 100;
    const scriptElements = document.getElementsByTagName('script');
    Array.from(scriptElements).slice(0, maxScripts).forEach(script => {
      try {
        const scriptContent = script.innerHTML;
        const truncatedContent = scriptContent.length > 1000 ? 
                                scriptContent.substring(0, 1000) + '...(内容已截断)' : 
                                scriptContent;
                                
        pageData.scripts.push({
          src: script.src || '内联脚本',
          content: script.src ? '外部脚本' : truncatedContent,
          type: script.type || 'text/javascript'
        });
      } catch (error) {
        console.error('处理脚本时出错:', error);
      }
    });
    
    if (scriptElements.length > maxScripts) {
      pageData.scripts.push({
        src: '已截断',
        content: `还有${scriptElements.length - maxScripts}个脚本未显示`,
        type: 'info'
      });
    }

    // 检查损坏的图片 - 添加超时和可见性检查
    const maxImagesToCheck = 100;
    const images = document.querySelectorAll('img[src]:not([src=""])');
    
    const visibleImages = Array.from(images).filter(img => {
      try {
        const rect = img.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      } catch (error) {
        console.error('检查图片可见性时出错:', error);
        return false;
      }
    }).slice(0, maxImagesToCheck);
    
    visibleImages.forEach(img => {
      try {
        if (img.complete && img.naturalWidth === 0 && img.naturalHeight === 0) {
          pageData.errors.push({
            type: 'broken_image',
            src: img.src,
            alt: img.alt || '无替代文本',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('检查图片状态时出错:', error);
      }
    });

    // 收集附件链接 - 优化收集策略
    const attachmentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.txt'];
    const maxAttachments = 30;
    const links = document.querySelectorAll('a[href]');
    let attachmentCount = 0;
    
    for (let i = 0; i < links.length && attachmentCount < maxAttachments; i++) {
      try {
        const link = links[i];
        const href = link.getAttribute('href');
        if (href) {
          const hrefLower = href.toLowerCase();
          if (attachmentExtensions.some(ext => hrefLower.endsWith(ext))) {
            pageData.attachments.push({
              url: link.href,
              text: truncateText(link.textContent.trim(), 100),
              type: hrefLower.split('.').pop()
            });
            attachmentCount++;
          }
        }
      } catch (error) {
        console.error('处理附件链接时出错:', error);
      }
    }

    // 收集表格数据 - 限制采样大小
    const maxTables = 10;
    const tables = document.querySelectorAll('table');
    const tablesToProcess = Array.from(tables).slice(0, maxTables);
    
    tablesToProcess.forEach((table, index) => {
      try {
        // 过滤掉太小的表格
        if (table.rows.length <= 1 && (!table.rows[0] || table.rows[0].cells.length <= 1)) {
          return;
        }
        
        const tableData = {
          id: table.id || `table-${index}`,
          caption: table.caption ? truncateText(table.caption.textContent.trim(), 100) : '',
          headers: [],
          rowCount: table.rows.length,
          columnCount: 0,
          sample: []
        };

        // 获取表格标题
        const headerCells = table.querySelectorAll('th');
        if (headerCells.length > 0) {
          headerCells.forEach(cell => {
            tableData.headers.push(truncateText(cell.textContent.trim(), 50));
          });
          tableData.columnCount = tableData.headers.length;
        } else if (table.rows.length > 0) {
          tableData.columnCount = table.rows[0].cells.length;
        }

        // 获取样本数据
        const maxRows = Math.min(5, table.rows.length);
        for (let i = 0; i < maxRows; i++) {
          const row = table.rows[i];
          const rowData = Array.from(row.cells).map(cell => 
            truncateText(cell.textContent.trim(), 100)
          );
          tableData.sample.push(rowData);
        }

        pageData.tables.push(tableData);
      } catch (error) {
        console.error('处理表格时出错:', error);
      }
    });

  } catch (error) {
    console.error('收集页面数据时出错:', error);
    pageData.errors.push({
      type: 'collection_error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

  return pageData;
}

// 辅助函数：截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 初始化错误收集器
initializeErrorCollector();

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageData') {
    try {
      const pageData = collectPageData();
      sendResponse({data: pageData});
    } catch (error) {
      console.error('处理消息时出错:', error);
      sendResponse({
        error: '收集页面数据时出错: ' + error.message,
        data: {
          url: window.location.href,
          title: document.title,
          errors: [{
            type: 'fatal_error',
            message: error.message,
            timestamp: new Date().toISOString()
          }]
        }
      });
    }
    return true;
  }
}); 