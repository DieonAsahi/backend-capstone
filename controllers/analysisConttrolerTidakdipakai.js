// import { createClient } from "@supabase/supabase-js";
// import { supabase } from "../config/supabase.js";
// import { getDateRange } from "../utils/dateFilter.js";

// import AnalisisTopik from "../data/AnalisisTopik.js";
// import Artikel from "../data/Artikel.js";

export const getTrenKomponenServis = async (req, res) => {
  try {
    const { data: riwayat, error: errorRiwayat } = await supabase
      .from("service_history")
      .select("component_id, detail, category, status")
      .eq("status", "Selesai");

    if (errorRiwayat) throw errorRiwayat;

    const { data: masterKomponen, error: errorMaster } = await supabase
      .from("master_components")
      .select("id,name");

    if (errorMaster) throw errorMaster;

    const componentMap = {};

    masterKomponen.forEach((item) => {
      componentMap[item.id] = item.name;
    });

    const daftarKomponen = [
      "oli",
      "busi",
      "rem",
      "ban",
      "aki",
      "mesin",
      "shockbreaker",
      "shock",
      "rantai",
      "lampu",
      "vbelt",
      "roller",
      "radiator",
      "filter",
      "cvt",
      "suspensi",
      "knalpot",
      "cakram",
      "tromol",
      "seher",
      "klep",
      "sekring",
      "karburator",
      "injeksi",
      "shock breaker",
    ];

    let hitungKomponen = {};
    daftarKomponen.forEach((k) => {
      hitungKomponen[k] = 0;
    });

    riwayat.forEach((item) => {
      if (item.component_id) {
        const nama = componentMap[item.component_id];
        if (nama) {
          const key = nama.toLowerCase();
          if (!hitungKomponen[key]) {
            hitungKomponen[key] = 0;
          }
          hitungKomponen[key]++;
          return;
        }
      }

      if (item.detail) {
        const detail = item.detail.toLowerCase();
        daftarKomponen.forEach((komponen) => {
          if (detail.includes(komponen)) {
            hitungKomponen[komponen]++;
          }
        });
      }
    });

    console.log("Riwayat:", riwayat);
    console.log("Jumlah:", riwayat.length);
    console.log("Master:", masterKomponen);
    const hasilAnalisis = Object.entries(hitungKomponen)
      .map(([nama, total]) => {
        let namaRapi = nama.toUpperCase();
        if (nama === "shock") namaRapi = "SHOCKBREAKER";
        if (nama === "filter") namaRapi = "FILTER UDARA";

        return {
          komponen: namaRapi,
          total_servis: total,
          persentase:
            riwayat.length > 0
              ? ((total / riwayat.length) * 100).toFixed(1) + "%"
              : "0%",
        };
      })
      .filter((item) => item.total_servis > 0)
      .sort((a, b) => b.total_servis - a.total_servis)
      .slice(0, 5);
    console.log("Riwayat:", riwayat);
    console.log("Jumlah:", riwayat.length);
    console.log("Master:", masterKomponen);
    res.status(200).json({
      status: "success",
      total_sampel_data: riwayat.length,
      data: hasilAnalisis,
    });
  } catch (error) {
    console.error("Error pada analisis komponen:", error.message);
    res.status(500).json({
      status: "error",
      message: "Gagal memproses analisis Big Data komponen.",
    });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { tahun, bulan, minggu } = req.query;
    const { start, end } = getDateRange(tahun, bulan, minggu);

    const semuaArtikel = await Artikel.find({
      tanggal: {
        $gte: start,
        $lte: end,
      },
    });

    // // Agregasi total frekuensi per kategori untuk Pie Chart
    // const agregasiKategori = await AnalisisTopik.aggregate([
    //   { $group: { _id: "$kategori", total: { $sum: "$frekuensi" } } },
    // ]);

    // Mengambil timestamp 'updatedAt' dari artikel terakhir yang masuk di MongoDB Atlas
    const artikelTerbaru = await Artikel.findOne({}).sort({ updatedAt: -1 });
    const lastUpdate = artikelTerbaru ? artikelTerbaru.updatedAt : new Date();

    res.status(200).json({
      status: "success",
      lastUpdate: lastUpdate,
      charts: {
        // barChartTopik: dataTopik.map((t) => ({
        //   kata: t.kataKunci,
        //   jumlah: t.frekuensi,
        //   kategori: t.kategori,
        // })),
        pieChartKategori: agregasiKategori.map((k) => ({
          kategori: k._id,
          jumlah: k.total,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
