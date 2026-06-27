// routes/edukasiRoutes.js
import express from 'express';
const router = express.Router();

// Import controller edukasi (Pastikan nama file sesuai dan gunakan akhiran .js)
import { getEdukasiArtikel } from '../controllers/eduController.js';

/**
 * Route Utama untuk Fitur Edukasi
 * Endpoint: GET /api/edukasi
 */
router.get('/edu', getEdukasiArtikel);

// Ekspor router menggunakan gaya ES Modules
export default router;