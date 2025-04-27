<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { uploadToB2 } from '../api';
  import type { UploadResult } from '../types';

  // Props
  export let maxSizeMB: number = 10;
  export let acceptedTypes: string = 'image/*';
  export let showPreview: boolean = true;
  export let autoUpload: boolean = false;
  export let useApiEndpoint: boolean = true;
  export let customApiUrl: string = '';
  export let buttonText: string = 'Upload to Backblaze B2';
  export let dropzoneText: string = 'Select an image';

  // Internal state
  let selectedFile: File | null = null;
  let previewUrl: string | null = null;
  let uploadStatus: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  let uploadProgress: number = 0;
  let uploadedFileUrl: string = '';
  let uploadedFileName: string = '';
  let errorMessage: string = '';

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    select: { file: File };
    start: { file: File };
    progress: { file: File, progress: number };
    success: UploadResult;
    error: { error: string, file: File | null };
  }>();

  // Handle file selection
  function handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      // Check file size
      if (files[0].size > maxSizeMB * 1024 * 1024) {
        errorMessage = `File size exceeds the maximum allowed size (${maxSizeMB}MB)`;
        uploadStatus = 'error';
        dispatch('error', { error: errorMessage, file: null });
        return;
      }
      
      selectedFile = files[0];
      
      // Create a preview URL for the selected image
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      if (showPreview) {
        previewUrl = URL.createObjectURL(selectedFile);
      }
      
      // Reset status
      uploadStatus = 'idle';
      errorMessage = '';
      
      // Emit select event
      dispatch('select', { file: selectedFile });
      
      // Auto upload if enabled
      if (autoUpload) {
        uploadFile();
      }
    }
  }
  
  // Handle drop zone
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const input = document.getElementById('file-input') as HTMLInputElement;
      input.files = event.dataTransfer.files;
      handleFileSelect({ target: input } as unknown as Event);
    }
  }
  
  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }
  
  // Upload file to B2
  async function uploadFile(): Promise<void> {
    if (!selectedFile) {
      errorMessage = 'Please select a file first';
      uploadStatus = 'error';
      dispatch('error', { error: errorMessage, file: null });
      return;
    }
    
    if (selectedFile.size === 0) {
      errorMessage = 'Cannot upload empty file';
      uploadStatus = 'error';
      dispatch('error', { error: errorMessage, file: selectedFile });
      return;
    }
    
    try {
      uploadStatus = 'uploading';
      uploadProgress = 0;
      
      // Emit start event
      dispatch('start', { file: selectedFile });
      
      // Method 1: Direct B2 API (client-side)
      if (!useApiEndpoint) {
        try {
          const result = await uploadToB2(selectedFile) as UploadResult;
          uploadStatus = 'success';
          uploadedFileUrl = result.fileUrl;
          uploadedFileName = result.fileName;
          
          // Emit success event
          dispatch('success', result);
        } catch (error) {
          throw error;
        }
      } 
      // Method 2: Use API endpoint (for SvelteKit/server-side apps)
      else {
        // Create form data with the file
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Setup progress tracking with XHR
        const xhr = new XMLHttpRequest();
        
        // Create a promise to handle the XHR response
        const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              uploadProgress = Math.round((event.loaded / event.total) * 100);
              
              // Emit progress event
              dispatch('progress', { file: selectedFile!, progress: uploadProgress });
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.fileName && response.fileUrl) {
                  resolve({
                    fileName: response.fileName,
                    fileUrl: response.fileUrl
                  });
                } else {
                  reject(new Error(response.error || 'Upload failed'));
                }
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              let errorMsg = `Server error: ${xhr.status}`;
              try {
                const errorObj = JSON.parse(xhr.responseText);
                if (errorObj.error) errorMsg = errorObj.error;
              } catch (e) {
                // Use default error message
              }
              reject(new Error(errorMsg));
            }
          });
          
          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred during upload'));
          });
        });
        
        // Start the upload
        xhr.open('POST', customApiUrl || '/api/b2');
        xhr.send(formData);
        
        // Wait for completion
        const result = await uploadPromise;
        
        // Success
        uploadStatus = 'success';
        uploadedFileUrl = result.fileUrl;
        uploadedFileName = result.fileName;
        
        // Emit success event
        dispatch('success', result);
      }
    } catch (error: unknown) {
      uploadStatus = 'error';
      errorMessage = error instanceof Error ? error.message : 'An error occurred during upload';
      console.error('Upload error:', error);
      
      // Emit error event
      dispatch('error', { error: errorMessage, file: selectedFile });
    }
  }
  
  // Reset the component
  export function reset(): void {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    selectedFile = null;
    previewUrl = null;
    uploadStatus = 'idle';
    uploadProgress = 0;
    uploadedFileUrl = '';
    uploadedFileName = '';
    errorMessage = '';
    
    // Reset file input
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }
  
  // Clean up on unmount
  onMount(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  });
</script>

<div class="b2-uploader">
  <div class="file-input-container">
    <label 
      for="file-input" 
      class="file-input-label"
      on:dragover={handleDragOver}
      on:drop={handleDrop}
    >
      {#if showPreview && previewUrl}
        <img src={previewUrl} alt="Selected image preview" class="image-preview" />
      {:else}
        <div class="placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>{dropzoneText}</span>
        </div>
      {/if}
    </label>
    <input 
      id="file-input" 
      type="file" 
      accept={acceptedTypes} 
      on:change={handleFileSelect} 
      class="hidden-input"
    />
  </div>
  
  {#if selectedFile}
    <div class="file-info">
      <p><strong>Selected file:</strong> {selectedFile.name}</p>
      <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(2)} KB</p>
      <p><strong>Type:</strong> {selectedFile.type}</p>
    </div>
    
    {#if !autoUpload}
      <button 
        class="upload-button" 
        on:click={uploadFile} 
        disabled={uploadStatus === 'uploading'}
      >
        {#if uploadStatus === 'idle' || uploadStatus === 'error' || uploadStatus === 'success'}
          {buttonText}
        {:else if uploadStatus === 'uploading'}
          Uploading... {uploadProgress}%
        {/if}
      </button>
    {/if}
    
    {#if uploadStatus === 'uploading'}
      <div class="progress-container">
        <div class="progress-bar" style="width: {uploadProgress}%"></div>
      </div>
    {/if}
    
    {#if uploadStatus === 'success'}
      <div class="success-message">
        <p>✅ File uploaded successfully!</p>
        <a href={uploadedFileUrl} target="_blank" rel="noopener noreferrer">View uploaded file</a>
        <p>File Name: {uploadedFileName}</p>
      </div>
    {/if}
    
    {#if uploadStatus === 'error'}
      <div class="error-message">
        <p>❌ {errorMessage}</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .b2-uploader {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
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
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.3s;
  }
  
  .file-input-label:hover {
    border-color: #0070f3;
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
    object-fit: cover;
  }
  
  .file-info {
    background-color: #fff;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #eee;
  }
  
  .file-info p {
    margin: 0.5rem 0;
  }
  
  .upload-button {
    background-color: #0070f3;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  
  .upload-button:hover:not(:disabled) {
    background-color: #0051a8;
  }
  
  .upload-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  .progress-container {
    width: 100%;
    height: 10px;
    background-color: #eee;
    border-radius: 5px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background-color: #0070f3;
    transition: width 0.3s ease;
  }
  
  .success-message {
    background-color: #e6f7e6;
    color: #2e7d32;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #c8e6c9;
  }
  
  .success-message a {
    color: #0070f3;
    text-decoration: none;
    display: block;
    margin: 8px 0;
  }
  
  .success-message a:hover {
    text-decoration: underline;
  }
  
  .error-message {
    background-color: #ffebee;
    color: #c62828;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #ffcdd2;
  }
</style> 