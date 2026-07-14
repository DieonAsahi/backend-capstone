import mongoose from "mongoose";

const ArtikelSchema = new mongoose.Schema(
  {
    judul: {
      type: String,
      required: true,
      unique: true,
    },
    ringkasan: String,
    link: String,
    sumber: String,
    tanggal: Date,
  },
  {
    timestamps: true,
    collection: "artikel",
  },
);

const Artikel =
  mongoose.models.Artikel || mongoose.model("Artikel", ArtikelSchema);

export const getArtikelByRange = async (start, end) => {
  return await Artikel.find({
    tanggal: {
      $gte: start,
      $lte: end,
    },
  });
};

export const getArtikelTerbaru = async () => {
  return await Artikel.findOne({}).sort({
    tanggal: -1,
  });
};

export const getSemuaArtikel = async () => {
  return await Artikel.find({});
};

export const simpanArtikel = async (data) => {
  return await Artikel.updateOne(
    {
      judul: data.judul,
    },
    data,
    {
      upsert: true,
    },
  );
};

export default Artikel;
