// webpack.config.js

var nodeExternals = require('webpack-node-externals')
var path = require('path')
var webpack = require('webpack')

var NODE_TARGET = process.env.NODE_TARGET || 'web'
var production = process.env.NODE_ENV === 'production'

var output = {
  path: path.join(__dirname, '/dist')
}

Object.assign(output, {
  filename: production ? 'cozy-client.min.js' : 'cozy-client.js',
  library: ['cozy', 'client'],
  libraryTarget: 'umd',
  umdNamedDefine: true,
  path: path.join(__dirname, '/build')
})

var config = {
  entry: path.join(__dirname, 'src', 'index.js'),
  devtool: 'source-map',
  target: NODE_TARGET,
  output: output,
  resolve: {
    modules: ['node_modules', path.resolve('./src')],
    extensions: ['.js']
  },
  externals: {
    btoa: 'btoa'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    'crypto': false
  }
}

if (production) {
  config.plugins = [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      mangle: true,
      compress: {
        warnings: false
      }
    })
  ]
}

module.exports = config
