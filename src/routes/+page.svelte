<script lang="ts">
    import { onMount } from 'svelte';
    
    // State variables
    let selectedFile: File | null = null;
    let previewUrl = '';
    let uploadStatus = 'idle'; // idle, uploading, success, error
    let uploadProgress = 0;
    let errorMessage = '';
    let uploadedFileUrl = '';
    
    // Environment variables from Vercel
    const B2_BUCKET_NAME = "eeshstutiBucket";
    
    // Handle file selection
    function handleFileSelect(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        selectedFile = file;
        
        // Create a preview URL
        previewUrl = URL.createObjectURL(file);
        
        // Reset status
        uploadStatus = 'idle';
        uploadProgress = 0;
        errorMessage = '';
        uploadedFileUrl = '';
      }
    }
    
    // Test file upload (for debugging)
    async function testUpload() {
      if (!selectedFile) {
        errorMessage = 'Please select a file first';
        return;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await fetch('/api/test', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        console.log('Test upload result:', result);
        alert('Check console for upload test result');
      } catch (error) {
        console.error('Test upload failed:', error);
        alert('Test upload failed - check console');
      }
    }
    
    // Handle file upload
    async function uploadFile() {
      if (!selectedFile) {
        errorMessage = 'Please select a file first';
        return;
      }
      
      if (selectedFile.size === 0) {
        errorMessage = 'Cannot upload empty file';
        return;
      }
      
      try {
        uploadStatus = 'uploading';
        uploadProgress = 0;
        
        // Create form data with the file
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Setup progress tracking with XHR
        const xhr = new XMLHttpRequest();
        
        // Create a promise to handle the XHR response
        const uploadPromise = new Promise<{fileName: string, fileUrl: string}>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              uploadProgress = Math.round((event.loaded / event.total) * 100);
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                  resolve(response);
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
        xhr.open('POST', '/api/b2');
        xhr.send(formData);
        
        // Wait for completion
        const result = await uploadPromise;
        
        // Success
        uploadStatus = 'success';
        uploadedFileUrl = result.fileUrl;
      } catch (error: any) {
        uploadStatus = 'error';
        errorMessage = error.message || 'An error occurred during upload';
        console.error('Upload error:', error);
      }
    }
    
    // Clean up object URL when component is destroyed
    onMount(() => {
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    });
  </script>
  
  <main class="container">
    <h1>Backblaze B2 Image Uploader</h1>
    
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
        
        <button class="test-button" on:click={testUpload}>
          Test Upload (Debug)
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
  </main>
  
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
    
    .test-button {
      background-color: #6b03fc;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    
    .test-button:hover {
      background-color: #5602c9;
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