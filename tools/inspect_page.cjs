const puppeteer = require('puppeteer');

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Listen for console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Listen for page errors (crashes, unhandled exceptions)
  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION] ${err.toString()}`);
  });

  try {
    console.log("Navigating to http://localhost:5173/app/questoes ...");
    await page.goto('http://localhost:5173/app/questoes', { waitUntil: 'networkidle2', timeout: 15000 });
    
    console.log("Current URL:", page.url());
    
    // Check if we are on the login page
    if (page.url().includes('/login')) {
      console.log("Redirected to login page. Let's inspect login page structure.");
    }

    // Wait 3 seconds
    await new Promise(r => setTimeout(r, 3000));

    // Get page title and HTML structure
    const title = await page.title();
    console.log("Page Title:", title);

    const bodyHTML = await page.evaluate(() => {
      return document.body.innerHTML;
    });
    console.log("Body HTML length:", bodyHTML.length);
    console.log("Snippet of HTML:\n", bodyHTML.substring(0, 1000));
  } catch (err) {
    console.error("Error during navigation/inspection:", err);
  } finally {
    await browser.close();
  }
}
run();
