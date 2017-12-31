# react-style-loader [![Build Status](https://circleci.com/gh/JounQin/react-style-loader/tree/master.svg?style=shield)](https://circleci.com/gh/JounQin/react-style-loader/tree/master) [![npm package](https://img.shields.io/npm/v/react-style-loader.svg)](https://www.npmjs.com/package/react-style-loader)

This is a fork based on [style-loader](https://github.com/webpack/style-loader). Similar to `style-loader`, you can chain it after `css-loader` to dynamically inject CSS into the document as style tags.

### Differences from `style-loader`

#### Server-Side Rendering Support

When bundling with `target: 'node'`, the styles in all rendered components are collected and exposed on the React render context object as `context.styles`, which you can simply inline into your markup's `<head>`. If you are building a React SSR app, you probably should use this loader for CSS imported from JavaScript files too.

To use `react-style-loader` to collect all styles on server, you need to separate loading global styles and async component styles, because we need to collect then through `componentWillMount` lifecycle on runtime, so you need add a option `react: true` to this loader for async component styles, then you will be able to use `styles.__inject__(userContext)` on server side.

##### Real world configuration

```js
import webpack from 'webpack'
import ExtractTextWebpackPlugin from 'extract-text-webpack-plugin'
import FriendlyErrorsWebpackPlugin from 'friendly-errors-webpack-plugin'
import UglifyjsWebpackPlugin from 'uglifyjs-webpack-plugin'

import { NODE_ENV, __DEV__, resolve } from './config'

const souceMap = __DEV__
const minimize = !souceMap

const cssLoaders = modules =>
  ExtractTextWebpackPlugin.extract({
    fallback: {
      loader: 'react-style-loader',
      options: {
        react: modules,
      },
    },
    use: [
      {
        loader: 'css-loader',
        options: {
          minimize,
          souceMap,
          modules,
          camelCase: true,
          importLoaders: 2,
          localIdentName: __DEV__
            ? '[path][name]__[local]--[hash:base64:5]'
            : '[hash:base64:5]',
        },
      },
      {
        loader: 'postcss-loader',
        options: {
          minimize,
          souceMap,
        },
      },
      {
        loader: 'sass-loader',
        options: {
          minimize,
          souceMap,
          includePaths: [resolve('node_modules/bootstrap/scss')],
        },
      },
    ],
  })

export default {
  devtool: __DEV__ && 'cheap-module-source-map',
  resolve: {
    extensions: ['.js', '.scss'],
    modules: [resolve('src'), 'node_modules'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          cacheDirectory: true,
        },
      },
      {
        test: /\.pug$/,
        use: [
          'apply-loader',
          {
            loader: 'pug-loader',
            options: {
              pretty: __DEV__,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        oneOf: [
          {
            test: /bootstrap.scss/,
            use: cssLoaders(),
          },
          {
            test: /./,
            use: cssLoaders(true),
          },
        ],
      },
    ],
  },
  plugins: [
    new ExtractTextWebpackPlugin({
      disable: __DEV__,
      filename: '[name].[contenthash].css',
    }),
    new FriendlyErrorsWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      __DEV__,
    }),
    ...(__DEV__
      ? [new webpack.NamedModulesPlugin(), new webpack.NamedChunksPlugin()]
      : [
          new UglifyjsWebpackPlugin(),
          new webpack.NoEmitOnErrorsPlugin(),
          new webpack.optimize.ModuleConcatenationPlugin(),
        ]),
  ],
}
```

#### Misc

- Does not support url mode and reference counting mode. Also removed `singleton` and `insertAt` query options. It always automatically pick the style insertion mechanism that makes most sense. If you need these capabilities you should probably use the original `style-loader` instead.

- Fixed the issue that root-relative URLs are interpreted against chrome:// urls and make source map URLs work for injected `<style>` tags in Chrome.

## License

MIT
