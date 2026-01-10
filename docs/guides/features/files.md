# File Uploads

Upload and share files, images, and videos in your chat with progress tracking and previews.

## Quick Start

```typescript
// Upload file
const file = await sdk.uploadFile({
  file: selectedFile,
  channelId: 'ch-abc123',
  onProgress: (percent) => console.log(`Upload: ${percent}%`),
});

// Send as message
await sdk.sendMessage({
  channelId: 'ch-abc123',
  text: 'Check this out!',
  attachments: [file],
});
```

## Upload Methods

### 1. From File Input (Web)

```typescript
<input type="file" onChange={async (e) => {
  const file = e.target.files[0];
  
  await sdk.uploadFile({
    file,
    channelId: 'ch-abc123',
    onProgress: (percent) => {
      setProgress(percent);
    },
  });
}} />
```

### 2. Drag and Drop

```typescript
<div onDrop={async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  
  await sdk.uploadFile({ file, channelId: 'ch-abc123' });
}}>
  Drop files here
</div>
```

### 3. From Camera (React Native)

```typescript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  quality: 0.8,
});

if (!result.canceled) {
  await sdk.uploadFile({
    uri: result.assets[0].uri,
    channelId: 'ch-abc123',
  });
}
```

## File Types

### Images

```typescript
await sdk.uploadFile({
  file: imageFile,
  channelId: 'ch-abc123',
  thumbnail: true, // Auto-generate thumbnail
});
```

### Videos

```typescript
await sdk.uploadFile({
  file: videoFile,
  channelId: 'ch-abc123',
  transcode: true, // Transcode to web-friendly format
});
```

### Documents

```typescript
await sdk.uploadFile({
  file: pdfFile,
  channelId: 'ch-abc123',
  preview: true, // Generate PDF preview
});
```

## Upload Options

```typescript
await sdk.uploadFile({
  file: file,
  channelId: 'ch-abc123',
  
  // Options
  maxSize: 10 * 1024 * 1024, // 10MB max
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  compress: true, // Auto-compress images
  
  // Callbacks
  onProgress: (percent) => console.log(percent),
  onComplete: (file) => console.log('Done!', file),
  onError: (error) => console.error('Failed', error),
});
```

## Image Gallery

```typescript
import { useFiles } from '@chatsdk/react';

function ImageGallery({ channelId }) {
  const { files } = useFiles({ channelId, type: 'image' });
  
  return (
    <div className="gallery">
      {files.map((file) => (
        <img
          key={file.id}
          src={file.thumbnailUrl}
          alt={file.name}
          onClick={() => openLightbox(file)}
        />
      ))}
    </div>
  );
}
```

## Next Steps

- **[Messages →](./messages.md)** - Rich text formatting
- **[Threads →](./threads.md)** - Organize conversations
