const express = require('express')
const bodyParser = require('body-parser')
const puppeteer = require('puppeteer-core')
const { ssr } = require('./ssr.js')

const hostname = '127.0.0.1'
const port = process.env.PORT || 3000
const host = `http://localhost:${port}`

const app = express()

app.listen(port, () => console.log(`page-inspector listen on ${host}`))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

let browserWSEndpoint = null

app.get('/', async (req, res, next) => {
  const { url } = req.query

  if (!url) {
    return res
      .status(400)
      .send(`Invalid url param. Example: ${host}/?url=https://example.com`)
  }

  if (!browserWSEndpoint) {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    browserWSEndpoint = await browser.wsEndpoint()
  }

  const { html, status } = await ssr(url, browserWSEndpoint)
  return res.status(status).send(html)
})

app.post('/', (req, res) => {
  console.log(req.body)

  return res.status(200).send('OK')
})
