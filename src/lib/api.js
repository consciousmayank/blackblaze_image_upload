import { B2Client } from './b2client';

// Store for the B2Client instance
let clientInstance = null;

/**
 * Initialize the B2 client with credentials
 * @param {Object} config - B2 configuration
 * @param {string} config.applicationKey - B2 application key
 * @param {string} config.applicationId - B2 application ID
 * @param {string} config.bucketName - B2 bucket name
 * @returns {B2Client} The B2 client instance
 */
export function initB2Client(config) {
  const { applicationKey, applicationId, bucketName } = config;
  
  if (!applicationKey || !applicationId || !bucketName) {
    throw new Error('Missing required B2 configuration parameters');
  }
  
  clientInstance = new B2Client(applicationKey, applicationId, bucketName);
  return clientInstance;
}

/**
 * Get the B2 client instance
 * @returns {B2Client} The B2 client instance
 * @throws {Error} If the client hasn't been initialized
 */
export function getB2Client() {
  if (!clientInstance) {
    throw new Error('B2 client not initialized. Call initB2Client first.');
  }
  return clientInstance;
}

/**
 * Upload a file to B2
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} Upload result with fileName and fileUrl
 */
export async function uploadToB2(file) {
  const client = getB2Client();
  return client.uploadFile(file);
}

/**
 * Get a file URL for viewing
 * @param {string} fileName - The name of the file to get
 * @returns {Promise<string>} The file URL
 */
export async function getB2FileUrl(fileName) {
  const client = getB2Client();
  return client.getFileUrl(fileName);
}

/**
 * Check if a file exists in B2
 * @param {string} fileName - The name of the file to check
 * @returns {Promise<boolean>} Whether the file exists
 */
export async function checkB2FileExists(fileName) {
  const client = getB2Client();
  return client.checkFileExists(fileName);
}

export default {
  initB2Client,
  getB2Client,
  uploadToB2,
  getB2FileUrl,
  checkB2FileExists
}; 