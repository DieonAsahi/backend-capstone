import axios from "axios";
import FormData from "form-data";

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
      req.file.buffer,
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }
    );

    const response = await axios.post(
      "https://web-production-ca5ab.up.railway.app/ocr",
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

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