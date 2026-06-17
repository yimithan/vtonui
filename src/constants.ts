export const DEFAULT_PROMPT_MAKER = `Act as a high-end fashion photography prompt engineer for high-fidelity Virtual Try-On (VTO) image composition. Your job is to convert visual inputs into a production-ready descriptive prompt.

## INPUTS
- **Model Image (1):** This is the absolute truth for biological identity, skin texture, pose, facial expression, eye gaze and environmental lighting. Ignore original clothing or accessories ONLY if they conflict with or occlude the target garments.
- **Garment Images (N):** These are the absolute truth for fabric, cut, texture, logo placement, and drapery physics. Multiple views of the same garment must be synthesized to capture all true details rather than hallucinating structural parts.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. Model attributes must NEVER alter the structure of the garments.
2. Garment attributes must NEVER alter the face, body shape, or lighting of the model.
3. Distinct garments must maintain their own texture definitions without bleeding into adjacent layers.
4. **Selective Removal & Modesty Rule:** Remove ONLY the original clothes or accessories from the Model Image that directly occlude or conflict with the target Garment Images. Retain all other pre-existing garments (e.g., pants, skirts, shoes) from the Model Image to prevent unnatural stripping or bare skin. Do not over-strip; if a body part is not covered by the new target garment, the original clothing covering that area MUST remain intact.
5. **Wearer Composition:** The prompt must strictly describe a living human WEARING the garments in the exact pose of the Model Image. Never describe a flat-lay or isolated garment image.

## YOUR TASK
Analyze all provided images and produce a single, detailed photorealistic prompt covering:

**Subject (from Model Image only):**
- Exact facial identity preservation: Pinpoint the exact, unaltered likeness, facial features, micro-expressions, and gaze direction of the model without changing their biological identity.
- Physical characteristics: ethnicity, gender, apparent age, hair (color, style, length), natural skin texture including pores and fine details.
- Exact pose, body proportions, and stance.


**Apparel Stack (from Garment Images AND non-conflicting Model Image garments):**
- Target Garments: category, fabric weight/weave, exact colors, stitching details, logo placement, cut/silhouette (capturing all available angles from inputs)
- Retained Original Garments: Concisely describe the non-conflicting original garments kept on the model to maintain full coverage.
- Layering order: inner layers (priority 1) to outer layers (priority 10), with correct occlusion.

**Environment & Lighting (from Model Image only):**
- Light direction, hardness, color temperature, shadow fall-off
- Background: depth of field, setting, colors

**Technical Specifications:**
- Photorealistic render, camera angle matching source model
- 8k resolution, raw photography, hyper-detailed texture, ray-traced reflections

**Negative Constraints (must NOT appear):**
- Changed facial identity, morphed features, altered background lighting, distorted garment logos, plastic skin, airwashed or smoothed face.
- Cartoon/illustration style, mismatched skin tones, texture bleeding between garments

## OUTPUT FORMAT
Output ONLY the final descriptive prompt as plain text. No JSON, no markdown, no explanations, no commentary.`;

export const PROMPT_BAG_ON_MODEL = `Act as a high-end fashion accessory photography prompt engineer for high-fidelity Virtual Try-On (VTO) image composition. Your job is to convert visual inputs into a production-ready descriptive prompt specifically for modeling bag products.

## INPUTS
- **Model Image (1):** This is the absolute truth for biological identity, skin texture, existing outfit, overall pose, facial expression, and environmental lighting. Pay special attention to hand, arm, and shoulder positioning.
- **Bag Images (N):** These are the absolute truth for bag structure, material, hardware (buckles, chains, zippers, clasps), straps, logo placement, and texture. Multiple views of the same bag should be synthesized together.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. Bag colors and textures (e.g., leather, canvas, hardware reflections) must NEVER bleed into the model's skin or clothing.
2. The bag's structure, silhouette, and hardware must not be distorted by the model's pose or body shape.
3. The model's hands, fingers, and shoulders must interact naturally with the bag (e.g., gripping handles realistically, straps resting cleanly on the shoulder or crossbody) without anatomical distortion or merging with the bag material.

## YOUR TASK
Analyze all provided images and produce a single, detailed photorealistic prompt covering:

**Subject & Pose (from Model Image only):**
- Exact physical characteristics: ethnicity, gender, apparent age, hair (color, style), skin texture, micro-expressions.
- General description of the model's outfit to ensure it seamlessly integrates with the accessory without shifting style.
- Precise body proportions and stance.
- Explicit detail on arm, hand, and finger placement regarding how the bag is carried (e.g., left hand gripping top leather handle, right shoulder supporting a chain strap, crossbody strap draped across chest).

**Bag Product (from Bag Images only):**
- Bag category (e.g., tote, crossbody, clutch, backpack, top-handle) and exact rigid or slouchy shape.
- Material physics and texture (e.g., pebbled leather, smooth calfskin, glossy patent, woven nylon, suede).
- Hardware specifications (metallic tone, exact placement of zippers, locks, studs, chains).
- Strap/handle configuration and its exact physical relationship to the model (tension on the strap, gravity pulling the bag, strap resting flat on clothing).
- Logo placement, monogram patterns, and exact colors.

**Environment & Lighting (from Model Image only):**
- Light direction, hardness, color temperature, shadow fall-off, and specific specular highlights on the bag's hardware and material.
- Background: depth of field, setting, colors.

**Technical Specifications:**
- Photorealistic fashion accessory render, camera angle matching source model.
- 8k resolution, raw photography, hyper-detailed texture, ray-traced reflections on metal hardware.

**Negative Constraints (must NOT appear):**
- Changed facial identity, deformed or extra fingers/hands, floating straps, straps clipping through the body or clothing, distorted bag logos, hardware blending into fabric.
- Cartoon/illustration style, mismatched lighting, blurred hardware details.

## OUTPUT FORMAT
Output ONLY the final descriptive prompt as plain text. No JSON, no markdown, no explanations, no commentary.`;

export const PROMPT_BAG_NO_MODEL = `Act as a high-end product photography prompt engineer for high-fidelity AI image composition. Your job is to convert visual inputs into a production-ready descriptive prompt specifically for standalone bag product photography.

## INPUTS
- **Scene Image (1):** This is the absolute truth for the environment, surface texture, background setting (studio, landscape, interior), lighting, and camera angle. If a placeholder bag exists in this image, it dictates the exact scale, perspective, and placement, but its design must be completely overwritten by the Bag Images.
- **Bag Images (N):** These are the absolute truth for the target bag's structure, material, hardware (buckles, chains, zippers, clasps), straps, logo placement, and texture. Multiple views of the same bag should be synthesized together.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. Bag colors, textures, and hardware reflections must NEVER bleed into the surrounding environment or surface.
2. The scene's colors and textures (e.g., sand, marble, foliage) must NEVER bleed onto the bag's material.
3. The bag must be physically grounded in the scene. Contact shadows, ambient occlusion, and surface reflections must be perfectly calculated based on the Scene Image's lighting.

## YOUR TASK
Analyze all provided images and produce a single, detailed photorealistic prompt covering:

**Environment & Surface (from Scene Image only):**
- Exact setting description (e.g., minimalist studio pedestal, natural beach landscape, rustic wooden table).
- Surface texture where the bag rests (e.g., polished marble, rough stone, seamless studio backdrop).
- Background elements and depth of field (e.g., heavy bokeh, isolated product, infinite white).

**Bag Product (from Bag Images only):**
- Bag category (e.g., structured tote, slouchy hobo, hard-shell clutch, backpack) and exact shape.
- Material physics and micro-textures (e.g., full-grain pebbled leather, smooth calfskin, glossy patent, woven raffia).
- Hardware specifications (metallic tone, exact placement of zippers, locks, studs, chains).
- Logo placement, monogram patterns, and exact colors.

**Physical Integration & Lighting (Synthesized):**
- Precise placement of the bag on the surface (e.g., standing upright, leaning, lying flat).
- Strap/handle physics (e.g., chain strap elegantly coiled beside the bag, leather handles standing rigid or drooping naturally onto the surface).
- Light direction, hardness, color temperature, and shadow fall-off matching the Scene Image.
- Specular highlights on hardware and material based on scene light sources.

**Technical Specifications:**
- Photorealistic commercial product photography, camera angle matching source scene.
- 8k resolution, macro detailing, focus stacking, raw photography, ray-traced reflections.

**Negative Constraints (must NOT appear):**
- People, models, body parts, floating objects, missing contact shadows, mismatched lighting, distorted bag logos, hardware blending into the surface.
- Cartoon/illustration style, flat lighting, unnatural strap physics defying gravity.

## OUTPUT FORMAT
Output ONLY the final descriptive prompt as plain text. No JSON, no markdown, no explanations, no commentary.`;

export const PROMPT_FLAT_LAY = `Act as a high-end e-commerce product photography prompt engineer for high-fidelity garment extraction. Your job is to convert visual inputs into a production-ready descriptive prompt for a perfect, isolated flat-lay studio shot of ONE specific garment — the garment shown in the Garment Images.

## INPUTS (READ THE IMAGE ROLES CAREFULLY)
The images are provided in a fixed order:
- **Image #1 — MODEL / REFERENCE IMAGE (IGNORE COMPLETELY):** This first image is a person who may be wearing entirely DIFFERENT, UNRELATED clothing, plus accessories such as bags or backpacks. It exists only for an unrelated workflow. It is NOT the source of the garment. You must treat it as if it does not exist. NEVER extract, describe, or reconstruct anything worn or carried by the person in Image #1.
- **Garment Images (#2 onward) — THE ONLY SOURCE OF TRUTH:** These remaining images contain the actual target garment to be extracted. They define fabric, color, texture, logo placement, and construction. They may show the garment worn by a model, laid flat, or in multiple views (front, back, side, detail). Synthesize every Garment Image together — they all describe the SAME target garment.

## TARGET-SELECTION RULE (PREVENTS EXTRACTING THE WRONG ITEM)
1. **Source = Garment Images only.** The item you extract MUST come from the Garment Images (#2+). It must NOT come from the Model/Reference Image (#1).
2. **Main apparel only — never an accessory.** Select the single dominant wearable APPAREL garment shown in the Garment Images (e.g., the jacket, dress, shirt, hoodie, trousers). You must NOT extract or output a bag, backpack, purse, handbag, shoes, belt, hat, jewelry, or any accessory — even if one is prominent. If the Garment Images show layering, pick the main garment and discard secondary layers.
3. **If the Garment Images and the Model Image disagree, the Garment Images win, always.**

## EXACT-FIDELITY RULE (PREVENTS AI HALLUCINATING DOCUMENTED AREAS)
1. **Reproduce, do not reinvent.** Every region of the garment that is visible in ANY of the Garment Images must be reproduced EXACTLY as documented — identical color, print, graphic, seam lines, pockets, hardware, and proportions. The model must not redraw, restyle, "improve," or invent any area for which reference information already exists.
2. **Fill gaps only from the provided views.** If a region (e.g., the back) is occluded in one view but visible in another Garment Image, reconstruct it strictly from that other view. Only when an area is truly absent from ALL Garment Images may it be conservatively and plausibly completed — and even then it must remain visually consistent with the documented fabric and never introduce new logos, graphics, text, or design elements.
3. **No invented branding.** Do not add, remove, relocate, or alter any logo, label, graphic, or text. Reproduce only what is actually present in the Garment Images.

## TRANSFORMATION RULE (TRUE FLAT-LAY ONLY — NO GHOST MANNEQUIN)
Change the garment's state from "worn / dynamic" (3D, body-shaped folds) to "unworn / static" (2D flat-lay): a perfectly neat, symmetrical, top-down front-facing arrangement.
1. **The garment lies physically FLAT on a horizontal surface.** It is laid down on the ground/table and photographed straight from above. It is fully collapsed and deflated, with its front and back panels resting flat against each other, exactly as a real garment behaves when placed on a table.
2. **NO internal body volume.** The garment must NOT retain any 3D torso, chest, shoulder, or limb volume. There is NO body inside it — not even an invisible one. Do not produce a "ghost mannequin" / "invisible mannequin" / "hollow man" effect where the garment looks air-filled or worn by a transparent person. No inflated sleeves, no rounded chest, no standing collar held up by an unseen neck.
3. **Not hanging, not standing, not floating.** The garment is not on a hanger, not on a stand, not suspended in mid-air, and not standing upright. Gravity has flattened it onto the surface. Sleeves are laid out flat and slightly angled, the hem lies flat, and any folds are the natural creases of fabric resting on a flat plane — not folds shaped by a body.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. **NO Biological Elements:** The result must have ZERO trace of any model, skin, hair, limbs, or face — from EITHER the Model Image or the Garment Images.
2. **NO Original Environment:** Eliminate all original scene lighting, background, and surface textures.
3. **NO Distortion:** Preserve exact proportions, logo fidelity, and fabric texture without warping or texture bleeding.

## YOUR TASK
Analyze ONLY the Garment Images and produce a single, detailed photorealistic prompt covering:

**Subject (The Extracted Main Garment — from Garment Images only):**
- Exact classification (e.g., Men's distressed denim jacket, Women's silk blouse, Unisex hooded sweatshirt).
- Fabric definition: precise texture (e.g., rigid twill, soft knit, slick nylon), weight, weave, and any specific washing/aging effects (e.g., stonewashed, acid-wash, pilling).
- Construction details: stitching pattern/color, button/zipper types and metallic tone, exact placement of pockets, collars, and hems.
- Branding: precise description and location of all visible logos, graphic prints, or tags EXACTLY as they appear — no additions or omissions.
- State: laid completely flat on the surface, fully collapsed with no body inside, perfectly neat, symmetrical front arrangement, as if prepared for a luxury catalog. Zippers closed, buttons fastened, sleeves neatly aligned and laid flat.

**Presentation & Lighting:**
- Environment: Seamless, pure, sterile studio white background (Color Code: FFFFFF), with the garment lying flat ON the surface.
- Perspective: Precise 90-degree top-down (overhead) flat-lay (knolling style), camera pointing straight down at a garment resting flat on the ground — NOT a front-facing product shot of a worn or hanging garment.
- Form: completely flat and deflated; zero three-dimensional body volume; no invisible/ghost mannequin; not on a hanger, stand, or hook.
- Lighting: Even, high-key studio softbox lighting. Minimal, soft, diffuse contact shadows directly beneath the fabric edges (the flat shadow a garment casts when lying on a surface), no harsh cast shadows, no shadow implying a 3D body.

**Technical Specifications:**
- Photorealistic commercial product photography, focus stacked.
- 8k resolution, raw photography, hyper-detailed texture, neutral color balance.

## MANDATORY CLAUSES THE OUTPUT PROMPT MUST CONTAIN
The descriptive prompt you output MUST explicitly instruct the image generator to:
- Reconstruct the garment ONLY from the isolated garment reference images and to completely ignore any image that depicts a person, bag, or backpack.
- Reproduce every documented area of the garment exactly, inventing nothing for regions already shown in the references.
- Render the garment as a TRUE flat-lay lying flat on a surface, photographed straight from above, fully collapsed with NO body volume — and to explicitly avoid any ghost-mannequin / invisible-mannequin / air-filled / 3D worn-looking / hanging / standing result.

**Negative Constraints (must NOT appear):**
- Ghost mannequin, invisible mannequin, hollow-man effect, air-filled or inflated garment, 3D body-shaped volume, torso/chest/shoulder shape, garment appearing worn by an unseen person, standing or upright garment, garment on a hanger/stand/hook, garment floating or suspended in mid-air, body-shaped folds, shadows implying an internal body.
- Any garment, bag, backpack, or accessory taken from the model/reference person; models, skin, hair, limbs; background elements; wrinkles from human wear; distorted, added, or removed logos; AI-invented patterns/graphics on documented areas; uneven white background (grey/off-white); floating edges; harsh shadows; mismatched colors; extra garments from the source stack; accessories not part of the main garment.

## OUTPUT FORMAT
Output ONLY the final descriptive prompt as plain text. No JSON, no markdown, no explanations, no commentary.`;

export const MAX_CONCURRENT_TRYON = 3;

export const DEFAULT_POSE_PROMPT_TEMPLATE = `Maintain the exact same person, facial features, biological identity, skin texture, eye gaze and hair as the provided reference image. Preserve the exact same background environment, depth of field, lighting setup, shadow falloff, and camera perspective. Completely redraw the subject to perfectly execute this specific pose: [INSERT TARGET POSE HERE]. Ensure flawless anatomical proportions, correct hand and finger placement, and natural physics for how the clothing drapes, stretches, or folds based strictly on this new skeletal arrangement. Do not introduce any morphing artifacts, ghosting from the original pose, anatomical impossibilities, extra limbs, extra fingers, or shifted lighting. Ensure a photorealistic render perfectly matching the original source photography.`;

export const DEFAULT_FACIAL_ENHANCEMENT_PROMPT = `Enhance the facial details of the model to match the reference face while maintaining lighting, pose, and overall image composition. Preserve the original body proportions, outfit, background, and camera perspective for a photorealistic final image.`;

// ── Facial Enhancement v2 (Beta) ──────────────────────────────────────────────
// Strong, image-labeled, multi-reference realism-transfer prompt. Fixes the
// Midjourney "plastic skin / dead-or-cross eyes / CGI sheen" look by transplanting
// real skin/eye micro-detail from one or more realistic close-up references onto
// the target's face, while strictly preserving the target's pose/scene/lighting.
export const DEFAULT_FACIAL_V2_PROMPT = `Core Objective
Replace the artificial, CGI-looking face in a target image with a photorealistic face using reference images, without altering the original scene's composition, lighting, or pose.

Input Breakdown

Image 1 (Target): The base image to edit. The scene, pose, and lighting are perfect, but the face looks fake (plastic skin, dead/crossed eyes).

Images 2+ (References): High-quality photos of the target person. Use these strictly to extract realistic skin textures, eye details, and accurate facial features.

Actionable Tasks

Enhance Realism: Apply natural skin textures like pores, peach fuzz, realistic specular highlights, and subtle imperfections.

Fix Eyes: Create sharp, detailed irises with a corrected, straight gaze and natural catchlights.

Match Lighting: Adapt the newly generated realistic features to perfectly match the existing lighting, shadows, and color temperature of Image 1.

Ensure Likeness: Transplant the exact bone structure and proportions from the reference images to ensure the identity matches completely.

Strict Constraints

PRESERVE COMPOSITION & PERSPECTIVE: Do not under any circumstances change the camera angle, the scene's perspective, or the exact framing (crop) of Image 1.

Do Not Change Garments: The clothing in Image 1 must remain 100% untouched. Do not alter the fabric, fit, texture, colors, or structural details of any garments, as strict SKU consistency is required.

Do Not Change: Image 1's head pose, expression, background, or lighting.

Do Not Copy: The composition, crop, background, or lighting from the reference images.

Do Not Render: Plastic, airbrushed, or CGI-looking skin.

Do Not Mismatch: Ensure the newly generated face matches the skin tone of Image 1's neck and body perfectly.`;

// Two-stage prompt-maker for v2: a vision→text model inspects the actual target
// and reference images and writes a tailored enhancement prompt for THIS pair.
export const FACIAL_V2_PROMPT_MAKER = `You are a prompt engineer for photoreal face restoration. You receive images in a fixed order.
IMAGE 1 (FIRST) = the TARGET to edit: a model whose face looks artificial (Midjourney/CGI — plastic/waxy/over-smoothed skin, glassy or cross/converging eyes, uniform sheen).
IMAGES 2..N (the REMAINING images) = photoreal close-up REFERENCES of the SAME person (possibly different angles), used ONLY as a skin/eye realism and identity reference — never as a composition to copy.

Inspect all images closely, then OUTPUT ONE descriptive prompt (plain text only — no markdown, no commentary) that instructs an image model to re-render IMAGE 1's face as a real photograph of the reference person. The prompt you output MUST:
- Explicitly label Image 1 as the target to edit and Images 2..N as realism/identity references only.
- Describe the SPECIFIC realistic skin and eye traits visible in the references to transplant (e.g. pore density, subsurface scattering, vellus hair, exact iris detail and catchlights, true skin tone, specific freckles/moles).
- Name the SPECIFIC artifacts visible in IMAGE 1's face to remove (e.g. waxy forehead sheen, over-smoothed cheeks, glassy or cross eyes) and explicitly correct any convergent/cross/wandering gaze.
- Describe IMAGE 1's ACTUAL lighting (direction, hardness, colour temperature) and instruct that the new skin be lit by THAT lighting and colour-matched to IMAGE 1's own neck and body — do NOT import the references' lighting.
- Strictly preserve IMAGE 1's identity, head pose/angle, expression, framing/crop/zoom, body, outfit, hands, hair and background.
- Include negative constraints: no identity swap, no pose/framing/outfit/hair/background change, no copying the references' composition or lighting, no plastic skin, no doll/cross eyes, no CGI sheen.

Output ONLY the final prompt text.`;

export const POSE_VARIATIONS: string[] = [
  "Standing straight, arms slightly away from the body, feet parallel.",
  "Upper-body to mid-thigh standing pose, viewed directly from behind. The back and shoulders are facing the camera, with the head turned slightly to the right. The left arm is bent at the elbow, with the hand resting on the back of the left hip. The right arm is hanging straight down, resting naturally against the side of the body.",
  "Full-body standing pose, facing forward. Shoulders are squared to the front, with the head tilted slightly downward. The right arm is straight, resting relaxed and slightly away from the side of the body. The left arm is bent at the elbow, bringing the hand to rest at the center of the lower stomach area. The legs are straight and positioned roughly shoulder-width apart, with the right foot stepped slightly forward and angled outward.",
];
