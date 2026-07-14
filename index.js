import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import workshopRoutes from "./routes/workshopRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import diagnoseRoutes from "./routes/diagnoseRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import edukasiRoutes from "./routes/eduRoutes.js";

dotenv.config();

import connectDB from "./config/mongodb.js";
import { jalankanPipelineData } from "./data/rssScheduler.js";

const app = express();

connectDB().then(() => {
  console.log("Menjalankan penarikan data awal");
  jalankanPipelineData();
});

// ================= SECURITY =================
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

// ================= BODY PARSER =================
app.use(express.json({ limit: "10kb" }));

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("API jalan motocare");
});

// ================= ROUTES =================
app.use("/api/auth", authRoutes);

app.use("/api/vehicle", vehicleRoutes);

app.use("/api", ocrRoutes);

app.use("/api/workshop", workshopRoutes);

app.use("/api/edukasi", edukasiRoutes);

app.use("/api/kerusakan", diagnoseRoutes);

app.use("/api/analisis", analysisRoutes);

// ================= PORT =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});
