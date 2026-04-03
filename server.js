const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ================= DB CONNECT ================= */
mongoose.connect("mongodb://127.0.0.1:27017/chat-app")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

/* ================= MODELS ================= */
const User = require("./models/User");
const Message = require("./models/Message");

/* ================= USERS SOCKET MAP ================= */
const users = {};

/* ================= SOCKET ================= */
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // USER JOIN
  socket.on("join", (username) => {
    users[username] = socket.id;

    console.log("Users:", users);

    io.emit("users", Object.keys(users));
  });

  // PRIVATE MESSAGE
  socket.on("private_message", async (data) => {
    const { sender, receiver, text } = data;

    console.log("Message:", data);

    try {
      // Save to DB
      await Message.create({
        sender,
        receiver,
        text
      });

      // Send to receiver
      const receiverSocket = users[receiver];

      if (receiverSocket) {
        io.to(receiverSocket).emit("private_message", data);
      }

      // Send back to sender
      socket.emit("private_message", data);

    } catch (err) {
      console.log("Message error:", err);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        delete users[user];
      }
    }

    io.emit("users", Object.keys(users));
  });

});

/* ================= AUTH ROUTES ================= */

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await User.findOne({ username });

    if (existing) {
      return res.json({ error: "User already exists" });
    }

    await User.create({ username, password });

    res.json({ message: "Signup success" });

  } catch (err) {
    res.json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({ error: "User not found. Signup first." });
    }

    if (user.password !== password) {
      return res.json({ error: "Wrong password" });
    }

    res.json({ message: "Login success" });

  } catch (err) {
    res.json({ error: "Login failed" });
  }
});

/* ================= CHAT HISTORY ================= */

app.get("/api/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);

  } catch (err) {
    res.json([]);
  }
});

/* ================= START SERVER ================= */

const PORT = 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
