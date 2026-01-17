import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOST = "fbcdn.net";
const PLACEHOLDER_PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

const isAllowedHost = (hostname) => hostname.toLowerCase().endsWith(ALLOWED_HOST);

const buildProxyUrl = (url) => `/api/image-cache?url=${encodeURIComponent(url)}`;

const normalizeExtension = (contentType) => {
  const raw = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
  if (!raw) return "jpg";
  if (raw === "jpeg") return "jpg";
  return raw;
};

const readUrlParam = (raw) => {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
};

const validateUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return { error: "Invalid url" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { error: "Invalid url protocol" };
  }

  if (!isAllowedHost(parsed.hostname)) {
    return { error: "Host not allowed" };
  }

  return { parsed };
};

const buildWeservUrl = (url) => {
  const stripped = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(stripped)}`;
};

const fetchImage = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "image/*,*/*;q=0.8",
      Referer: "https://www.facebook.com/",
    },
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, status: 415 };
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    return { ok: false, status: 413 };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return { ok: false, status: 413 };
  }

  return { ok: true, buffer, contentType };
};

const fetchImageWithFallback = async (url) => {
  const primary = await fetchImage(url);
  if (primary.ok) return primary;
  const fallback = await fetchImage(buildWeservUrl(url));
  if (fallback.ok) return fallback;
  return primary;
};

const sendPlaceholder = (res) => {
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "public, max-age=600");
  return res.status(200).send(PLACEHOLDER_PIXEL);
};

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rawUrl = readUrlParam(req.query?.url);
    if (!rawUrl) {
      return sendPlaceholder(res);
    }

    const validation = validateUrl(rawUrl);
    if (validation.error) {
      return sendPlaceholder(res);
    }

    try {
      const result = await fetchImageWithFallback(rawUrl);
      if (!result.ok) return sendPlaceholder(res);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).send(result.buffer);
    } catch (error) {
      const message = error?.message ? String(error.message) : "Unknown error";
      console.error("[image-cache] proxy error:", message);
      return sendPlaceholder(res);
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { url, petId } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const validation = validateUrl(url);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({ url: buildProxyUrl(url), cached: false, proxied: true });
  }

  try {
    const result = await fetchImageWithFallback(url);
    if (!result.ok) {
      return res.status(200).json({ url: buildProxyUrl(url), cached: false, proxied: true, status: result.status });
    }

    const ext = normalizeExtension(result.contentType);
    const hash = crypto.createHash("sha256").update(url).digest("hex");
    const filePath = `external-cache/${hash}.${ext}`;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { error: uploadError } = await supabase.storage
      .from("pet-photos")
      .upload(filePath, result.buffer, {
        contentType: result.contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("[image-cache] upload error:", uploadError.message);
      return res.status(200).json({ url: buildProxyUrl(url), cached: false, proxied: true });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("pet-photos")
      .getPublicUrl(filePath);

    if (!publicUrl) {
      return res.status(200).json({ url: buildProxyUrl(url), cached: false, proxied: true });
    }

    if (petId) {
      await supabase.from("pets").update({ image_url: publicUrl }).eq("id", petId);
    }

    return res.status(200).json({ url: publicUrl, cached: true });
  } catch (error) {
    const message = error?.message ? String(error.message) : "Unknown error";
    console.error("[image-cache] error:", message);
    return res.status(500).json({ error: message });
  }
}
