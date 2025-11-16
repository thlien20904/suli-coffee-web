// frontend/scripts/build-hash.js - Generate SHA256 hash for CSP
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateCSPHash(scriptContent) {
  const hash = crypto
    .createHash("sha256")
    .update(scriptContent, "utf8")
    .digest("base64");
  return `sha256-${hash}`;
}

// Example script content for hash generation
const scriptContent = `console.log('🛡️ SuLi Coffee CSP Protected App');`;

const hash = generateCSPHash(scriptContent);
console.log("📝 Generated CSP Hash:");
console.log(`HASH_CSP=${hash}`);
console.log("");
console.log("✅ Add this to your .env file:");
console.log(`HASH_CSP=${hash}`);

// Update .env file
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf8");

  if (envContent.includes("HASH_CSP=")) {
    envContent = envContent.replace(/HASH_CSP=.*/, `HASH_CSP=${hash}`);
  } else {
    envContent += `\nHASH_CSP=${hash}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("🔄 Updated .env file with new hash");
} else {
  console.log("⚠️ .env file not found, please add the hash manually");
}

// Generate hash.html with the script
const hashHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSP Hash Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .hash-info {
            background: #e7f3ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>✅ CSP Hash Demo</h1>
        <p>This script is allowed by CSP using SHA256 hash verification.</p>
        
        <div class="hash-info">
            <strong>Hash:</strong> ${hash}<br>
            <strong>Script:</strong> ${scriptContent}
        </div>
        
        <p id="status">⏳ Loading...</p>
    </div>

    <script>
${scriptContent}
document.getElementById('status').textContent = '✅ Script executed successfully with CSP hash!';
    </script>
</body>
</html>`;

const publicPath = path.join(__dirname, "..", "public", "csp");
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}

fs.writeFileSync(path.join(publicPath, "hash.html"), hashHtmlContent);
console.log("📄 Generated hash.html demo file");

console.log("");
console.log("🎉 CSP Hash setup completed!");
console.log("📋 Next steps:");
console.log("1. Build your React app: npm run build");
console.log("2. Start server: npm run serve");
console.log("3. Test hash demo: http://localhost:3001/hash");
