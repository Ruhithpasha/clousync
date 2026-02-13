const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // Note: listModels is not directly on genAI in older versions,
    // but we can try to find it or use any model to see supported versions.
    console.log("Attempting to list models...");
    // In newer SDKs, it's not exposed this way.
    // Let's try a direct fetch to the discovery endpoint if the SDK doesn't have it.
    // However, let's just try to switch to 'v1' which is usually more stable.
    const v1GenAI = new GoogleGenerativeAI(apiKey); // SDK handles version usually
    console.log(
      "Using SDK version:",
      require("@google/generative-ai/package.json").version,
    );
  } catch (err) {
    console.error(err);
  }
}

listModels();
