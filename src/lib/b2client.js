import crypto from 'crypto';

/**
 * B2 API response interfaces
 * @typedef {Object} AuthResponse
 * @property {string} accountId - The account ID
 * @property {string} apiUrl - The API URL
 * @property {string} authorizationToken - The authorization token
 * @property {string} downloadUrl - The download URL
 *
 * @typedef {Object} UploadUrlResponse
 * @property {string} uploadUrl - The upload URL
 * @property {string} authorizationToken - The authorization token
 *
 * @typedef {Object} Bucket
 * @property {string} bucketId - The bucket ID
 * @property {string} bucketName - The bucket name
 */

/**
 * Client for Backblaze B2 API operations
 */
export class B2Client {
  /**
   * Create a new B2Client
   * @param {string} applicationKey - B2 application key
   * @param {string} applicationId - B2 application ID
   * @param {string} bucketName - B2 bucket name
   */
  constructor(applicationKey, applicationId, bucketName) {
    this.applicationKey = applicationKey;
    this.applicationId = applicationId;
    this.bucketName = bucketName;
    this.authData = null;
    this.bucketId = null;
  }

  /**
   * Authenticate with the B2 API
   * @returns {Promise<AuthResponse>} Authentication data
   */
  async authenticate() {
    const authString = `${this.applicationId}:${this.applicationKey}`;
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
    
    this.authData = await response.json();
    return this.authData;
  }

  /**
   * Get authentication data, authenticating if necessary
   * @returns {Promise<AuthResponse>} Authentication data
   */
  async getAuthData() {
    if (!this.authData) {
      this.authData = await this.authenticate();
    }
    return this.authData;
  }

  /**
   * Get bucket ID from bucket name
   * @returns {Promise<string>} Bucket ID
   */
  async getBucketId() {
    if (this.bucketId) {
      return this.bucketId;
    }

    const authData = await this.getAuthData();
    
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
    const bucket = data.buckets.find(b => b.bucketName === this.bucketName);
    
    if (!bucket) {
      throw new Error(`Bucket "${this.bucketName}" not found`);
    }
    
    this.bucketId = bucket.bucketId;
    return this.bucketId;
  }

  /**
   * Get an upload URL for the bucket
   * @returns {Promise<UploadUrlResponse>} Upload URL data
   */
  async getUploadUrl() {
    const authData = await this.getAuthData();
    const bucketId = await this.getBucketId();
    
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
   * Upload a file to B2
   * @param {File} file - The file to upload
   * @returns {Promise<Object>} Upload result with fileName and fileUrl
   */
  async uploadFile(file) {
    if (!file || file.size === 0) {
      throw new Error("File is empty - please upload a valid file");
    }

    const authData = await this.getAuthData();
    const uploadUrlData = await this.getUploadUrl();
    
    // Generate a simple filename with timestamp
    const timestamp = new Date().getTime();
    const fileName = `file_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Calculate SHA1 hash
    const hashHex = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    
    const response = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fileName,
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': fileBuffer.length.toString(),
        'X-Bz-Content-Sha1': hashHex,
        'X-Bz-Info-Author': 'B2ImageUploader'
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
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    const fileUrl = `${authData.downloadUrl}/file/${this.bucketName}/${result.fileName}`;
    
    return { 
      fileName: result.fileName,
      fileUrl
    };
  }

  /**
   * Get a file URL for viewing
   * @param {string} fileName - The name of the file to get
   * @returns {Promise<string>} The file URL
   */
  async getFileUrl(fileName) {
    if (!fileName) {
      throw new Error('File name is required');
    }
    
    const authData = await this.getAuthData();
    return `${authData.downloadUrl}/file/${this.bucketName}/${fileName}`;
  }

  /**
   * Check if a file exists in B2
   * @param {string} fileName - The name of the file to check
   * @returns {Promise<boolean>} Whether the file exists
   */
  async checkFileExists(fileName) {
    if (!fileName) {
      throw new Error('File name is required');
    }
    
    try {
      const authData = await this.getAuthData();
      const fileUrl = `${authData.downloadUrl}/file/${this.bucketName}/${fileName}`;
      
      const response = await fetch(fileUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': authData.authorizationToken
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false;
    }
  }
}

export default B2Client; 