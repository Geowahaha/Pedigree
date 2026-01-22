import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const RATE_LIMIT_MAX = Number(process.env.AI_VIDEO_RATE_LIMIT_MAX || 5);
const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.AI_VIDEO_RATE_LIMIT_WINDOW_MINUTES || 60);

const parseJson = (raw) => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const buildInput = ({ imageValue, prompt, extraInput, imageKey, promptKey, defaults }) => {
  const input = { ...defaults, ...(extraInput || {}) };
  if (imageValue && imageKey) {
    input[imageKey] = imageValue;
  }
  if (prompt && promptKey) {
    input[promptKey] = prompt;
  }
  return input;
};

const normalizeReferenceImages = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const items = value.filter((item) => typeof item === "string" && item.trim().length > 0);
    return items.length > 0 ? items : null;
  }
  if (typeof value === "string") {
    return [value];
  }
  return null;
};

const getBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
};

const requireAuthorizedProfile = async (req) => {
  if (!supabaseAdmin) {
    return { error: { status: 500, message: "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY missing" } };
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return { error: { status: 401, message: "Missing auth token" } };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData?.user) {
    return { error: { status: 401, message: "Invalid or expired session" } };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, verified_breeder, email")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: { status: 403, message: "Profile not found" } };
  }

  const isAdmin = profile.role === "admin";
  const isPaid = profile.verified_breeder === true;

  if (!isAdmin && !isPaid) {
    return { error: { status: 403, message: "AI video generation is available for Pro/Admin accounts only." } };
  }

  return { user: authData.user, profile, isAdmin };
};

const enforceRateLimit = async (userId, isAdmin) => {
  if (isAdmin) return null;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("ai_video_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    return { status: 500, message: "Unable to check rate limits." };
  }

  if ((count || 0) >= RATE_LIMIT_MAX) {
    return {
      status: 429,
      message: `Rate limit exceeded. Try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
    };
  }

  const modelLabel = process.env.REPLICATE_VIDEO_MODEL || process.env.REPLICATE_VIDEO_VERSION || null;
  const { error: insertError } = await supabaseAdmin
    .from("ai_video_usage")
    .insert({ user_id: userId, model_version: modelLabel });

  if (insertError) {
    return { status: 500, message: "Unable to record usage." };
  }

  return null;
};

export default async function handler(req, res) {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_VIDEO_VERSION;
  const model = process.env.REPLICATE_VIDEO_MODEL;
  const imageKey = process.env.REPLICATE_VIDEO_IMAGE_KEY || "reference_images";
  const promptKey = process.env.REPLICATE_VIDEO_PROMPT_KEY || "prompt";
  const defaults = parseJson(process.env.REPLICATE_VIDEO_INPUT_DEFAULTS);

  const replicate = token ? new Replicate({ auth: token }) : null;

  if (!token) {
    return res.status(500).json({ error: "Server Configuration Error: REPLICATE_API_TOKEN missing" });
  }
  if (!version && !model) {
    return res.status(500).json({ error: "Server Configuration Error: REPLICATE_VIDEO_VERSION or REPLICATE_VIDEO_MODEL missing" });
  }

  try {
    const auth = await requireAuthorizedProfile(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message });
    }

    if (req.method === "GET") {
      const id = req.query?.id;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Missing prediction id" });
      }

      const data = await replicate.predictions.get(id);
      return res.status(200).json({
        id: data.id,
        status: data.status,
        output: data.output,
        error: data.error || null,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const limitError = await enforceRateLimit(auth.user.id, auth.isAdmin);
    if (limitError) {
      return res.status(limitError.status).json({ error: limitError.message });
    }

    const { imageUrl, referenceImages, prompt, input } = req.body || {};
    const normalizedImages = normalizeReferenceImages(referenceImages || imageUrl);
    if (!normalizedImages || normalizedImages.length === 0) {
      return res.status(400).json({ error: "Missing reference image" });
    }

    const payload = {
      input: buildInput({
        imageValue: imageKey ? normalizedImages : null,
        prompt: typeof prompt === "string" ? prompt : "",
        extraInput: typeof input === "object" && input ? input : {},
        imageKey,
        promptKey,
        defaults,
      }),
    };

    const data = model
      ? await replicate.predictions.create({ model, ...payload })
      : await replicate.predictions.create({ version, ...payload });

    return res.status(200).json({
      id: data.id,
      status: data.status,
      output: data.output,
      error: data.error || null,
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : "Video generation failed";
    const status = error?.statusCode || 500;
    console.error("[AI Video] Error:", message);
    return res.status(status).json({ error: message });
  }
}
