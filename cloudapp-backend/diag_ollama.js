const fs = require("fs");
const path = require("path");

async function testOllama() {
  console.log("Testing Ollama connection...");
  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "moondream",
        prompt: "Say 'Hello' if you can read this.",
        stream: false,
      }),
    });
    const result = await response.json();
    console.log("Text test result:", result);
  } catch (err) {
    console.error("Text test failed:", err.message);
  }
}

testOllama();
