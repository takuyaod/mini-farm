import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  webpack(config) {
    config.resolve.alias['shared'] = path.resolve(__dirname, '../shared')
    return config
  },
}

export default nextConfig
