const natural = require("natural");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

/* ================= MIDDLEWARE =================== */

app.use(cors());
app.use(express.json());


app.get("/api/all-users", async (req, res) => {

  try {

    const users =
      await User.find({}, "username");

    res.json(users);

  } catch (err) {

    console.log(err);

    res.status(500).json([]);

  }

});
app.use(express.static("public"));
app.use("/uploads",
  express.static("uploads")
);
/* ================= DB CONNECT ================= */

mongoose.connect("mongodb://127.0.0.1:27017/chat-app", {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("Mongo error:", err));

/* ================= MODELS ================= */

const User = require("./models/User");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const ChatRequest =
  require("./models/ChatRequest");
/* ================= MULTER ================= */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/");

  },

  filename: (req, file, cb) => {

    cb(
      null,
      Date.now() +
      "-" +
      file.originalname
    );

  }

});

const upload = multer({
  storage
});
/* ================= ONLINE USERS ================= */

const users = {};

/* ================= SOCKET.IO ================= */

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  /* ========= USER ONLINE ========= */

  socket.on("join", (username) => {

    users[username] = socket.id;

    console.log("Online users:", users);

    io.emit("users", Object.keys(users));

  });

  /* ========= JOIN CHAT ROOM ========= */

  socket.on("join_conversation", (conversationId) => {

    socket.join(conversationId);

    console.log("Joined conversation:", conversationId);

  });

  /* ========= SEND MESSAGE ========= */

  socket.on("send_message", async (data) => {

    try {

      const {
        sender,
        conversationId,
        content
      } = data;

      console.log("Message:", data);

     const message = await Message.create({

  sender,

  conversationId,

  content

});
      await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: content,
          updatedAt: new Date()
        }
      );
      message.conversation = conversationId;
      io.to(conversationId).emit(
        "receive_message",
        message
      );

    } catch (err) {

      console.log("Send message error:", err);

    }

  });

  /* ========= DISCONNECT ========= */

  socket.on("disconnect", () => {

    for (let user in users) {

      if (users[user] === socket.id) {

        delete users[user];

      }

    }

    io.emit("users", Object.keys(users));

    console.log("User disconnected:", socket.id);

  });

});

/* ================= AUTH ROUTES ================= */

/* ========= SIGNUP ========= */

app.post("/api/auth/signup", async (req, res) => {

  try {

    const { username, password } = req.body;

    if (!username || !password) {

      return res.json({
        error: "Username and password required"
      });

    }

    const existing = await User.findOne({ username });

    if (existing) {

      return res.json({
        error: "User already exists"
      });

    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({

      username,
      password: hashedPassword

    });

    res.json({

      message: "Signup success",
      user

    });

  } catch (err) {

    console.log("Signup error:", err);

    res.json({
      error: "Signup failed"
    });

  }

});

/* ========= LOGIN ========= */

app.post("/api/auth/login", async (req, res) => {

  try {

    const { username, password } = req.body;

    if (!username || !password) {

      return res.json({
        error: "Username and password required"
      });

    }

    const user = await User.findOne({ username });

    if (!user) {

      return res.json({
        error: "User not found"
      });

    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {

      return res.json({
        error: "Wrong password"
      });

    }

    res.json({

      message: "Login success",
      user

    });

  } catch (err) {

    console.log("Login error:", err);

    res.json({
      error: "Login failed"
    });

  }

});

/* ================= CONVERSATIONS ================= */

/* ========= CREATE PRIVATE CHAT =========== */

app.post("/api/conversation/private", async (req, res) => {

  try {

    const { user1, user2 } = req.body;

    let conversation = await Conversation.findOne({

      type: "private",

      participants: {
        $all: [user1, user2]
      }

    });

    if (!conversation) {

      conversation = await Conversation.create({

        type: "private",

        participants: [user1, user2]

      });

    }

    res.json(conversation);

  } catch (err) {

    console.log("Private conversation error:", err);

    res.json({
      error: "Conversation failed"
    });

  }

});

/* ========= GET USER CONVERSATIONS ========= */

app.get("/api/conversations/:username", async (req, res) => {

  try {

    const user = await User.findOne({
      username: req.params.username
    });

    if (!user) {

      return res.json([]);

    }

    const conversations = await Conversation.find({

      participants: user._id

    })
    .populate("participants", "username")
    .sort({ updatedAt: -1 });

    res.json(conversations);

  } catch (err) {

    console.log("Fetch conversations error:", err);

    res.json([]);

  }

});

/* ========= CREATE GROUP ========= */
app.post("/api/group/create", async (req, res) => {

  try {

    const {
      groupName,
      creator,
      members
    } = req.body;

    // REMOVE DUPLICATES
    const uniqueMembers =
      [...new Set([
        creator,
        ...members
      ])];

    const conversation =
      await Conversation.create({

        type: "group",

        groupName,

        participants:
          uniqueMembers

      });

    const populatedConversation =
      await Conversation.findById(
        conversation._id
      )
      .populate(
        "participants",
        "username"
      );

    // EMIT TO ONLINE USERS
    populatedConversation
      .participants
      .forEach(user => {

        if (users[user.username]) {

          io.to(
            users[user.username]
          ).emit(
            "group_created",
            populatedConversation
          );

        }

      });

    res.json(
      populatedConversation
    );

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error:
        "Group creation failed"
    });

  }

});

/* ================= MESSAGE HISTORY ================= */

app.get("/api/messages/:conversationId", async (req, res) => {

  try {

    const messages = await Message.find({

      conversationId: req.params.conversationId

    })
    .populate("sender", "username")
    .sort({ createdAt: 1 });

    res.json(messages);

  } catch (err) {

    console.log("Fetch messages error:", err);

    res.json([]);

  }

});
/* ================= CHAT SUMMARY ================= */

app.get("/api/summary/:conversationId", async (req, res) => {
  try {

    const messages = await Message.find({
      conversation: req.params.conversationId
    }).sort({
      createdAt: 1
    });

    if (!messages.length) {
      return res.json({
        summary: "No messages yet"
      });
    }

    const text = messages
      .map(m => m.text || m.content || "")
      .join(". ");

    const sentences = text.split(".");

    const tfidf = new natural.TfIdf();

    sentences.forEach(s => {
      tfidf.addDocument(s);
    });

    let scored = sentences.map((s, i) => {

      let score = 0;

      tfidf.listTerms(i).forEach(term => {
        score += term.tfidf;
      });

      return {
        sentence: s,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const summary = scored
      .slice(0, 3)
      .map(s => s.sentence)
      .join(". ");

    res.json({
      summary
    });

  } catch (err) {

    console.log(err);

    res.json({
      summary: "Summary failed"
    });

  }
});
/* ================= AUDIO UPLOAD ================= */

app.post(
  "/api/upload/audio",

  upload.single("audio"),

  async (req, res) => {

    try {

      const {
        sender,
        conversationId
      } = req.body;

      const message =
  await Message.create({

    sender,

    conversationId,

    messageType: "audio",

    mediaUrl:
      "/uploads/" +
      req.file.filename

  });

// POPULATE SENDER USERNAME
const populatedMessage =
  await Message.findById(
    message._id
  ).populate(
    "sender",
    "username"
  );

// EMIT TO ALL USERS
io.to(conversationId)
  .emit(
    "receive_message",
    populatedMessage
  );
      res.json(message);

    } catch (err) {

      console.log(
        "Audio upload error:",
        err
      );

      res.json({
        error:
          "Audio upload failed"
      });

    }

  }
);

/* ================= IMAGE UPLOAD ================= */

app.post(
  "/api/upload/image",

  upload.single("image"),

  async (req, res) => {

    try {

      const {
        sender,
        conversationId
      } = req.body;

      const message =
  await Message.create({

    sender,

    conversationId,

    messageType: "audio",

    mediaUrl:
      "/uploads/" +
      req.file.filename

  });

// POPULATE SENDER USERNAME
const populatedMessage =
  await Message.findById(
    message._id
  ).populate(
    "sender",
    "username"
  );

// EMIT TO ALL USERS
io.to(conversationId)
  .emit(
    "receive_message",
    populatedMessage
  );
      res.json(message);

    } catch (err) {

      console.log(
        "Image upload error:",
        err
      );

      res.json({
        error:
          "Image upload failed"
      });

    }

  }
);
/* ================= SEND REQUEST ================= */

app.post(
  "/api/request/send",

  async (req, res) => {

    try {

      const {
        sender,
        receiver
      } = req.body;

      // CHECK EXISTING REQUEST
      const existing =
        await ChatRequest.findOne({

          sender,
          receiver,

          status: "pending"

        });

      if (existing) {

        return res.json({
          error: "Request already sent"
        });

      }

      // CREATE REQUEST
      const request =
        await ChatRequest.create({

          sender,
          receiver,

          status: "pending"

        });

      res.json(request);

    } catch (err) {

      console.log(err);

      res.json({
        error: "Request failed"
      });

    }

  }
);


/* ================= GET REQUESTS ================= */

app.get(
  "/api/request/:userId",

  async (req, res) => {

    try {

      const requests =
        await ChatRequest.find({

          receiver:
            req.params.userId,

          status: "pending"

        })
        .populate(
          "sender",
          "username"
        );

      res.json(requests);

    } catch (err) {

      console.log(err);

      res.json([]);

    }

  }
);


/* ================= ACCEPT REQUEST ================= */

app.post(
  "/api/request/accept/:id",

  async (req, res) => {

    try {

      const requestId =
        req.params.id;

      const request =
        await ChatRequest.findById(
          requestId
        );

      if (!request) {

        return res.status(404).json({
          error: "Request not found"
        });

      }

      // UPDATE STATUS
      request.status =
        "accepted";

      await request.save();

      // CHECK IF CONVERSATION ALREADY EXISTS
      let conversation =
        await Conversation.findOne({

          type: "private",

          participants: {
            $all: [
              request.sender,
              request.receiver
            ]
          }

        });

      // CREATE NEW CONVERSATION
      if (!conversation) {

        conversation =
          await Conversation.create({

            type: "private",

            participants: [
              request.sender,
              request.receiver
            ]

          });

      }

      // POPULATE USERS
      const populatedConversation =
        await Conversation.findById(
          conversation._id
        )
        .populate(
          "participants",
          "username"
        );

      // REALTIME UPDATE
      const senderUser =
        await User.findById(
          request.sender
        );

      const receiverUser =
        await User.findById(
          request.receiver
        );

      if (
        users[senderUser.username]
      ) {

        io.to(
          users[senderUser.username]
        ).emit(
          "conversation_accepted",
          populatedConversation
        );

      }

      if (
        users[receiverUser.username]
      ) {

        io.to(
          users[receiverUser.username]
        ).emit(
          "conversation_accepted",
          populatedConversation
        );

      }

      res.json({
        success: true,
        conversation:
          populatedConversation
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Accept failed"
      });

    }

  }
);
/* ================= SERVER ================= */

const PORT = 3000;

server.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});
