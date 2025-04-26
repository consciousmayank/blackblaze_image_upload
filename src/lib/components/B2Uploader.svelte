<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createB2Client } from '../utils/b2-client';
  import type { B2Config, UploadResult } from '../types';
  
  // Props
  export let config: B2Config;
  export let buttonText: string = 'Upload to B2';
  export let allowedFileTypes: string = 'image/*';
  export let maxFileSize: number = 10 * 1024 * 1024; // 10MB default
  export let showPreview: boolean = true;
  export let customClass: string = '';
  export let previewClass: string = '';
  export let buttonClass: string = '';
  
  // Internal state
  let selectedFile: File | null = null;
  let previewUrl: string = '';
  let uploadStatus: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  let uploadProgress: number = 0;
  let errorMessage: string = '';
  let uploadedFileUrl: string = '';
  let dragActive: boolean = false;
  
  // Custom events
  export const uploadStartEvent = createEventDispatcher<void>();
  export const uploadProgressEvent = createEventDispatcher<{ progress: number }>();
  export const uploadCompleteEvent = createEventDispatcher<UploadResult>();
  export const uploadErrorEvent = createEventDispatcher<{ error: string }>();
  export const fileSelectedEvent = createEventDispatcher<{ file: File }>();
  
  // Create B2 client
  const b2Client = createB2Client(config);
  
  function createEventDispatcher<T>() {
    const callbacks: ((detail: T) => void)[] = [];
    
    // Return an object with dispatch and subscribe methods
    return {
      dispatch: (detail: T) => {
        callbacks.forEach(callback => callback(detail));
      },
      subscribe: (callback: (detail: T) => void) => {
        callbacks.push(callback);
        
        // Return unsubscribe function
        return () => {
          const index = callbacks.indexOf(callback);
          if (index !== -1) {
            callbacks.splice(index, 1);
          }
        };
      }
    };
  }
  
  // Handle file selection
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      processSelectedFile(file);
    }
  }
  
  // Process the selected file
  function processSelectedFile(file: File) {
    // Validate file type if allowed types are specified
    if (allowedFileTypes && !file.type.match(allowedFileTypes.replace(/\*/g, '.*'))) {
      errorMessage = `Invalid file type. Allowed: ${allowedFileTypes}`;
      uploadStatus = 'error';
      uploadErrorEvent.dispatch({ error: errorMessage });
      return;
    }
    
    // Validate file size
    if (maxFileSize && file.size > maxFileSize) {
      errorMessage = `File too large. Maximum size: ${formatSize(maxFileSize)}`;
      uploadStatus = 'error';
      uploadErrorEvent.dispatch({ error: errorMessage });
      return;
    }
    
    selectedFile = file;
    fileSelectedEvent.dispatch({ file });
    
    // Create a preview URL for images
    if (showPreview && file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }
    
    // Reset status
    uploadStatus = 'idle';
    uploadProgress = 0;
    errorMessage = '';
    uploadedFileUrl = '';
  }
  
  // Handle drag events
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragActive = true;
  }
  
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragActive = false;
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragActive = true;
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragActive = false;
    
    const file = event.dataTransfer?.files[0];
    if (file) {
      processSelectedFile(file);
    }
  }
  
  // Handle file upload
  async function uploadFile() {
    if (!selectedFile) {
      errorMessage = 'Please select a file first';
      uploadStatus = 'error';
      uploadErrorEvent.dispatch({ error: errorMessage });
      return;
    }
    
    if (selectedFile.size === 0) {
      errorMessage = 'Cannot upload empty file';
      uploadStatus = 'error';
      uploadErrorEvent.dispatch({ error: errorMessage });
      return;
    }
    
    try {
      uploadStatus = 'uploading';
      uploadProgress = 0;
      
      // Signal upload start
      uploadStartEvent.dispatch();
      
      // Use the progress tracking upload method
      const result = await b2Client.uploadFileWithProgress(
        selectedFile,
        (progress) => {
          uploadProgress = progress;
          uploadProgressEvent.dispatch({ progress });
        }
      );
      
      if (result.success) {
        uploadStatus = 'success';
        uploadedFileUrl = result.fileUrl!;
        uploadCompleteEvent.dispatch(result);
      } else {
        uploadStatus = 'error';
        errorMessage = result.error || 'Upload failed';
        uploadErrorEvent.dispatch({ error: errorMessage });
      }
    } catch (error: any) {
      uploadStatus = 'error';
      errorMessage = error.message || 'An error occurred during upload';
      uploadErrorEvent.dispatch({ error: errorMessage });
    }
  }
  
  // Utility function to format file sizes
  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  // Clean up object URL when component is destroyed
  onDestroy(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  });
</script>

<div class="b2-uploader {customClass}" 
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  class:drag-active={dragActive}>
  
  <div class="upload-container">
    <div class="file-input-container">
      <label for="b2-file-input" class="file-input-label">
        {#if showPreview && previewUrl}
          <img src={previewUrl} alt="Selected file preview" class="image-preview {previewClass}" />
        {:else}
          <div class="placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Select a file</span>
          </div>
        {/if}
      </label>
      <input 
        id="b2-file-input" 
        type="file" 
        accept={allowedFileTypes} 
        on:change={handleFileSelect} 
        class="hidden-input"
      />
    </div>
    
    {#if selectedFile}
      <div class="file-info">
        <p><strong>Selected file:</strong> {selectedFile.name}</p>
        <p><strong>Size:</strong> {formatSize(selectedFile.size)}</p>
        <p><strong>Type:</strong> {selectedFile.type}</p>
      </div>
      
      <button 
        class="upload-button {buttonClass}" 
        on:click={uploadFile} 
        disabled={uploadStatus === 'uploading'}
      >
        {#if uploadStatus === 'idle' || uploadStatus === 'error' || uploadStatus === 'success'}
          {buttonText}
        {:else if uploadStatus === 'uploading'}
          Uploading... {uploadProgress}%
        {/if}
      </button>
      
      {#if uploadStatus === 'uploading'}
        <div class="progress-container">
          <div class="progress-bar" style="width: {uploadProgress}%"></div>
        </div>
      {/if}
      
      {#if uploadStatus === 'success'}
        <div class="success-message">
          <p>✅ File uploaded successfully!</p>
          <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">View uploaded file</a>
        </div>
      {/if}
      
      {#if uploadStatus === 'error'}
        <div class="error-message">
          <p>❌ {errorMessage}</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .b2-uploader {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .upload-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 0.5rem;
    background-color: #f9f9f9;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .drag-active .upload-container {
    border: 2px dashed #4a90e2;
    background-color: rgba(74, 144, 226, 0.1);
  }
  
  .file-input-container {
    display: flex;
    justify-content: center;
  }
  
  .file-input-label {
    display: block;
    width: 300px;
    height: 200px;
    border: 2px dashed #ccc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
  }
  
  .file-input-label:hover {
    border-color: #4a90e2;
  }
  
  .hidden-input {
    display: none;
  }
  
  .placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
    gap: 0.5rem;
  }
  
  .image-preview {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .file-info {
    background-color: #f0f0f0;
    padding: 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .upload-button {
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .upload-button:hover {
    background-color: #357ab8;
  }
  
  .upload-button:disabled {
    background-color: #b3cae6;
    cursor: not-allowed;
  }
  
  .progress-container {
    height: 8px;
    width: 100%;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.5rem;
  }
  
  .progress-bar {
    height: 100%;
    background-color: #4a90e2;
    transition: width 0.3s ease;
  }
  
  .success-message {
    background-color: #dff0d8;
    color: #3c763d;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
  
  .success-message a {
    color: #3c763d;
    text-decoration: underline;
  }
  
  .error-message {
    background-color: #f2dede;
    color: #a94442;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
</style> 