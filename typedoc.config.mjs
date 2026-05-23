const formatDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

export default {
  entryPoints: ["src/*.ts"],
  // 这里设置头部标题
  name: "API Docs",
  out: "docs",
  plugin: ["typedoc-plugin-rename-defaults", "typedoc-plugin-mdn-links", "typedoc-plugin-replace-text"],
  exclude: ["node_modules", "__tests__/**/*", "packages/*/{__tests__,e2e}/**/*"],
  // includeVersion: true,
  hideGenerator: true,
  disableSources: false,
  tsconfig: "tsconfig.json",
  readme: "README.md",
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
    Examples: "https://github.com/freeshineit/hls-parse/tree/main",
    Github: "https://github.com/freeshineit/hls-parse",
  },
  customFooterHtml: `<p style="text-align: center;">Copyright © ${formatDate} <a href="https://github.com/freeshineit" target="_blank">ShineShao</a></p>`,
};
