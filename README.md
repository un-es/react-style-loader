# react-style-loader [![Travis](https://img.shields.io/travis/JounQin/react-style-loader.svg)](https://travis-ci.org/JounQin/react-style-loader) [![npm package](https://img.shields.io/npm/v/react-style-loader.svg)](https://www.npmjs.com/package/react-style-loader)

This is a fork based on [style-loader](https://github.com/webpack/style-loader). Similar to `style-loader`, you can chain it after `css-loader` to dynamically inject CSS into the document as style tags.

## Options

* **manualInject** (3.1.0+):

  Type: `boolean`. When importing the style from a js file, by default the style is injected as a side effect of the import. When `manualInject` is true, the imported style object exposes a `__inject__` method, which can then be called manually at appropriate timing. If called on the server, the method expects one argument which is the `ssrContext` to attach styles to.

  ```js
  import React from 'react'

  import styles from 'styles.scss'

  export default class App extends React.PureComponent {
    componentWillMount() {
      if (styles.__inject__) {
        styles.__inject__(this.props.staticContext) // staticContext from react-router on server
      }
    }

    render() {
      return <div class={styles.heading}>Hello World</div>
    }
  }
  ```

* **ssrId** (3.1.0+):

  Type: `boolean`. Add `data-react-ssr-id` attribute to injected `<style>` tags even when not in Node.js. This can be used with pre-rendering (instead of SSR) to avoid duplicate style injection on hydration.

### Differences from `style-loader`

#### Server-Side Rendering Support

When bundling with `target: 'node'`, the styles in all rendered components are collected and exposed on the React render context object as `context.styles`, which you can simply inline into your markup's `<head>`. If you are building a React SSR app, you probably should use this loader for CSS imported from JavaScript files too.

To use `react-style-loader` to collect all styles on server, you need to separate loading global styles and async component styles, because we need to collect then through `componentWillMount` lifecycle on runtime, so you need add a option `react: true` to this loader for async component styles, then you will be able to use `styles.__inject__(userContext)` on server side.

##### [Configuration Example](https://github.com/JounQin/react-hackernews/blob/master/build/base.js)

#### Misc

* Does not support url mode and reference counting mode. Also removed `singleton` and `insertAt` query options. It always automatically pick the style insertion mechanism that makes most sense. If you need these capabilities you should probably use the original `style-loader` instead.

* Fixed the issue that root-relative URLs are interpreted against chrome:// urls and make source map URLs work for injected `<style>` tags in Chrome.

## License

MIT
