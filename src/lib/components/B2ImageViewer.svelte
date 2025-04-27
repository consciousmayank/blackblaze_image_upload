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
  let progressValue: number = 0;
  let progressInterval: ReturnType<typeof setInterval>;

  // Event dispatcher for component events
  const dispatch = createEventDispatcher<{
    load: LoadEventDetail;
    error: ErrorEventDetail;
  }>();

  // Simulate progress animation
  function startProgressAnimation() {
    progressValue = 0;
    clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
      // Increase progress, but slow down as it approaches 90%
      // to simulate waiting for server response
      if (progressValue < 90) {
        const increment = 90 - progressValue > 30 ? 5 : 2;
        progressValue += increment;
      }
    }, 300);
  }

  // Load the image
  async function loadImage() {
    if (!fileName) {
      error = 'No file name provided';
      dispatch('error', { error, fileName });
      return;
    }

    error = '';
    isLoading = true;
    startProgressAnimation();

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
      
      // Complete the progress
      progressValue = 100;
      clearInterval(progressInterval);
      
      // Dispatch success event
      dispatch('load', { fileName });
    } catch (err) {
      console.error('Image fetch error:', err);
      error = err instanceof Error ? err.message : 'Failed to load image';
      imageUrl = '';
      clearInterval(progressInterval);
      
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
    
    return () => {
      clearInterval(progressInterval);
    };
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
      <div class="progress-container">
        <div class="progress-label">Loading image...</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progressValue}%"></div>
        </div>
        <div class="progress-percentage">{Math.round(progressValue)}%</div>
      </div>
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
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill pulse"></div>
            </div>
          </div>
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
  
  .progress-container {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }
  
  .progress-label {
    text-align: center;
    margin-bottom: 10px;
    color: #555;
    font-size: 14px;
  }
  
  .progress-bar {
    height: 6px;
    background-color: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }
  
  .progress-fill {
    height: 100%;
    background-color: #4285f4;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .progress-fill.pulse {
    width: 100%;
    background: linear-gradient(90deg, #4285f4 0%, #7fbaff 50%, #4285f4 100%);
    background-size: 200% 100%;
    animation: pulse-animation 1.5s infinite;
  }
  
  .progress-percentage {
    text-align: center;
    margin-top: 8px;
    font-size: 12px;
    color: #555;
  }
  
  @keyframes pulse-animation {
    0% { background-position: 100% 0; }
    100% { background-position: 0 0; }
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
  
  .image-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
  }
  
  .loaded .image-loading {
    display: none;
  }
</style> 