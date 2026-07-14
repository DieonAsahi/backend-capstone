import express from 'express';
const router = express.Router();

import { getEdukasiArtikel } from '../controllers/eduController.js';

router.get('/edu', getEdukasiArtikel);

export default router;