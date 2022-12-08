import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';

(async () => {
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
    headless: false,
    ignoreHTTPSErrors: true,
    executablePath: executablePath(),
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  const loginUrl = 'https://www.crunchbase.com/login';
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  await page.goto(loginUrl);
  await new Promise((_func) => setTimeout(_func, 2000));
  await page.type('#mat-input-1', username);
  await page.type('#mat-input-2', password);
  await new Promise((_func) => setTimeout(_func, 2000));
  console.log('Login');
  await Promise.all([
    page.click('#mat-tab-content-0-0 > div > login > form > button'),
  ]);
  await new Promise((_func) => setTimeout(_func, 5000));
  await page.goto(
    'https://www.crunchbase.com/organization/uphonest-capital/recent_investments/investments'
  );
  const investmentTableSelector =
    'body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > div > div > page-centered-layout:nth-child(2) > div > profile-section > section-card > mat-card > div.section-content-wrapper > div > list-card > div > table > tbody';
  console.log('Selecting', investmentTableSelector);
  const investmentRowCount = await page.$$eval(
    `${investmentTableSelector} > tr`,
    (el) => el.length
  );
  console.log('Total Records', investmentRowCount);
  const investedCompanies = [];
  for (let i = 1; i < investmentRowCount + 1; i++) {
    const companyName = await page.evaluate(
      (el) => el.innerText,
      await page.$(
        `${investmentTableSelector} > tr:nth-child(${i}) > td:nth-child(2) > field-formatter > identifier-formatter > a div.identifier-label`
      )
    );
    const companyLink = await page.evaluate(
      (el) => el.href,
      await page.$(
        `${investmentTableSelector} > tr:nth-child(${i}) > td:nth-child(2) > field-formatter > identifier-formatter > a`
      )
    );
    investedCompanies.push({ companyName, companyLink });
  }
  console.log(investedCompanies);
  await browser.close();
})();
