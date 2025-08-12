import express from "express";
import { login, logout,forgotPassword, resetPassword  } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import pool from "../db.js";
const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/user", authenticate, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const [rows] = await pool.query(
      "SELECT id, email, name, role FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(rows[0]); // sends { id, email, name, role }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/protected", authenticate, (req, res) => {
  res.json({ message: "You are authenticated", user: req.user });
});


export default router;
