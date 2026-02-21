const fs = require("fs");
const path = require("path");

async function testOllamaVision() {
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    console.log("No uploads directory found.");
    return;
  }

  const files = fs
    .readdirSync(uploadsDir)
    .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"));
  if (files.length === 0) {
    console.log("No images found in uploads to test.");
    return;
  }

  const testFile = path.join(uploadsDir, files[0]);
  console.log(`Testing Ollama Vision with file: ${testFile}`);

  try {
    const imageData = Buffer.from(fs.readFileSync(testFile)).toString("base64");

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "moondream",
        prompt: "Describe this image in 5 words.",
        images: [imageData],
        stream: false,
      }),
    });

    const result = await response.json();
    console.log("Vision test result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Vision test failed:", err.message);
  }
}

testOllamaVision();
