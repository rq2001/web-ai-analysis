# AI页面分析工具 - 浏览器扩展

这是一个强大的浏览器扩展，可以使用AI（Ollama和OpenRoute）分析网页内容，提供有关页面结构、脚本行为、安全风险等方面的深入见解。

## 功能特点

- 分析页面HTML结构和内容
- 检查JavaScript脚本行为
- 分析页面性能
- 识别潜在安全风险
- 提供元数据分析
- 支持Ollama本地AI和OpenRoute云端AI服务

## 安装要求

- Chrome浏览器 88+ / Firefox 87+ / Edge 88+
- [Ollama](https://ollama.ai/)（可选，用于本地AI分析）
- OpenRoute API密钥（可选，用于云端AI分析）

## 安装步骤

1. 克隆或下载此仓库
2. 打开Chrome/Firefox/Edge浏览器
3. 进入扩展管理页面：
   - Chrome: chrome://extensions/
   - Firefox: about:addons
   - Edge: edge://extensions/
4. 启用"开发者模式"
5. 点击"加载已解压的扩展"（Chrome/Edge）或"临时载入附加组件"（Firefox）
6. 选择此仓库的目录

## 配置

1. 点击浏览器工具栏中的扩展图标
2. 在设置部分配置：
   - Ollama端点（默认为 http://localhost:11434/api/generate）
   - Ollama模型（默认为 llama3）
   - OpenRoute API密钥
   - OpenRoute模型（默认为 openai/gpt-3.5-turbo）
   - 自定义模型

## 使用方法

1. 访问任意网页
2. 点击扩展图标
3. 选择分析类型：
   - 页面摘要
   - 情感分析
   - 关键词提取
   - 脚本分析
   - 安全检查
   - 自定义分析
4. 点击"分析当前页面"按钮
5. 等待分析完成
6. 查看分析结果

## 项目结构

```
├── manifest.json          # 扩展配置文件
├── popup.html            # 弹出窗口界面
├── popup.js             # 弹出窗口逻辑
├── background.js        # 后台脚本
├── content.js          # 内容脚本
├── icons/              # 扩展图标
└── README.md           # 说明文档
```

## 开发

### 本地开发

1. 修改代码后，在扩展管理页面点击"重新加载"
2. 使用Chrome DevTools调试：
   - 右键点击扩展图标，选择"检查弹出内容"
   - 在扩展管理页面点击"背景页"以调试background.js
   - 在页面上按F12调试content script

### 调试提示

- 检查浏览器控制台是否有错误信息
- 确保API设置正确
- 验证页面权限是否足够

## 隐私说明

- 所有页面分析都在本地进行
- 仅在用户明确同意的情况下发送数据到AI服务
- 不收集或存储任何个人信息
- API密钥安全存储在浏览器中

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 支持

如果遇到问题，请：
1. 检查配置是否正确
2. 确保Ollama服务正在运行（如果使用）
3. 验证OpenRoute API密钥（如果使用）
4. 查看浏览器控制台是否有错误信息
5. 提交Issue获取帮助