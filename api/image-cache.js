import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_BYTES = 8 * 1024 * 1024;

const isAllowedHost = (hostname) => hostname.toLowerCase().endsWith("fbcdn.net");

const normalizeExtension = (contentType) => {
  const raw = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (!raw) return "jpg";
  if (raw === "jpeg") return "jpg";
  return raw;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { url, petId } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return res.status(400).json({ error: "Invalid url protocol" });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return res.status(400).json({ error: "Host not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Storage not configured" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(422).json({ error: "Image fetch failed", status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(415).json({ error: "Unsupported content type" });
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return res.status(413).json({ error: "Image too large" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: "Image too large" });
    }

    const ext = normalizeExtension(contentType);
    const hash = crypto.createHash("sha256").update(url).digest("hex");
    const filePath = `external-cache/${hash}.${ext}`;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error: uploadError } = await supabase.storage
      .from("pet-photos")
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[image-cache] upload error:", uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("pet-photos")
      .getPublicUrl(filePath);

    if (petId && publicUrl) {
      await supabase.from("pets").update({ image_url: publicUrl }).eq("id", petId);
    }

    return res.status(200).json({ url: publicUrl, cached: true });
  } catch (error) {
    const message = error?.message ? String(error.message) : "Unknown error";
    console.error("[image-cache] error:", message);
    return res.status(500).json({ error: message });
  }
}
