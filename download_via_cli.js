const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const logPath = 'C:\\Users\\Praveenkumar Melapu\\.gemini\\antigravity-ide\\brain\\2e467779-8d65-4968-9d13-685f5e90e374\\.system_generated\\tasks\\task-104.log';
const OUTPUT_DIR = path.join(__dirname, 'stitch_html');


if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

function log(msg) {
  console.log(`[INFO] ${msg}`);
}

function error(msg, err) {
  console.error(`[ERROR] ${msg}`, err || '');
}

async function run() {
  try {
    const logContent = fs.readFileSync(logPath, 'utf8');
    const jsonStr = logContent.split('\n')[0];
    const data = JSON.parse(jsonStr);
    const screens = data.screens || [];

    log(`Found ${screens.length} screens in log.`);

    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      const screenId = screen.name.split('/').pop();
      const safeTitle = screen.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${i + 1}_${safeTitle}_${screenId}.html`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      log(`[${i + 1}/${screens.length}] Downloading "${screen.title}" (${screenId})...`);

      // Write parameters to a unique temp file
      const tempJsonPath = path.join(__dirname, `args_${screenId}.json`);
      const params = {
        projectId: "8568513620785904162",
        screenId: screenId
      };
      fs.writeFileSync(tempJsonPath, JSON.stringify(params), 'utf8');

      try {
        // Execute tool call via stitch-mcp CLI
        const cmd = `npx @_davideast/stitch-mcp tool get_screen_code -f args_${screenId}.json -o json`;
        const output = execSync(cmd, {
          env: {
            ...process.env,
            STITCH_API_KEY: process.env.STITCH_API_KEY

          },
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });

        const resObj = JSON.parse(output);
        let htmlContent = '';
        
        if (resObj && resObj.htmlContent) {
          htmlContent = resObj.htmlContent;
        } else if (resObj && resObj.content && resObj.content[0] && resObj.content[0].text) {
          htmlContent = resObj.content[0].text;
        }

        if (htmlContent) {
          fs.writeFileSync(outputPath, htmlContent, 'utf8');
          log(`  Saved to ${filename} (${htmlContent.length} bytes)`);
        } else {
          error(`Unexpected output format for ${screenId}: ${output.substring(0, 500)}`);
        }
      } catch (e) {
        error(`Failed to download ${screen.title}`, e.message);
      }

      // Clean up temp file immediately
      if (fs.existsSync(tempJsonPath)) {
        try {
          fs.unlinkSync(tempJsonPath);
        } catch (e) {
          // ignore cleanup errors
        }
      }

      // Add a tiny delay
      await new Promise(r => setTimeout(r, 200));
    }

    log('Finished downloading all screens.');

  } catch (e) {
    error('Execution failed', e);
  }
}

run();
