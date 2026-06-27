export const DATA_GEJALA = {
  // Mesin
  G01: "Motor susah dihidupkan saat mesin dingin",
  G02: "Tarikan motor terasa berat / ngempos",
  G03: "Keluar asap putih tebal dari knalpot",
  G04: "Mesin sering mati mendadak saat posisi idle/langsam",
  G05: "Terdengar suara letupan (nembak) dari knalpot",
  G06: "Mesin cepat sangat panas (overheat)",
  G07: "Konsumsi bensin terasa jauh lebih boros",
  // Kelistrikan
  G08: "Lampu utama/speedometer redup saat mesin idle",
  G09: "Klakson suaranya lemah atau mati total",
  G10: "Starter tangan tidak merespon",
  G11: "Lampu indikator mesin menyala terus",
  // Transmisi
  G12: "Motor matic bergetar hebat (gredek) di awal mulai jalan",
  G13: "RPM mesin tinggi tapi laju motor lambat",
  G14: "Oper gigi terasa keras atau susah dinetralin",
  G15: "Terdengar suara kasar/srek-srek dari area CVT atau rantai",
  // Rem & Kaki
  G16: "Rem terasa kurang pakem / blong",
  G17: "Terdengar suara mendecit tajam saat mengerem",
  G18: "Stang terasa tidak stabil, oleng, atau lari ke satu sisi",
};

export const DATA_KERUSAKAN = {
  K01: {
    nama: "Busi Lemah / Kotor",
    penjelasan:
      "Masalah pada busi mengakibatkan mesin susah dihidupkan (starter/kickstarter), tarikan motor terasa berat, konsumsi bahan bakar boros, serta muncul suara letupan pada knalpot.",
    solusi:
      "Bersihkan busi dan cek celah elektroda, atau lakukan servis sistem pembakaran dan periksa kabel busi. Jika kondisi parah, ganti busi dengan yang baru agar performa mesin kembali normal.",
  },
  K02: {
    nama: "Aki Soak / Lemah",
    penjelasan:
      "Sumber listrik utama motor saat mesin mati sudah kehabisan daya, sehingga tidak kuat menyuplai daya listrik ke komponen starter maupun klakson.",
    solusi:
      "Lakukan pengecasan ulang (recharge) aki di bengkel terdekat. Jika aki sudah berumur lebih dari 2 tahun atau tidak bisa menyimpan daya lagi, ganti dengan aki baru.",
  },
  K03: {
    nama: "Kampas Rem Aus",
    penjelasan:
      "Bantalan rem sudah sangat tipis atau habis tergesek, menyebabkan daya pengereman menurun drastis dan memicu gesekan logam yang berbunyi nyaring.",
    solusi:
      "Segera ganti kampas rem depan/belakang dengan yang baru demi keselamatan berkendara dan menghindari kerusakan permanen pada piringan cakram (disc brake).",
  },
  K04: {
    nama: "Roller & Van Belt CVT Aus (Khusus Matic)",
    penjelasan:
      "Komponen penggerak di dalam rumah CVT sudah berubah bentuk (peang) atau karet v-belt melar, sehingga penyaluran tenaga dari mesin ke roda belakang menjadi slip.",
    solusi:
      "Buka blok CVT, lakukan pembersihan komponen, dan ganti satu set roller serta v-belt yang aus dengan komponen orisinal.",
  },
  K05: {
    nama: "Kampas Ganda Kotor / Aus (Khusus Matic)",
    penjelasan:
      "Kampas yang bertugas mencengkeram mangkok kopling mengalami slip akibat penumpukan debu sisa gesekan atau karena ketebalan kampas sudah habis.",
    solusi:
      "Lakukan servis CVT berkala untuk membersihkan debu di dalam mangkok ganda. Jika kampas sudah halus/tipis, lakukan penggantian sepatu kampas kopling ganda.",
  },
  K06: {
    nama: "Ring Piston Aus / Sil Klep Bocor",
    penjelasan:
      "Oli mesin menyelinap masuk ke dalam ruang bakar karena pembatasnya (ring piston) sudah aus. Hal ini memicu oli ikut terbakar, knalpot ngebul putih, dan performa drop.",
    solusi:
      "Bongkar blok mesin (turun setengah) untuk mengganti ring piston yang aus serta sil klep. Pastikan juga volume oli selalu dicek agar mesin tidak macet akibat kehabisan oli.",
  },
  K07: {
    nama: "Komstir Aus / Longgar",
    penjelasan:
      "Bantalan peluru (bearing) pada leher kemudi stang sudah tidak rata atau kering dari pelumas, membuat handling kemudi kaku atau terasa goyang.",
    solusi:
      "Bawa ke bengkel untuk menyetel ulang kekencangan komstir. Jika stang masih terasa tersendat di tengah, ganti satu set mangkok dan peluru komstir yang baru.",
  },
  K08: {
    nama: "Sistem Injeksi Bermasalah",
    penjelasan:
      "Indikator check engine menyala karena sensor motor membaca adanya malfungsi arus, suplai bahan bakar dari injektor tersumbat, atau throttle body kotor.",
    solusi:
      "Lakukan pembersihan komponen Throttle Body (TB) dan Injektor menggunakan cairan injector cleaner, kemudian lakukan reset ECU/ECM menggunakan scanner diagnostic di bengkel.",
  },
};

export const RULE_BASE = [
  {
    id: "RULE 01",
    gejala: ["G01", "G02", "G05"],
    kerusakan: "K01",
    confidence: 90,
  },
  { id: "RULE 02", gejala: ["G09", "G10"], kerusakan: "K02", confidence: 95 },
  {
    id: "RULE 03",
    gejala: ["G01", "G08", "G10"],
    kerusakan: "K02",
    confidence: 85,
  },
  { id: "RULE 04", gejala: ["G16", "G17"], kerusakan: "K03", confidence: 95 },
  {
    id: "RULE 05",
    gejala: ["G02", "G13", "G15"],
    kerusakan: "K04",
    confidence: 88,
  },
  { id: "RULE 06", gejala: ["G12"], kerusakan: "K05", confidence: 85 },
  {
    id: "RULE 07",
    gejala: ["G02", "G03", "G07"],
    kerusakan: "K06",
    confidence: 95,
  },
  { id: "RULE 08", gejala: ["G18"], kerusakan: "K07", confidence: 90 },
  { id: "RULE 09", gejala: ["G04", "G11"], kerusakan: "K08", confidence: 90 },
];
