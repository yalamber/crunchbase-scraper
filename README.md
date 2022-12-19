RUN chrome using below command in terminal

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=$(mktemp -d -t 'chrome-remote_data_dir')
```

Login to crunchbase account.

Update InvestorUrl, InvestorCompanyName, filename const to proper company link and names
Update browserWSEndpoint const in index.js line no 22

run `node index.js`
