/** @type {import('next').NextConfig} */
export default {
  // Add this configuration to increase header size limits
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
  },
  // Add custom server headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ]
  },
}
