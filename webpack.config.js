const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(glsl|vs|fs)$/,
        loader: "ts-shader-loader",
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "spheres",
      filename: "index.html",
      template: "src/index.html",
    }),
    // Static assets (CSS, textures) are served from `public` by the dev server,
    // so they need to be copied over for the production bundle as well.
    new CopyWebpackPlugin({
      patterns: [{ from: "public", globOptions: { ignore: ["**/*.wav"] } }],
    }),
  ],
  devServer: {
    static: "public",
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  mode: "production",
};
