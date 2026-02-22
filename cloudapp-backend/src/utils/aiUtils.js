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

let classifier;
let textModel;
let visionModel;
let tokenizer;
let processor;

let classifierPromise;
let textModelPromise;
let visionModelPromise;

/**
 * L2 Normalization helper for vectors
 */
function L2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map((val) => val / (norm || 1));
}

/**
 * Lazy loads the specialized CLIP components
 */
async function getCLIP(type = "classifier") {
  const {
    pipeline: transformerPipeline,
    CLIPTextModelWithProjection,
    CLIPVisionModelWithProjection,
    AutoTokenizer,
    AutoProcessor,
  } = await import("@xenova/transformers");

  const modelId = "Xenova/clip-vit-base-patch32";

  if (type === "classifier") {
    if (classifier) return classifier;
    if (classifierPromise) return classifierPromise;
    classifierPromise = transformerPipeline(
      "zero-shot-image-classification",
      modelId,
    );
    classifier = await classifierPromise;
    return classifier;
  } else if (type === "text") {
    if (textModel && tokenizer) return { model: textModel, tokenizer };
    if (textModelPromise) return textModelPromise;

    textModelPromise = (async () => {
      tokenizer = await AutoTokenizer.from_pretrained(modelId);
      textModel = await CLIPTextModelWithProjection.from_pretrained(modelId);
      return { model: textModel, tokenizer };
    })();
    return textModelPromise;
  } else if (type === "vision") {
    if (visionModel && processor) return { model: visionModel, processor };
    if (visionModelPromise) return visionModelPromise;

    visionModelPromise = (async () => {
      processor = await AutoProcessor.from_pretrained(modelId);
      visionModel =
        await CLIPVisionModelWithProjection.from_pretrained(modelId);
      return { model: visionModel, processor };
    })();
    return visionModelPromise;
  }
}

async function generateCLIPImageEmbedding(filePath) {
  try {
    const { RawImage } = await import("@xenova/transformers");
    const { model, processor } = await getCLIP("vision");

    // Read and process image
    const image = await RawImage.read(filePath);
    const inputs = await processor(image);

    // Generate image embedding (projected to 512-d)
    const { image_embeds } = await model(inputs);

    // Normalize and return as array
    return L2Normalize(Array.from(image_embeds.data));
  } catch (error) {
    console.error("❌ [CLIP-EMB] Image embedding failed:", error.message);
    return null;
  }
}

/**
 * Generates a 512-d vector for a text query
 */
async function generateCLIPTextEmbedding(text) {
  try {
    const { model, tokenizer } = await getCLIP("text");

    // Tokenize text
    const inputs = await tokenizer(text, { padding: true, truncation: true });

    // Generate text embedding (projected to 512-d)
    const { text_embeds } = await model(inputs);

    // Normalize and return as array
    return L2Normalize(Array.from(text_embeds.data));
  } catch (error) {
    console.error("❌ [CLIP-EMB] Text embedding failed:", error.message);
    return null;
  }
}

async function classifyImageWithCLIP(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`[CLIP] File not found: ${filePath}`);
      return "Other";
    }

    const classifier = await getCLIP();
    const categories = [
      "Nature and Landscapes",
      "Portrait of a Person",
      "Baby or Small Child",
      "Documents and Text",
      "Screenshot of a Phone or Computer",
      "Architecture and Buildings",
      "Food and Drinks",
      "Technology and Gadgets",
      "Animals and Pets",
      "Travel and Places",
      "Sports and Fitness",
      "Fashion and Clothing",
      "Art and Drawings",
      "Home Interiors",
      "Vehicles and Cars",
      "Flowers and Plants",
      "Beach and Ocean",
      "Mountains and Hiking",
      "Musical Instruments",
      "Celebration, Wedding or Party",
    ];

    console.log(`\n--- 🤖 CLIP ANALYSIS START ---`);
    console.log(`[CLIP] Processing: ${path.basename(filePath)}`);

    const results = await classifier(filePath, categories);

    // CLIP results are sorted by score. Let's look at the top few.
    const topResult = results[0];
    const secondResult = results[1];

    console.log(
      `[CLIP] Results:`,
      results
        .slice(0, 3)
        .map((r) => `${r.label}: ${(r.score * 100).toFixed(1)}%`)
        .join(", "),
    );

    let finalLabel = topResult.label;

    // --- HEURISTIC: People/Kids/Portrait Priority ---
    // If CLIP sees a person, it often scores "Fashion" high because of clothes.
    const personLabels = ["Portrait of a Person", "Baby or Small Child"];
    if (
      topResult.label === "Fashion and Clothing" &&
      secondResult &&
      personLabels.includes(secondResult.label) &&
      secondResult.score > 0.12 // Lower threshold for person override
    ) {
      console.log(
        `[CLIP] 💡 Heuristic: Person found in Fashion context. Re-categorizing to '${secondResult.label}'.`,
      );
      finalLabel = secondResult.label;
    }

    // Map long descriptive labels back to simple UI categories
    const labelMap = {
      "Nature and Landscapes": "Nature",
      "Portrait of a Person": "People",
      "Baby or Small Child": "Kids",
      "Documents and Text": "Documents",
      "Screenshot of a Phone or Computer": "Screenshots",
      "Architecture and Buildings": "Architecture",
      "Food and Drinks": "Food",
      "Technology and Gadgets": "Technology",
      "Animals and Pets": "Animals",
      "Travel and Places": "Travel",
      "Sports and Fitness": "Sports",
      "Fashion and Clothing": "Fashion",
      "Art and Drawings": "Art",
      "Home Interiors": "Interiors",
      "Vehicles and Cars": "Vehicles",
      "Flowers and Plants": "Flowers",
      "Beach and Ocean": "Beach",
      "Mountains and Hiking": "Mountains",
      "Musical Instruments": "Music",
      "Celebration, Wedding or Party": "Celebrations",
    };

    const finalCategory = labelMap[finalLabel] || "Other";
    console.log(`✅ [CLIP] FINAL CATEGORY: ${finalCategory.toUpperCase()}`);
    console.log(`--- 🤖 CLIP ANALYSIS END ---\n`);

    return topResult.score > 0.15 ? finalCategory : "Other";
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
  generateCLIPImageEmbedding,
  generateCLIPTextEmbedding,
};
