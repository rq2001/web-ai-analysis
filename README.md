# AI Page Analyzer - Browser Extension

This is a powerful browser extension that uses AI (Ollama and OpenRoute) to analyze web page content, providing in-depth insights into page structure, script behavior, security risks, and more.

## Features

- Analyze page HTML structure and content
- Inspect JavaScript script behavior
- Analyze page performance
- Identify potential security risks
- Provide metadata analysis
- Support for Ollama local AI and OpenRoute cloud AI services

## Installation Requirements

- Chrome browser 88+ / Firefox 87+ / Edge 88+
- [Ollama](https://ollama.ai/) (optional, for local AI analysis)
- OpenRoute API key (optional, for cloud AI analysis)

## Installation Steps

1. Clone or download this repository
2. Open Chrome/Firefox/Edge browser
3. Go to the extensions page:
   - Chrome: chrome://extensions/
   - Firefox: about:addons
   - Edge: edge://extensions/
4. Enable "Developer mode"
5. Click "Load unpacked" (Chrome/Edge) or "Load Temporary Add-on" (Firefox)
6. Select the directory of this repository

## Configuration

1. Click the extension icon in the browser toolbar
2. In the settings section, configure:
   - Ollama endpoint (default: http://localhost:11434/api/generate)
   - Ollama model (default: llama3)
   - OpenRoute API key
   - OpenRoute model (default: openai/gpt-3.5-turbo)
   - Custom models

## Usage

1. Visit any web page
2. Click the extension icon
3. Select analysis type:
   - Page summary
   - Sentiment analysis
   - Keyword extraction
   - Script analysis
   - Security check
   - Custom analysis
4. Click "Analyze Current Page" button
5. Wait for analysis to complete
6. View analysis results

## Project Structure

```
├── manifest.json          # Extension configuration file
├── popup.html             # Popup interface
├── popup.js               # Popup logic
├── background.js          # Background script
├── content.js            # Content script
├── icons/                # Extension icons
└── README.md             # Documentation
```

## Development

### Local Development

1. After modifying code, click "Reload" in the extensions page
2. Use Chrome DevTools for debugging:
   - Right-click the extension icon and select "Inspect popup"
   - Click "Background page" in the extensions page to debug background.js
   - Press F12 on the page to debug content script

### Debugging Tips

- Check browser console for error messages
- Ensure API settings are correct
- Verify page permissions are sufficient

## Privacy Policy

- All page analysis is performed locally
- Data is only sent to AI services with explicit user consent
- No personal information is collected or stored
- API keys are securely stored in the browser

## License

MIT License

## Contributing

We welcome issues and pull requests!

## Support

If you encounter issues, please:
1. Check if configurations are correct
2. Ensure Ollama service is running (if used)
3. Verify OpenRoute API key (if used)
4. Check browser console for error messages
5. Submit an issue for assistance
