import { createRequire } from "node:module";
import path from "node:path";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url),
  { webpack } = require("next/dist/compiled/webpack/webpack.js");
await mkdir("test-results/blog", { recursive: true });
await new Promise((resolve, reject) => {
  const compiler = webpack({
    mode: "development",
    target: "node",
    devtool: false,
    entry: path.resolve("tests/blog/server.checks.ts"),
    output: {
      path: path.resolve("test-results/blog"),
      filename: "server-tests.cjs",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: { "@": path.resolve("src"), "server-only": false },
    },
    externals: {
      pg: "commonjs pg",
      sharp: "commonjs sharp",
      "next/headers": "commonjs next/headers",
      "next/server": "commonjs next/server",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: path.resolve("tests/helpers/tsx-loader.mjs"),
        },
      ],
    },
    optimization: { minimize: false },
    performance: { hints: false },
  });
  compiler.run((error, stats) => {
    compiler.close(() => {});
    if (error) reject(error);
    else if (stats.hasErrors())
      reject(new Error(stats.toString({ all: false, errors: true })));
    else resolve();
  });
});
