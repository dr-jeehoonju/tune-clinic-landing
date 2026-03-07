module.exports = function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false);

  return {
    templateFormats: ["11ty.js"],
    dir: {
      input: "src",
      output: ".",
      includes: "_includes",
      data: "_data",
    },
  };
};
