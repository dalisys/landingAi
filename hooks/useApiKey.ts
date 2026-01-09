import { useEffect, useState } from 'react';

export const useApiKey = () => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const apiKey =
      import.meta.env?.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.API_KEY : undefined);
    setHasApiKey(!!apiKey);
  }, []);

  return { hasApiKey };
};
