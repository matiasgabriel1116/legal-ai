import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180
    },
    // [AI OPTIMIZATION] Add these new experimental settings
    serverComponentsExternalPackages: ['@xenova/transformers'],
  },
  poweredByHeader: false,
  
  // [AI OPTIMIZATION] Required webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        {
          '@xenova/transformers': 'commonjs @xenova/transformers',
          'onnxruntime-node': 'commonjs onnxruntime-node'
        }
      );
    }
    
    // [OPTIONAL] For file system access
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
  
  serverRuntimeConfig: {
    hfToken: process.env.HUGGINGFACE_HUB_TOKEN
  },
  publicRuntimeConfig: {
    publicHfToken: process.env.NEXT_PUBLIC_HF_TOKEN
  }
};

export default nextConfig;