import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

// ================= SECURITY =================
app.use(
  cors({
    origin: "*", // aman untuk Flutter + ngrok development
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

// LIMIT REQUEST
app.use(express.json({ limit: "10kb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("API jalan motocare");
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { email, password, confirm_password, full_name } = req.body;

    // VALIDASI KOSONG
    if (!email || !password || !confirm_password || !full_name) {
      return res.status(400).json({
        error: "Semua field wajib diisi",
      });
    }

    // VALIDASI PASSWORD
    if (password !== confirm_password) {
      return res.status(400).json({
        error: "Password tidak sama",
      });
    }

    // MINIMAL PASSWORD
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password minimal 8 karakter",
      });
    }

    // CEK EMAIL
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({
        error: "Email sudah terdaftar",
      });
    }

    // REGISTER
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // INSERT USER
    if (data.user) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email: email,
        full_name,
      });

      if (insertError) {
        return res.status(400).json({
          error: insertError.message,
        });
      }
    }

    return res.json({
      message: "OTP dikirim ke email",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, type } = req.body;

    // VALIDASI
    if (!email || !otp || !type) {
      return res.status(400).json({
        error: "Data tidak lengkap",
      });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // DEMO JWT
    console.log("JWT:", data.session.access_token);

    return res.json({
      message: "OTP valid",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ================= RESEND OTP =================
app.post("/resend-otp", async (req, res) => {
  try {
    const { email, type } = req.body;

    // VALIDASI
    if (!email || !type) {
      return res.status(400).json({
        error: "Data tidak lengkap",
      });
    }

    let error = null;

    // REGISTER
    if (type === "signup") {
      const result = await supabase.auth.resend({
        type: "signup",
        email,
      });

      error = result.error;
    }

    // FORGOT PASSWORD
    else if (type === "email") {
      const result = await supabase.auth.signInWithOtp({
        email,
      });

      error = result.error;
    } else {
      return res.status(400).json({
        error: "Type tidak valid",
      });
    }

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      message: "OTP berhasil dikirim",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // VALIDASI
    if (!email || !password) {
      return res.status(400).json({
        error: "Email dan password wajib diisi",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // EMAIL BELUM VERIFIED
    if (!data.user.email_confirmed_at) {
      return res.status(401).json({
        error: "Email belum diverifikasi",
      });
    }

    return res.json({
      message: "Login berhasil",
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ================= UPDATE PASSWORD =================
app.post("/update-password", async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    // VALIDASI
    if (!access_token || !new_password) {
      return res.status(400).json({
        error: "Token dan password wajib diisi",
      });
    }

    // MINIMAL PASSWORD
    if (new_password.length < 8) {
      return res.status(400).json({
        error: "Password minimal 8 karakter",
      });
    }

    // VALIDASI TOKEN
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser(access_token);

    if (sessionError || !user) {
      return res.status(401).json({
        error: "Token tidak valid",
      });
    }

    // SET SESSION
    await supabase.auth.setSession({
      access_token: access_token,
      refresh_token: "",
    });

    // UPDATE PASSWORD
    const { error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.json({
      message: "Password berhasil diubah",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
});

// ================= PORT =================
app.listen(3000, () => {
  console.log("Server jalan di port 3000");
});