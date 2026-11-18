import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.resolve("package.json")),
  { webpack } = require("next/dist/compiled/webpack/webpack.js");
export async function buildCatalogHarness(output) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "production",
      target: "web",
      devtool: false,
      entry: path.resolve("tests/fixtures/catalog-harness.tsx"),
      output: { path: output, filename: "catalog-harness.js" },
      resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: {
          "@": path.resolve("src"),
          "server-only": false,
          "next/navigation": path.resolve("tests/fixtures/blog-navigation.ts"),
        },
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
      plugins: [
        new webpack.DefinePlugin({
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.env": "({})",
        }),
      ],
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
}
export async function buildCatalogParser(output) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "development",
      target: "node",
      devtool: false,
      entry: path.resolve("tests/fixtures/catalog-parser.ts"),
      output: {
        path: output,
        filename: "catalog-parser.cjs",
        library: { type: "commonjs2" },
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: { "@": path.resolve("src"), "server-only": false },
      },
      externals: { "read-excel-file/node": "commonjs read-excel-file/node" },
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
}
