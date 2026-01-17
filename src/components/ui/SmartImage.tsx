import React from 'react';
import { cacheExternalImage, FALLBACK_IMAGE, getCachedImageUrl, getProxyImageUrl, isBlockedExternalImage } from '@/lib/imageCache';

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  petId?: string;
  fallbackSrc?: string;
};

const SmartImage: React.FC<SmartImageProps> = ({
  src,
  petId,
  fallbackSrc = FALLBACK_IMAGE,
  onError,
  crossOrigin,
  referrerPolicy,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = React.useState<string>(src || fallbackSrc);
  const [cacheAttempted, setCacheAttempted] = React.useState(false);
  const isBlocked = isBlockedExternalImage(src);
  const proxyUrl = isBlocked ? getProxyImageUrl(src) : null;

  React.useEffect(() => {
    setCacheAttempted(false);

    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    if (isBlocked) {
      const cached = getCachedImageUrl(src);
      if (cached) {
        setCurrentSrc(cached);
        return;
      }

      // Use server proxy first to avoid hotlink blocks.
      if (proxyUrl) {
        setCurrentSrc(proxyUrl);
      } else {
        setCurrentSrc(fallbackSrc);
      }
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

    if (isBlocked && !cacheAttempted) {
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

  const resolvedReferrerPolicy = isBlocked ? (referrerPolicy || 'no-referrer') : referrerPolicy;
  const resolvedCrossOrigin = isBlocked ? (crossOrigin || 'anonymous') : crossOrigin;

  return (
    <img
      {...props}
      src={currentSrc}
      onError={handleError}
      referrerPolicy={resolvedReferrerPolicy}
      crossOrigin={resolvedCrossOrigin}
    />
  );
};

export default SmartImage;
