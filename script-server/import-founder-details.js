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
        view: 'CompanyViewPending',
      })
      .firstPage();
    if (records.length === 0) {
      return;
    }
    const record = records[0];
    // link to url
    console.log('Scrapping ' + record.get('CompanyLink'));
    await page.goto(record.get('CompanyLink'));
    // get industries and founders
    const industries = [];
    const founders = [];
    // Selector path for industry and founders
    const industrySelector =
      'body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > div > page-centered-layout > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > fields-card:nth-child(1) > ul > li:nth-child(1) > field-formatter > identifier-multi-formatter > span > chips-container';
    const foundersSelector =
      'body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > div > page-centered-layout > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > fields-card:nth-child(1) > ul > li:nth-child(4) > field-formatter > identifier-multi-formatter > span';
    // get count for industries
    const industryCount = await page.$$eval(
      `${industrySelector} > a`,
      (el) => el.length
    );
    // iterate through list to get industry name
    for (let i = 1; i < industryCount + 1; i++) {
      const industryName = await page.evaluate(
        (el) => el.innerText,
        await page.$(`${industrySelector} > a:nth-child(${i}) div.chip-text`)
      );
      industries.push(industryName);
    }
    // get count for founders
    const foundersCount = await page.$$eval(
      `${foundersSelector} > a`,
      (el) => el.length
    );
    // iterate through list to get founders name and link
    for (let i = 1; i < foundersCount + 1; i++) {
      const founderName = await page.evaluate(
        (el) => el.innerText,
        await page.$(`${foundersSelector} > a:nth-child(${i})`)
      );
      const founderLink = await page.evaluate(
        (el) => el.href,
        await page.$(`${foundersSelector} > a:nth-child(${i})`)
      );
      founders.push({ founderName, founderLink });
    }
    await base('CrunchData').update([
      {
        id: record.getId(),
        fields: {
          CompanyIndustries: industries.join(', '),
          CompanyAddress: '',
          Founder1Name: founders?.[0]?.founderName,
          Founder1Link: founders?.[0]?.founderName,
          Founder2Name: founders?.[1]?.founderName,
          Founder2Link: founders?.[1]?.founderLink,
        },
      },
    ]);
    await browser.close();
  } catch (e) {
    console.log(e);
  }
})();
