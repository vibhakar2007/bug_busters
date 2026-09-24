import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.loca.lt",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.trycloudflare.com",
    "*.localtunnel.me",
    "*.pinggy.link",
    "*.serveo.net",
    "*.local",
  ],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, ngrok-skip-browser-warning, bypass-tunnel-reminder, x-requested-with" },
          { key: "ngrok-skip-browser-warning", value: "true" },
          { key: "bypass-tunnel-reminder", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
