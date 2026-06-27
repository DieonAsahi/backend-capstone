import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

import {
  register,
  verifyOtp,
  checkEmail,
  resendOtp,
  login,
  googleSync,
  updatePassword,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);

router.post("/verify-otp", verifyOtp);

router.post("/check-email", checkEmail);

router.post("/resend-otp", resendOtp);

router.post("/login", login);

router.post("/google-sync", authMiddleware, googleSync);

router.post("/update-password", updatePassword);

router.get("/profile", authMiddleware, getProfile);

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("image"),
  updateProfile,
);

export default router;
