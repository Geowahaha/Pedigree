import Replicate from "replicate";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";

const localEnvPath = path.resolve(process.cwd(), '.env.local');
console.log('Checking for .env.local at:', localEnvPath);

if (fs.existsSync(localEnvPath)) {
    console.log('Found .env.local, loading...');
    const result = dotenv.config({ path: localEnvPath, override: true }); // override needed if defaults exist
    if (result.error) console.error('Error loading .env.local:', result.error);
} else {
    console.log('.env.local not found, trying .env');
    dotenv.config();
}

const token = process.env.REPLICATE_API_TOKEN;
console.log('Token loaded:', token ? `${token.substring(0, 5)}...` : 'NONE');

if (!token) {
    console.error('Error: REPLICATE_API_TOKEN is missing in process.env');
    process.exit(1);
}

const replicate = new Replicate({
    auth: token,
});

async function testMagicPhoto() {
    console.log("Testing Replicate API - Magic Photo (Image-to-Video)...");

    try {
        // 1. Get the latest model version dynamically
        console.log("Fetching latest model version for 'stability-ai/stable-video-diffusion'...");
        const model = await replicate.models.get("stability-ai", "stable-video-diffusion");
        const latestVersion = model.latest_version;

        if (!latestVersion) {
            console.error("Error: Could not find latest version for model.");
            return;
        }
        console.log(`Using model version: ${latestVersion.id}`);

        // 2. Run the prediction
        const output = await replicate.run(
            `stability-ai/stable-video-diffusion:${latestVersion.id}`,
            {
                input: {
                    input_image: "https://hips.hearstapps.com/hmg-prod/images/dog-puppy-on-garden-royalty-free-image-1586966191.jpg",
                    video_length: "25_frames_with_svd_xt", // Correct enum value
                    sizing_strategy: "maintain_aspect_ratio",
                    frames_per_second: 6,
                    motion_bucket_id: 127,
                    cond_aug: 0.02
                }
            }
        );

        console.log("Success! Output:", output);
    } catch (error: any) {
        console.error("Error running Replicate:", error.message || error);
        if (error.response) {
            // console.error("Response data:", await error.response.json()); // If it's a fetch response
        }
    }
}

testMagicPhoto();
