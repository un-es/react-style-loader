/* eslint-disable unicorn/filename-case */

/**
 * @typedef {import('./listToStyles.js').StyleObject} StyleObject
 * @typedef {import('./listToStyles.js').StyleObjectPart} StyleObjectPart
 */

import listToStyles from './listToStyles.js'

export default function addStylesToShadowDOM(parentId, list, shadowRoot) {
  const styles = listToStyles(parentId, list)
  addStyles(styles, shadowRoot)
}

/**
 * @param {StyleObject[]} styles
 * @param {*} shadowRoot
 */
function addStyles(styles, shadowRoot) {
  const injectedStyles =
    shadowRoot._injectedStyles || (shadowRoot._injectedStyles = {})
  for (const item of styles) {
    const style = injectedStyles[item.id]
    if (!style) {
      for (let j = 0; j < item.parts.length; j++) {
        addStyle(item.parts[j], shadowRoot)
      }
      injectedStyles[item.id] = true
    }
  }
}

function createStyleElement(shadowRoot) {
  const styleElement = document.createElement('style')
  styleElement.type = 'text/css'
  shadowRoot.append(styleElement)
  return styleElement
}

/**
 *
 * @param {StyleObjectPart} obj
 * @param {*} shadowRoot
 */
function addStyle(obj, shadowRoot) {
  const styleElement = createStyleElement(shadowRoot)
  let css = obj.css
  const media = obj.media
  const sourceMap = obj.sourceMap

  if (media) {
    styleElement.setAttribute('media', media)
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
