# AI Comment Extension

Generate concise, context-aware comments for LinkedIn and X (Twitter) with one click.

## Overview

This project adds a browser extension that detects comment boxes on LinkedIn and X, and generates AI-powered replies using a local backend service. It helps you write professional or friendly comments faster.

## Features

- Two comment styles: Professional and Friendly
- Supports LinkedIn and X (Twitter)
- Automatic post text extraction from social feeds
- Language detection for English and Bengali
- Copy-to-clipboard support
- Lightweight browser extension UI

## Project Structure

- `backend/` - Express server that generates comments through OpenAI API
- `extension/` - Chrome/Edge extension that injects the AI comment button

## Requirements

- Node.js 18 or newer
- An OpenAI API key in the backend environment
- Chrome or Edge browser

## Backend Setup

1. Navigate to the `backend` folder.
2. Install dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file in the backend folder:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the backend server:

```bash
node server.js
```

## Extension Setup

1. Open Chrome or Edge and go to `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension` folder.

## Usage

1. Start the backend server.
2. Open LinkedIn or X (Twitter) and find a post.
3. Click inside a comment box under the post.
4. Use the AI Comment button to choose Professional or Friendly.
5. Copy the generated comment and paste it into the comment box.

## Troubleshooting

- If no button appears, refresh the page after loading the extension.
- If generation fails, confirm the backend server is running on port 5000.
- If the backend returns an error, verify the OpenAI API key is configured correctly.
- Check browser console (F12) for any error messages.