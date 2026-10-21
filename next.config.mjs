/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare's edge runtime doesn't support Next's built-in image optimizer,
  // and every image here is already served as a plain static file (from
  // public/database/photos in dev, or the database repo in production), so
  // there is nothing for the optimizer to do anyway.
  images: {
    unoptimized: true
  },
  // This is a private tool: keep it out of search engines and out of other sites' frames.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" }
        ]
      }
    ];
  }
};

export default nextConfig;
