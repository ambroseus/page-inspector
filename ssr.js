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

/**
 * https://developers.google.com/web/tools/puppeteer/articles/ssr#reuseinstance
 * @param {string} url URL to prerender
 * @param {string} browserWSEndpoint Optional remote debugging URL. If
 *     provided, Puppeteer's reconnects to the browser instance. Otherwise,
 *     a new browser instance is launched
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

    await page.exposeFunction('ssrlog', str => console.log(str))

    // inject <base> on page to relative resources load properly
    await page.evaluate(async url => {
      const base = document.createElement('base')
      base.href = url
      document.head.prepend(base)
    }, url)

    // inject save selection button and handler
    await page.evaluate(async url => {
      function getSelection() {
        var sel = window.getSelection()
        if (!sel) return false

        var el = sel.focusNode
        var path = []
        while (el.nodeName.toLowerCase() != 'html') {
          path.unshift(
            el.nodeName + (el.className ? ` class='${el.className}'` : '')
          )
          el = el.parentNode
        }
        path.push(sel.toString())
        console.log(path)
      }

      const div = document.createElement('div')
      div.innerHTML = `
				<button onClick="(${getSelection.toString()})()">save selection</button>
      `
      await window.ssrlog(div.innerHTML)
      await window.ssrlog(`url: ${url}`)
      document.body.prepend(div)
    }, url)

    // remove scripts and html imports - they've already executed
    await page.evaluate(() => {
      const elements = document.querySelectorAll('script, link[rel="import"]')
      elements.forEach(e => e.remove())
    })

    const html = await page.content()
    await page.close()

    return { html, status: response.status() }
  } catch (e) {
    const html = e.toString()
    console.warn({ message: `URL: ${url} Failed with message: ${html}` })
    return { html, status: 500 }
  }
}

exports.ssr = ssr
