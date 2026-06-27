import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token tidak ditemukan",
      });
    }

    const access_token = authHeader.split(" ")[1];

    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        error: "Token tidak valid",
      });
    }

    console.log("================================");
    console.log("TOKEN:", access_token);
    console.log("USER ID:", user.id);
    console.log("EMAIL:", user.email);
    console.log("================================");

    req.user = user;
    req.supabase = client;

    next();
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};
