import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.resolve("package.json")),
  { webpack } = require("next/dist/compiled/webpack/webpack.js");
export async function buildBlogHarness(outputDirectory) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "production",
      target: "web",
      devtool: false,
      entry: path.resolve("tests/fixtures/blog-editor-harness.tsx"),
      output: {
        path: outputDirectory,
        filename: "blog-harness.js",
        publicPath: "/__blogchunks/",
      },
      resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: {
          "@": path.resolve("src"),
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
          { test: /\.css$/, type: "asset/source" },
        ],
      },
      optimization: { minimize: false },
      plugins: [
        new webpack.DefinePlugin({
          "process.env.NODE_ENV": JSON.stringify("production"),
          "process.env.VERCEL_ENV": JSON.stringify("test"),
          "process.env": "({})",
        }),
      ],
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
