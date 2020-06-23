const puppeteer = require('puppeteer')

// https://hackernoon.com/tips-and-tricks-for-web-scraping-with-puppeteer-ed391a63d952
// Don't download all resources, we just need the HTML
// Also, this is huge performance/response time boost
const blockedResourceTypes = [
  'image',
  'media',
  'font',
  'texttrack',
  'object',
  'beacon',
  'csp_report',
  'imageset',
]

const skippedResources = [
  'quantserve',
  'adzerk',
  'doubleclick',
  'adition',
  'exelator',
  'sharethrough',
  'cdn.api.twitter',
  'google-analytics',
  'googletagmanager',
  'google',
  'fontawesome',
  'facebook',
  'analytics',
  'optimizely',
  'clicktale',
  'mixpanel',
  'zedo',
  'clicksor',
  'tiqcdn',
]

function inject(text) {
  return text
}

/**
 * https://developers.google.com/web/tools/puppeteer/articles/ssr#reuseinstance
 * @param {string} url URL to prerender.
 * @param {string} browserWSEndpoint Optional remote debugging URL. If
 *     provided, Puppeteer's reconnects to the browser instance. Otherwise,
 *     a new browser instance is launched.
 */
async function ssr(url, browserWSEndpoint) {
  const browser = await puppeteer.connect({ browserWSEndpoint })

  try {
    const page = await browser.newPage()
    await page.setRequestInterception(true)

    page.on('request', request => {
      const requestUrl = request._url.split('?')[0].split('#')[0]
      if (
        blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
        skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
      ) {
        request.abort()
      } else {
        request.continue()
      }
    })

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
    })

    await page.exposeFunction('inject', text => inject(text))

    // Inject <base> on page to relative resources load properly.
    await page.evaluate(async url => {
      const base = document.createElement('base')
      base.href = url
      // Add to top of head, before all other resources.
      document.head.prepend(base)

      const div = document.createElement('div')
      div.innerText = await window.inject('INJECTED CONTENT')
      document.body.prepend(div)
    }, url)

    // Remove scripts and html imports. They've already executed.
    await page.evaluate(() => {
      const elements = document.querySelectorAll('script, link[rel="import"]')
      elements.forEach(e => e.remove())
    })

    const html = await page.content()

    // Close the page we opened here (not the browser).
    await page.close()

    return { html, status: response.status() }
  } catch (e) {
    const html = e.toString()
    console.warn({ message: `URL: ${url} Failed with message: ${html}` })
    return { html, status: 500 }
  }
}

exports.ssr = ssr
