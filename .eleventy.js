module.exports = function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false);
  eleventyConfig.addPassthroughCopy({ "src/blog/images": "blog/images" });

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
