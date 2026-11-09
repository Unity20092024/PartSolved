import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.resolve("package.json"));
const { webpack } = require("next/dist/compiled/webpack/webpack.js");
export async function buildAiHarness(outputDirectory) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "production",
      target: "web",
      devtool: false,
      entry: path.resolve("tests/fixtures/ai-photo-harness.tsx"),
      output: { path: outputDirectory, filename: "ai-harness.js" },
      resolve: {
        extensions: [".tsx", ".ts", ".js"],
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
      optimization: { minimize: false },
      plugins: [
        new webpack.DefinePlugin({
          "process.env": JSON.stringify({ NODE_ENV: "production" }),
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
