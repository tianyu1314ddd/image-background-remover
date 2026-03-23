import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Custom asset resolver that serves from worker bundle instead of R2
const localAssetResolver = {
  name: "local-asset-resolver",
  async maybeGetAssetResult(event) {
    const url = new URL(event.rawPath, "https://assets.local");
    const pathname = url.pathname;
    
    // Try to serve from the assets directory
    // Since we can't access local files in workers, return undefined
    // to let the next handler try other options
    return undefined;
  }
};

export default defineCloudflareConfig({
  incrementalCache: "dummy",
  tagCache: "dummy",
  queue: "dummy",
  cachePurge: "dummy",
});
