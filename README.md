# Svelte B2 Uploader

A Svelte library for uploading images to Backblaze B2 storage.

## Features

- Easy-to-use Svelte component for file uploads to Backblaze B2
- Progress tracking
- Drag and drop support
- Image preview
- Customizable styling
- TypeScript support
- Comprehensive error handling

## Installation

```bash
npm install svelte-b2-uploader
```

## Usage

### Basic Usage

```svelte
<script>
  import { B2Uploader } from 'svelte-b2-uploader';
  
  // Configure Backblaze B2 credentials
  const b2Config = {
    applicationKey: 'YOUR_B2_APPLICATION_KEY',
    applicationId: 'YOUR_B2_APPLICATION_ID',
    bucketName: 'YOUR_B2_BUCKET_NAME'
  };
</script>

<B2Uploader config={b2Config} />
```

### With Custom Options

```svelte
<script>
  import { B2Uploader } from 'svelte-b2-uploader';
  
  const b2Config = {
    applicationKey: 'YOUR_B2_APPLICATION_KEY',
    applicationId: 'YOUR_B2_APPLICATION_ID',
    bucketName: 'YOUR_B2_BUCKET_NAME'
  };
</script>

<B2Uploader 
  config={b2Config}
  buttonText="Upload to B2"
  allowedFileTypes="image/*"
  maxFileSize={5 * 1024 * 1024} // 5MB
  showPreview={true}
  customClass="my-uploader"
  buttonClass="my-button"
  previewClass="my-preview"
/>
```

### Handling Events

```svelte
<script>
  import { B2Uploader } from 'svelte-b2-uploader';
  import type { UploadResult } from 'svelte-b2-uploader';
  
  const b2Config = {
    applicationKey: 'YOUR_B2_APPLICATION_KEY',
    applicationId: 'YOUR_B2_APPLICATION_ID',
    bucketName: 'YOUR_B2_BUCKET_NAME'
  };
  
  function handleUploadComplete(result) {
    if (result.success) {
      console.log('Upload successful!');
      console.log('File URL:', result.fileUrl);
    }
  }
</script>

<B2Uploader 
  config={b2Config}
  let:uploadCompleteEvent
  let:uploadProgressEvent
/>

<script>
  // Subscribe to events
  uploadCompleteEvent.subscribe(handleUploadComplete);
  uploadProgressEvent.subscribe(({progress}) => {
    console.log(`Upload progress: ${progress}%`);
  });
</script>
```

### Using the B2 Client Directly

If you need more control, you can use the B2 client directly:

```svelte
<script>
  import { createB2Client } from 'svelte-b2-uploader';
  
  const b2Config = {
    applicationKey: 'YOUR_B2_APPLICATION_KEY',
    applicationId: 'YOUR_B2_APPLICATION_ID',
    bucketName: 'YOUR_B2_BUCKET_NAME'
  };
  
  // Create the client
  const b2Client = createB2Client(b2Config);
  
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Upload with progress tracking
    const result = await b2Client.uploadFileWithProgress(
      file,
      (progress) => {
        console.log(`Progress: ${progress}%`);
      }
    );
    
    if (result.success) {
      console.log('Upload successful!');
      console.log('File URL:', result.fileUrl);
    } else {
      console.error('Upload failed:', result.error);
    }
  }
</script>

<input type="file" on:change={handleFileUpload} />
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `B2Config` | Required | B2 configuration (applicationKey, applicationId, bucketName) |
| `buttonText` | `string` | 'Upload to B2' | Text for the upload button |
| `allowedFileTypes` | `string` | 'image/*' | MIME types to accept (e.g., 'image/*', 'image/png') |
| `maxFileSize` | `number` | 10 * 1024 * 1024 (10MB) | Maximum file size in bytes |
| `showPreview` | `boolean` | true | Whether to show image preview |
| `customClass` | `string` | '' | Custom CSS class for the component |
| `buttonClass` | `string` | '' | Custom CSS class for the button |
| `previewClass` | `string` | '' | Custom CSS class for the preview |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `uploadStartEvent` | none | Fired when upload starts |
| `uploadProgressEvent` | `{ progress: number }` | Fired during upload progress |
| `uploadCompleteEvent` | `UploadResult` | Fired when upload completes |
| `uploadErrorEvent` | `{ error: string }` | Fired when an error occurs |
| `fileSelectedEvent` | `{ file: File }` | Fired when a file is selected |

## License

MIT
