<template>
  <div class="bg-white/90 rounded-2xl shadow-sm border border-gray-100 py-2 px-4 content-fade-in">
    <!-- Header with clean typography -->
    <div class="flex items-center justify-between mb-1">
      <h2 class="text-lg font-medium text-gray-900 tracking-tight"></h2>
      <div class="flex items-center gap-2">

        <button 
          @click="toggleCompactMode" 
          class="cursor-pointer text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200"
          :title="compactMode ? 'Show details' : 'Hide details'"
        >
          <svg v-if="compactMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 16V8m0 0l-6 6m6-6l-6-6M4 8v8m0 0l6-6m-6 6l6 6"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Clean minimal list -->
    <div class="divide-y divide-gray-100">
      <div v-for="feature in features" :key="feature.id" 
           class="group py-1 first:pt-0 last:pb-0 hover:bg-gray-25 -mx-2 px-2 rounded-lg transition-colors duration-150">
        
        <div class="flex items-center justify-between gap-4">
          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <h3 class="font-medium text-gray-900 text-base">{{ feature.name }}</h3>
              
              <!-- Environment info icon -->
              <div v-if="!compactMode" class="relative group">
                <svg 
                  class="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors duration-200" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <!-- Icon tooltip -->
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  {{ getEnvironmentTooltip(feature.environments) }}
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
            
            <!-- Description -->
            <transition name="fade">
              <p v-if="!compactMode" class="text-xs text-gray-500 mt-1 leading-relaxed">{{ feature.description }}</p>
            </transition>
          </div>

          <!-- Toggle switch -->
          <div class="flex-shrink-0">
            <label class="relative  items-center cursor-pointer">
              <input 
                type="checkbox" 
                :checked="feature.enabled" 
                @change="toggleFeature(feature.id)"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer transition-all duration-200 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storage } from '@wxt-dev/storage';
import { sendMessage } from 'webext-bridge/popup';




const compactMode = ref(true)

const features = ref([])

const toggleFeature = async (featureId) => {
  if (!Array.isArray(features.value)) {
    return;
  }
  
  const feature = features.value.find(f => f.id === featureId)

  if (feature) {
    feature.enabled = !feature.enabled
    
    // Save updated settings to storage
    try {
      const settings = await storage.getMeta('local:settingsDEV')
      // Ensure we save a plain array, not a reactive reference
      settings.features = JSON.parse(JSON.stringify(features.value))
      await storage.setMeta('local:settingsDEV', settings)
    } catch (error) {
    }
    
    // Send command to content script
    if (feature.apiCommand) {
      try {
        const action = feature.enabled ? 'start' : 'stop'
        await sendMessage('EXECUTE_SCRIPT', {
          command: feature.apiCommand,
          action: action
        }, 'background')
      } catch (error) {
        console.error('Failed to send command:', error)
      }
    }
  }
}

const toggleCompactMode = () => {
  compactMode.value = !compactMode.value
}


const getEnvironmentBadgeClass = (env) => {
  switch (env) {
    case 'GTMUI':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'GTMTA':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'GTMTASS':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const getEnvironmentName = (env) => {
  const envNames = {
    'GTMUI': 'GTM Interface',
    'GTMTA': 'GTM Preview Mode', 
    'GTMTASS': 'Server Side Preview'
  }
  return envNames[env] || env
}

const getEnvironmentTooltip = (environments) => {
  const envNames = {
    'GTMUI': 'GTM Interface',
    'GTMTA': 'GTM Preview Mode', 
    'GTMTASS': 'Server Side Preview'
  }
  
  const names = environments.map(env => envNames[env] || env)
  return `Available in: ${names.join(', ')}`
}
onMounted(async()=>{
  try {
    const settings = await storage.getMeta('local:settingsDEV')
    const loadedFeatures = settings?.features || [];
    // Ensure we have a proper array
    features.value = Array.isArray(loadedFeatures) ? loadedFeatures : [];
  } catch (error) {
    console.error('Failed to load features from storage:', error);
    features.value = [];
  }
})
</script>

<style scoped>
.content-fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>