# AI Comment Extension

Generate concise, context-aware comments for LinkedIn and X (Twitter) with one click.

## Overview

This project adds a browser extension that detects comment boxes on LinkedIn and X, and generates AI-powered replies using a local backend service. It helps you write professional or friendly comments faster.

## Features

- **Three Comment Styles**: Professional, Friendly, and Collaboration.
- **Platform Support**: Optimized for LinkedIn and X (Twitter).
- **Smart Extraction**: Automatic post text extraction from social feeds.
- **Multilingual**: Language detection for English and Bengali.
- **Configurable**: Customizable Backend URL and API Key via Extension Options.
- **User Friendly**: Copy-to-clipboard and regenerate support.

## Project Structure

- `backend/` - Express server that generates comments through OpenAI API.
- `extension/` - Chrome/Edge extension that injects the AI comment button.

## Requirements

- Node.js 18 or newer
- An OpenAI API key
- Chrome or Edge browser

## Backend Setup

1. Navigate to the `backend` folder.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file in the backend folder (see `.env.example`):

```bash
OPENAI_API_KEY=your_openai_api_key_here
API_SECRET=your-very-long-random-secret-key-change-this
PORT=34567
```

4. Start the backend server:

```bash
node server.js
```

## Extension Setup

1. Open Chrome or Edge and go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension` folder.
5. **Configure the Extension**:
   - Right-click the AI Comment Generator icon in your extensions bar.
   - Select **Options**.
   - Ensure the **Backend URL** matches your server (default: `http://localhost:34567/generate`).
   - Enter the **API Key** (matches `API_SECRET` in your backend `.env`).
   - Click **Save Settings**.

## Usage

1. Start the backend server.
2. Open LinkedIn or X (Twitter) and find a post.
3. Click inside a comment box under the post. An AI button will appear above the box.
4. Hover over or click the AI button to choose a style: Professional, Friendly, or Collaboration.
5. Copy the generated comment and paste it into the comment box.

## Troubleshooting

- **Button not appearing**: Refresh the page or click inside the comment box again.
- **Generation fails**: 
  - Confirm the backend server is running.
  - Check the **Options** page in the extension to verify the URL and API Key match your backend.
  - Verify your `OPENAI_API_KEY` is valid and has credits.
- **Console Logs**: Check the browser console (F12) and backend terminal for error messages.
