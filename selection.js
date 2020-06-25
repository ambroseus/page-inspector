function getSelection() {
  let sel = window.getSelection()
  if (!sel) return false

  function getXPath(element) {
    if (element.id) return `//*[@id='` + element.id + `']`
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

  function getPath(el) {
    let path = []
    while (el.nodeName.toLowerCase() != 'html') {
      path.unshift(
        el.nodeName + (el.className ? ` class='${el.className}'` : '')
      )
      el = el.parentNode
    }
    return path
  }

  //console.log(sel)

  console.log(getXPath(sel.focusNode.parentElement))
  console.log(sel.toString())
}
