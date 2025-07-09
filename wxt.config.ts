import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  manifest: {
    name: "Stape GTM Helper",
    description: "Enhance your Google Tag Manager debugging.",    
    permissions: ["webNavigation", "scripting", "storage", "webRequest"],
    host_permissions: ["https://*/"]
  },    
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
      plugins: [
      tailwindcss()      
    ],
  }),
  runner: {
    startUrls: ['https://tagmanager.google.com/'],
  },  
});