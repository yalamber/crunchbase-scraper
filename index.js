import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { stringify } from 'csv-stringify';
// import { executablePath } from 'puppeteer';

(async () => {
  try {
    puppeteer.use(StealthPlugin());
    // const browser = await puppeteer.launch({
    //   headless: false,
    //   args: ['--no-sandbox'],
    //   headless: false,
    //   ignoreHTTPSErrors: true,
    //   executablePath: executablePath(),
    // });
    // Set investor company recent investments url
    const InvestorUrl =
      'https://www.crunchbase.com/organization/uphonest-capital/recent_investments';
    const InvestorCompanyName = 'Uphonest Capital';
    const filename = './data/uphonest-capital.csv';
    const browserWSEndpoint =
      'ws://127.0.0.1:9222/devtools/browser/e7303be6-701c-4d9e-bbba-6b45f419d3e6';
    const browser = await puppeteer.connect({
      browserWSEndpoint,
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    const writableStream = fs.createWriteStream(filename);
    const columns = [
      'InvestorCompany',
      'InvestedCompanyName',
      'CompanyCurnchbaseUrl',
      'Industries',
      'FounderName',
      'FounderLinkedIn',
    ];
    const stringifier = stringify({ header: true, columns: columns });
    stringifier.write({
      InvestorCompany: InvestorCompanyName,
    });
    stringifier.pipe(writableStream);
    await page.goto(InvestorUrl);
    // Table selector for list of recent investments
    const investmentTableSelector =
      'body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > div > page-centered-layout > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > list-card > div > table > tbody';
    // Total loaded row count for investment table
    const investmentRowCount = await page.$$eval(
      `${investmentTableSelector} > tr`,
      (el) => el.length
    );
    // set initial data object to set all data into
    const data = {
      InvestorUrl,
      investments: [],
    };
    // Set Invested companies list
    const investedCompanies = [];
    console.log('Total invested companies list loaded: ', investmentRowCount);
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
    // iterate through all company to get required data
    for (const company of investedCompanies) {
      // load company link
      await page.goto(company.companyLink, {
        waitUntil: 'domcontentloaded',
      });
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
      stringifier.write({
        InvestorCompany: '',
        InvestedCompanyName: company.companyName,
        Industries: industries.join(', '),
      });
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
      let i = 0;
      for (const founder of founders) {
        await page.goto(founder.founderLink, {
          waitUntil: 'domcontentloaded',
        });
        // TODO: proper selector for linked in link
        const founderLinkedinLink = await page.evaluate(
          (el) => el?.href,
          await page.$(`a[title="View on LinkedIn"]`) // todo update selector to get linked by title attribute
        );
        founders[i].founderLinkedinLink = founderLinkedinLink;
        stringifier.write({
          InvestorCompany: '',
          InvestedCompanyName: '',
          Industries: '',
          FounderName: founder.founderName,
          FounderLinkedIn: founderLinkedinLink,
        });
        await new Promise((_func) => setTimeout(_func, 2000));
        i++;
      }

      // push all details to  data
      data.investments.push({
        ...company,
        industries,
        founders,
      });
      await new Promise((_func) => setTimeout(_func, 5000));
    }
    console.log(JSON.stringify(data));
    await browser.close();
  } catch (e) {
    console.log(e);
  }
})();
