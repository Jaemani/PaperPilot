# Taskpane

This directory contains the main user interface and business logic for the PaperPilot Word Add-in.

## Structure

- **`index.tsx`**: Entry point for the React application. Handles initialization and rendering of the `App` component.
- **`taskpane.html`**: The static HTML host page for the taskpane.
- **`taskpane.ts`**: Contains the core logic for interacting with the **Word JavaScript API**. This includes functions for:
  - Scanning the document for formatting errors.
  - Applying fixes to the document body.
  - Managing selection events and context synchronization.
- **`components/`**: React functional components using **Fluent UI v9**.
  - `App.tsx`: Main navigation and state management.
  - `Header.tsx`, `HeroList.tsx`: Branding and informational components.
  - `TextInsertion.tsx`: Example utility for document interaction.
- **`data/`**: Static configuration data.
  - `journalFormats.json`: A comprehensive database of journal-specific formatting rules (margins, font sizes, caption styles, etc.).

## Development

The taskpane runs within an `<iframe>` inside Microsoft Word. It communicates with the Word host through the `Office.js` library.
