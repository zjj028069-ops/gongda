import { useEffect, useState } from 'react';

/** ≤768 启用微信式四栏壳；≥769 保持 PC Shell */
export function useIsNarrow(maxWidth = 768) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);
  return narrow;
}
