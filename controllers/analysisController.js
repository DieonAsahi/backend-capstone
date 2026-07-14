import { createClient } from "@supabase/supabase-js";
import { supabase } from "../config/supabase.js";
import { getDateRange } from "../utils/dateFilter.js";

import { getArtikelByRange, getArtikelTerbaru } from "../data/artikel.js";
import { analisisTopikArtikel } from "../data/analisisTopik.js";

export const getTrenKomponenServis = async (req, res) => {
  try {
    const { tahun, bulan, minggu } = req.query;

    let query = supabase
      .from("service_history")
      .select("component_id, detail, category, status, service_date")
      .eq("status", "Selesai");

    if (tahun && bulan) {
      const { start, end } = getDateRange(tahun, bulan, minggu);

      query = query.gte("service_date", start.toISOString());
      query = query.lte("service_date", end.toISOString());
    } else if (tahun) {
      query = query.gte("service_date", `${tahun}-01-01`);
      query = query.lte("service_date", `${tahun}-12-31`);
    }

    const { data: riwayat, error: errorRiwayat } = await query;

    console.log("==== HASIL QUERY RIWAYAT ====");
    console.log(riwayat);
    console.log(errorRiwayat);
    console.log("=============================");

    const lastUpdate =
      riwayat.length > 0
        ? riwayat.map((e) => new Date(e.service_date)).sort((a, b) => b - a)[0]
        : new Date();

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
    console.log("========== TREN KOMPONEN ==========");
    console.log("Tahun :", tahun);
    console.log("Bulan :", bulan);
    console.log("Minggu:", minggu);

    console.log("Last Update:", lastUpdate);
    console.log("Jumlah Riwayat:", riwayat.length);

    console.log("Hasil Analisis:");
    console.table(hasilAnalisis);

    console.log("Response JSON:");
    console.log({
      status: "success",
      total_sampel_data: riwayat.length,
      lastUpdate,
      data: hasilAnalisis,
    });

    console.log("===================================");
    res.status(200).json({
      status: "success",
      total_sampel_data: riwayat.length,
      lastUpdate,
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

export const getKomponenFilter = async (req, res) => {
  try {
    const { tahun, bulan } = req.query;

    // ambil semua tanggal service
    const { data, error } = await supabase
      .from("service_history")
      .select("service_date")
      .eq("status", "Selesai")
      .order("service_date");

    if (error) throw error;

    const tahunList = [
      ...new Set(data.map((e) => new Date(e.service_date).getFullYear())),
    ];

    let bulanList = [];
    let mingguList = [];

    if (tahun) {
      bulanList = [
        ...new Set(
          data
            .filter(
              (e) => new Date(e.service_date).getFullYear() == Number(tahun),
            )
            .map((e) => new Date(e.service_date).getMonth() + 1),
        ),
      ].sort((a, b) => a - b);
    }

    if (tahun && bulan) {
      const { start, end } = getDateRange(tahun, bulan);

      const mingguSet = new Set();

      data
        .filter((e) => {
          const d = new Date(e.service_date);
          return d >= start && d <= end;
        })
        .forEach((e) => {
          const day = new Date(e.service_date).getDate();
          mingguSet.add(Math.ceil(day / 7));
        });

      mingguList = [...mingguSet].sort((a, b) => a - b);
    }

    res.json({
      status: "success",
      tahun: tahunList,
      bulan: bulanList,
      minggu: mingguList,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

export const getTrenServis = async (req, res) => {
  try {
    const { tahun, bulan, minggu } = req.query;

    console.log("\n========== TREN SERVIS ==========");
    console.log("Query:");
    console.log({ tahun, bulan, minggu });

    let query = supabase
      .from("service_history")
      .select("service_date")
      .eq("status", "Selesai");

    if (tahun && bulan) {
      const { start, end } = getDateRange(tahun, bulan);

      console.log("Range:");
      console.log({
        start,
        end,
      });

      query = query
        .gte("service_date", start.toISOString())
        .lte("service_date", end.toISOString());
    } else if (tahun) {
      console.log("Range Tahun:");
      console.log({
        start: `${tahun}-01-01`,
        end: `${tahun}-12-31`,
      });

      query = query
        .gte("service_date", `${tahun}-01-01`)
        .lte("service_date", `${tahun}-12-31`);
    }

    const { data, error } = await query.order("service_date");

    console.log("Supabase Error:");
    console.log(error);

    if (error) throw error;

    console.log("Jumlah Data:");
    console.log(data?.length);

    console.log("Sample Data:");
    console.log(data?.slice(0, 5));

    const lastUpdate =
      data.length > 0
        ? data.map((e) => new Date(e.service_date)).sort((a, b) => b - a)[0]
        : new Date();

    console.log("Last Update:");
    console.log(lastUpdate);

    let hasil = [];

    if (tahun && bulan) {
      if (minggu) {
        console.log("Mode: Per Hari");

        const map = {};

        data.forEach((item) => {
          const day = new Date(item.service_date).getDate();
          const week = Math.ceil(day / 7);

          if (week == Number(minggu)) {
            const label = `${day}`;
            map[label] = (map[label] || 0) + 1;
          }
        });

        console.log("Map:");
        console.log(map);

        hasil = Object.entries(map).map(([label, jumlah]) => ({
          label,
          jumlah,
        }));
      } else {
        console.log("Mode: Per Minggu");

        const map = {
          "Minggu 1": 0,
          "Minggu 2": 0,
          "Minggu 3": 0,
          "Minggu 4": 0,
          "Minggu 5": 0,
        };

        data.forEach((item) => {
          const day = new Date(item.service_date).getDate();
          const week = Math.ceil(day / 7);

          map[`Minggu ${week}`]++;
        });

        console.log("Map:");
        console.log(map);

        hasil = Object.entries(map)
          .map(([label, jumlah]) => ({
            label,
            jumlah,
          }))
          .filter((e) => e.jumlah > 0);
      }
    } else if (tahun) {
      console.log("Mode: Per Bulan");

      const map = {
        Jan: 0,
        Feb: 0,
        Mar: 0,
        Apr: 0,
        Mei: 0,
        Jun: 0,
        Jul: 0,
        Agu: 0,
        Sep: 0,
        Okt: 0,
        Nov: 0,
        Des: 0,
      };

      const namaBulan = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];

      data.forEach((item) => {
        const month = new Date(item.service_date).getMonth();
        map[namaBulan[month]]++;
      });

      console.log("Map:");
      console.log(map);

      hasil = Object.entries(map).map(([label, jumlah]) => ({
        label,
        jumlah,
      }));
    } else {
      console.log("Mode: Per Tahun");

      const map = {};

      data.forEach((item) => {
        const year = new Date(item.service_date).getFullYear();
        map[year] = (map[year] || 0) + 1;
      });

      console.log("Map:");
      console.log(map);

      hasil = Object.entries(map)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([label, jumlah]) => ({
          label,
          jumlah,
        }));
    }

    console.log("Hasil Akhir:");
    console.table(hasil);

    console.log("=================================\n");

    res.json({
      status: "success",
      lastUpdate,
      data: hasil,
    });
  } catch (err) {
    console.log("\n========== ERROR TREN SERVIS ==========");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    console.error("Full Error:", err);
    console.log("=======================================\n");

    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { tahun = 0, bulan = 0, minggu = 0 } = req.query;

    console.log("REQ QUERY =", req.query);
    console.log("PARAM =", { tahun, bulan, minggu });

    const { start, end } = getDateRange(tahun, bulan, minggu);

    console.log("START =", start);
    console.log("END   =", end);

    setImmediate(() => {
      console.log("\n================ ANALISIS ARTIKEL ================");
      console.log({ tahun, bulan, minggu });
      console.log({ start, end });
      console.log("Artikel by range:", start, end);
      console.log("=================================================\n");
    });

    console.log("=== QUERY ARTIKEL ===");
    console.log("start =", start.toISOString());
    console.log("end   =", end.toISOString());

    const semuaArtikel = await getArtikelByRange(start, end);
    console.log("Jumlah artikel:", semuaArtikel.length);

    if (semuaArtikel.length > 0) {
      console.log("Artikel pertama:", {
        judul: semuaArtikel[0].judul,
        tanggal: semuaArtikel[0].tanggal,
      });
    }
    const artikelTerbaru = await getArtikelTerbaru();

    const dataTopik = analisisTopikArtikel(semuaArtikel);

    res.status(200).json({
      status: "success",
      lastUpdate: artikelTerbaru?.tanggal || new Date(),
      charts: {
        barChartTopik: dataTopik,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getArtikelFilter = async (req, res) => {
  try {
    const { tahun, bulan } = req.query;
    console.log("\n========== FILTER ARTIKEL ==========");
    console.log("QUERY =", req.query);

    const semuaArtikel = await getArtikelByRange(
      new Date("2000-01-01"),
      new Date(),
    );

    console.log("TOTAL ARTIKEL =", semuaArtikel.length);

    if (semuaArtikel.length > 0) {
      console.log("ARTIKEL PERTAMA =", semuaArtikel[0].tanggal);
      console.log(
        "ARTIKEL TERAKHIR =",
        semuaArtikel[semuaArtikel.length - 1].tanggal,
      );
    }

    const tahunList = [
      ...new Set(semuaArtikel.map((e) => new Date(e.tanggal).getFullYear())),
    ].sort((a, b) => a - b);

    let bulanList = [];
    let mingguList = [];

    if (tahun) {
      bulanList = [
        ...new Set(
          semuaArtikel
            .filter((e) => new Date(e.tanggal).getFullYear() === Number(tahun))
            .map((e) => new Date(e.tanggal).getMonth() + 1),
        ),
      ].sort((a, b) => a - b);
    }

    if (tahun && bulan) {
      const mingguSet = new Set();

      semuaArtikel
        .filter((e) => {
          const d = new Date(e.tanggal);
          return (
            d.getFullYear() === Number(tahun) &&
            d.getMonth() + 1 === Number(bulan)
          );
        })
        .forEach((e) => {
          const week = Math.ceil(new Date(e.tanggal).getDate() / 7);
          mingguSet.add(week);
        });

      mingguList = [...mingguSet].sort((a, b) => a - b);
    }

    console.log("TAHUN =", tahunList);
    console.log("BULAN =", bulanList);
    console.log("MINGGU =", mingguList);
    console.log("====================================\n");

    res.json({
      status: "success",
      tahun: tahunList,
      bulan: bulanList,
      minggu: mingguList,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

export const getTrendTopikArtikel = async (req, res) => {
  try {
    const { tahun, bulan, minggu } = req.query;

    if (!tahun || !bulan) {
      return res.status(400).json({
        status: "error",
        message: "tahun dan bulan wajib diisi",
      });
    }

    const { start, end } = getDateRange(tahun, bulan, minggu);

    const artikel = await getArtikelByRange(start, end);

    const lastUpdate = await getArtikelTerbaru();

    let hasil = [];

    if (minggu) {
      // Trend harian
      const map = {};

      artikel.forEach((item) => {
        const day = new Date(item.tanggal).getDate();

        const label = `${day}`;

        map[label] = (map[label] || 0) + 1;
      });

      hasil = Object.entries(map).map(([label, jumlah]) => ({
        label,
        jumlah,
      }));
    } else {
      // Trend mingguan
      const map = {
        "Minggu 1": 0,
        "Minggu 2": 0,
        "Minggu 3": 0,
        "Minggu 4": 0,
        "Minggu 5": 0,
      };

      artikel.forEach((item) => {
        const day = new Date(item.tanggal).getDate();

        const week = Math.ceil(day / 7);

        map[`Minggu ${week}`]++;
      });

      hasil = Object.entries(map)
        .map(([label, jumlah]) => ({
          label,
          jumlah,
        }))
        .filter((e) => e.jumlah > 0);
    }

    res.json({
      status: "success",
      lastUpdate: lastUpdate?.tanggal || new Date(),
      data: hasil,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
