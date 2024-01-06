/* eslint-disable unicorn/filename-case */

import listToStyles from './listToStyles.js'

export default function addStylesServer(parentId, list, isProduction, context) {
  if (!context && typeof __REACT_SSR_CONTEXT__ !== 'undefined') {
    context = __REACT_SSR_CONTEXT__
  }
  if (context) {
    if (!Object.hasOwn(context, 'styles')) {
      Object.defineProperty(context, 'styles', {
        enumerable: true,
        get: function () {
          return renderStyles(context._styles)
        },
      })
      // expose renderStyles for react-server-renderer (vuejs/#6353)
      context._renderStyles = renderStyles
    }

    const styles = context._styles || (context._styles = {})
    list = listToStyles(parentId, list)
    if (isProduction) {
      addStyleProd(styles, list)
    } else {
      addStyleDev(styles, list)
    }
  }
}

// In production, render as few style tags as possible.
// (mostly because IE9 has a limit on number of style tags)
function addStyleProd(styles, list) {
  for (const element of list) {
    const parts = element.parts
    for (const part of parts) {
      // group style tags by media types.
      const id = part.media || 'default'
      const style = styles[id]
      if (style) {
        if (!style.ids.includes(part.id)) {
          style.ids.push(part.id)
          style.css += '\n' + part.css
        }
      } else {
        styles[id] = {
          ids: [part.id],
          css: part.css,
          media: part.media,
        }
      }
    }
  }
}

// In dev we use individual style tag for each module for hot-reload
// and source maps.
function addStyleDev(styles, list) {
  for (const element of list) {
    const parts = element.parts
    for (const part of parts) {
      styles[part.id] = {
        ids: [part.id],
        css: part.css,
        media: part.media,
      }
    }
  }
}

function renderStyles(styles) {
  let css = ''
  for (const style of Object.values(styles)) {
    css +=
      '<style data-react-ssr-id="' +
      style.ids.join(' ') +
      '"' +
      (style.media ? ' media="' + style.media + '"' : '') +
      '>' +
      style.css +
      '</style>'
  }
  return css
}
