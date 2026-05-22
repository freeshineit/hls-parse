import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import serve from "rollup-plugin-serve";
import fs from "fs";

const pkg = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);

const sharedPlugins = [
  resolve({ browser: true }),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.json",
    declaration: true,
    declarationDir: "dist/types",
  }),
];

// Copy IIFE bundle to public/ so index.html can load it
// function copyPlugin() {
//   return {
//     name: "copy-bundle-to-public",
//     buildEnd() {
//       fs.mkdirSync("public/browser", { recursive: true });
//     },
//     writeBundle() {
//       try {
//         fs.copyFileSync(
//           "dist/browser/hls-parse.min.js",
//           "public/browser/hls-parse.umd.js",
//         );
//       } catch {
//         /* ignore */
//       }
//     },
//   };
// }

export default [
  // Node CJS
  {
    input: "src/index.ts",
    output: {
      file: pkg.main,
      format: "cjs",
      sourcemap: true,
      exports: "named",
    },
    plugins: [...sharedPlugins],
  },
  // Browser ESM
  {
    input: "src/index.ts",
    output: {
      file: "dist/esm/index.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    plugins: [...sharedPlugins],
  },
  // Browser IIFE + dev server
  {
    input: "src/index.ts",
    output: {
      file: "dist/browser/hls-parse.min.js",
      format: "iife",
      name: "HLSParse",
      sourcemap: false,
      exports: "named",
    },
    plugins: [
      ...sharedPlugins,
      // copyPlugin(),
      serve({
        host: "localhost",
        port: 8080,
        contentBase: ["public", "dist"],
        open: false,
        headers: { "Access-Control-Allow-Origin": "*" },
        onListening() {
          console.log("🌐 Server: http://localhost:8080");
        },
      }),
    ],
  },
];
