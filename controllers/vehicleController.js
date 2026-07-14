import cloudinary from "../config/cloudinary.js";
import fs from "fs";

export const uploadVehicleImage = async (req, res) => {
  try {
    console.log(req.file);
    if (!req.file) {
      return res.status(400).json({
        error: "File tidak ditemukan",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "motocare/vehicle",
    });

    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};

export const addVehicle = async (req, res) => {
  try {
    console.log(req.body);

    const {
      brand,
      model,
      year,
      plate_number,
      vehicle_image,
      odometer_image,
      estimated_km_per_day,
      current_odometer,
      components,
    } = req.body;

    // VALIDASI
    if (
      !brand ||
      !model ||
      year === null ||
      year === undefined ||
      !plate_number
    ) {
      return res.status(400).json({
        error: "Data kendaraan tidak lengkap",
      });
    }

    // ================= GET USER =================
    const client = req.supabase;
    const user = req.user;
    const now = new Date();

    // ================= INSERT VEHICLE =================
    const { data: vehicleData, error: vehicleError } = await client
      .from("vehicles")
      .insert({
        user_id: user.id,

        brand,
        model,
        year,

        plate_number,

        vehicle_image,
        odometer_image,

        estimated_km_per_day,
        current_odometer,

        last_odometer_update: now,
      })
      .select()
      .single();

    if (vehicleError) {
      return res.status(400).json({
        error: vehicleError.message,
        details: vehicleError.details,
        hint: vehicleError.hint,
        code: vehicleError.code,
      });
    }

    // ================= INSERT COMPONENTS =================
    let componentRows = [];
    let masters = [];

    if (components && components.length > 0) {
      console.log(components);

      const { data } = await client.from("master_components").select("*");

      masters = data ?? [];

      componentRows = components
        .map((item) => {
          const master = masters.find((m) => m.id === item.component_id);
          if (!master) {
            return null;
          }
          const serviceDays = item.service_days;

          const usedKm = estimated_km_per_day * serviceDays;

          const remainingKm = Math.max(master.max_km - usedKm, 0);

          const remainingDays = Math.max(master.max_days - serviceDays, 0);

          return {
            vehicle_id: vehicleData.id,
            component_id: item.component_id,

            last_replaced_date: item.last_replaced_date,
            last_replaced_odometer: item.last_replaced_odometer,

            service_days: serviceDays,
            used_km: usedKm,

            remaining_km: remainingKm,
            remaining_days: remainingDays,

            last_odometer_update: current_odometer,
            last_day_update: new Date(),
          };
        })
        .filter((item) => item !== null);

      console.log(componentRows);

      const { data: insertedComponents, error: componentError } = await client
        .from("vehicle_components")
        .insert(componentRows)
        .select();

      // console.log("INSERTED COMPONENTS:");
      // console.log(insertedComponents);

      if (componentError) {
        console.log(componentError);

        return res.status(400).json({
          error: componentError.message,
        });
      }
    }

    // ================= HITUNG PERFORMANCE AWAL =================
    const performanceList = componentRows.map((item) => {
      const master = masters.find((m) => m.id === item.component_id);

      const kmPercent = (item.remaining_km / master.max_km) * 100;

      const dayPercent = (item.remaining_days / master.max_days) * 100;

      return (kmPercent + dayPercent) / 2;
    });

    const totalPerformance =
      performanceList.length > 0
        ? performanceList.reduce((sum, value) => {
            return sum + value;
          }, 0) / performanceList.length
        : 100;

    // ================= INSERT PERFORMANCE HISTORY =================
    const { error: performanceError } = await client
      .from("vehicle_performance_history")
      .insert({
        vehicle_id: vehicleData.id,
        performance_percent: Number(totalPerformance.toFixed(1)),
      });

    if (performanceError) {
      console.log(performanceError);
    }

    // console.log("AKAN RETURN SUKSES");

    return res.status(200).json({
      message: "Kendaraan berhasil ditambahkan",
      vehicle: vehicleData,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const vehicleHealth = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // ================= GET VEHICLE =================
    const client = req.supabase;
    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    console.log(vehicle, vehicleError);

    const { data, error } = await client.from("master_components").select("*");

    // console.log("MASTER:");
    // console.log(data);

    // console.log("MASTER ERROR:");
    // console.log(error);

    if (vehicleError || !vehicle) {
      return res.status(404).json({
        error: "Kendaraan tidak ditemukan",
      });
    }

    // ================= GET USER =================
    const { data: user, error: userError } = await client
      .from("users")
      .select("id, full_name, email")
      .eq("id", vehicle.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "User tidak ditemukan",
      });
    }

    // ================= GET COMPONENTS =================
    const { data: components, error: componentError } = await client
      .from("vehicle_components")
      .select(
        `
        vehicle_id,
        component_id,
        last_replaced_date,
        last_replaced_odometer,
        remaining_km,
        remaining_days,
        last_odometer_update,
        last_day_update,
        master_components!fk_component (
          id,
          name,
          icon,
          max_days,
          max_km
        )
      `,
      )
      .eq("vehicle_id", vehicleId)
      .order("component_id", { ascending: true });

    // console.log(componentError);

    const { data: rawComponents, error: rawError } = await client
      .from("vehicle_components")
      .select("*")
      .eq("vehicle_id", vehicleId);

    // console.log("RAW COMPONENTS:");
    // console.log(rawComponents);
    // console.log("RAW ERROR:");
    // console.log(rawError);

    if (componentError) {
      return res.status(400).json({
        error: componentError.message,
      });
    }

    // ================= HITUNG UMUR KOMPONEN =================

    // console.log("EST KM:", vehicle.estimated_km_per_day);
    // console.log("COMPONENTS:", components);

    const results = components.map((item) => {
      console.log("ITEM:", item);

      const master = Array.isArray(item.master_components)
        ? item.master_components[0]
        : item.master_components;

      if (!master) {
        return null;
      }

      const remainingKm = item.remaining_km;

      const remainingDays = item.remaining_days;

      const usedKm = master.max_km - remainingKm;

      const serviceDays = master.max_days - remainingDays;

      // console.log("USED KM:", usedKm);
      // console.log("REMAINING KM:", remainingKm);
      // console.log("REMAINING DAYS:", remainingDays);

      const kmPercent = (remainingKm / master.max_km) * 100;

      const dayPercent = (remainingDays / master.max_days) * 100;

      const healthPercent = (kmPercent + dayPercent) / 2;

      let status = "good";
      let color = "green";

      if (healthPercent <= 30) {
        status = "danger";
        color = "red";
      } else if (healthPercent <= 70) {
        status = "warning";
        color = "yellow";
      }

      return {
        id: master.id,

        name: master.name,
        icon: master.icon,

        remaining_km: remainingKm,
        max_km: master.max_km,

        remaining_days: remainingDays,
        max_days: master.max_days,

        health_percent: healthPercent,

        status,
        color,
      };
    });

    const validResults = results
      .filter((item) => item !== null)
      .sort((a, b) => a.id - b.id);

    // ================= HITUNG PERFORMA KOMPONEN =================

    const totalPerformance =
      validResults.length > 0
        ? validResults.reduce((sum, item) => {
            return sum + item.health_percent;
          }, 0) / validResults.length
        : 100;

    const { data: histories } = await client
      .from("vehicle_performance_history")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: true })
      .limit(7);

    await generateNotifications(client, vehicleId);

    return res.json({
      user,

      vehicle: {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        current_odometer: vehicle.current_odometer,
        vehicle_image: vehicle.vehicle_image,
      },

      components: validResults,

      performance: {
        current: Number(totalPerformance.toFixed(1)),
        history: histories ?? [],
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getMyVehicle = async (req, res) => {
  try {
    const client = req.supabase;
    const user = req.user;

    const { data, error } = await client
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    console.log("ERROR:", error);

    if (error || !data) {
      return res.status(404).json({
        message: "Belum ada kendaraan",
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getMyVehicles = async (req, res) => {
  try {
    const client = req.supabase;
    const user = req.user;

    console.log("[getMyVehicles] Request dari user:", {
      id: user.id,
      email: user.email,
    });

    const { data: vehicles, error } = await client
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log("[getMyVehicles] Query vehicles response:", {
      error,
      count: vehicles?.length || 0,
      vehicles,
    });

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    const result = [];

    for (const vehicle of vehicles) {
      const { data: latestPerformance } = await client
        .from("vehicle_performance_history")
        .select("performance_percent")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log("[getMyVehicles] Performance response:", {
        vehicleId: vehicle.id,
        latestPerformance,
      });

      const performance = latestPerformance?.performance_percent ?? 100;

      let status = "Optimal";

      if (performance < 40) {
        status = "Perlu Servis";
      } else if (performance < 70) {
        status = "Perlu Perhatian";
      }

      result.push({
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        plate_number: vehicle.plate_number,
        current_odometer: vehicle.current_odometer,
        vehicle_image: vehicle.vehicle_image,
        performance,
        status,
      });
    }

    // console.log("[getMyVehicles] Final response:", result);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const client = req.supabase;
    const user = req.user;

    const { vehicleId } = req.params;

    const { error } = await client
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("user_id", user.id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Kendaraan berhasil dihapus",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const updateOdometer = async (req, res) => {
  try {
    const { vehicle_id, new_odometer, odometer_image } = req.body;

    const client = req.supabase;

    if (!vehicle_id || new_odometer === undefined) {
      return res.status(400).json({
        error: "Data tidak lengkap",
      });
    }

    // GET VEHICLE
    const { data: vehicle, error: vehicleError } = await client
      .from("vehicles")
      .select("*")
      .eq("id", vehicle_id)
      .single();

    if (vehicleError || !vehicle) {
      return res.status(404).json({
        error: "Kendaraan tidak ditemukan",
      });
    }

    if (vehicle.user_id !== req.user.id) {
      return res.status(403).json({
        error: "Akses ditolak",
      });
    }

    if (new_odometer < vehicle.current_odometer) {
      return res.status(400).json({
        error: "Odometer tidak boleh lebih kecil",
      });
    }

    const deltaKm = new_odometer - vehicle.current_odometer;

    if (deltaKm === 0) {
      return res.status(400).json({
        error: "Odometer tidak berubah",
      });
    }

    // GET COMPONENTS
    const { data: components, error: componentError } = await client
      .from("vehicle_components")
      .select(
        `
    *,
    master_components!fk_component (
      id,
      max_km,
      max_days
    )
  `,
      )
      .eq("vehicle_id", vehicle_id);

    if (componentError) {
      return res.status(400).json({
        error: componentError.message,
      });
    }
    const now = new Date();

    const updatedComponents = components.map((item) => {
      const daysPassed = Math.floor(
        (now - new Date(item.last_day_update)) / (1000 * 60 * 60 * 24),
      );

      const newRemainingKm = Math.max(item.remaining_km - deltaKm, 0);

      const newRemainingDays = Math.max(item.remaining_days - daysPassed, 0);

      return {
        id: item.id,
        remaining_km: newRemainingKm,
        remaining_days: newRemainingDays,
        last_odometer_update: new_odometer,
        last_day_update: now,
      };
    });

    for (const component of updatedComponents) {
      const { data, error } = await client
        .from("vehicle_components")
        .update({
          remaining_km: component.remaining_km,
          remaining_days: component.remaining_days,
          last_odometer_update: component.last_odometer_update,
          last_day_update: component.last_day_update,
        })
        .eq("id", component.id)
        .select();

      // console.log("UPDATE COMPONENT:", component.id);
      // console.log("DATA:", data);
      // console.log("ERROR:", error);
    }

    await client
      .from("vehicles")
      .update({
        current_odometer: new_odometer,
        odometer_image: odometer_image,
        last_odometer_update: now,
      })
      .eq("id", vehicle_id);

    const performanceList = updatedComponents.map((item, index) => {
      const master = components[index].master_components;

      const kmPercent = (item.remaining_km / master.max_km) * 100;

      const dayPercent = (item.remaining_days / master.max_days) * 100;

      return (kmPercent + dayPercent) / 2;
    });

    const totalPerformance =
      performanceList.reduce((a, b) => a + b, 0) / performanceList.length;

    await client.from("vehicle_performance_history").insert({
      vehicle_id: vehicle_id,
      performance_percent: Number(totalPerformance.toFixed(1)),
    });

    await generateNotifications(client, vehicle_id);

    return res.status(200).json({
      message: "Odometer berhasil diperbarui",
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getPerformanceHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const client = req.supabase;

    const { data, error } = await client
      .from("vehicle_performance_history")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: true });

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

export const getService = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const client = req.supabase;

    const { data: components, error } = await client

      .from("vehicle_components")

      .select(
        `
        remaining_days,
        remaining_km,
        master_components!fk_component (
          id,
          name,
          icon,
          max_days,
          max_km
        )
      `,
      )

      .eq("vehicle_id", vehicleId);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    const { data: vehicle } = await client
      .from("vehicles")
      .select("estimated_km_per_day")
      .eq("id", vehicleId)
      .single();

    const { data: scheduledServices } = await client
      .from("service_history")
      .select("component_id")
      .eq("vehicle_id", vehicleId)
      .eq("service_type", "Servis Rutin")
      .eq("status", "Dijadwalkan");

    const scheduledComponentIds = new Set(
      scheduledServices?.map((s) => s.component_id) || [],
    );

    const reminders = components
      .map((item) => {
        const master = Array.isArray(item.master_components)
          ? item.master_components[0]
          : item.master_components;

        const kmPercent = (item.remaining_km / master.max_km) * 100;
        const dayPercent = (item.remaining_days / master.max_days) * 100;

        const healthPercent = (kmPercent + dayPercent) / 2;

        let status = "good";
        let message = "";

        if (
          healthPercent <= 20 ||
          item.remaining_km <= 0 ||
          item.remaining_days <= 0
        ) {
          status = "danger";
          if (item.remaining_km <= 0) {
            message = `Sudah melewati ${Math.abs(item.remaining_km)} km, ganti ${master.name.toLowerCase()} sekarang`;
          } else if (item.remaining_days <= 0) {
            message = `Sudah melewati ${Math.abs(item.remaining_days)} hari, ganti ${master.name.toLowerCase()} sekarang`;
          } else {
            message = "Perlu diperiksa sekarang";
          }
        } else if (healthPercent <= 40 || kmPercent <= 30 || dayPercent <= 30) {
          status = "warning";
          if (kmPercent <= 30) {
            message = `${item.remaining_km} km lagi menuju penggantian`;
          } else if (dayPercent <= 30) {
            message = `Perlu diganti dalam ${item.remaining_days} hari`;
          } else {
            message = "Perlu dijadwalkan servis";
          }
        }

        return {
          id: master.id,
          name: master.name,
          icon: master.icon,
          isScheduled: scheduledComponentIds.has(master.id),
          status,
          remaining_days: item.remaining_days,
          health_percent: Number(healthPercent.toFixed(1)),
          message,
        };
      })

      .filter((item) => item.status === "warning" || item.status === "danger")

      .sort((a, b) => {
        if (a.status === "danger" && b.status !== "danger") return -1;

        if (a.status !== "danger" && b.status === "danger") return 1;

        return a.health_percent - b.health_percent;
      });

    return res.status(200).json(reminders);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getVehicleOdometer = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const client = req.supabase;

    // console.log("================================");
    // console.log("VEHICLE ID:", vehicleId);

    const { data, error } = await client
      .from("vehicles")
      .select("current_odometer, last_odometer_update")
      .eq("id", vehicleId)
      .single();

    if (error) {
      console.log("ODOMETER ERROR:", error);

      return res.status(400).json({
        error: error.message,
      });
    }

    // console.log("CURRENT ODOMETER:", data.current_odometer);
    // console.log("LAST ODOMETER UPDATE:", data.last_odometer_update);
    // console.log("================================");

    return res.status(200).json(data);
  } catch (err) {
    console.log("GET ODOMETER ERROR:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getMasterComponents = async (req, res) => {
  try {
    const client = req.supabase;

    const { data, error } = await client
      .from("master_components")
      .select("id, name, icon")
      .order("id");

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

export const createServiceHistory = async (req, res) => {
  try {
    const client = req.supabase;

    const {
      vehicle_id,
      component_id,
      service_type,
      detail,
      service_date,
      odometer,
      workshop_name,
      cost,
      status,
    } = req.body;

    const { data, error } = await client
      .from("service_history")
      .insert({
        vehicle_id,
        component_id,
        service_type,
        detail,
        service_date,
        odometer,
        workshop_name,
        cost,
        status,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    await generateNotifications(client, vehicle_id);

    return res.status(201).json({
      message: "Riwayat servis berhasil ditambahkan",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const getServiceHistory = async (req, res) => {
  try {
    // console.log("========== SERVICE HISTORY ==========");
    // console.log("BODY:", req.body);
    // console.log("USER:", req.user);
    // console.log("====================================");

    const client = req.supabase;
    const { vehicleId } = req.params;

    const { data, error } = await client
      .from("service_history")
      .select(
        `
        *,
        master_components (
          id,
          name,
          icon
        )
      `,
      )
      .eq("vehicle_id", vehicleId)
      .order("service_date", { ascending: false });

    if (error) {
      console.log("ERROR:", error);

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

export const updateServiceHistory = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const client = req.supabase;
    const { id } = req.params;

    const {
      vehicle_id,
      component_id,
      service_type,
      detail,
      status,
      service_date,
      odometer,
      workshop_name,
      cost,
    } = req.body;

    const updateData = {
      component_id: service_type === "Servis Rutin" ? component_id : null,
      detail: service_type === "Perbaikan" ? detail : null,
      service_type,
      status,
      service_date,
      odometer,
      workshop_name,
      cost,
      updated_at: new Date(),
    };

    const { data, error } = await client
      .from("service_history")
      .update(updateData)
      .eq("id", id)
      .eq("vehicle_id", vehicle_id)
      .select()
      .single();

    if (
      !error &&
      status === "Selesai" &&
      service_type === "Servis Rutin" &&
      component_id
    ) {
      const { data: master } = await client
        .from("master_components")
        .select("max_days, max_km")
        .eq("id", component_id)
        .single();

      if (master) {
        await client
          .from("vehicle_components")
          .update({
            remaining_days: master.max_days,
            remaining_km: master.max_km,

            service_days: 0,
            used_km: 0,

            last_replaced_date: service_date,
            last_replaced_odometer: odometer,

            last_day_update: service_date,
            last_odometer_update: odometer,
          })
          .eq("vehicle_id", vehicle_id)
          .eq("component_id", component_id);
      }
    }

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    await generateNotifications(client, vehicle_id);

    return res.status(200).json({
      message: "Riwayat servis berhasil diperbarui",
      data,
    });
  } catch (err) {
    console.log("UPDATE SERVICE ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const deleteServiceHistory = async (req, res) => {
  try {
    const client = req.supabase;
    const { id } = req.params;

    const { error } = await client
      .from("service_history")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Riwayat servis berhasil dihapus",
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

export const generateNotifications = async (client, vehicleId) => {
  // console.log("================================");
  // console.log("GENERATE NOTIFICATIONS");
  // console.log("VEHICLE ID:", vehicleId);
  // console.log("================================");

  const { data: components } = await client
    .from("vehicle_components")
    .select(
      `
      remaining_days,
      remaining_km,
      component_id,
      master_components!fk_component (
        id,
        name,
        icon,
        max_days,
        max_km
      )
    `,
    )
    .eq("vehicle_id", vehicleId);

  // console.log("COMPONENTS:", components);

  if (!components) return;

  const { data: before } = await client
    .from("notifications")
    .select("id")
    .eq("vehicle_id", vehicleId);

  // console.log("BEFORE DELETE:", before?.length);

  const { error: deleteError } = await client
    .from("notifications")
    .delete()
    .eq("vehicle_id", vehicleId);

  // console.log("DELETE ERROR:", deleteError);

  const { data: after } = await client
    .from("notifications")
    .select("id")
    .eq("vehicle_id", vehicleId);

  // console.log("AFTER DELETE:", after?.length);

  // console.log("DELETE ERROR:", deleteError);

  for (const item of components) {
    const master = Array.isArray(item.master_components)
      ? item.master_components[0]
      : item.master_components;

    const kmPercent = (item.remaining_km / master.max_km) * 100;
    const dayPercent = (item.remaining_days / master.max_days) * 100;

    const healthPercent = (kmPercent + dayPercent) / 2;

    let severity = null;
    let message = null;

    // console.log("COMPONENT:", master.name);
    // console.log("remaining_days:", item.remaining_days);
    // console.log("remaining_km:", item.remaining_km);
    // console.log("healthPercent:", healthPercent);

    if (
      healthPercent <= 20 ||
      item.remaining_km <= 0 ||
      item.remaining_days <= 0
    ) {
      severity = "Darurat";

      if (item.remaining_km <= 0) {
        message = `Sudah melewati ${Math.abs(item.remaining_km)} km, ganti ${master.name.toLowerCase()} sekarang`;
      } else if (item.remaining_days <= 0) {
        message = `Sudah melewati ${Math.abs(item.remaining_days)} hari, ganti ${master.name.toLowerCase()} sekarang`;
      } else {
        message = `Ganti ${master.name.toLowerCase()} sekarang`;
      }
    } else if (healthPercent <= 40 || kmPercent <= 30 || dayPercent <= 30) {
      severity = "Mendesak";
      if (kmPercent <= 30) {
        message = `${item.remaining_km} km lagi menuju penggantian`;
      } else if (dayPercent <= 30) {
        message = `Perlu penggantian dalam ${item.remaining_days} hari`;
      } else {
        message = "Perlu dijadwalkan servis";
      }
    } else if (healthPercent <= 60 || kmPercent <= 50 || dayPercent <= 50) {
      severity = "Segera";

      if (kmPercent <= 50) {
        message = `${item.remaining_km} km lagi menuju pengecekan`;
      } else if (dayPercent <= 50) {
        message = `Lakukan pengecekan dalam ${item.remaining_days} hari`;
      } else {
        message = "Lakukan pengecekan segera`;";
      }
    }

    if (!severity) continue;

    console.log("INSERT NOTIFICATION:", {
      vehicle_id: vehicleId,
      component_id: master.id,
      severity,
      title: master.name,
      message,
    });

    const { data: notifData, error: notifError } = await client
      .from("notifications")
      .insert({
        vehicle_id: vehicleId,
        component_id: master.id,
        severity,
        title: master.name,
        message,
      })
      .select();

    // console.log("NOTIF DATA:", notifData);
    // console.log("NOTIF ERROR:", notifError);
  }
};

export const getNotifications = async (req, res) => {
  const { vehicleId } = req.params;

  // console.log("GET NOTIFICATIONS VEHICLE:", vehicleId);

  const { data, error } = await req.supabase
    .from("notifications")
    .select(
      `
  *,
  master_components!component_id (
    icon,
    name
  )
`,
    )
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  // console.log("NOTIF DATA:", data);
  // console.log("NOTIF ERROR:", error);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json(data);
};
