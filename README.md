# B2 Image Tools

A Svelte/SvelteKit library for uploading and viewing images from Backblaze B2 cloud storage.

## Features

- **B2ImageUploader**: A component for uploading images to Backblaze B2
- **B2ImageViewer**: A component for viewing images from Backblaze B2
- **B2Client**: A client-side API for interacting with Backblaze B2
- **Server-side handlers**: Example API routes for SvelteKit projects

## Installation

### Using npm

```bash
npm install git+https://github.com/consciousmayank/blackblaze_image_upload.git
```

### Using pnpm

```bash
pnpm add git+https://github.com/consciousmayank/blackblaze_image_upload.git
```

### Using yarn

```bash
yarn add https://github.com/consciousmayank/blackblaze_image_upload.git
```

## Usage

### Client-Side Configuration

To use the library directly in the browser, you need to initialize the B2 client:

```javascript
import { initB2Client } from 'b2-image-tools/api';

// Initialize the client
initB2Client({
  applicationKey: 'your-b2-application-key', 
  applicationId: 'your-b2-application-id',
  bucketName: 'your-bucket-name'
});
```

⚠️ **Security Warning**: This approach exposes your B2 credentials in client-side code. For production applications, use the server-side API approach described below.

### Server-Side Configuration

For better security, create a server-side API endpoint in your SvelteKit project:

1. Copy the example API handler to your project:

```javascript
// src/routes/api/b2/+server.js or +server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

// Copy the contents from src/lib/server/api-handler-example.js
// ...
```

2. Set your B2 credentials in environment variables or directly in the file:

```javascript
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || "your-application-key";
const B2_APPLICATION_ID = process.env.B2_APPLICATION_ID || "your-application-id";
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || "your-bucket-name";
```

### Using the Components

#### B2ImageUploader

```svelte
<script>
  import { B2ImageUploader } from 'b2-image-tools/components';
  
  function handleSuccess(event) {
    const { fileName, fileUrl } = event.detail;
    console.log(`File uploaded: ${fileName}`);
    console.log(`File URL: ${fileUrl}`);
  }
</script>

<!-- Using with server-side API endpoint -->
<B2ImageUploader 
  maxSizeMB={5}
  acceptedTypes="image/*"
  showPreview={true}
  autoUpload={false}
  useApiEndpoint={true}
  on:success={handleSuccess}
  on:error={(e) => console.error(e.detail.error)}
/>

<!-- Using with direct client-side API -->
<B2ImageUploader 
  maxSizeMB={5}
  useApiEndpoint={false}
  autoUpload={true}
  on:success={handleSuccess}
/>
```

#### B2ImageViewer

```svelte
<script>
  import { B2ImageViewer } from 'b2-image-tools/components';
  
  // Image filename to view
  let imageFileName = 'file_1234567890.jpg';
</script>

<!-- Using with server-side API endpoint -->
<B2ImageViewer 
  fileName={imageFileName}
  autoLoad={true}
  showFileName={true}
  width="100%"
  height="auto"
  useApiEndpoint={true}
  on:load={(e) => console.log(`Loaded: ${e.detail.fileName}`)}
  on:error={(e) => console.error(e.detail.error)}
/>

<!-- Using with direct client-side API -->
<B2ImageViewer 
  fileName={imageFileName}
  autoLoad={true}
  useApiEndpoint={false}
/>
```

### API Functions

You can also use the B2 API functions directly:

```javascript
import { 
  uploadToB2, 
  getB2FileUrl, 
  checkB2FileExists 
} from 'b2-image-tools/api';

// Upload a file
const uploadFile = async (file) => {
  try {
    const result = await uploadToB2(file);
    console.log(`File uploaded: ${result.fileName}`);
    console.log(`File URL: ${result.fileUrl}`);
    return result;
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Get a file URL
const getFileUrl = async (fileName) => {
  try {
    const url = await getB2FileUrl(fileName);
    return url;
  } catch (error) {
    console.error('Failed to get URL:', error);
  }
};

// Check if a file exists
const checkFileExists = async (fileName) => {
  try {
    const exists = await checkB2FileExists(fileName);
    return exists;
  } catch (error) {
    console.error('Failed to check file:', error);
    return false;
  }
};
```

## Component Props

### B2ImageUploader

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxSizeMB` | number | 10 | Maximum file size in MB |
| `acceptedTypes` | string | "image/*" | Accepted file types |
| `showPreview` | boolean | true | Show image preview |
| `autoUpload` | boolean | false | Upload automatically after selection |
| `useApiEndpoint` | boolean | true | Use server-side API endpoint |
| `customApiUrl` | string | "" | Custom API endpoint URL |
| `buttonText` | string | "Upload to Backblaze B2" | Text for upload button |
| `dropzoneText` | string | "Select an image" | Text for dropzone |

### B2ImageViewer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileName` | string | "" | Name of the file to view |
| `autoLoad` | boolean | false | Load image automatically |
| `showFileName` | boolean | true | Show file name |
| `width` | string | "100%" | Image width |
| `height` | string | "auto" | Image height |
| `useApiEndpoint` | boolean | true | Use server-side API endpoint |
| `customApiUrl` | string | "" | Custom API endpoint URL |

## Events

### B2ImageUploader Events

| Event | Detail | Description |
|-------|--------|-------------|
| `select` | `{ file: File }` | File selected |
| `start` | `{ file: File }` | Upload started |
| `progress` | `{ file: File, progress: number }` | Upload progress |
| `success` | `{ fileName: string, fileUrl: string }` | Upload completed |
| `error` | `{ error: string, file: File \| null }` | Upload error |

### B2ImageViewer Events

| Event | Detail | Description |
|-------|--------|-------------|
| `load` | `{ fileName: string }` | Image loaded |
| `error` | `{ error: string, fileName: string }` | Image load error |

## License

MIT
