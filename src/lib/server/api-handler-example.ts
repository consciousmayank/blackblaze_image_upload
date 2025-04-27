/**
 * Example SvelteKit API handler for B2 operations
 * To use this, copy to your project's src/routes/api/b2/+server.js or +server.ts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

// Environment variables - should be moved to .env file in production
const B2_APPLICATION_KEY = "your-application-key";
const B2_APPLICATION_ID = "your-application-id";
const B2_BUCKET_NAME = "your-bucket-name";

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

// GET endpoint for file download
export const GET = (async ({ url }) => {
  try {
    const fileName = url.searchParams.get('fileName');
    
    if (!fileName) {
      return json({ error: 'File name is required' }, { status: 400 });
    }
    
    console.log(`Attempting to download file: ${fileName}`);
    
    // Authenticate with B2
    const authData = await authenticateB2();
    
    // Download the file
    const fileData = await downloadFileFromB2(authData, fileName);
    
    // Set appropriate headers for the response
    const response = new Response(fileData.body);
    
    if (fileData.contentType) {
      response.headers.set('Content-Type', fileData.contentType);
    }
    
    if (fileData.contentLength) {
      response.headers.set('Content-Length', fileData.contentLength.toString());
    }
    
    response.headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    
    return response;
  } catch (error: unknown) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: errorMessage || 'Download failed' }, { status: 500 });
  }
}) satisfies RequestHandler;

// POST endpoint for file upload
export const POST = (async ({ request }) => {
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
        
        const fileUrl = `${authData.downloadUrl}/file/${B2_BUCKET_NAME}/${uploadResult.fileName}`;
        
        return json({
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
    
    // Handle JSON requests for auth, etc.
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
}) satisfies RequestHandler;

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

    // Generate a simple filename with timestamp
    const timestamp = new Date().getTime();
    const fileName = `file_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Calculate SHA1 hash
    const hashHex = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    
    // Make the upload request
    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fileName,
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'X-Bz-Content-Sha1': hashHex,
        'X-Bz-Info-Author': 'SvelteKitUploader'
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
      } catch (e: unknown) {
        errorMessage += ` - ${errorText} ${e}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json() as B2UploadResponse;
    return { fileName: result.fileName };
  } catch (error) {
    console.error('Upload exception:', error);
    throw error;
  }
}

// Download file from B2
async function downloadFileFromB2(authData: AuthResponse, fileName: string) {
  try {
    // Use the downloadUrl from the auth response
    const downloadUrl = `${authData.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': authData.authorizationToken
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('B2 download error response:', errorText);
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    
    // Get content type and length from headers
    const contentType = response.headers.get('Content-Type');
    const contentLength = response.headers.get('Content-Length');
    
    return {
      body: response.body,
      contentType,
      contentLength: contentLength ? parseInt(contentLength) : undefined
    };
  } catch (error) {
    console.error('Download exception:', error);
    throw error;
  }
} 