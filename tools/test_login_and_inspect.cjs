const puppeteer = require('puppeteer');

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER EXCEPTION] ${err.toString()}`);
  });

  try {
    console.log("Navigating to login page...");
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    // Use a unique email to ensure signup works
    const email = `testuser_${Date.now()}@example.com`;
    const password = "TestPassword123!";
    console.log(`Attempting to sign up with email: ${email}`);

    // Switch to "Criar Conta" tab
    const buttons1 = await page.$$('button');
    for (const btn of buttons1) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'Criar Conta') {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));

    // Fill email and password for signup
    const inputs1 = await page.$$('input');
    await inputs1[0].type(email);
    await inputs1[1].type(password);

    // Click submit (Cadastrar)
    const buttons2 = await page.$$('button');
    for (const btn of buttons2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'Cadastrar') {
        await btn.click();
        break;
      }
    }

    console.log("Signup clicked. Waiting 3 seconds for signup response...");
    await new Promise(r => setTimeout(r, 3000));

    // Switch back to "Entrar" tab
    const buttons3 = await page.$$('button');
    for (const btn of buttons3) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'Entrar') {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));

    // Fill credentials for login
    console.log("Filling credentials for login...");
    const inputs2 = await page.$$('input');
    
    // Clear inputs using page.evaluate
    await page.evaluate(el => el.value = '', inputs2[0]);
    await page.evaluate(el => el.value = '', inputs2[1]);
    
    await inputs2[0].type(email);
    await inputs2[1].type(password);

    // Click submit (Entrar)
    const buttons4 = await page.$$('button');
    let loginBtn = null;
    for (const btn of buttons4) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'Entrar') {
        loginBtn = btn;
        break;
      }
    }

    if (loginBtn) {
      console.log("Clicking login submit...");
      await loginBtn.click();
    }

    console.log("Waiting for layout sidebar to appear...");
    try {
      await page.waitForSelector('aside', { timeout: 8000 });
      console.log("Logged in successfully!");
    } catch (e) {
      console.error("Timeout waiting for sidebar. Printing current page text and taking screenshot...");
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log("Page text:\n", bodyText);
      await page.screenshot({ path: 'C:/Users/uniao/.gemini/antigravity-ide/brain/c42c2a2f-3a52-405c-8597-2b2c5c4b6778/login_failed.png' });
      throw e;
    }

    await page.goto('http://localhost:5173/app/questoes', { waitUntil: 'networkidle2' });
    console.log("Current URL:", page.url());

    // Wait 5 seconds for loading to complete
    await new Promise(r => setTimeout(r, 5000));
    
    const finalHtml = await page.evaluate(() => document.body.innerHTML);
    console.log("Final page body HTML length:", finalHtml.length);
    console.log("Snippet of HTML:\n", finalHtml.substring(0, 3000));
    
    await page.screenshot({ path: 'C:/Users/uniao/.gemini/antigravity-ide/brain/c42c2a2f-3a52-405c-8597-2b2c5c4b6778/questoes_loaded.png' });
    console.log("Saved screenshot to questoes_loaded.png");

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await browser.close();
  }
}
run();
