export const getWebSocketUrl = () => {
  // In development, use the local network IP
  if (process.env.NODE_ENV === 'development') {
    // The WebSocket server will be available on all network interfaces
    return 'http://0.0.0.0:3001';
  }
  
  // In production, you might want to use a specific domain or environment variable
  return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
};
