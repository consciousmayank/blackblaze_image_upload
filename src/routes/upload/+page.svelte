<script lang="ts">
  import { onMount } from 'svelte';
  
  // State variables
  let selectedFile: File | null = null;
  let previewUrl: string | null = null;
  let uploadStatus: 'idle' | 'uploading' | 'success' | 'error' = 'idle';
  let uploadProgress = 0;
  let uploadedFileUrl = '';
  let uploadedFileName = '';
  let errorMessage = '';
  
  // Handle file selection
  function handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      selectedFile = files[0];
      
      // Create a preview URL for the selected image
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      previewUrl = URL.createObjectURL(selectedFile);
      
      // Reset status
      uploadStatus = 'idle';
      errorMessage = '';
    }
  }
  
  // Upload file to B2
  async function uploadFile(): Promise<void> {
    if (!selectedFile) {
      return;
    }
    
    uploadStatus = 'uploading';
    uploadProgress = 0;
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/b2', true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          uploadProgress = Math.round((e.loaded / e.total) * 100);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          uploadStatus = 'success';
          uploadedFileUrl = response.fileUrl;
          uploadedFileName = response.fileName;
        } else {
          let errorData = { error: 'Upload failed' };
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }
          
          errorMessage = errorData.error || 'Upload failed';
          uploadStatus = 'error';
        }
      };
      
      xhr.onerror = () => {
        errorMessage = 'Network error occurred';
        uploadStatus = 'error';
      };
      
      xhr.send(formData);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      errorMessage = error instanceof Error ? error.message : 'Upload failed';
      uploadStatus = 'error';
    }
  }
  
  // Test upload function (for debug)
  async function testUpload(): Promise<void> {
    try {
      const response = await fetch('/api/b2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'authenticate'
        })
      });
      
      const data = await response.json();
      console.log('Auth response:', data);
    } catch (error) {
      console.error('Test error:', error);
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

<div class="container">
  <h1>Upload to Backblaze B2</h1>
  
  <div class="upload-container">
    <div class="file-input-container">
      <label for="file-input" class="file-input-label">
        {#if previewUrl}
          <img src={previewUrl || "/placeholder.svg"} alt="Selected image preview" class="image-preview" />
        {:else}
          <div class="placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Select an image</span>
          </div>
        {/if}
      </label>
      <input 
        id="file-input" 
        type="file" 
        accept="image/*" 
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
      
      <button 
        class="upload-button" 
        on:click={uploadFile} 
        disabled={uploadStatus === 'uploading'}
      >
        {#if uploadStatus === 'idle' || uploadStatus === 'error' || uploadStatus === 'success'}
          Upload to Backblaze B2
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
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
  }
  
  .upload-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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