import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const loginUrl = 'https://www.crunchbase.com/login';
  const username = '';
  const password = '';
  await page.goto(loginUrl, { waitUntil: 'networkidle0' }); // wait until page load
  await page.type('#mat-input-1', username);
  await page.type('#mat-input-2', password);
  await Promise.all([
    page.click('#mat-tab-content-0-0 > div > login > form > button'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);
  await page.goto(
    'https://www.crunchbase.com/organization/tesla-motors/company_financials'
  );

  await browser.close();
})();
