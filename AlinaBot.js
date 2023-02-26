const puppeteer = require('puppeteer-extra');
const { Telegraf } = require('telegraf');
const request = require('request');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer'); 
const schedule = require('node-schedule');
const { DateTime } = require('luxon');
const express = require("express");
const app = express();

const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};

const bot = new Telegraf('5936581129:AAHh6En3oq0AkJg56PflQtcxhsRoZfTmLOk');

async function runJob() {
  const pathToExtension = require('path').join(__dirname, '2captcha-solver');
  puppeteer.use(StealthPlugin())
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--no-sandbox'
    ],
    executablePath: executablePath()
  });

  const [page] = await browser.pages()

  console.log('Code is running...');

  // Opening a page
  await page.goto('https://online.mfa.gov.ua/application')
  

  await page.waitForXPath('/html/body/div[3]/div[3]/div/div[2]/button');
  const okButton = await page.$x('/html/body/div[3]/div[3]/div/div[2]/button');
  await okButton[0].click();

  await page.waitForXPath('//*[@id="countries"]');
  const countryField = await page.$x('//*[@id="countries"]');
  await countryField[0].click({ clickCount: 3 });
  await countryField[0].type(' Канада');
  // await countryField[0].type('А');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('Enter');

  // Waiting for the element with the CSS selector ".captcha-solver" to be available
  await Promise.all([
    await page.waitForSelector('.captcha-solver'),
    await page.click('.captcha-solver'),
    await page.waitForFunction(() => !document.querySelector('.captcha-solver'), { timeout: 0 })
  ]);

  await page.waitForXPath('//*[@id="consulates"]');
  const consulateField = await page.$x('//*[@id="consulates"]');
  await consulateField[0].click();
  await page.waitForTimeout(1000);
  await page.keyboard.press('PageUp');
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000);

  await page.waitForXPath('//*[@id="categories"]');
  const categoryField = await page.$x('//*[@id="categories"]');
  await categoryField[0].click();
  await page.keyboard.press('PageUp');
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000);

  await page.waitForXPath('//*[@id="services"]');
  const serviceField = await page.$x('//*[@id="services"]');
  await serviceField[0].click();
  await page.keyboard.press('PageUp');
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000);

  const input_date = await page.waitForXPath("//input[@placeholder='Дата']");
  const disabledAttribute = await input_date.evaluate(el => el.getAttribute('disabled'));
  const hasDisabledAttribute = disabledAttribute !== null;

  if (!hasDisabledAttribute) {
    await input_date.click("//input[@placeholder='Дата']");
    await page.waitForTimeout(1000);
  }

  const screenshot = await page.screenshot({ encoding: 'binary' });
  const buffer = Buffer.from(screenshot, 'binary');
  const imageBytes = { source: buffer };

  if (hasDisabledAttribute) {
    messageText = 'Вибачте, запису немає.';
    await bot.telegram.sendMessage('@escape_from_matrix_test', messageText);
    await bot.telegram.sendPhoto('@escape_from_matrix_test', imageBytes);
  } else {
    messageText = 'Ураааааа, запісь доступна.';
    await bot.telegram.sendMessage('@escape_from_matrix_test', messageText);
    await bot.telegram.sendMessage('@escape_from_canada', messageText);
    await bot.telegram.sendPhoto('@escape_from_matrix_test', imageBytes);
    await bot.telegram.sendPhoto('@escape_from_canada', imageBytes);
  }

  await page.waitForTimeout(1000);
  await browser.close();

};


let job;

const startJob = (minutes) => {
  if (job) {
    job.cancel();
  }
  const scheduleString = `*/${minutes} * * * *`;
  job = schedule.scheduleJob(scheduleString, runJob);
  console.log(`Job scheduled to run every ${minutes} minutes.`);
};


bot.command('start', (ctx) => {
  const minutes = parseInt(ctx.message.text.split(' ')[1]);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    ctx.reply('Invalid interval specified. Please use /start <minutes> to specify an interval in minutes.');
    return;
  }
  startJob(minutes);
  ctx.reply(`Job scheduled to run every ${minutes} minutes.`);
});

bot.command('stop', (ctx) => {
  if (job) {
    job.cancel();
    job = null;
    ctx.reply('Job stopped.');
  } else {
    ctx.reply('Job is not currently running.');
  }
});

bot.launch();

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running...");
});

//console.log('Bot running...');

