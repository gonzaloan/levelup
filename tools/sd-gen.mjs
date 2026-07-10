#!/usr/bin/env node
/* Local Stable Diffusion (Automatic1111 @ :7860) txt2img generator.
   Project-owned decorative art ONLY (bosses/heroes/concept art/logos) — never diagrams.
   Usage: node tools/sd-gen.mjs '<json spec path>'  OR  single inline via flags.
   Writes PNG to research/sd-gen/, no external deps. */
import { writeFileSync, readFileSync } from "node:fs";
import { Buffer } from "node:buffer";

const SD = process.env.SD_URL || "http://127.0.0.1:7860";
const MODEL = "sd\dreamshaperXL_lightningDPMSDE.safetensors [fdbe56354b]";

const NEG = "text, watermark, signature, blurry, jpeg artifacts, deformed, extra limbs, low quality, ugly, oversaturated, logo text, letters";

async function gen({ prompt, negative = NEG, width = 768, height = 768, steps = 8, cfg = 2, seed = 12345, out }) {
  const body = {
    prompt, negative_prompt: negative,
    width, height, steps, cfg_scale: cfg, seed,
    sampler_name: "DPM++ SDE", scheduler: "Karras",
    override_settings: { sd_model_checkpoint: MODEL },
    override_settings_restore_afterwards: true,
  };
  const r = await fetch(`${SD}/sdapi/v1/txt2img`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`SD ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const png = Buffer.from(j.images[0], "base64");
  writeFileSync(out, png);
  console.log(`OK ${out} (${png.length} bytes)`);
}

const arg = process.argv[2];
if (arg && arg.endsWith(".json")) {
  const specs = JSON.parse(readFileSync(arg, "utf8"));
  for (const s of specs) await gen(s);
} else {
  // smoke test
  await gen({
    prompt: "epic dark fantasy boss creature, complexity golem made of tangled circuit-board and glowing azure runes, dramatic rim light, deep navy background, painterly game key art, centered",
    seed: 777, out: "research/sd-gen/_smoke.png",
  });
}
