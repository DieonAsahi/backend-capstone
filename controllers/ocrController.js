import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export const scanOcr = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Gambar wajib diupload",
      });
    }

    const formData = new FormData();

    formData.append(
      "file",
      fs.createReadStream(req.file.path),
      req.file.originalname,
    );

    const response = await axios.post("https://web-production-ca5ab.up.railway.app/ocr", formData, {
      headers: formData.getHeaders(),
    });

    console.log("OCR RESPONSE:");
    console.log(response.data);

    fs.unlinkSync(req.file.path);

    return res.json({
      success: true,
      odometer: response.data.odometer,
    });
  } catch (e) {
    console.log(e);

    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
