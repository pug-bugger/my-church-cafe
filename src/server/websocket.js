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
const HOST = "0.0.0.0"; // Listen on all network interfaces

httpServer.listen(PORT, HOST, () => {
  console.log(`WebSocket server running on ${HOST}:${PORT}`);

  // Get local IP addresses
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  console.log("Available on network addresses:");
  for (const [name, addresses] of Object.entries(results)) {
    console.log(`  ${name}: ${addresses.join(", ")}`);
  }
});
