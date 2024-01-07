// @ts-check

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
  Modified by Evan You @yyx990803
*/

/**
 * @typedef {{manualInject?: boolean; shadowMode?: boolean; ssrId?: string}} LoaderOptions
 * @typedef {import('webpack').LoaderContext<LoaderOptions>} LoaderContext
 */

const path = require('node:path')
const qs = require('node:querystring')

const hash = require('hash-sum')
const loaderUtils = require('loader-utils')

// eslint-disable-next-line no-empty-function
module.exports = function () {}

/**
 * @param {LoaderContext} loaderContext
 * @param {string} request
 * @returns {string} stringified request
 */
const stringifyRequest = (loaderContext, request) =>
  loaderContext.utils
    ? JSON.stringify(
        loaderContext.utils.contextify(loaderContext.context, request),
      )
    : loaderUtils.stringifyRequest(loaderContext, request)

/**
 * @this {LoaderContext & {minimize?: boolean}}
 * @param {string} remainingRequest
 * @returns {string} transformed codes
 */
module.exports.pitch = function (remainingRequest) {
  const isServer = this.target === 'node'
  const isProduction = this.minimize || process.env.NODE_ENV === 'production'
  const addStylesClientPath = stringifyRequest(
    this,
    '!' + path.join(__dirname, 'lib/addStylesClient.js'),
  )
  const addStylesServerPath = stringifyRequest(
    this,
    '!' + path.join(__dirname, 'lib/addStylesServer.js'),
  )
  const addStylesShadowPath = stringifyRequest(
    this,
    '!' + path.join(__dirname, 'lib/addStylesShadow.js'),
  )

  const request = stringifyRequest(this, '!!' + remainingRequest)
  const relPath = path
    .relative(__dirname, this.resourcePath)
    .replaceAll('\\', '/')
  const id = JSON.stringify(hash(request + relPath))
  const options = this.getOptions?.() || loaderUtils.getOptions(this) || {}

  // direct css import from js --> direct, or manually call `styles.__inject__(ssrContext)` with `manualInject` option
  // css import from react file --> component lifecycle linked
  // style embedded in react file --> component lifecycle linked
  const isReact =
    /"react":true/.test(remainingRequest) ||
    options.manualInject !== false ||
    qs.parse(this.resourceQuery.slice(1)).react != null

  const shared = [
    '// style-loader: Adds some css to the DOM by adding a <style> tag',
    '',
    '// load the styles',
    'var content = require(' + request + ');',
    // get default export if list is an ES Module (CSS Loader v4+)
    'if(content.__esModule) content = content.default;',
    // content list format is [id, css, media, sourceMap]
    "if(typeof content === 'string') content = [[module.id, content, '']];",
    'if(content.locals) module.exports = content.locals;',
  ]

  // shadowMode is enabled in vue-cli with vue build --target web-component.
  // exposes the same __inject__ method like SSR
  if (options.shadowMode) {
    return [
      ...shared,
      '// add CSS to Shadow Root',
      // eslint-disable-next-line sonarjs/no-duplicate-string
      'var add = require(' + addStylesShadowPath + ').default',
      'module.exports.__inject__ = function (shadowRoot) {',
      '  add(' + id + ', content, shadowRoot)',
      '};',
    ].join('\n')
  }
  if (!isServer) {
    // on the client: dynamic inject + hot-reload
    let code = [
      '// add the styles to the DOM',
      'var add = require(' + addStylesClientPath + ').default',
      'var update = add(' +
        id +
        // eslint-disable-next-line sonarjs/no-duplicate-string
        ', content, ' +
        isProduction +
        ', ' +
        JSON.stringify(options) +
        ');',
    ]
    if (!isProduction) {
      code = [
        ...code,
        '// Hot Module Replacement',
        'if(module.hot) {',
        ' // When the styles change, update the <style> tags',
        ' if(!content.locals) {',
        '   module.hot.accept(' + request + ', function() {',
        '     var newContent = require(' + request + ');',
        '     if(newContent.__esModule) newContent = newContent.default;',
        "     if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];",
        '     update(newContent);',
        '   });',
        ' }',
        ' // When the module is disposed, remove the <style> tags',
        ' module.hot.dispose(function() { update(); });',
        '}',
      ]
    }
    return [...shared, ...code].join('\n')
  }
  // on the server: attach to React SSR context
  if (isReact) {
    // inside react file: expose a function so it can be called in
    // component's lifecycle hooks
    return [
      ...shared,
      '// add CSS to SSR context',
      'var add = require(' + addStylesServerPath + ').default',
      'module.exports.__inject__ = function (context) {',
      '  add(' + id + ', content, ' + isProduction + ', context)',
      '};',
    ].join('\n')
  }
  // normal import
  return [
    ...shared,
    'require(' +
      addStylesServerPath +
      ').default(' +
      id +
      ', content, ' +
      isProduction +
      ')',
  ].join('\n')
}
