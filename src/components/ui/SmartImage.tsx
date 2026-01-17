import React from 'react';
import { cacheExternalImage, FALLBACK_IMAGE, getCachedImageUrl, isBlockedExternalImage } from '@/lib/imageCache';

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  petId?: string;
  fallbackSrc?: string;
};

const SmartImage: React.FC<SmartImageProps> = ({
  src,
  petId,
  fallbackSrc = FALLBACK_IMAGE,
  onError,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = React.useState<string>(src || fallbackSrc);
  const [cacheAttempted, setCacheAttempted] = React.useState(false);

  React.useEffect(() => {
    setCacheAttempted(false);

    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    if (isBlockedExternalImage(src)) {
      const cached = getCachedImageUrl(src);
      if (cached) {
        setCurrentSrc(cached);
        return;
      }

      setCurrentSrc(fallbackSrc);
      cacheExternalImage(src, petId).then((cachedUrl) => {
        if (cachedUrl) setCurrentSrc(cachedUrl);
      });
      return;
    }

    setCurrentSrc(src);
  }, [src, fallbackSrc, petId]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (onError) onError(event);

    if (!src) return;

    if (isBlockedExternalImage(src) && !cacheAttempted) {
      setCacheAttempted(true);
      cacheExternalImage(src, petId).then((cachedUrl) => {
        if (cachedUrl) setCurrentSrc(cachedUrl);
      });
      return;
    }

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };

  return <img {...props} src={currentSrc} onError={handleError} />;
};

export default SmartImage;
