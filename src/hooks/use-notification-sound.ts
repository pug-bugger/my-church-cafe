import { useCallback } from 'react';

export const useNotificationSound = () => {
  const playSound = useCallback(() => {
    const audio = new Audio('/sounds/orderNotific.mp3');
    audio.play().catch((error) => {
      console.error("Playback failed. User may need to interact with the site first:", error);
    });
  }, []);

  return { playSound };
};