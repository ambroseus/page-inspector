const express = require('express');
const puppeteer = require('puppeteer');
const { ssr } = require('./ssr.js');

const hostname = '127.0.0.1';
const port = 8081;
const host = `http://localhost:${port}`;

const app = express();

app.listen(port, () => console.log(`page-inspector listen on ${host}`))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
	next();
});

let browserWSEndpoint = null;

app.get('/', async (req, res, next) => {

	const { url } = req.query;

	if (!url) {
		return res.status(400).send(`Invalid url param: Example: ${host}/google.com`);
	}

	if (!browserWSEndpoint) {
		const browser = await puppeteer.launch();
		browserWSEndpoint = await browser.wsEndpoint();
	}

	const { html, status } = await ssr(url, browserWSEndpoint);
	return res.status(status).send(html);
})