import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage에 올라간 인증샷 도메인 (프로젝트 생성 후 실제 값으로 교체)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
