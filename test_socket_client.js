/* eslint-disable */
const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  timeout: 5000,
  reconnection: false,
});

socket.on("connect", () => {
  console.log("SUCCESS: Connected to socket server on port 3001");
  socket.disconnect();
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("FAILURE: Could not connect to socket server:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("FAILURE: Connection timeout");
  process.exit(1);
}, 6000);
