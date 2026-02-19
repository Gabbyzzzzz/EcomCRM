/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-email/render', '@react-email/components'],
  },
}

export default nextConfig
