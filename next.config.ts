import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  outputFileTracingIncludes: { "/lesson-files/*": ["./private/lesson-files/**/*"] },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};
export default nextConfig;
