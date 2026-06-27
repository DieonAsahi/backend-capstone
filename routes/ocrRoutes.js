import express from "express";

import { upload } from "../middlewares/uploadMiddleware.js";

import { scanOcr } from "../controllers/ocrController.js";

const router = express.Router();

router.post("/ocr", upload.single("image"), scanOcr);

export default router;