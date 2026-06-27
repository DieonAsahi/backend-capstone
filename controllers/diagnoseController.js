import { supabase } from "../config/supabase.js";

import {
  DATA_GEJALA,
  DATA_KERUSAKAN,
  RULE_BASE,
} from "../data/diagnoseData.js";

export const diagnoseMotor = async (req, res) => {
  const { gejalaUser } = req.body;

  if (!gejalaUser || !Array.isArray(gejalaUser) || gejalaUser.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Silakan pilih minimal satu gejala terlebih dahulu.",
    });
  }

  let matchedRule = null;

  for (const rule of RULE_BASE) {
    const isMatched = rule.gejala.every((g) => gejalaUser.includes(g));

    if (isMatched) {
      matchedRule = rule;
      break;
    }
  }

  if (matchedRule) {
    const detail = DATA_KERUSAKAN[matchedRule.kerusakan];

    return res.json({
      success: true,
      data: {
        id_kerusakan: matchedRule.kerusakan,
        nama: detail.nama,
        penjelasan: detail.penjelasan,
        solusi: detail.solusi,
        confidence: matchedRule.confidence,
      },
    });
  }

  return res.json({
    success: true,
    data: {
      id_kerusakan: "UNKNOWN",
      nama: "Kerusakan Belum Terdeteksi",
      penjelasan:
        "Gejala yang Anda pilih belum memenuhi pola kombinasi data kerusakan motor yang kami miliki.",
      solusi:
        "Disarankan untuk melakukan pemeriksaan fisik menyeluruh di bengkel terdekat.",
      confidence: 0,
    },
  });
};

export const getEstimasi = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("product_estimations")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};