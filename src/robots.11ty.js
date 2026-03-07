const SITE_URL = "https://tuneclinic.com";

module.exports = class {
  data() {
    return {
      permalink: "robots.txt",
    };
  }

  render() {
    return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  }
};
