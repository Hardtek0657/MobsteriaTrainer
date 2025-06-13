# Mobsteria Trainer

A lightweight and powerful JavaScript trainer for the game **Mobsteria**, designed to enhance gameplay by injecting real-time updates and automation features directly into the browser's Developer Console.

## Features

1. **Enhanced Scanner**:
   - Scans the game environment for updates and changes.
   - Provides real-time feedback on character status and game events.

2. **Automated Actions**:
   - Supports automated character updates and interactions.
   - Reduces manual input for repetitive tasks.

3. **Easy to Use**:
   - No installation required—just paste into the browser's Developer Console.
   - No dependencies or external tools needed.

## Prerequisites
To use this trainer, you will need:
- Your **`authToken`** (unique to each user). This token is required for authenticated actions.

### How to Find Your `authToken`
1. Open the **Developer Tools** in your browser (`F12` or `Ctrl + Shift + J` / `Cmd + Opt + J`).
2. Navigate to the **Network** tab.
3. Perform any action in the game (e.g., moving, attacking).
4. Look for a network request (usually labeled as `fetch`, `XHR`, or similar).
5. Click on the request and check the **Headers** section.
6. Under **Request Headers**, locate the `Authorization` header. The token will start with `Bearer` (e.g., `Bearer abc123xyz...`).
7. Copy the entire token (including `Bearer`).

## How to Use

### Step 1: Open the Developer Console
1. Launch **Mobsteria** in your browser.
2. Open the Developer Console:
   - **Chrome/Edge**: Press `F12` or `Ctrl + Shift + J` (Windows/Linux) / `Cmd + Opt + J` (Mac).
   - **Firefox**: Press `F12` or `Ctrl + Shift + K` (Windows/Linux) / `Cmd + Opt + K` (Mac).
   - **Safari**: Enable the Developer Menu in Preferences, then press `Cmd + Opt + C`.

### Step 2: Paste the Code
Copy the entire contents of `Mobsteria.js` and paste it into the Developer Console. Press `Enter` to execute.

### Step 3: Set Your `authToken`
Before initializing the trainer, ensure the `authToken` is set. Replace `YOUR_AUTH_TOKEN_HERE` with your actual token:
```javascript
  authToken: "Bearer YOUR_AUTH_TOKEN_HERE", // Replace with your token
