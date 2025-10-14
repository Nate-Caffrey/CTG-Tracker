<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ref, computed } from 'vue';
// NEUER IMPORT: Importiere die Konfigurationsdatei direkt. 
// Passe den Pfad bei Bedarf an deine tatsächliche Build-Konfiguration an.
import appConfig from '~/config/app.config.json';

interface Resource {
	id: number;
	location: string;
	group: number;
}

// 1. TYPED DEFINITION FÜR DIE GRUPPENKONFIGURATION, inklusive der nextGroup-Eigenschaft
// Keys aus JSON sind immer Strings (z.B. "0", "1", "2"), daher wird hier string als Index-Signatur verwendet,
// um einen zuverlässigen Zugriff zu gewährleisten.
interface GroupColorConfig {
    [key: string]: { 
        name: string; 
        bgColor: string; 
        textColor: string; 
        nextGroup: number; // Muss in der Konfigurationsdatei vorhanden sein
    };
}

const route = useRoute();
const resourceId = route.params.id;

// Angenommen, useFetch und $fetch sind global in Nuxt/Vite verfügbar
const { data: responseData, pending, error, refresh } = await useFetch(`/api/resources/${resourceId}`, {
	transform: (response: any) => response.data as Resource | null
});

const resource = responseData;

const isSaving = ref(false);
const saveMessage = ref('');
const isError = ref(false);

// 2. INITIALISIERUNG VON GROUP_COLORS DURCH DIREKTEN IMPORT
// ACHTUNG: Die geladene JSON-Datei MUSS die Felder name, bgColor, textColor und nextGroup enthalten.
const GROUP_COLORS: GroupColorConfig = appConfig as GroupColorConfig;


const currentGroupData = computed(() => {
	const group = resource.value?.group ?? 0;
	// FIX: Explizite Konvertierung der Gruppen-ID zu einem String-Schlüssel für den zuverlässigen Lookup 
	// im aus JSON importierten Objekt.
    const groupKey = group.toString();
	
    // Verwenden des Nullish Coalescing Operators, um Standardgruppe '0' zu gewährleisten, falls group nicht existiert 
    // oder die Gruppe nicht in der Konfigurationsdatei gefunden wird.
	return GROUP_COLORS[groupKey] ?? GROUP_COLORS['0'];
});

const nextGroupValue = computed<number>(() => {
	const currentGroup = resource.value?.group ?? 0;
	// FIX: Explizite Konvertierung der Gruppen-ID zu einem String-Schlüssel für den zuverlässigen Lookup.
    const currentGroupKey = currentGroup.toString();
	
	// WICHTIGE ÄNDERUNG: Die nächste Gruppe wird direkt aus der Konfiguration gelesen.
    // Dies macht die Logik flexibel.
    const currentConfig = GROUP_COLORS[currentGroupKey] ?? GROUP_COLORS['0'];
    
    // FIX: Fallback auf 0, falls nextGroup im Konfigurationsobjekt fehlen sollte, um 'undefined' zu verhindern.
    return currentConfig?.nextGroup ?? 0;
});

async function updateResourceGroup() {
	if (!resource.value || isSaving.value) return;

	isSaving.value = true;
	saveMessage.value = '';
	isError.value = false;
	
	const targetGroup = nextGroupValue.value;

	try {
		console.log(`Updating resource ID ${resourceId} to group ${targetGroup}`);
		const response: any = await $fetch(`/api/resources/${resourceId}`, {
			method: 'PUT',
			body: { 
				group: targetGroup 
			}
		});

		if (response && response.statusCode === 200) {
            const targetGroupKey = targetGroup.toString();
			saveMessage.value = `Gruppe erfolgreich auf ${GROUP_COLORS[targetGroupKey]?.name ?? targetGroup} aktualisiert!`;
			await refresh(); 
		} else {
			throw new Error(response?.message || 'Unbekannter Serverfehler.');
		}

	} catch (err) {
		console.error('Update failed:', err);
		isError.value = true;
		saveMessage.value = 'Fehler beim Speichern der Gruppe. Details: ' + (err as Error).message;
	} finally {
		isSaving.value = false;
		
		setTimeout(() => {
			saveMessage.value = '';
			isError.value = false;
		}, 5000);
	}
}

// Setzt den Seitentitel dynamisch
useHead({
	title: resource.value?.location ? `Ressource: ${resource.value.location}` : 'Ressource nicht gefunden'
});
</script>

<template>
	<div class="container mx-auto p-4 sm:p-6 max-w-4xl min-h-screen">
		
		<NuxtLink to="/" class="inline-flex items-center text-black-600 hover:text-black-800 transition-colors mb-6 font-medium">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
			</svg>
			Zurück zur Übersicht
		</NuxtLink>

		<div v-if="pending" class="flex justify-center items-center py-10 bg-white rounded-xl shadow-md">
			<svg class="animate-spin h-8 w-8 text-black-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
			<p class="ml-4 text-lg text-gray-600">Details werden geladen...</p>
		</div>

		<div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-6 rounded relative shadow-lg" role="alert">
			<h2 class="text-2xl font-bold mb-2">Ladefehler</h2>
			<p>Es gab einen Fehler beim Abrufen der Ressource mit ID: {{ resourceId }}.</p>
			<p class="mt-2 text-sm italic">{{ error.message }}</p>
		</div>

		<div v-else-if="!resource" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-6 rounded shadow-lg" role="alert">
			<h2 class="text-2xl font-bold mb-2">Ressource nicht gefunden (ID: {{ resourceId }})</h2>
			<p>Es konnte kein Eintrag mit dieser ID in der Datenbank gefunden werden.</p>
		</div>

		<div v-else class="bg-white shadow-2xl rounded-xl p-8 border-t-8 border-black-500">
			<h1 class="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-2">{{ resource.location }}</h1>
			<p class="text-xl text-gray-500 mb-6">Datenbank-ID: {{ resource.id }}</p>
			
			<button 
				@click="updateResourceGroup"
				:disabled="isSaving"
				:class="[
					'w-full block transition-all duration-300 ease-in-out transform shadow-lg rounded-2xl p-6 sm:p-12 text-center my-8',
					currentGroupData?.bgColor,
					currentGroupData?.textColor,
					isSaving ? 'opacity-70 cursor-wait scale-100' : 'hover:scale-[1.02] active:scale-[0.98]'
				]"
			>
				<span v-if="isSaving" class="text-3xl sm:text-4xl font-extrabold flex items-center justify-center">
					<svg class="animate-spin h-7 w-7 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Speichern...
				</span>
				<span v-else class="space-y-2 block">
					<p class="text-xl sm:text-2xl font-semibold opacity-80">
						Aktueller Zustand:
					</p>
					<p class="text-4xl sm:text-6xl font-extrabold uppercase">
						{{ currentGroupData?.name ?? '' }}
					</p>
					<p class="text-base sm:text-lg pt-4 font-medium opacity-90">
						Klicken zum Wechseln auf: <span class="font-bold">{{ GROUP_COLORS[nextGroupValue.toString()]?.name }}</span>
					</p>
				</span>
			</button>

			<div v-if="saveMessage" :class="['p-3 mb-6 rounded-lg font-medium', isError ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300']">
					{{ saveMessage }}
			</div>
		</div>
	</div>
</template>
