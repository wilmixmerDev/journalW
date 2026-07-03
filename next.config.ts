import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    // Avoid overlapping the sidebar's account avatar, which also sits bottom-left.
    position: "bottom-right",
  },
};

export default nextConfig;
