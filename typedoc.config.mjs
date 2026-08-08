const formatDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

const isZh = process.env.DOC_LANG === "zh";

export default {
  entryPoints: ["src/*.ts"],
  name: isZh ? "API 文档" : "API Docs",
  out: isZh ? "docs/zh" : "docs",
  plugin: ["typedoc-plugin-rename-defaults", "typedoc-plugin-mdn-links", "typedoc-plugin-replace-text"],
  exclude: ["node_modules", "__tests__/**/*", "packages/*/{__tests__,e2e}/**/*"],
  hideGenerator: true,
  disableSources: false,
  includeVersion: true,
  tsconfig: "tsconfig.json",
  readme: isZh ? "README.zh-CN.md" : "README.md",
  githubPages: true,
  gitRemote: "origin",
  highlightLanguages: ["typescript", "javascript", "css", "html", "json", "scss", "jsx", "tsx", "bash"],
  replaceText: {
    inCodeCommentText: true,
    inCodeCommentTags: true,
    inMarkdown: false,
    replacements: [
      // {
      //   pattern:"",
      //   replace: '',
      // },
    ],
  },
  navigationLinks: {
    ...(isZh
      ? {
          示例: "https://github.com/freeshineit/hls-parse/tree/main/examples",
          "English Docs": "../",
          Github: "https://github.com/freeshineit/hls-parse",
        }
      : {
          Examples: "https://github.com/freeshineit/hls-parse/tree/main/examples",
          中文文档: "./zh/",
          Github: "https://github.com/freeshineit/hls-parse",
        }),
  },
  customFooterHtml: `<p style="text-align: center;">Copyright © ${formatDate} <a href="https://github.com/freeshineit" target="_blank">ShineShao</a></p>`,
};
