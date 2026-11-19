import { createRequire } from "node:module";
import path from "node:path";
import { mkdir } from "node:fs/promises";
const require = createRequire(path.resolve("package.json")),
  { webpack } = require("next/dist/compiled/webpack/webpack.js");
await mkdir("test-results/finder-catalog", { recursive: true });
await new Promise((resolve, reject) => {
  const compiler = webpack({
    mode: "development",
    target: "node",
    devtool: false,
    entry: path.resolve("tests/finder-catalog/unit.checks.ts"),
    output: {
      path: path.resolve("test-results/finder-catalog"),
      filename: "server-tests.cjs",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: { "@": path.resolve("src"), "server-only": false },
    },
    externals: {
      "read-excel-file/node": "commonjs read-excel-file/node",
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
