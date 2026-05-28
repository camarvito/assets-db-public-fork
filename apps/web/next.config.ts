import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@assets-db/shared'],
  // Let relative imports inside the `shared` package that use a `.js`
  // extension (required by NodeNext moduleResolution, which the API uses)
  // resolve to their `.ts`/`.tsx` siblings inside the Next bundler.
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ...(webpackConfig.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return webpackConfig;
  },
};

export default config;
