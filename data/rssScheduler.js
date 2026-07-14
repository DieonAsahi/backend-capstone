import Parser from "rss-parser";
import cron from "node-cron";

import { simpanArtikel, getSemuaArtikel } from "./artikel.js";

import {
  hapusAnalisisTopik,
  simpanAnalisisTopik,
  getKategoriTopik,
} from "./analisisTopik.js";

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "application/rss+xml, application/rdf+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.1",
  },
});

const daftarSumberRSS = [
  // 'https://www.wahanahonda.com/rss',
  "https://www.hondacengkareng.com/feed/",
  "https://www.dayaauto.co.id/category/news/artikel/feed/",
  "https://www.federaloil.co.id/rss",
  "https://elangsung.com/feed/",
  "https://feed.liputan6.com/rss/otomotif",
  "https://rss.tempo.co/otomotif",
];

const stopwords = [
  "dan",
  "yang",
  "untuk",
  "pada",
  "ke",
  "dari",
  "di",
  "ini",
  "itu",
  "dengan",
  "atau",
  "adalah",
  "bisa",
  "cara",
  "motor",
  "tips",
  "dalam",
  "mengapa",
  "bagaimana",
  "juga",
  "nyaman",
  "aman",
  "harga",
  "baru",
  "berkendara",
  "salah",
  "satu",
  "bukan",
  "untuk",
  "oleh",
  "saat",
  "agar",
  "namun",
  "secara",
  "membuat",
  "ingat",
  "banyak",
  "bisa",
  "kamu",
  "kita",
  "anda",
  "mereka",
  "akan",
  "telah",
  "sudah",
  "bila",
  "jika",
  "bahkan",
];

const jalankanPipelineData = async () => {
  console.log("[CRON] Menjalankan sinkronisasi Big Data harian...");

  for (const url of daftarSumberRSS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items) {
        const ringkasanBersih =
          item.contentSnippet ||
          (item.description ? item.description.replace(/<[^>]*>/g, "") : "");

        await simpanArtikel({
          judul: item.title,
          ringkasan: ringkasanBersih.substring(0, 200),
          link: item.link,
          sumber: feed.title || "Portal Otomotif",
          tanggal: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch (err) {
      console.error(`Gagal mengambil data dari ${url}:`, err.message);
    }
  }

  try {
    const semuaArtikel = await getSemuaArtikel();
    let hitungKata = {};

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
      const judulKecil = art.judul ? art.judul.toLowerCase() : "";
      const ringkasanKecil = art.ringkasan ? art.ringkasan.toLowerCase() : "";

      const apakahArtikelEdukasi = kataKunciEdukasi.some(
        (keyword) =>
          judulKecil.includes(keyword) || ringkasanKecil.includes(keyword),
      );

      if (apakahArtikelEdukasi) {
        const teksGabungan = `${judulKecil} ${ringkasanKecil}`;
        const kataKata = teksGabungan
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .split(/\s+/);

        kataKata.forEach((kata) => {
          if (komponenOtomotif.includes(kata)) {
            hitungKata[kata] = (hitungKata[kata] || 0) + 1;
          }
        });
      }
    });

    const urutanKata = Object.entries(hitungKata)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    await hapusAnalisisTopik();

    const dataTopik = [];

    for (const [kata, frekuensi] of urutanKata) {

      dataTopik.push({
        kataKunci: kata,
        frekuensi,
        kategori: getKategoriTopik(kata),
      });
    }
    console.log(
      "[CRON] Pipeline Big Data sukses difilter khusus komponen motor!",
    );
    await simpanAnalisisTopik(dataTopik);
  } catch (error) {
    console.error("[CRON] Gagal memproses analisis data:", error.message);
  }
};

cron.schedule("0 0 * * *", jalankanPipelineData);

export { jalankanPipelineData };
