const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  const extensionPath = path.resolve(__dirname, '../extensao');
  console.log("Loading extension from:", extensionPath);

  const browser = await puppeteer.launch({
    headless: false, // extension only works in non-headless or new headless
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      `--no-sandbox`
    ]
  });

  const page = await browser.newPage();
  
  // Listen to page console messages
  page.on('console', msg => {
    console.log('[BROWSER CONSOLE]', msg.text());
  });

  console.log("Navigating to local page to test context...");
  // Go to a dummy localhost page to trigger the react app module, or any HTTP page
  await page.goto('http://localhost:5173/');

  // Wait a few seconds to observe logs
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("Navigating to simulated tecconcursos page...");
  await page.goto('https://www.tecconcursos.com.br/questoes/12345');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  await browser.close();
}
run().catch(console.error);
