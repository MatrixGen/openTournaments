// components/common/OptimizedImage.jsx
import { useState, useEffect } from 'react';

const OptimizedImage = ({ src, alt, fallbackSrc, ...props }) => {
  const [imageSrc, setImageSrc] = useState(fallbackSrc || '/placeholder.jpg');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
      setIsLoading(false);
    };
  }, [src, fallbackSrc]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-neutral-700 animate-pulse rounded" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        {...props}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${props.className || ''}`}
      />
    </div>
  );
};

export default OptimizedImage;