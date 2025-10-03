import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      // Proxy for GraphQL requests to avoid CORS issues
      '/graphql': {
        target: 'https://aptos-testnet.nodit.io/Sp~-7hXzIBAHGtB2xHu5B~8Wmwyx96uq/v1/graphql',
        changeOrigin: true,
        secure: true,
        // Remove the /graphql prefix when forwarding
        rewrite: (path) => path.replace(/^\/graphql/, ''),
      },
      // Proxy for REST API requests to avoid CORS issues
      '/aptos-api': {
        target: 'https://aptos-testnet.nodit.io/Sp~-7hXzIBAHGtB2xHu5B~8Wmwyx96uq/v1',
        changeOrigin: true,
        secure: true,
        // Remove the /aptos-api prefix when forwarding
        rewrite: (path) => path.replace(/^\/aptos-api/, ''),
        // Add custom headers to handle authentication
        headers: {
          // Add any required headers here if needed
        },
        // Handle errors and timeouts
        proxyTimeout: 30000, // 30 seconds timeout
        timeout: 30000,
        // Add error handling
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any, req: any, res: any) => {
          console.log('Proxy Error:', err);
          res.status(500).send('Proxy Error');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onProxyReq: (proxyReq: any, req: any, res: any) => {
          // Log proxy requests for debugging
          console.log('Proxying request to:', proxyReq.path);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onProxyRes: (proxyRes: any, req: any, res: any) => {
          // Log proxy responses for debugging
          console.log('Received proxy response with status:', proxyRes.statusCode);
        },
      },
    },
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
