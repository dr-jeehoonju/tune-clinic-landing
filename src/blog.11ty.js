const { renderBlogPost } = require("./render");

module.exports = class {
  data() {
    return {
      pagination: {
        data: "blog.posts",
        size: 1,
        alias: "post",
      },
      permalink: (data) => data.post.permalink,
    };
  }

  render(data) {
    return renderBlogPost(data.post, data.site.localeData);
  }
};
