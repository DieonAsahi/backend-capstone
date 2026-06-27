import axios from "axios";

export const getWorkshop = async (req, res) => {
  try {
    const response = await axios.get("http://127.0.0.1:8000/workshop");

    return res.json(response.data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getNearestWorkshop = async (req, res) => {
  try {
    const { lat, lng, limit } = req.query;

    const response = await axios.get("http://127.0.0.1:8000/workshop/nearest", {
      params: {
        lat,
        lng,
        limit,
      },
    });

    return res.json(response.data);
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getWorkshopDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`http://127.0.0.1:8000/workshop/${id}`);

    return res.json(response.data);
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};
