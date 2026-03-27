/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  devIndicators: false,
  async rewrites() {
    return [
      // LangGraph server
      {
        source: "/api/langgraph/:path*",
        destination: "http://localhost:2024/:path*",
      },
      // Python backend routes (explicit list to avoid intercepting Next.js API routes like /api/auth)
      {
        source: "/api/kanban/:path*",
        destination: "http://localhost:8001/api/kanban/:path*",
      },
      {
        source: "/api/calendar/:path*",
        destination: "http://localhost:8001/api/calendar/:path*",
      },
      {
        source: "/api/storage/:path*",
        destination: "http://localhost:8001/api/storage/:path*",
      },
      {
        source: "/api/threads/:path*",
        destination: "http://localhost:8001/api/threads/:path*",
      },
      {
        source: "/api/soul/:path*",
        destination: "http://localhost:8001/api/soul/:path*",
      },
      {
        source: "/api/heartbeat/:path*",
        destination: "http://localhost:8001/api/heartbeat/:path*",
      },
      {
        source: "/api/channels/:path*",
        destination: "http://localhost:8001/api/channels/:path*",
      },
      {
        source: "/api/suggestions/:path*",
        destination: "http://localhost:8001/api/suggestions/:path*",
      },
      {
        source: "/api/models/:path*",
        destination: "http://localhost:8001/api/models/:path*",
      },
      {
        source: "/api/memory/:path*",
        destination: "http://localhost:8001/api/memory/:path*",
      },
      {
        source: "/api/mcp/:path*",
        destination: "http://localhost:8001/api/mcp/:path*",
      },
      {
        source: "/api/skills/:path*",
        destination: "http://localhost:8001/api/skills/:path*",
      },
      {
        source: "/api/artifacts/:path*",
        destination: "http://localhost:8001/api/artifacts/:path*",
      },
      {
        source: "/api/api-keys/:path*",
        destination: "http://localhost:8001/api/api-keys/:path*",
      },
      {
        source: "/api/agents/:path*",
        destination: "http://localhost:8001/api/agents/:path*",
      },
    ];
  },
};

export default config;
