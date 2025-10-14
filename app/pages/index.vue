<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import appConfig from '~/config/app.config.json';

interface Resource {
    id: number;
    location: string;
    group: number;
}

interface GroupColorConfig {
    [key: number]: { 
        name: string; 
        bgColor: string; 
        textColor: string; 
    };
}

const GROUP_COLORS: GroupColorConfig = (appConfig || {}) as GroupColorConfig;


const resources = ref<Resource[] | null>(null);
const pending = ref(true);
const error = ref<Error | null>(null);

let pollInterval: number | null = null;
const POLLING_INTERVAL = 1000;

const allSameNonZeroGroup = computed(() => {
    const list = resources.value;

    if (!list || list.length === 0) {
        return false;
    }

    const firstGroup = list[0]?.group;

    if (firstGroup === 0) {
        return false;
    }

    return list.every(resource => resource.group === firstGroup);
});

const stopPolling = () => {
    if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('Polling gestoppt. Win condition erfüllt oder manuell beendet.');
    }
}

const startPolling = () => {
    if (pollInterval === null) {
        pollInterval = window.setInterval(() => {
            fetchResources(false);
        }, POLLING_INTERVAL);
        console.log('Polling gestartet.');
    }
}

async function fetchResources(isInitialLoad = false) {

    if (isInitialLoad) {
        pending.value = true;
        error.value = null;
    }

    const wasWinning = allSameNonZeroGroup.value; 

    try {
        const response: any = await $fetch('/api/resources', { method: 'GET' });
        const newData: Resource[] = response.data as Resource[] || [];

        if (!resources.value || resources.value.length === 0 || isInitialLoad) {
            resources.value = newData;
        } else {
            const oldResources = resources.value;
            const newMap = new Map(newData.map(r => [r.id, r]));

            const updatedResources: Resource[] = [];
            for (const oldResource of oldResources) {
                const newResource = newMap.get(oldResource.id);
                
                if (newResource) {
                    if (oldResource.group !== newResource.group) {
                        oldResource.group = newResource.group;
                    }
                    if (oldResource.location !== newResource.location) {
                        oldResource.location = newResource.location;
                    }
                    updatedResources.push(oldResource);
                    newMap.delete(oldResource.id);
                }
            }
            
            const addedResources = Array.from(newMap.values());
            
            if (addedResources.length > 0 || updatedResources.length !== oldResources.length) {
                resources.value = [...updatedResources, ...addedResources].sort((a, b) => a.id - b.id);
            }
        }
        
        if (allSameNonZeroGroup.value) {
            stopPolling();
        } else if (wasWinning && !allSameNonZeroGroup.value) {
            startPolling(); 
        }

    } catch (err) {
        console.error('Fetch failed:', err);
        error.value = err as Error;
        resources.value = [];
        stopPolling(); 
    } finally {
        pending.value = false;
    }
}

onMounted(() => {
    fetchResources(true); 
    startPolling(); 
});

onUnmounted(() => {
    stopPolling();
});

const isResetting = ref(false);
const resetMessage = ref('');
const isResetError = ref(false);

const getGroupDisplay = (group: number) => {
    return GROUP_COLORS[group] || GROUP_COLORS[0];
};

async function resetAllGroups() {
    isResetting.value = true;
    resetMessage.value = '';
    isResetError.value = false;

    try {
        const response: any = await $fetch('/api/resources/reset', {
            method: 'PUT',
        });

        if (response && response.statusCode === 200) {
            resetMessage.value = 'Alle Gruppen erfolgreich auf Weiss (0) zurueckgesetzt!';
            
            stopPolling(); 
            
            await fetchResources(false); 
            
            startPolling(); 

        } else {
            throw new Error(response?.message || 'Unbekannter Serverfehler.');
        }

    } catch (err) {
        console.error('Reset failed:', err);
        isResetError.value = true;
        resetMessage.value = 'Fehler beim Zuruecksetzen. Details: ' + (err as Error).message;
    } finally {
        isResetting.value = false;
        
        setTimeout(() => {
            resetMessage.value = '';
            isResetError.value = false;
        }, 5000);
    }
}
</script>

<template>
    <div class="container mx-auto p-4 sm:p-6 max-w-3xl">
        <h1 class="text-4xl font-extrabold text-black-700 mb-6">CTG - Tracker</h1>

        <div v-if="allSameNonZeroGroup && resources && resources.length" 
            class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-xl shadow-lg mb-6 animate-pulse" 
            role="alert"
        >
            <h2 class="text-2xl font-extrabold mb-2 flex items-center">
                <svg class="w-6 h-6 mr-3 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm4.707 6.293l-5 5a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L9 11.586l4.293-4.293a1 1 0 011.414 1.414z"/></svg>
                SIEG!
            </h2>
            <p class="text-lg">Alle Leuchtstäbchen sind der Gruppe 
                <span 
                    :class="[
                        'px-2 py-1 rounded font-bold shadow-md',
                        getGroupDisplay(resources && resources[0] ? resources[0].group : 0)?.bgColor,
                        getGroupDisplay(resources && resources[0] ? resources[0].group : 0)?.textColor
                    ]"
                >
                    {{ resources && resources[0] ? getGroupDisplay(resources[0].group)?.name : '' }}
                </span>
                zugewiesen! Gut gemacht.
            </p>
        </div>

        <div v-if="pending" class="flex justify-center items-center py-10 bg-white rounded-xl shadow-md">
            <svg class="animate-spin h-8 w-8 text-black-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="ml-4 text-lg text-gray-600">Lade Ressourcen...</p>
        </div>

        <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-6 rounded relative shadow-lg" role="alert">
            <h2 class="text-2xl font-bold mb-2">Ladefehler</h2>
            <p>Es gab einen Fehler beim Abrufen der Ressourcen.</p>
            <p class="mt-2 text-sm italic">{{ error.message }}</p>
        </div>

        <ul v-else-if="resources && resources.length">
            <li v-for="resource in resources" :key="resource.id" class="mb-4">
                <NuxtLink :to="`/resources/${resource.id}`" 
                            class="block bg-white hover:bg-gray-50 transition-all duration-200 rounded-xl shadow-lg p-5 border-l-4 border-black-500"
                >
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                            <span class="text-xl font-extrabold text-gray-800 block">{{ resource.location }}</span>
                            <span class="text-sm text-gray-400 hidden sm:block">ID: {{ resource.id }}</span>
                        </div>

                        <div class="mt-3 sm:mt-0">
                            <span 
                                :class="[
                                    'px-4 py-2 rounded-full text-base font-semibold shadow-inner transition-colors duration-300',
                                    getGroupDisplay(resource.group)?.bgColor,
                                    getGroupDisplay(resource.group)?.textColor
                                ]"
                            >
                                {{ getGroupDisplay(resource.group)?.name ?? 'Unbekannt' }} ({{ resource.group }})
                            </span>
                        </div>
                    </div>
                </NuxtLink>
            </li>
        </ul>

        <div v-else class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-6 rounded shadow-lg" role="alert">
            <h2 class="text-2xl font-bold mb-2">Keine Ressourcen gefunden</h2>
            <p>Die Datenbank ist entweder leer oder konnte nicht geladen werden.</p>
        </div>

        <div class="mb-6 space-y-4 pt-8">
            <button 
                @click="resetAllGroups"
                :disabled="isResetting"
                class="w-full sm:w-auto px-6 py-3 rounded-xl text-lg font-bold transition-all duration-200 shadow-md flex items-center justify-center space-x-2"
                :class="[isResetting ? 'bg-gray-400 text-gray-700 cursor-wait' : 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]']"
            >
                <svg v-if="isResetting" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span v-else>Reset</span>
            </button>

            <div v-if="resetMessage" :class="['p-3 rounded-lg font-medium', isResetError ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300']">
                {{ resetMessage }}
            </div>
        </div>
    </div>
</template>