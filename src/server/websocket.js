const { Server } = require("socket.io");
const { createServer } = require("http");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("updateOrderStatus", (data) => {
    // Broadcast the status update to all connected clients
    io.emit("orderStatusUpdated", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
