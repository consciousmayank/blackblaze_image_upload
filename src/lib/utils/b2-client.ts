import crypto from 'crypto';
import type { 
  B2Config,
  AuthResponse,
  UploadUrlResponse,
  Bucket,
  B2UploadResponse,
  UploadResult
} from '../types';

/**
 * Creates a B2 client for interacting with the Backblaze B2 API
 */
export function createB2Client(config: B2Config) {
  const { applicationKey, applicationId, bucketName } = config;
  
  /**
   * Authenticate with B2 API
   */
  async function authenticate(): Promise<AuthResponse> {
    const authString = `${applicationId}:${applicationKey}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    
    const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${base64Auth}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get upload URL for the bucket
   */
  async function getUploadUrl(authData: AuthResponse, bucketId: string): Promise<UploadUrlResponse> {
    const response = await fetch(`${authData.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Get bucket ID from bucket name
   */
  async function getBucketId(authData: AuthResponse): Promise<string> {
    const response = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: authData.accountId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list buckets: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const bucket = data.buckets.find((b: Bucket) => b.bucketName === bucketName);
    
    if (!bucket) {
      throw new Error(`Bucket "${bucketName}" not found`);
    }
    
    return bucket.bucketId;
  }

  /**
   * Upload file to B2
   */
  async function uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResult> {
    try {
      if (!file || file.size === 0) {
        return { 
          success: false, 
          error: 'File is empty or invalid' 
        };
      }

      // Authentication flow
      const authData = await authenticate();
      const bucketId = await getBucketId(authData);
      const uploadUrlData = await getUploadUrl(authData, bucketId);
      
      // Generate a filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `file_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      
      // Calculate SHA1 hash
      const hashHex = crypto.createHash('sha1').update(fileBuffer).digest('hex');
      
      // Upload the file
      if (onProgress) {
        onProgress(10); // Authentication completed
      }
      
      // Upload using fetch API (simple implementation)
      const response = await fetch(uploadUrlData.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadUrlData.authorizationToken,
          'X-Bz-File-Name': fileName,
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Length': fileBuffer.length.toString(),
          'X-Bz-Content-Sha1': hashHex,
          'X-Bz-Info-Author': 'SvelteB2Uploader'
        },
        body: fileBuffer
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `B2 upload failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) errorMessage += ` - ${errorData.message}`;
        } catch (e) {
          errorMessage += ` - ${errorText}`;
        }
        
        return { 
          success: false, 
          error: errorMessage 
        };
      }
      
      const result = await response.json() as B2UploadResponse;
      
      if (onProgress) {
        onProgress(100); // Upload completed
      }
      
      // File URL format: https://f002.backblazeb2.com/file/[bucketName]/[fileName]
      const fileUrl = `https://f002.backblazeb2.com/file/${bucketName}/${result.fileName}`;
      
      return {
        success: true,
        fileName: result.fileName,
        fileUrl
      };
    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  }

  /**
   * Upload file to B2 with progress tracking using XHR
   */
  async function uploadFileWithProgress(file: File, onProgress?: (progress: number) => void): Promise<UploadResult> {
    try {
      if (!file || file.size === 0) {
        return { 
          success: false, 
          error: 'File is empty or invalid' 
        };
      }

      // Authentication flow
      const authData = await authenticate();
      const bucketId = await getBucketId(authData);
      const uploadUrlData = await getUploadUrl(authData, bucketId);
      
      if (onProgress) {
        onProgress(10); // Authentication completed
      }
      
      // Generate a filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `file_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      
      // Calculate SHA1 hash
      const hashHex = crypto.createHash('sha1').update(fileBuffer).digest('hex');
      
      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            // Scale progress to 10-95% range (10% for auth, 95% for upload completion, 100% for processing)
            const scaledProgress = 10 + Math.round((event.loaded / event.total) * 85);
            onProgress(scaledProgress);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText) as B2UploadResponse;
              const fileUrl = `https://f002.backblazeb2.com/file/${bucketName}/${response.fileName}`;
              
              if (onProgress) {
                onProgress(100); // Upload completed
              }
              
              resolve({
                success: true,
                fileName: response.fileName,
                fileUrl
              });
            } catch (e) {
              resolve({ 
                success: false, 
                error: 'Invalid response from server' 
              });
            }
          } else {
            let errorMsg = `Server error: ${xhr.status}`;
            try {
              const errorObj = JSON.parse(xhr.responseText);
              if (errorObj.error) errorMsg = errorObj.error;
            } catch (e) {
              // Use default error message
            }
            resolve({ 
              success: false, 
              error: errorMsg 
            });
          }
        });
        
        xhr.addEventListener('error', () => {
          resolve({ 
            success: false, 
            error: 'Network error occurred during upload' 
          });
        });
        
        xhr.open('POST', uploadUrlData.uploadUrl);
        xhr.setRequestHeader('Authorization', uploadUrlData.authorizationToken);
        xhr.setRequestHeader('X-Bz-File-Name', fileName);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('Content-Length', fileBuffer.length.toString());
        xhr.setRequestHeader('X-Bz-Content-Sha1', hashHex);
        xhr.setRequestHeader('X-Bz-Info-Author', 'SvelteB2Uploader');
        xhr.send(fileBuffer);
      });
    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  }

  return {
    authenticate,
    getBucketId,
    getUploadUrl,
    uploadFile,
    uploadFileWithProgress
  };
} 