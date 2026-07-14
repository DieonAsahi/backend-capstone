import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Mengambil variabel MONGO_URI yang aman dari file .env
    const dbUri = process.env.MONGO_URI;

    if (!dbUri) {
      console.error("MONGO_URI tidak ditemukan di file .env!");
      process.exit(1);
    }

    const conn = await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 5000, // Beri waktu toleransi 5 detik untuk mencoba konek ulang sebelum melempar eror
    });

    console.log(`MongoDB Atlas Terkoneksi ke: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Gagal terhubung ke MongoDB Atlas: ${error.message}`);
    }
};

export default connectDB;
