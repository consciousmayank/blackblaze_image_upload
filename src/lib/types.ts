// Configuration type for B2 client
export interface B2Config {
  applicationKey: string;
  applicationId: string;
  bucketName: string;
}

// B2 API response interfaces
export interface AuthResponse {
  accountId: string;
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  authorizationToken: string;
}

export interface Bucket {
  bucketId: string;
  bucketName: string;
}

// B2 Upload response 
export interface B2UploadResponse {
  accountId: string;
  bucketId: string;
  contentLength: number;
  contentSha1: string;
  contentType: string;
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
}

// Upload result type
export interface UploadResult {
  success: boolean;
  fileName?: string;
  fileUrl?: string;
  error?: string;
} 