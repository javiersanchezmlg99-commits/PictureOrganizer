import { useState, useEffect } from 'react';
import { localFileUrl } from '../shared/utils';

interface ThumbnailImageProps {
  photoId: string;
  originalPath: string;
  alt: string;
  className?: string;
}

/**
 * Image component that loads cached thumbnail via IPC.
 * Falls back to original image path on error.
 */
export default function ThumbnailImage({ photoId, originalPath, alt, className }: ThumbnailImageProps) {
  const [src, setSrc] = useState<string>('');
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.electronAPI.getThumbnail(photoId, originalPath).then((thumbPath) => {
      if (!cancelled) {
        setSrc(localFileUrl(thumbPath));
      }
    });
    return () => { cancelled = true; };
  }, [photoId, originalPath]);

  if (!src || errored) {
    return <div className={`${className} bg-gray-700`} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
