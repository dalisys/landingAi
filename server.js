import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const NAV_TIMEOUT = 60_000; // cap per navigation
// Use system Chrome by default (properly signed), fallback to Puppeteer's Chrome
const executablePathEnv =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const headful = process.env.PUPPETEER_HEADFUL === "1"; // set to 1 to watch the browser

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

// Ensure generated images directory exists
const generatedImagesDir = path.join(__dirname, "public", "generated-images");
if (!fs.existsSync(generatedImagesDir)) {
  fs.mkdirSync(generatedImagesDir, { recursive: true });
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Helper: Sanitize URL for folder names
const getSanitizedDomain = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/[^a-z0-9]/gi, "_");
  } catch (e) {
    return "unknown_domain";
  }
};

// Helper: Create a hash for the full URL to identify unique pages
const getUrlHash = (url) => {
  return crypto.createHash("md5").update(url).digest("hex").substring(0, 10);
};

// API endpoint to save generated images
app.post("/api/save-image", async (req, res) => {
  const { base64Data, filename, projectId } = req.body;

  if (!base64Data || !filename) {
    return res
      .status(400)
      .json({ error: "base64Data and filename are required" });
  }

  try {
    // Determine target directory
    let targetDir = generatedImagesDir;
    let publicPathPrefix = "/generated-images";

    if (projectId) {
      targetDir = path.join(generatedImagesDir, projectId);
      publicPathPrefix = `/generated-images/${projectId}`;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    // Remove data URL prefix if present
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // Generate full file path
    const filePath = path.join(targetDir, filename);

    // Save the file
    fs.writeFileSync(filePath, base64Image, "base64");

    // Return the public URL path
    const publicUrl = `${publicPathPrefix}/${filename}`;
    console.log("[save-image] Saved image to:", publicUrl);

    res.json({ url: publicUrl, success: true });
  } catch (error) {
    console.error("[save-image] Error saving image:", error);
    res
      .status(500)
      .json({ error: "Failed to save image", details: error.message });
  }
});

app.post("/api/screenshot", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let browser;
  try {
    const domain = getSanitizedDomain(url);
    const urlHash = getUrlHash(url);
    const domainDir = path.join(screenshotsDir, domain);

    // 1. Check Cache
    if (fs.existsSync(domainDir)) {
      console.log(`[screenshot] Checking cache for ${url} in ${domainDir}`);
      const files = fs.readdirSync(domainDir);
      // Look for files matching this URL hash
      const cachedFiles = files
        .filter((f) => f.includes(`_${urlHash}_`) && f.endsWith(".jpg"))
        .sort();

      if (cachedFiles.length > 0) {
        console.log("[screenshot] Cache hit! Returning existing screenshots.");
        const screenshots = [];
        const savedPaths = [];

        for (const file of cachedFiles) {
          const filePath = path.join(domainDir, file);
          const buffer = fs.readFileSync(filePath);
          screenshots.push(
            `data:image/jpeg;base64,${buffer.toString("base64")}`
          );
          savedPaths.push(filePath);
        }

        return res.json({ screenshots, savedPaths, fromCache: true });
      }
    }

    // 2. Capture New Screenshots
    console.log("[screenshot] requested url:", url);
    console.log("[screenshot] launching chrome at:", executablePathEnv);
    browser = await puppeteer.launch({
      headless: headful ? false : true,
      devtools: headful,
      executablePath: executablePathEnv,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      ignoreHTTPSErrors: true,
      protocolTimeout: 120_000,
      timeout: 120_000,
      dumpio: headful,
    });
    console.log("[screenshot] browser launched successfully");

    const page = await browser.newPage();
    console.log("[screenshot] new page created");

    // Always log important events
    page.on("console", (msg) =>
      console.log("[page-console]", msg.type(), msg.text())
    );
    page.on("pageerror", (err) => console.error("[page-error]", err));
    page.on("requestfailed", (req) =>
      console.error("[request-failed]", req.url(), req.failure()?.errorText)
    );
    page.on("response", (res) => {
      if (res.status() >= 400) {
        console.warn("[page-response]", res.status(), res.url());
      }
    });

    await page.setViewport({ width: 1366, height: 768 });
    console.log("[screenshot] viewport set");

    page.setDefaultNavigationTimeout(NAV_TIMEOUT);
    page.setDefaultTimeout(NAV_TIMEOUT);
    console.log(
      "[screenshot] timeouts set - nav:",
      page.getDefaultNavigationTimeout(),
      "default:",
      page.getDefaultTimeout()
    );

    // Normalize URL to prevent common typos
    let targetUrl = url;
    if (targetUrl.startsWith("htpps://")) {
      targetUrl = targetUrl.replace("htpps://", "https://");
    } else if (
      !targetUrl.startsWith("http://") &&
      !targetUrl.startsWith("https://")
    ) {
      targetUrl = "https://" + targetUrl;
    }

    console.log("[screenshot] starting navigation to:", targetUrl);
    let response;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: "networkidle2",
        timeout: NAV_TIMEOUT,
      });
      console.log(
        "[screenshot] navigation successful! Status:",
        response?.status()
      );
    } catch (navErr) {
      console.error("[screenshot] Navigation failed:", navErr);
      // Try with less strict waitUntil
      try {
        console.log("[screenshot] Retrying with domcontentloaded...");
        response = await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: NAV_TIMEOUT,
        });
        console.log(
          "[screenshot] Retry successful! Status:",
          response?.status()
        );
      } catch (err2) {
        console.error("[screenshot] Second navigation attempt failed:", err2);
        // Last resort - try with load
        try {
          console.log("[screenshot] Final attempt with load...");
          response = await page.goto(targetUrl, {
            waitUntil: "load",
            timeout: NAV_TIMEOUT,
          });
          console.log("[screenshot] Final attempt status:", response?.status());
        } catch (err3) {
          console.error("[screenshot] All navigation attempts failed:", err3);
          throw new Error(
            `Failed to navigate to ${targetUrl}: ${err3.message}`
          );
        }
      }
    }

    console.log("[screenshot] proceeding to capture");

    // allow some paint time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the actual page dimensions
    const { pageHeight, viewportHeight } = await page.evaluate(() => ({
      pageHeight: Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0,
        document.body?.offsetHeight || 0,
        document.documentElement?.offsetHeight || 0
      ),
      viewportHeight: window.innerHeight,
    }));

    console.log(
      "[screenshot] page height:",
      pageHeight,
      "viewport height:",
      viewportHeight
    );

    // Calculate positions to cover the entire page with 100px overlap
    const positions = [];
    const overlap = 100; // 100px overlap between screenshots
    const step = viewportHeight - overlap;

    for (let y = 0; y < pageHeight; y += step) {
      positions.push(Math.min(y, Math.max(0, pageHeight - viewportHeight)));
      // Stop if we've reached the bottom
      if (y + viewportHeight >= pageHeight) break;
    }

    // Ensure we always capture the very bottom
    const lastPos = Math.max(0, pageHeight - viewportHeight);
    if (positions.length === 0 || positions[positions.length - 1] !== lastPos) {
      positions.push(lastPos);
    }

    // Remove duplicates and sort
    const uniquePositions = [...new Set(positions)].sort((a, b) => a - b);
    console.log(
      "[screenshot] will capture",
      uniquePositions.length,
      "screenshots at positions:",
      uniquePositions
    );

    const screenshots = [];
    const savedPaths = [];
    const timestamp = Date.now();
    // const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50); // Old way

    // Ensure domain directory exists
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }

    for (let i = 0; i < uniquePositions.length; i++) {
      const y = uniquePositions[i];
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await new Promise((resolve) => setTimeout(resolve, 1200)); // give heavy pages time to settle

      // Capture as JPEG with 70% quality to save space/bandwidth
      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 70,
        encoding: "binary",
        fullPage: false,
      });

      // New naming: screenshot_{hash}_{timestamp}_{i}.jpg
      const filename = `screenshot_${urlHash}_${timestamp}_${i + 1}.jpg`;
      const filepath = path.join(domainDir, filename);

      fs.writeFileSync(filepath, buffer);
      screenshots.push(
        `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`
      );
      savedPaths.push(filepath);
      console.log(
        "[screenshot] captured shot",
        i + 1,
        "pos",
        y,
        "bytes",
        buffer.length
      );
    }

    res.json({ screenshots, savedPaths, fromCache: false });
  } catch (error) {
    console.error("Screenshot error:", error);

    // Handle specific navigation errors gracefully
    const errorMessage = error.message || "";
    if (
      errorMessage.includes("net::ERR_NAME_NOT_RESOLVED") ||
      errorMessage.includes("net::ERR_CONNECTION_REFUSED") ||
      errorMessage.includes("net::ERR_ABORTED") ||
      errorMessage.includes("Failed to navigate")
    ) {
      return res.status(400).json({
        error:
          "Invalid URL or website not reachable. Please check the address and try again.",
        details: errorMessage,
      });
    }

    res
      .status(500)
      .json({ error: "Failed to capture screenshot", details: errorMessage });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
