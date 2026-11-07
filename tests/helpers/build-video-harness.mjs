import { createRequire } from "node:module";
import path from "node:path";
const loadNext = createRequire(path.resolve("package.json"));
const { webpack } = loadNext("next/dist/compiled/webpack/webpack.js");
// Use Next's existing bundled compiler; no additional player/test dependency.
export async function buildVideoHarness(outputDirectory) {
  await new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: "production",
      target: "web",
      devtool: false,
      entry: path.resolve("tests/fixtures/hybrid-video-harness.tsx"),
      output: { path: outputDirectory, filename: "video-harness.js" },
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
