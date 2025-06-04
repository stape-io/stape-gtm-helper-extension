import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: "Stape GTM Helper",
    description: "Enhance your Google Tag Manager debugging.",    
    permissions: ["webNavigation", "scripting"],
    host_permissions: ["https://*/"]
  },    
  modules: ['@wxt-dev/module-vue'],
  runner: {
    startUrls: ['https://tagmanager.google.com/'],
  },  
});
