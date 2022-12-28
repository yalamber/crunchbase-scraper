import dotenv from 'dotenv';
dotenv.config();
import Airtable from 'airtable';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY,
});
const base = Airtable.base(process.env.AIRTABLE_BASE);

(async function () {
  try {
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      headless: false,
      ignoreHTTPSErrors: true,
      executablePath: executablePath(),
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    const records = await base('CrunchData')
      .select({
        maxRecords: 1,
        view: 'InvestmentCompany',
      })
      .firstPage();
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    // link to url
    console.log('Scrapping ' + record.get('InvestmentCompanyLink'));
    await page.goto(record.get('InvestmentCompanyLink'));
    const investmentTableSelector =
      'body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > div > page-centered-layout > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > list-card > div > table > tbody';
    // Total loaded row count for investment table
    const investmentRowCount = await page.$$eval(
      `${investmentTableSelector} > tr`,
      (el) => el.length
    );
    const investedCompanies = [];
    console.log('Total invested companies list loaded: ', investmentRowCount);
    for (let i = 1; i < investmentRowCount + 1; i++) {
      const CompanyName = await page.evaluate(
        (el) => el.innerText,
        await page.$(
          `${investmentTableSelector} > tr:nth-child(${i}) > td:nth-child(2) > field-formatter > identifier-formatter > a div.identifier-label`
        )
      );
      const CompanyLink = await page.evaluate(
        (el) => el.href,
        await page.$(
          `${investmentTableSelector} > tr:nth-child(${i}) > td:nth-child(2) > field-formatter > identifier-formatter > a`
        )
      );
      investedCompanies.push({
        fields: {
          InvestmentCompany: '',
          InvestmentCompanyLink: '',
          CompanyName,
          CompanyLink,
        },
      });
    }
    console.log(investedCompanies);
    await base('CrunchData').create(investedCompanies);
    await browser.close();
  } catch (e) {
    console.log(e);
  }
})();
