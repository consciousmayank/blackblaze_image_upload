<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    
    // State variables
    let selectedFile: File | null = null;
    let previewUrl = '';
    let uploadStatus = 'idle'; // idle, uploading, success, error
    let uploadProgress = 0;
    let errorMessage = '';
    let uploadedFileUrl = '';
    let uploadedFileName = '';
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
        uploadedFileName = '';
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
        uploadedFileName = result.fileName;
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

    function navigateToUpload() {
      goto('/upload');
    }

    function navigateToDownload() {
      goto('/download');
    }
    
    function navigateToComponentExample() {
      goto('/component-example');
    }
  </script>
  
  <main class="container">
    <h1>Backblaze B2 File Operations</h1>
    
    <div class="button-container">
      <button on:click={navigateToUpload} class="upload-btn">
        Upload Image
      </button>
      
      <button on:click={navigateToDownload} class="download-btn">
        Download Image
      </button>
    </div>
    
    <div class="component-example-link">
      <button on:click={navigateToComponentExample} class="example-btn">
        Component Examples
      </button>
    </div>
  </main>
  
  <style>
    .container {
      max-width: 600px;
      margin: 50px auto;
      padding: 30px;
      text-align: center;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      margin-bottom: 30px;
      color: #333;
    }
    
    .button-container {
      display: flex;
      justify-content: space-around;
      margin-top: 20px;
    }
    
    button {
      padding: 12px 24px;
      font-size: 16px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: transform 0.2s, background-color 0.3s;
      font-weight: bold;
    }
    
    button:hover {
      transform: translateY(-2px);
    }
    
    .upload-btn {
      background-color: #4285f4;
      color: white;
    }
    
    .upload-btn:hover {
      background-color: #3367d6;
    }
    
    .download-btn {
      background-color: #0f9d58;
      color: white;
    }
    
    .download-btn:hover {
      background-color: #0b8043;
    }
    
    .component-example-link {
      margin-top: 20px;
      text-align: center;
    }
    
    .example-btn {
      background-color: #9c27b0;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.3s, transform 0.2s;
    }
    
    .example-btn:hover {
      background-color: #7b1fa2;
      transform: translateY(-2px);
    }
  </style>