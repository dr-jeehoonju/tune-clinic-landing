const { SITE_URL } = require("./url-helpers");

module.exports = class {
  data() {
    return {
      permalink: "robots.txt",
    };
  }

  render() {
    return `User-agent: *
Allow: /
Disallow: /admin.html

Sitemap: ${SITE_URL}/sitemap.xml
`;
  }
};
