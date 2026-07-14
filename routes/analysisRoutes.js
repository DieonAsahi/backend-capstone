import express from "express";
import {
  getTrenKomponenServis,
  getDashboardData,
  getKomponenFilter,
  getArtikelFilter,
  getTrenServis,
  getTrendTopikArtikel,
} from "../controllers/analysisController.js";

const router = express.Router();

router.get("/tren-komponen", getTrenKomponenServis);

router.get("/komponen-filter", getKomponenFilter);

router.get("/tren-servis", getTrenServis);

router.get("/artikel", getDashboardData);

router.get("/artikel-filter", getArtikelFilter);

router.get("/artikel-trend", getTrendTopikArtikel);

export default router;
