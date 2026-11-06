import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests', timeout: 120_000, expect: { timeout: 30_000 }, workers: 1,
  use: { baseURL:'http://127.0.0.1:4173', viewport:{width:1280,height:900},
    launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']} },
  webServer:{command:'npm run preview -- --host 127.0.0.1',port:4173,reuseExistingServer:true,timeout:30_000},
});
