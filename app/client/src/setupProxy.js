const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Proxy API calls only. A blanket "proxy" in package.json forwards other dev
 * requests (e.g. webpack HMR *.hot-update.json) to the backend and causes 404s.
 */
module.exports = function proxy(app) {
  const target = process.env.AEGISREC_PROXY_TARGET || "http://127.0.0.1:8000";

  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
