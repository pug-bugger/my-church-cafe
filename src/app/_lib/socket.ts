import { io, type Socket } from "socket.io-client";

export function createSocket(token: string): Socket {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  return io(url, {
    path: "/socket.io",
    transports: ["websocket"],
    auth: { token },
  });
}

