import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests', timeout: 300_000, expect: { timeout: 60_000 }, workers: 1,
  use: { baseURL:'http://127.0.0.1:4173', viewport:{width:960,height:680},
    launchOptions:{args:['--use-angle=metal','--ignore-gpu-blocklist']} },
  webServer:{command:'npm run preview -- --host 127.0.0.1',port:4173,reuseExistingServer:true,timeout:30_000},
});
