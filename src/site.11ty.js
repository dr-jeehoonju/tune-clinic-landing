const { renderPage } = require("./render");

module.exports = class {
  data() {
    return {
      pagination: {
        data: "site.pages",
        size: 1,
        alias: "entry",
      },
      permalink: (data) => data.entry.permalink,
    };
  }

  render(data) {
    return renderPage(data.entry, data.site.localeData);
  }
};
