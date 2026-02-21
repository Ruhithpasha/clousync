const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Load dotenv just in case this util is used standalone
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY
  ? process.env.GEMINI_API_KEY.trim()
  : null;

if (
  !apiKey ||
  apiKey === "your_gemini_api_key_here" ||
  !apiKey.startsWith("AIza")
) {
  console.warn(
    "⚠️ [AI] GEMINI_API_KEY is missing or invalid. AI features will be disabled.",
  );
}

const genAI = new GoogleGenerativeAI(apiKey || "DUMMY_KEY");

/**
 * Converts local file information to a GoogleGenerativeAI.Part object.
 */
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

/**
 * Generates descriptive tags for an image using Gemini.
 */
async function generateImageTags(filePath, mimeType) {
  console.log(`[AI] Generating tags for: ${filePath} (${mimeType})`);

  // Try these models in order - broadening fallbacks to find what works for this key
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro-vision",
    "gemini-pro",
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Checking model: ${modelName}...`);
      // Let the SDK manage the API version automatically
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt =
        "Analyze this image and provide a list of 5 concise, relevant descriptive tags. Return only the tags separated by commas, no other text.";
      const imagePart = fileToGenerativePart(filePath, mimeType);

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text().replace(/["'`]/g, "");

      const tags = text
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length < 30)
        .slice(0, 5);
      if (tags.length > 0) {
        console.log(`[AI] Success with ${modelName}:`, tags);
        return tags;
      }
    } catch (error) {
      console.error(`❌ [AI] Model ${modelName} failed!`);
      // Deep log for 404 debugging
      if (error.response)
        console.error("[AI] Detail:", JSON.stringify(error.response, null, 2));
      else console.error("[AI] Error Message:", error.message);
    }
  }
  return ["AI-Processed"];
}

let pipeline;
let clipPromise;

/**
 * Lazy loads the CLIP pipeline
 */
async function getCLIP() {
  if (pipeline) return pipeline;
  if (clipPromise) return clipPromise;

  console.log(
    "🚀 [CLIP] Initialization started (this may take a moment on first run)...",
  );
  const { pipeline: transformerPipeline } =
    await import("@xenova/transformers");

  clipPromise = transformerPipeline(
    "zero-shot-image-classification",
    "Xenova/clip-vit-base-patch32",
  );
  pipeline = await clipPromise;
  console.log("✅ [CLIP] Model loaded and ready.");
  return pipeline;
}

async function classifyImageWithCLIP(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[CLIP] File not found: ${filePath}`);
      return "Other";
    }

    const classifier = await getCLIP();
    const categories = [
      "Nature",
      "People",
      "Documents",
      "Architecture",
      "Food",
      "Technology",
      "Animals",
      "Travel",
      "Sports",
      "Fashion",
      "Art",
      "Interiors",
      "Vehicles",
    ];

    console.log(`\n--- 🤖 CLIP ANALYSIS START ---`);
    console.log(`[CLIP] Processing: ${path.basename(filePath)}`);

    const results = await classifier(filePath, categories);

    // Sort results by score (highest first)
    const topResult = results[0];
    const rawScore = (topResult.score * 100).toFixed(1);

    console.log(
      `✅ [CLIP] TOP MATCH: ${topResult.label.toUpperCase()} (${rawScore}%)`,
    );
    console.log(`--- 🤖 CLIP ANALYSIS END ---\n`);

    // Only return the category if the confidence is high enough (e.g. > 15%)
    return topResult.score > 0.15 ? topResult.label : "Other";
  } catch (error) {
    console.error("❌ [CLIP] Classification failed:", error.message);
    console.log(`--- 🤖 CLIP ANALYSIS END ---\n`);
    return "Other";
  }
}

async function generateEmbedding(text) {
  const modelsToTry = ["text-embedding-004", "embedding-001"];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      if (result && result.embedding) {
        return result.embedding.values;
      }
    } catch (error) {
      console.error(`[AI] Embedding model ${modelName} failed:`, error.message);
    }
  }
  return null;
}

module.exports = {
  generateImageTags,
  generateEmbedding,
  classifyImageWithCLIP,
};
