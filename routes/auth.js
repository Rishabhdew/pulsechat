const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/* ===========================
   SIGNUP
=========================== */
router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // check if user exists
    const existing = await User.findOne({ username });

    if (existing) {
      return res.json({ error: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // save user
    await User.create({
      username,
      password: hashedPassword
    });

    res.json({ message: "Signup success" });

  } catch (err) {
    console.error(err);
    res.json({ error: "Signup failed" });
  }
});


/* ===========================
   LOGIN
=========================== */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        error: "User not found. Please signup first."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Wrong password"
      });
    }

    const token = jwt.sign(
      { username: user.username },
      "secret123",
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login success",
      token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Login failed"
    });
  }
});
module.exports = router;
