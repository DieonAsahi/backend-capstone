import express from "express";
import { diagnoseMotor, getEstimasi } from "../controllers/diagnoseController.js";

const router = express.Router();

router.post("/diagnose", diagnoseMotor);

router.get("/estimasi", getEstimasi);

export default router;