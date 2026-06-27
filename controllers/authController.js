import fs from "fs";
import cloudinary from "../config/cloudinary.js";

import { createClient } from "@supabase/supabase-js";
import { supabase } from "../config/supabase.js";

const registerLocks = new Map();
const registerAttempts = new Map();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 10 * 60 * 1000;

export const register = async (req, res) => {
  try {
    const { email, password, confirm_password, full_name } = req.body;

    // ================= VALIDASI =================
    if (!email || !password || !confirm_password || !full_name) {
      return res.status(400).json({
        error: "Semua field wajib diisi",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        error: "Password tidak sama",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password minimal 8 karakter",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ================= BLOCK CHECK =================
    const blocked = registerAttempts.get(cleanEmail);

    if (blocked && blocked.blockedUntil > Date.now()) {
      const remaining = Math.ceil(
        (blocked.blockedUntil - Date.now()) / 1000 / 60,
      );

      return res.status(429).json({
        error: `Terlalu banyak percobaan. Coba lagi dalam ${remaining} menit`,
      });
    }

    // ================= DOUBLE CLICK LOCK =================
    if (registerLocks.get(cleanEmail)) {
      return res.status(429).json({
        error: "Permintaan sedang diproses",
      });
    }

    registerLocks.set(cleanEmail, true);

    // ================= ATTEMPT COUNT =================
    let attemptData = registerAttempts.get(cleanEmail);

    if (!attemptData) {
      attemptData = {
        count: 0,
        blockedUntil: null,
      };
    }

    attemptData.count++;

    // BLOCK JIKA SPAM
    if (attemptData.count >= MAX_ATTEMPTS) {
      attemptData.blockedUntil = Date.now() + BLOCK_DURATION;

      registerAttempts.set(cleanEmail, attemptData);

      registerLocks.delete(cleanEmail);

      return res.status(429).json({
        error: "Terlalu banyak percobaan. Akun diblokir 10 menit",
      });
    }

    registerAttempts.set(cleanEmail, attemptData);

    // ================= REGISTER =================
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (error) {
      registerLocks.delete(cleanEmail);

      return res.status(400).json({
        error: error.message,
      });
    }

    // RESET ATTEMPT JIKA BERHASIL
    registerAttempts.delete(cleanEmail);

    // HAPUS LOCK
    registerLocks.delete(cleanEmail);

    return res.json({
      message: "OTP dikirim ke email",
    });
  } catch (err) {
    console.log(err);

    if (req.body?.email) {
      registerLocks.delete(req.body.email.trim().toLowerCase());
    }

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
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

    console.log("SESSION:", data.session);
    console.log("REFRESH:", data.session?.refresh_token);

    console.log("VERIFY ERROR:", error);
    console.log("USER:", data?.user);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    const existingUser = await supabase
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!existingUser.data) {
      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name,
      });

      if (insertError) {
        return res.status(400).json({
          error: insertError.message,
        });
      }
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
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email wajib diisi",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        error: "Email tidak terdaftar",
      });
    }

    return res.json({
      message: "Email ditemukan",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const resendOtp = async (req, res) => {
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
      const result = await supabase.auth.resetPasswordForEmail(email);

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
};

export const login = async (req, res) => {
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
};

export const googleSync = async (req, res) => {
  try {
    const client = req.supabase;
    const user = req.user;

    console.log("========== GOOGLE SYNC ==========");
    console.log("USER ID:", user.id);
    console.log("EMAIL:", user.email);
    console.log("METADATA:", user.user_metadata);

    const { data: existingUser, error: checkError } = await client
      .from("users")
      .select("id, email")
      .eq("email", user.email)
      .maybeSingle();

    console.log("CHECK USER:");
    console.log(existingUser);
    console.log(checkError);

    if (!existingUser) {
      const payload = {
        id: user.id,
        email: user.email,
        full_name:
          user.user_metadata?.full_name || user.user_metadata?.name || "",

        image_url:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || "",

        bio: "",
      };

      console.log("INSERT USER:");
      console.log(payload);

      const { data, error } = await client
        .from("users")
        .insert(payload)
        .select();

      console.log("INSERT RESULT:");
      console.log(data);
      console.log(error);

      if (error) {
        return res.status(400).json({
          error: error.message,
        });
      }
    } else {
      console.log("USER SUDAH ADA, SKIP INSERT");
    }

    console.log("========== GOOGLE SYNC DONE ==========");

    return res.status(200).json({
      message: "Sync selesai",
    });
  } catch (err) {
    console.log("GOOGLE SYNC ERROR:");
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { access_token, refresh_token, new_password } = req.body;

    console.log("ACCESS TOKEN:", access_token);
    console.log("NEW PASSWORD:", new_password);

    if (!access_token || !new_password) {
      return res.status(400).json({
        error: "Token dan password wajib diisi",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: "Password minimal 8 karakter",
      });
    }

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

    const { data: userData, error: userError } =
      await client.auth.getUser(access_token);

    console.log("USER ERROR:", userError);
    console.log("USER DATA:", userData);

    const { data: sessionData, error: sessionError } =
      await client.auth.getSession();

    console.log("SESSION ERROR:", sessionError);
    console.log("SESSION DATA:", sessionData);

    await client.auth.setSession({
      access_token,
      refresh_token,
    });

    const { error } = await client.auth.updateUser({
      password: new_password,
    });

    console.log(error);

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
};

export const getProfile = async (req, res) => {
  try {
    const client = req.supabase;
    const userId = req.user.id;

    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const client = req.supabase;
    const userId = req.user.id;

    const { full_name, bio } = req.body;

    const updateData = {
      updated_at: new Date(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (bio !== undefined) updateData.bio = bio;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "motocare/vehicle", //bisa motocare/prfile
      });

      fs.unlinkSync(req.file.path);

      updateData.image_url = result.secure_url;
    }

    const { data, error } = await client
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:");
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};
