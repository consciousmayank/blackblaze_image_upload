<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { getB2FileUrl, checkB2FileExists } from '../api';
  import type { LoadEventDetail, ErrorEventDetail } from '../types';

  // Props
  export let fileName: string = '';
  export let autoLoad: boolean = false;
  export let showFileName: boolean = true;
  export let width: string = '100%';
  export let height: string = 'auto';
  export let useApiEndpoint: boolean = true;
  export let customApiUrl: string = '';

  // Internal state
  let isLoading: boolean = false;
  let error: string = '';
  let imageUrl: string = '';
  let imageLoaded: boolean = false;

  // Event dispatcher for component events
  const dispatch = createEventDispatcher<{
    load: LoadEventDetail;
    error: ErrorEventDetail;
  }>();

  // Load the image
  async function loadImage() {
    if (!fileName) {
      error = 'No file name provided';
      dispatch('error', { error, fileName });
      return;
    }

    error = '';
    isLoading = true;

    try {
      // Method 1: Use the library's API (direct client connection to B2)
      if (!useApiEndpoint) {
        imageUrl = await getB2FileUrl(fileName);
        const exists = await checkB2FileExists(fileName);
        
        if (!exists) {
          throw new Error('Image not found or could not be accessed');
        }
      } 
      // Method 2: Use API endpoint (for SvelteKit/server-side apps)
      else {
        // Create URL for the image
        const apiUrl = customApiUrl || `/api/b2?fileName=${encodeURIComponent(fileName)}`;
        
        // First check if the file exists with a HEAD request
        const headResponse = await fetch(apiUrl, { method: 'HEAD' });
        if (!headResponse.ok) {
          throw new Error('Image not found or could not be accessed');
        }
        
        // If successful, set the image URL
        imageUrl = apiUrl;
      }
      
      // Dispatch success event
      dispatch('load', { fileName });
    } catch (err) {
      console.error('Image fetch error:', err);
      error = err instanceof Error ? err.message : 'Failed to load image';
      imageUrl = '';
      
      // Dispatch error event
      dispatch('error', { error, fileName });
    } finally {
      isLoading = false;
    }
  }

  // Handle image load success
  function handleImageLoad() {
    imageLoaded = true;
  }

  // Load image when fileName changes or on mount if autoLoad is true
  $: if (fileName) {
    if (autoLoad) {
      loadImage();
    } else {
      imageUrl = '';
      imageLoaded = false;
    }
  }

  onMount(() => {
    if (autoLoad && fileName) {
      loadImage();
    }
  });
</script>

<div class="b2-image-viewer">
  {#if !imageUrl && !isLoading && !error}
    {#if fileName}
      <button on:click={loadImage} class="load-button">
        Load Image
      </button>
    {:else}
      <div class="placeholder">
        <span>No image file specified</span>
      </div>
    {/if}
  {/if}
  
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading image...</span>
    </div>
  {/if}
  
  {#if error}
    <div class="error">
      <span>❌ {error}</span>
    </div>
  {/if}
  
  {#if imageUrl}
    <div class="image-container" class:loaded={imageLoaded}>
      {#if showFileName}
        <div class="image-title">{fileName}</div>
      {/if}
      <img 
        src={imageUrl} 
        alt={fileName} 
        style="width: {width}; height: {height};" 
        on:load={handleImageLoad} 
        class:hide={!imageLoaded}
      />
      {#if !imageLoaded}
        <div class="image-loading">
          <div class="spinner"></div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .b2-image-viewer {
    position: relative;
    width: 100%;
    min-height: 100px;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .image-container {
    width: 100%;
    position: relative;
    border-radius: 4px;
    overflow: hidden;
  }
  
  img {
    display: block;
    max-width: 100%;
    border-radius: 4px;
    transition: opacity 0.3s ease;
  }
  
  img.hide {
    opacity: 0;
  }
  
  .image-title {
    font-size: 0.9rem;
    color: #333;
    margin-bottom: 8px;
    word-break: break-all;
    font-weight: 500;
  }
  
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
    color: #666;
    height: 150px;
    border-radius: 4px;
  }
  
  .loading, .error, .image-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background-color: #f9f9f9;
    border-radius: 4px;
    min-height: 100px;
  }
  
  .error {
    color: #d93025;
    background-color: #ffebee;
    border: 1px solid #ffcdd2;
  }
  
  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #3367d6;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 10px;
  }
  
  .load-button {
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
    display: block;
    margin: 0 auto;
  }
  
  .load-button:hover {
    background-color: #3367d6;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .image-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
  }
  
  .loaded .image-loading {
    display: none;
  }
</style> 