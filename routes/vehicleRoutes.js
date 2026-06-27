import express from "express";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../middlewares/uploadMiddleware.js";

import {
  addVehicle,
  vehicleHealth,
  uploadVehicleImage,
  getMyVehicle,
  getMyVehicles,
  deleteVehicle,
  updateOdometer,
  getPerformanceHistory,
  getService,
  createServiceHistory,
  getServiceHistory,
  updateServiceHistory,
  deleteServiceHistory,
  getVehicleOdometer,
  getMasterComponents,
  getNotifications,
} from "../controllers/vehicleController.js";

const router = express.Router();

router.post(
  "/upload-vehicle-image",
  authMiddleware,
  upload.single("image"),
  uploadVehicleImage,
);

router.post("/add-vehicle", authMiddleware, addVehicle);

router.get("/vehicle-health/:vehicleId", authMiddleware, vehicleHealth);

router.get("/my-vehicle", authMiddleware, getMyVehicle);

router.get("/my-vehicles", authMiddleware, getMyVehicles);

router.delete("/delete-vehicle/:vehicleId", authMiddleware, deleteVehicle);

router.put("/update-odometer", authMiddleware, updateOdometer);

router.get(
  "/performance-history/:vehicleId",
  authMiddleware,
  getPerformanceHistory,
);

router.get("/service/:vehicleId", authMiddleware, getService);

router.get("/vehicle-odometer/:vehicleId", authMiddleware, getVehicleOdometer);

router.get("/master-components", authMiddleware, getMasterComponents);

router.post("/service-history", authMiddleware, createServiceHistory);

router.get("/service-history/:vehicleId", authMiddleware, getServiceHistory);

router.put("/service-history/:id", authMiddleware, updateServiceHistory);

router.delete("/service-history/:id", authMiddleware, deleteServiceHistory);

router.get("/notifications/:vehicleId", authMiddleware, getNotifications);

export default router;
