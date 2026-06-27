import express from "express";

import {
  getWorkshop,
  getNearestWorkshop,
  getWorkshopDetail,
} from "../controllers/workshopController.js";

const router = express.Router();

router.get("/peta", getWorkshop);

router.get("/nearest", getNearestWorkshop);

router.get("/petaDetail/:id", getWorkshopDetail);

export default router;
