import mongoose from "mongoose";

const AnalisisTopikSchema = new mongoose.Schema(
  {
    kataKunci: {
      type: String,
      required: true,
    },
    frekuensi: {
      type: Number,
      required: true,
    },
    kategori: {
      type: String,
      default: "Umum",
    },
    tanggalAnalisis: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "analisis_topik",
  },
);

const AnalisisTopik = mongoose.model("AnalisisTopik", AnalisisTopikSchema);

export const getAnalisisTopik = async () => {
  return await AnalisisTopik.find().sort({
    frekuensi: -1,
  });
};

export const hapusAnalisisTopik = async () => {
  return await AnalisisTopik.deleteMany({});
};

export const simpanAnalisisTopik = async (data) => {
  return await AnalisisTopik.insertMany(data);
};

export const getKategoriTopik = (kata) => {
  if (
    [
      "oli",
      "mesin",
      "busi",
      "piston",
      "kopling",
      "karburator",
      "vbelt",
      "roller",
      "radiator",
      "cvt",
      "seher",
      "klep",
    ].includes(kata)
  ) {
    return "Mesin";
  }

  if (
    ["rem", "ban", "shock", "rantai", "suspensi", "cakram", "tromol"].includes(
      kata,
    )
  ) {
    return "Kaki-kaki";
  }

  if (["aki", "lampu", "injeksi", "ecu", "sekring"].includes(kata)) {
    return "Kelistrikan";
  }

  return "Umum";
};

export const analisisTopikArtikel = (semuaArtikel) => {
  const hitungKata = {};

  const komponenOtomotif = [
    "oli",
    "mesin",
    "busi",
    "rem",
    "ban",
    "shock",
    "rantai",
    "aki",
    "lampu",
    "injeksi",
    "ecu",
    "piston",
    "kopling",
    "karburator",
    "vbelt",
    "roller",
    "radiator",
    "filter",
    "pengereman",
    "cvt",
    "suspensi",
    "stang",
    "knalpot",
    "bensin",
    "karbu",
    "cakram",
    "tromol",
    "seher",
    "klep",
    "sekring",
    "tengki",
  ];

  const kataKunciEdukasi = [
    "rawat",
    "perawatan",
    "tips",
    "servis",
    "cara",
    "panduan",
    "memperbaiki",
    "mengatasi",
    "motor",
  ];

  semuaArtikel.forEach((art) => {
    const judul = art.judul?.toLowerCase() || "";
    const ringkasan = art.ringkasan?.toLowerCase() || "";

    const edukasi = kataKunciEdukasi.some(
      (k) => judul.includes(k) || ringkasan.includes(k),
    );

    if (!edukasi) return;

    const kata = `${judul} ${ringkasan}`
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/);

    kata.forEach((k) => {
      if (komponenOtomotif.includes(k)) {
        hitungKata[k] = (hitungKata[k] || 0) + 1;
      }
    });
  });

  return Object.entries(hitungKata)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kata, frekuensi]) => ({
      kata,
      jumlah: frekuensi,
      kategori: getKategoriTopik(kata),
    }));
};

export default AnalisisTopik;
