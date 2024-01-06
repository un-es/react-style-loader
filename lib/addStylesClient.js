/* eslint-disable unicorn/filename-case */

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
  Modified by Evan You @yyx990803
*/

/**
 * @typedef {import('./listToStyles.js').StyleObject} StyleObject
 * @typedef {import('./listToStyles.js').StyleObjectPart} StyleObjectPart
 */

import listToStyles from './listToStyles.js'

const hasDocument = typeof document !== 'undefined'

if (typeof DEBUG !== 'undefined' && DEBUG && !hasDocument) {
  throw new Error(
    'react-style-loader cannot be used in a non-browser environment. ' +
      "Use { target: 'node' } in your Webpack config to indicate a server-rendering environment.",
  )
}

/**
 * @type { Array<{id: number; refs: number; parts: StyleObjectPart}> }
 */
const stylesInDom = {}

const head =
  hasDocument && (document.head || document.querySelectorAll('head')[0])
let singletonElement = null
let singletonCounter = 0
let isProduction = false
// eslint-disable-next-line no-empty-function
const noop = function () {}
let options = null
const ssrIdKey = 'data-react-ssr-id'

// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
// tags it will allow on a page
const isOldIE =
  typeof navigator !== 'undefined' &&
  /msie [6-9]\b/.test(navigator.userAgent.toLowerCase())

export default function addStylesClient(
  parentId,
  list,
  _isProduction,
  _options,
) {
  isProduction = _isProduction

  options = _options || {}

  let styles = listToStyles(parentId, list)
  addStylesToDom(styles)

  return function update(newList) {
    const mayRemove = []
    for (const item of styles) {
      const domStyle = stylesInDom[item.id]
      domStyle.refs--
      mayRemove.push(domStyle)
    }
    if (newList) {
      styles = listToStyles(parentId, newList)
      addStylesToDom(styles)
    } else {
      styles = []
    }
    for (const domStyle of mayRemove) {
      if (domStyle.refs === 0) {
        for (let j = 0; j < domStyle.parts.length; j++) {
          domStyle.parts[j]()
        }
        delete stylesInDom[domStyle.id]
      }
    }
  }
}

/**
 * @param {StyleObject[]} styles
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
function addStylesToDom(styles) {
  for (const item of styles) {
    const domStyle = stylesInDom[item.id]
    if (domStyle) {
      domStyle.refs++
      let j
      for (j = 0; j < domStyle.parts.length; j++) {
        domStyle.parts[j](item.parts[j])
      }
      for (; j < item.parts.length; j++) {
        domStyle.parts.push(addStyle(item.parts[j]))
      }
      if (domStyle.parts.length > item.parts.length) {
        domStyle.parts.length = item.parts.length
      }
    } else {
      const parts = []
      for (let j = 0; j < item.parts.length; j++) {
        parts.push(addStyle(item.parts[j]))
      }
      stylesInDom[item.id] = { id: item.id, refs: 1, parts }
    }
  }
}

function createStyleElement() {
  const styleElement = document.createElement('style')
  styleElement.type = 'text/css'
  head.append(styleElement)
  return styleElement
}

/**
 * @param {StyleObjectPart} obj
 * @returns {(obj: StyleObjectPart) => void} update style callback
 */
function addStyle(obj) {
  let update, remove
  let styleElement = document.querySelector(
    'style[' + ssrIdKey + '~="' + obj.id + '"]',
  )

  if (styleElement) {
    if (isProduction) {
      // has SSR styles and in production mode.
      // simply do nothing.
      return noop
    }
    // has SSR styles but in dev mode.
    // for some reason Chrome can't handle source map in server-rendered
    // style tags - source maps in <style> only works if the style tag is
    // created and inserted dynamically. So we remove the server rendered
    // styles and inject new ones.
    styleElement.remove()
  }

  if (isOldIE) {
    // use singleton mode for IE9.
    const styleIndex = singletonCounter++
    styleElement = singletonElement || (singletonElement = createStyleElement())
    update = applyToSingletonTag.bind(null, styleElement, styleIndex, false)
    remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true)
  } else {
    // use multi-style-tag mode in all other cases
    styleElement = createStyleElement()
    update = applyToTag.bind(null, styleElement)
    remove = function () {
      styleElement.remove()
    }
  }

  update(obj)

  /**
   * @param {StyleObjectPart} newObj
   */
  return function updateStyle(newObj) {
    if (newObj) {
      if (
        newObj.css === obj.css &&
        newObj.media === obj.media &&
        newObj.sourceMap === obj.sourceMap
      ) {
        return
      }
      update((obj = newObj))
    } else {
      remove()
    }
  }
}

const replaceText = (function () {
  const textStore = []

  return function (index, replacement) {
    textStore[index] = replacement
    return textStore.filter(Boolean).join('\n')
  }
})()

function applyToSingletonTag(styleElement, index, remove, obj) {
  const css = remove ? '' : obj.css

  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = replaceText(index, css)
  } else {
    const cssNode = document.createTextNode(css)
    const childNodes = styleElement.childNodes
    if (childNodes[index]) {
      childNodes[index].remove()
    }
    if (childNodes.length > 0) {
      styleElement.insertBefore(cssNode, childNodes[index])
    } else {
      styleElement.append(cssNode)
    }
  }
}

function applyToTag(styleElement, obj) {
  let css = obj.css
  const media = obj.media
  const sourceMap = obj.sourceMap

  if (media) {
    styleElement.setAttribute('media', media)
  }
  if (options.ssrId) {
    styleElement.setAttribute(ssrIdKey, obj.id)
  }

  if (sourceMap) {
    // https://developer.chrome.com/devtools/docs/javascript-debugging
    // this makes source maps inside style tags work properly in Chrome
    css += '\n/*# sourceURL=' + sourceMap.sources[0] + ' */'
    // http://stackoverflow.com/a/26603875
    css +=
      '\n/*# sourceMappingURL=data:application/json;base64,' +
      btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) +
      ' */'
  }

  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css
  } else {
    while (styleElement.firstChild) {
      styleElement.firstChild.remove()
    }
    styleElement.append(document.createTextNode(css))
  }
}
