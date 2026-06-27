import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import workshopRoutes from "./routes/workshopRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import eduRoutes from "./routes/eduRoutes.js";
import diagnoseRoutes from "./routes/diagnoseRoutes.js";

dotenv.config();

const app = express();

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

app.use("/api/edukasi", eduRoutes);

app.use("/api/kerusakan", diagnoseRoutes);

// ================= PORT =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`);
});