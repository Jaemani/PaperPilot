# Commands

This directory contains logic for **Function Commands** and **Context Menu** actions.

## Files

- **`commands.html`**: A UI-less HTML page required by Office to register function commands.
- **`commands.ts`**: Implementation of actions triggered from the Word Ribbon or the Right-Click Context Menu.

## Key Features

- **Context Menu Integration**: Implements the "Analyze Term" feature that appears when a user right-clicks on text in Word.
- **Global Actions**: Handles ribbon button clicks that don't necessarily require the taskpane to be open.

## Note on Runtime

Function commands run in a separate, lightweight JavaScript runtime. They do not share global state with the taskpane React application directly. Communication between the two must happen via the document or external storage (e.g., `localStorage`).
