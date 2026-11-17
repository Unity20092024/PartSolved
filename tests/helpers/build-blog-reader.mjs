import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.resolve("package.json")),
  { webpack } = require("next/dist/compiled/webpack/webpack.js");
export async function buildBlogReader(outputDirectory) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "development",
      target: "node",
      devtool: false,
      entry: path.resolve("tests/fixtures/blog-reader-harness.tsx"),
      output: {
        path: outputDirectory,
        filename: "reader.cjs",
        library: { type: "commonjs2" },
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: { "@": path.resolve("src") },
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: path.resolve("tests/helpers/tsx-loader.mjs"),
          },
          { test: /\.css$/, type: "asset/source" },
        ],
      },
      plugins: [
        new webpack.NormalModuleReplacementPlugin(
          /\.\/blog-image$/,
          path.resolve("tests/fixtures/blog-reader-image.tsx"),
        ),
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
