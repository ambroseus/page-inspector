const express = require('express');
const puppeteer = require('puppeteer');
const ssr = require('./ssr.js');

const hostname = '127.0.0.1';
const port = 8081;


const app = express();

const port = params.port || 3000;
app.listen(port, () => console.log(`page-inspector listen on http://localhost:${port}`))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
	next();
});

let browserWSEndpoint = null;

app.get('/', async (req, res, next) => {

	const url = req.query;

	if (!url) {
		return res.status(400).send(`Invalid url param: Example: http://localhost:${port}/google.com`);
	}

	if (!browserWSEndpoint) {
		const browser = await puppeteer.launch();
		browserWSEndpoint = await browser.wsEndpoint();
	}

	const { html, status } = await ssr(url, browserWSEndpoint);
	return res.status(status).send(html);
})