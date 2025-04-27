<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createB2Client } from '../utils/b2-client';
  import type { B2Config } from '../types';
  
  // Props
  export let config: B2Config;
  export let fileName: string = '';
  export let customClass: string = '';
  export let imageClass: string = '';
  export let buttonText: string = 'Download Image';
  
  // Internal state
  let imageUrl: string = '';
  let status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  let errorMessage: string = '';
  
  // Custom events
  export const downloadStartEvent = createEventDispatcher<void>();
  export const downloadCompleteEvent = createEventDispatcher<{ url: string }>();
  export const downloadErrorEvent = createEventDispatcher<{ error: string }>();
  
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
  
  // Handle file download
  async function downloadFile() {
    if (!fileName) {
      errorMessage = 'Please enter a file name';
      status = 'error';
      downloadErrorEvent.dispatch({ error: errorMessage });
      return;
    }
    
    try {
      status = 'loading';
      errorMessage = '';
      imageUrl = '';
      
      // Signal download start
      downloadStartEvent.dispatch();
      
      // Get file download URL using the B2 client
      const downloadUrl = await b2Client.getFileDownloadUrl(fileName);
      
      // Set the image URL
      imageUrl = downloadUrl;
      status = 'success';
      downloadCompleteEvent.dispatch({ url: downloadUrl });
    } catch (error: any) {
      status = 'error';
      errorMessage = error.message || 'An error occurred during download';
      downloadErrorEvent.dispatch({ error: errorMessage });
      console.error('Download error:', error);
    }
  }
  
  // Clean up object URL when component is destroyed
  onDestroy(() => {
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  });
</script>

<div class="b2-downloader {customClass}">
  <div class="download-container">
    <div class="input-group">
      <label for="file-name-input">Image File Name</label>
      <input 
        id="file-name-input" 
        type="text" 
        bind:value={fileName} 
        placeholder="Enter file name (e.g. file_1234567890.jpg)"
      />
      
      <button 
        class="download-button" 
        on:click={downloadFile} 
        disabled={status === 'loading' || !fileName}
      >
        {#if status === 'loading'}
          Loading...
        {:else}
          {buttonText}
        {/if}
      </button>
    </div>
    
    {#if status === 'success' && imageUrl}
      <div class="image-container">
        <img src={imageUrl} alt={fileName} class="retrieved-image {imageClass}" />
      </div>
    {/if}
    
    {#if status === 'error' && errorMessage}
      <div class="error-message">
        <p>❌ {errorMessage}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .b2-downloader {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  .download-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 0.5rem;
    background-color: #f9f9f9;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  label {
    font-weight: 500;
    color: #555;
  }
  
  input {
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .download-button {
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    margin-top: 0.5rem;
  }
  
  .download-button:hover:not(:disabled) {
    background-color: #357ab8;
  }
  
  .download-button:disabled {
    background-color: #b3cae6;
    cursor: not-allowed;
  }
  
  .image-container {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fff;
    border-radius: 4px;
    border: 1px solid #eee;
    display: flex;
    justify-content: center;
  }
  
  .retrieved-image {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
  }
  
  .error-message {
    background-color: #f2dede;
    color: #a94442;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
  
  .error-message p {
    margin: 0;
  }
</style> 