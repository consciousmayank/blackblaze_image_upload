import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';

// Environment variables - should be moved to .env file in production
const B2_APPLICATION_KEY = "00563161c0b0cd87d7d2fad5ba01fbd7afb6e5b229";
const B2_APPLICATION_ID = "b847e0c7428b";
const B2_BUCKET_NAME = "eeshstutiBucket";

// B2 API response interfaces
interface AuthResponse {
  accountId: string;
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
}

interface Bucket {
  bucketId: string;
  bucketName: string;
}

// B2 Upload response 
interface B2UploadResponse {
  accountId: string;
  bucketId: string;
  contentLength: number;
  contentSha1: string;
  contentType: string;
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing file upload request...');
      
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        console.log('Form data parsed, file object:', {
          exists: !!file, 
          type: file ? typeof file : 'undefined',
          size: file?.size,
          name: file?.name,
          contentType: file?.type
        });
        
        if (!file) {
          return json({ error: 'No file uploaded' }, { status: 400 });
        }
        
        if (file.size === 0) {
          return json({ error: 'File is empty' }, { status: 400 });
        }
        
        // Upload file to B2
        const authData = await authenticateB2();
        const bucketId = await getBucketId(authData);
        const uploadUrlData = await getUploadUrl(authData, bucketId);
        const uploadResult = await uploadToB2(uploadUrlData, file);
        
        const fileUrl = `https://f002.backblazeb2.com/file/${B2_BUCKET_NAME}/${uploadResult.fileName}`;
        
        return json({
          success: true,
          fileName: uploadResult.fileName,
          fileUrl
        });
      } catch (uploadError) {
        console.error('Error processing the upload:', uploadError);
        if (uploadError instanceof Error) {
          return json({ error: uploadError.message }, { status: 500 });
        }
        return json({ error: 'Unknown upload error' }, { status: 500 });
      }
    }
    
    // Handle JSON requests
    else {
      const { action } = await request.json();
      
      if (action === 'authenticate') {
        // B2 Authentication
        const authData = await authenticateB2();
        return json(authData);
      } 
      else if (action === 'getUploadUrl') {
        // Get upload URL
        const authData = await authenticateB2();
        const bucketId = await getBucketId(authData);
        const uploadUrlData = await getUploadUrl(authData, bucketId);
        return json(uploadUrlData);
      }
      
      return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('B2 API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: errorMessage || 'Server error' }, { status: 500 });
  }
};

// Authenticate with B2 API
async function authenticateB2(): Promise<AuthResponse> {
  const authString = `${B2_APPLICATION_ID}:${B2_APPLICATION_KEY}`;
  // Base64 encode using Node.js Buffer
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

// Get upload URL for the bucket
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

// Get bucket ID from bucket name
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
  const bucket = data.buckets.find((b: Bucket) => b.bucketName === B2_BUCKET_NAME);
  
  if (!bucket) {
    throw new Error(`Bucket "${B2_BUCKET_NAME}" not found`);
  }
  
  return bucket.bucketId;
}

// Upload file to B2
async function uploadToB2(uploadUrlData: UploadUrlResponse, file: File): Promise<{ fileName: string }> {
  try {
    // Check if file has content
    if (file.size === 0) {
      throw new Error("File is empty - please upload a valid file");
    }

    // Generate a simple filename with timestamp - NO URL ENCODING
    const timestamp = new Date().getTime();
    const fileName = `file_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;
    
    console.log("Using simple filename:", fileName);
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Calculate SHA1 hash
    const hashHex = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    
    console.log('Upload details:', {
      fileName,
      contentLength: fileBuffer.length,
      sha1: hashHex
    });
    
    // Important: Match the exact headers from the successful Postman request
    // Note: NOT using encodeURIComponent on the fileName
    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fileName, // NOT encoded - matches Postman
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'X-Bz-Content-Sha1': hashHex,
        'X-Bz-Info-Author': 'SvelteUploader'
      },
      body: fileBuffer
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('B2 error response:', errorText);
      let errorMessage = `B2 upload failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) errorMessage += ` - ${errorData.message}`;
        if (errorData.code) errorMessage += ` (code: ${errorData.code})`;
      } catch (e) {
        errorMessage += ` - ${errorText} + ${e}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json() as B2UploadResponse;
    console.log('Upload success:', result);
    return { fileName: result.fileName };
  } catch (error) {
    console.error('Upload exception:', error);
    throw error;
  }
}