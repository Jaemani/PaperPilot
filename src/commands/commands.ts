/* global Office, Word */

Office.onReady(() => {
  // Office.js is ready.
});

// Called when user right-clicks text and selects "Analyze Term with AI".
// Stores the selected text in document settings, then shows the task pane.
// The task pane reads the setting on load and auto-triggers term analysis.
async function analyzeTermCommand(event: Office.AddinCommands.Event) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      const text = (selection.text || "").trim();
      if (text) {
        Office.context.document.settings.set("pp_analyzeTerm", text);
        await new Promise<void>((resolve) => {
          Office.context.document.settings.saveAsync(() => resolve());
        });
      }
    });
    // Show (or focus) the task pane so App.tsx can read the setting.
    await Office.addin.showAsTaskpane();
  } catch (e) {
    console.error("analyzeTermCommand error:", e);
  }
  event.completed();
}

Office.actions.associate("analyzeTermCommand", analyzeTermCommand);
