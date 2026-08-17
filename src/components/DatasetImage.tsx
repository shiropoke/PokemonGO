import { useEffect, useState } from 'react';

interface DatasetImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function DatasetImage({ src, alt, className }: DatasetImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span className={`dataset-image dataset-image--placeholder ${className ?? ''}`} aria-hidden="true">
        画像なし
      </span>
    );
  }

  return (
    <img
      className={`dataset-image ${className ?? ''}`}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
