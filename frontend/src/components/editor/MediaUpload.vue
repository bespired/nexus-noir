<script setup>
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const props = defineProps({
    modelId: {
        type: [Number, String],
        required: true
    },
    modelType: {
        type: String,
        required: true // e.g., 'App\\Models\\Clue'
    },
    label: {
        type: String,
        default: 'UPLOAD NEW MEDIA'
    },
    accept: {
        type: String,
        default: 'image/*'
    }
});

const emit = defineEmits(['uploaded', 'close']);

const toast = useToast();
const selectedFile = ref(null);
const fileTitle = ref('');
const uploading = ref(false);
const fileInput = ref(null);

const onFileSelect = (event) => {
    selectedFile.value = event.target.files[0];
    
    // Auto-clean filename for title
    if (selectedFile.value) {
        let name = selectedFile.value.name;
        
        // Remove file extension
        name = name.substring(0, name.lastIndexOf('.')) || name;
        
        // Remove leading timestamp (digits + underscore)
        // e.g. 1768758514_sumo-man -> sumo-man
        name = name.replace(/^\d+_/, '');
        
        // Remove "_compressed" suffix (case insensitive)
        name = name.replace(/_compressed$/i, '');
        
        fileTitle.value = name;
    }
};

const triggerFileInput = () => {
    fileInput.value.click();
};

const checkForBones = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const contents = e.target.result;
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('/draco/');
            
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);
            loader.parse(contents, '', (gltf) => {
                let hasBones = false;
                gltf.scene.traverse((child) => {
                    if (child.isBone || (child.isMesh && child.skeleton)) {
                        hasBones = true;
                    }
                });
                resolve(hasBones);
            }, (error) => {
                console.error('Error parsing GLB for bone detection:', error);
                resolve(false);
            });
        };
        reader.onerror = () => resolve(false);
        reader.readAsArrayBuffer(file);
    });
};

const handleUpload = async () => {
    uploading.value = true;

    let metadata = {};
    const extension = selectedFile.value.name.split('.').pop().toLowerCase();
    
    if (extension === 'glb') {
        const hasBones = await checkForBones(selectedFile.value);
        if (hasBones) {
            metadata.hasBones = true;
        }
    }

    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('imageable_id', props.modelId);
    formData.append('imageable_type', props.modelType);
    formData.append('title', fileTitle.value);
    
    if (Object.keys(metadata).length > 0) {
        formData.append('data', JSON.stringify(metadata));
    }

    try {
        const response = await fetch('/api/media', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Upload failed: ' + response.status);
        }

        const data = await response.json();
        toast.add({
            severity: 'success',
            summary: 'Upload Successful',
            detail: 'Media has been attached.',
            life: 3000
        });

        emit('uploaded', data);
        reset();
    } catch (error) {
        console.error(error);
        toast.add({
            severity: 'error',
            summary: 'Upload Error',
            detail: 'Could not upload file.',
            life: 3000
        });
    } finally {
        uploading.value = false;
    }
};

const reset = () => {
    selectedFile.value = null;
    fileTitle.value = '';
    if (fileInput.value) fileInput.value.value = '';
};

const handleClose = () => {
    reset();
    emit('close');
};
</script>

<template>
    <div class="media-upload-container">
        <div class="media-upload-header">
            <Button
                label="CLOSE UPLOAD"
                class="close-upload-btn"
                @click="handleClose"
            />
        </div>

        <div class="upload-panel">
            <h4 class="upload-panel-title">{{ label }}</h4>

            <div class="upload-controls">
                <input
                    type="file"
                    ref="fileInput"
                    class="hidden-input"
                    :accept="accept"
                    @change="onFileSelect"
                />
                <Button
                    label="Choose file"
                    severity="primary"
                    class="choose-btn"
                    @click="triggerFileInput"
                />
                <span class="filename-display">{{ selectedFile ? selectedFile.name : 'No file chosen' }}</span>
            </div>

            <div class="field">
                <InputText
                    v-model="fileTitle"
                    placeholder="OPTIONAL_TITLE"
                    class="noir-input"
                />
            </div>

            <Button
                label="UPLOAD_MEDIA"
                severity="success"
                class="confirm-upload-btn"
                :disabled="!selectedFile"
                :loading="uploading"
                @click="handleUpload"
            />
        </div>
    </div>
</template>

<style scoped>
.media-upload-container {
    padding: 1rem;
    background-color: transparent;
}

.media-upload-header {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.no-visual-data {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    color: var(--color-noir-muted);
    font-style: italic;
}

.close-upload-btn {
    align-self: flex-start;
    background-color: rgba(239, 68, 68, 0.1) !important;
    border: 1px solid var(--color-noir-danger) !important;
    color: var(--color-noir-danger) !important;
    font-weight: bold !important;
}

.upload-panel {
    background-color: rgba(11, 15, 25, 0.5);
    border: 1px solid var(--color-noir-panel);
    padding: 2rem;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.upload-panel-title {
    margin: 0;
    font-family: var(--font-mono);
    color: var(--color-noir-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.upload-controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.hidden-input {
    display: none;
}

.choose-btn {
    background-color: #3b82f6 !important;
    border-radius: 4px !important;
}

.filename-display {
    color: var(--color-noir-muted);
    font-size: 0.9rem;
}

.noir-input {
    width: 100%;
    background: #000 !important;
    border: 1px solid #1f2937 !important;
    color: white !important;
    padding: 0.75rem !important;
}

.confirm-upload-btn {
    background-color: rgba(16, 185, 129, 0.1) !important;
    border: 1px solid var(--color-noir-success) !important;
    color: var(--color-noir-success) !important;
    font-weight: bold !important;
    padding: 1rem !important;
}

.confirm-upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
