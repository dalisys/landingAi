// Capture one or more screenshots of a URL via the local Express proxy.
// The backend now returns multiple viewport captures; we normalize to an array here
// to keep the rest of the app simple.
export const captureScreenshot = async (url: string): Promise<string[]> => {
  try {
    const response = await fetch("/api/screenshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.statusText}`);
    }

    const data = await response.json();
    // Backward compatibility: older responses return a single `screenshot`
    if (Array.isArray(data.screenshots)) return data.screenshots;
    if (data.screenshot) return [data.screenshot];
    throw new Error("Screenshot response missing data");
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    throw error;
  }
};
