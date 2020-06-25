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

    // remove scripts and html imports - they've already executed
    await page.evaluate(() => {
      const elements = document.querySelectorAll('script, link[rel="import"]')
      elements.forEach(e => e.remove())
    })

    // inject <base> on page to relative resources load properly
    await page.evaluate(async url => {
      const base = document.createElement('base')
      base.href = url
      document.head.prepend(base)
    }, url)

    // inject global <script> for event listeners
    await page.evaluate(async () => {
      function onMouseMove(e) {
        if (!highlightEnabled) return

        function getXPath(element) {
          if (element === document.body) return element.tagName.toLowerCase()
          let ix = 0
          let siblings = element.parentNode.childNodes

          for (let i = 0; i < siblings.length; i++) {
            let sibling = siblings[i]
            if (sibling === element)
              return (
                getXPath(element.parentNode) +
                '/' +
                element.tagName.toLowerCase() +
                '[' +
                (ix + 1) +
                ']'
              )
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
              ix++
            }
          }
        }

        const el = document.elementFromPoint(e.clientX, e.clientY)

        if (el && currentEl !== el) {
          if (currentEl && currentElStyle) {
            currentEl.style = currentElStyle
            currentEl.onclick = currentElOnClick
          }

          currentEl = el
          currentElStyle = { ...el.style }
          currentElOnClick = el.onclick

          if (el.id === 'enable-highlight') return

          currentEl.style.background = '#ffa'
          currentEl.style.color = 'brown'
          currentEl.onclick = e => {
            e.stopPropagation()
            e.preventDefault()

            currentEl.style = currentElStyle
            currentEl.onclick = currentElOnClick
            currentElStyle = undefined
            currentElOnClick = undefined
            highlightEnabled = undefined

            const button = document.getElementById('enable-highlight')
            button.style.background = 'white'

            const target = currentEl.innerHTML.toString()
            const parent = currentEl.parentElement.innerHTML.toString()
            const xpath = getXPath(currentEl)
            alert(`target: ${target}\n\nparent: ${parent}\n\nxpath: ${xpath}`)

            currentEl = undefined
            return false
          }
        }
      }

      const script = document.createElement('script')
      script.innerHTML = `
        var currentEl
        var currentElStyle
        var currentElOnClick
        var highlightEnabled
        document.onmousemove = ${onMouseMove.toString()}
        `
      document.head.append(script)
    })

    // inject  button and handler
    await page.evaluate(async url => {
      function triggerHighlight(e) {
        highlightEnabled = !highlightEnabled
        const el = document.getElementById('enable-highlight')
        el.style.background = highlightEnabled ? 'gray' : 'white'
      }
      const div = document.createElement('div')
      div.innerHTML = `
        <button id='enable-highlight' onClick="(${triggerHighlight.toString()})()">select SKU</button>
      `
      await window.ssrlog(div.innerHTML)
      await window.ssrlog(`url: ${url}`)
      document.body.prepend(div)
    }, url)

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
