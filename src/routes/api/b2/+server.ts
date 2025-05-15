import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';

// Environment variables - should be moved to .env file in production
const B2_APPLICATION_KEY = "00563161c0b0cd87d7d2fad5ba01fbd7afb6e5b229";
const B2_APPLICATION_ID = "b847e0c7428b";
const B2_BUCKET_NAME = "eeshstutiBucket";

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

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

export const OPTIONS: RequestHandler = async () => {
  const response = new Response(null, { status: 204 });
  return addCorsHeaders(response);
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const fileName = url.searchParams.get('fileName');
    
    if (!fileName) {
      const errorResponse = json({ error: 'File name is required' }, { status: 400 });
      return addCorsHeaders(errorResponse);
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
    
    return addCorsHeaders(response);
  } catch (error: unknown) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = json({ error: errorMessage || 'Download failed' }, { status: 500 });
    return addCorsHeaders(errorResponse);
  }
};

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
          const errorResponse = json({ error: 'No file uploaded' }, { status: 400 });
          return addCorsHeaders(errorResponse);
        }
        
        if (file.size === 0) {
          const errorResponse = json({ error: 'File is empty' }, { status: 400 });
          return addCorsHeaders(errorResponse);
        }
        
        // Upload file to B2
        const authData = await authenticateB2();
        const bucketId = await getBucketId(authData);
        const uploadUrlData = await getUploadUrl(authData, bucketId);
        const uploadResult = await uploadToB2(uploadUrlData, file);
        
        const fileUrl = `https://f002.backblazeb2.com/file/${B2_BUCKET_NAME}/${uploadResult.fileName}`;
        
        const successResponse = json({
          success: true,
          fileName: uploadResult.fileName,
          fileUrl
        });
        return addCorsHeaders(successResponse);
      } catch (uploadError) {
        console.error('Error processing the upload:', uploadError);
        if (uploadError instanceof Error) {
          const errorResponse = json({ error: uploadError.message }, { status: 500 });
          return addCorsHeaders(errorResponse);
        }
        const errorResponse = json({ error: 'Unknown upload error' }, { status: 500 });
        return addCorsHeaders(errorResponse);
      }
    }
    
    // Handle JSON requests
    else {
      const { action } = await request.json();
      
      if (action === 'authenticate') {
        // B2 Authentication
        const authData = await authenticateB2();
        const authResponse = json(authData);
        return addCorsHeaders(authResponse);
      } 
      else if (action === 'getUploadUrl') {
        // Get upload URL
        const authData = await authenticateB2();
        const bucketId = await getBucketId(authData);
        const uploadUrlData = await getUploadUrl(authData, bucketId);
        const urlResponse = json(uploadUrlData);
        return addCorsHeaders(urlResponse);
      }
      
      const errorResponse = json({ error: 'Invalid action' }, { status: 400 });
      return addCorsHeaders(errorResponse);
    }
  } catch (error: unknown) {
    console.error('B2 API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorResponse = json({ error: errorMessage || 'Server error' }, { status: 500 });
    return addCorsHeaders(errorResponse);
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

// Download file from B2
async function downloadFileFromB2(authData: AuthResponse, fileName: string) {
  try {
    // Use the downloadUrl from the auth response
    const downloadUrl = `${authData.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
    
    console.log(`Downloading from: ${downloadUrl}`);
    
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