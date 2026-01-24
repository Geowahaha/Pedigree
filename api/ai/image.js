import Replicate from "replicate";

const DEFAULT_MODEL = "google/nano-banana";
const DEFAULT_VERSION = "zbw2b1aw05rma0cs29aa12r310";

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
  if (typeof prompt === "string" && promptKey) {
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
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return null;
};

export default async function handler(req, res) {
  const token = process.env.REPLICATE_API_TOKEN;
  const version = process.env.REPLICATE_IMAGE_VERSION || DEFAULT_VERSION;
  const model = process.env.REPLICATE_IMAGE_MODEL || DEFAULT_MODEL;
  const useVersion = process.env.REPLICATE_IMAGE_USE_VERSION === "true";
  const imageKey = process.env.REPLICATE_IMAGE_IMAGE_KEY || "reference_images";
  const promptKey = process.env.REPLICATE_IMAGE_PROMPT_KEY || "prompt";
  const defaults = parseJson(process.env.REPLICATE_IMAGE_INPUT_DEFAULTS);

  const replicate = token ? new Replicate({ auth: token }) : null;

  if (!token) {
    return res.status(500).json({ error: "Server Configuration Error: REPLICATE_API_TOKEN missing" });
  }
  if (!version && !model) {
    return res.status(500).json({ error: "Server Configuration Error: REPLICATE_IMAGE_VERSION missing" });
  }

  try {
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

    const { prompt, input, imageUrl, referenceImages } = req.body || {};
    const normalizedImages = normalizeReferenceImages(referenceImages || imageUrl);
    const resolvedPrompt = typeof prompt === "string" ? prompt : "";

    const payload = {
      input: buildInput({
        imageValue: normalizedImages,
        prompt: resolvedPrompt,
        extraInput: typeof input === "object" && input ? input : {},
        imageKey,
        promptKey,
        defaults,
      }),
    };

    const data = useVersion
      ? await replicate.predictions.create({ version, ...payload })
      : await replicate.predictions.create({ model, ...payload });

    return res.status(200).json({
      id: data.id,
      status: data.status,
      output: data.output,
      error: data.error || null,
    });
  } catch (error) {
    const message = error?.message ? String(error.message) : "Image generation failed";
    const status = error?.statusCode || 500;
    console.error("[AI Image] Error:", message);
    return res.status(status).json({ error: message });
  }
}
