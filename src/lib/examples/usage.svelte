<script lang="ts">
  import { B2Uploader } from '$lib';
  import type { UploadResult } from '$lib/types';
  
  // Configure Backblaze B2 credentials
  const b2Config = {
    applicationKey: 'YOUR_B2_APPLICATION_KEY',
    applicationId: 'YOUR_B2_APPLICATION_ID',
    bucketName: 'YOUR_B2_BUCKET_NAME'
  };
  
  // Handle upload events
  function handleUploadComplete(result: UploadResult) {
    if (result.success) {
      console.log('Upload successful!');
      console.log('File URL:', result.fileUrl);
    }
  }
  
  // Handle event binding after component is created
  let uploader: any;
  function bindEvents() {
    if (uploader && uploader.uploadCompleteEvent) {
      uploader.uploadCompleteEvent.subscribe(handleUploadComplete);
    }
  }
</script>

<main>
  <h1>Svelte B2 Uploader Example</h1>
  
  <!-- Basic Usage -->
  <section>
    <h2>Basic Usage</h2>
    <B2Uploader 
      config={b2Config} 
      buttonText="Upload Image"
    />
  </section>
  
  <!-- With custom styling -->
  <section>
    <h2>Custom Styling</h2>
    <B2Uploader 
      config={b2Config}
      buttonText="Upload to B2" 
      customClass="custom-uploader"
      buttonClass="custom-button"
      previewClass="custom-preview"
    />
  </section>
  
  <!-- With events -->
  <section>
    <h2>With Event Handling</h2>
    <B2Uploader 
      config={b2Config}
      buttonText="Upload with Events"
      bind:this={uploader}
    />
  </section>
</main>

<style>
  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  section {
    margin-bottom: 3rem;
    padding: 1.5rem;
    border: 1px solid #eee;
    border-radius: 8px;
  }
  
  h2 {
    margin-top: 0;
  }
  
  :global(.custom-uploader) {
    --main-color: #ff3e00;
    --secondary-color: #ff9e80;
  }
  
  :global(.custom-button) {
    background-color: var(--main-color) !important;
    font-weight: bold;
  }
  
  :global(.custom-button:hover) {
    background-color: var(--secondary-color) !important;
  }
  
  :global(.custom-preview) {
    border: 2px solid var(--main-color);
  }
</style> 