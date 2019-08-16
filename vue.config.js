module.exports = {
  runtimeCompiler: true,
  publicPath: "./",
  outputDir: "./lib",
  assetsDir: "",
  css: {
    modules: false,
    sourceMap: true,
    loaderOptions: {
      less: {
        modifyVars: {
          "primary-color": "#1DA57A",
          "link-color": "#1DA57A",
          "border-radius-base": "2px"
        },
        javascriptEnabled: true
      }
    }
  },
  devServer: {
    port: 8081
  }
};
