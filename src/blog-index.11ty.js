const { renderBlogIndex } = require("./render");

module.exports = class {
  data() {
    return {
      pagination: {
        data: "blog.indexEntries",
        size: 1,
        alias: "entry",
      },
      permalink: (data) => data.entry.permalink,
    };
  }

  render(data) {
    return renderBlogIndex(data.entry.locale, data.blog.posts, data.site.localeData);
  }
};
