module.exports = function (eleventyConfig) {
  eleventyConfig.setUseGitIgnore(false);

  // Blog post images live inside src/ so they are easy to reference
  // from Markdown — copy them to dist/blog/images on build.
  eleventyConfig.addPassthroughCopy({ "src/blog/images": "blog/images" });

  return {
    templateFormats: ["11ty.js"],
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
  };
};
