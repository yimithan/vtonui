export const DEFAULT_PROMPT_MAKER = `Act as a high-end fashion photography prompt engineer for high-fidelity Virtual Try-On (VTO) image composition. Your job is to convert visual inputs into a production-ready descriptive prompt.

## INPUTS
- **Model Image (1):** This is the absolute truth for biological identity, skin texture, pose, facial expression, eye gaze and environmental lighting.
- **Garment Images (N):** These are the absolute truth for fabric, cut, texture, logo placement, and drapery physics. Multiple garments form a layered stack (e.g., shirt + jacket). Multiple views of the same garment should be synthesized together.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. Model attributes must NEVER alter the structure of the garments.
2. Garment attributes must NEVER alter the face, body shape, or lighting of the model.
3. Distinct garments must maintain their own texture definitions without bleeding into adjacent layers.

## YOUR TASK
Analyze all provided images and produce a single, detailed photorealistic prompt covering:

**Subject (from Model Image only):**
- Exact physical characteristics: ethnicity, gender, apparent age, hair (color, style, length), micro-expressions, skin texture
- Exact pose, body proportions, and stance

**Apparel Stack (from Garment Images only):**
- For each garment: category, fabric weight/weave, exact colors, stitching details, logo placement, cut/silhouette
- Layering order: inner layers (priority 1) to outer layers (priority 10), with correct occlusion

**Environment & Lighting (from Model Image only):**
- Light direction, hardness, color temperature, shadow fall-off
- Background: depth of field, setting, colors

**Technical Specifications:**
- Photorealistic render, camera angle matching source model
- 8k resolution, raw photography, hyper-detailed texture, ray-traced reflections

**Negative Constraints (must NOT appear):**
- Changed facial identity, altered background lighting, distorted garment logos
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

export const PROMPT_FLAT_LAY = `Act as a high-end e-commerce product photography prompt engineer for high-fidelity Virtual Try-On (VTO) and garment extraction image composition. Your job is to convert visual inputs of garments (mostly worn by models in complex environments) into a production-ready descriptive prompt for a perfect, isolated flat-lay studio shot of a single item.

## INPUTS
- **Garment/Source Images (N):** These are the absolute truth for fabric, color, texture, logo placement, and construction details. These images typically feature garments worn by models, often layered (e.g., a jacket over a shirt). There may be multiple views (front, side, detail) of the same outfit.

## THE ISOLATION AND TRANSFORMATION RULE
1. **Identify the Main Garment:** Analyze the source images and select the *single most dominant* or *obvious main garment* for extraction (e.g., if a model wears a denim jacket over a t-shirt, the denim jacket is the main garment; if they wear a dress, the dress is the main garment). Discard other layered items, accessories, or background elements.
2. **Transform Perspective:** You must change the state of the garment from "worn and dynamic" (3D shape, body-shaped folds) to "unworn and static" (2D flat-lay). The garment must be presented as a perfectly neat, symmetrical, top-down front-shot.

## ZERO-BLEED CONSTRAINTS (CRITICAL)
1. **NO Biological Elements:** The resulting image must have ZERO trace of the model, skin, hair, limbs, or face.
2. **NO Original Environment:** The original scene lighting, background elements, or surface textures must be completely eliminated.
3. **NO Distortion:** The extraction process must maintain the exact proportions, logo fidelity, and fabric texture of the original garment without warping or texture bleeding.

## YOUR TASK
Analyze all provided images and produce a single, detailed photorealistic prompt covering:

**Subject (The Extracted Main Garment):**
- Exact classification (e.g., Men's distressed denim jacket, Women's silk blouse, Unisex hooded sweatshirt).
- Fabric definition: precise texture (e.g., rigid twill, soft knit, slick nylon), weight, weave, and any specific washing/aging effects (e.g., stonewashed, acid-wash, pilling).
- Construction details: stitching pattern/color, button/zipper types and metallic tone, exact placement of pockets, collars, and hems.
- Branding: precise description and location of all visible logos, graphic prints, or tags.
- State: perfectly neat, symmetrical front arrangement, as if prepared for a luxury catalog. Zippers should be closed, buttons fastened, and sleeves neatly aligned.

**Presentation & Lighting:**
- Environment: Seamless, pure, sterile studio white background (Color Code: FFFFFF).
- Perspective: Precise 90-degree top-down (overhead) flat-lay (knolling style).
- Lighting: Even, high-key studio softbox lighting. Minimal, soft, diffuse contact shadows directly beneath the edges of the fabric for depth, but no harsh cast shadows.

**Technical Specifications:**
- Photorealistic commercial product photography, focus stacked.
- 8k resolution, raw photography, hyper-detailed texture, neutral color balance.

**Negative Constraints (must NOT appear):**
- Models, skin, hair, limbs, background elements, wrinkles caused by human wear, distorted logos, uneven white background (grey/off-white), floating edges, harsh shadows.
- Mismatched colors, extra garments from the source stack, accessories not part of the main garment.

## OUTPUT FORMAT
Output ONLY the final descriptive prompt as plain text. No JSON, no markdown, no explanations, no commentary.`;

export const COOLDOWN_SUCCESS_SECONDS = 120;
export const COOLDOWN_ERROR_SECONDS = 10;
export const MAX_CONCURRENT_TRYON = 3;

export const DEFAULT_POSE_PROMPT_TEMPLATE = `Maintain the exact same person, facial features, biological identity, skin texture, eye gaze and hair as the provided reference image. Preserve the exact same background environment, depth of field, lighting setup, shadow falloff, and camera perspective. Completely redraw the subject to perfectly execute this specific pose: [INSERT TARGET POSE HERE]. Ensure flawless anatomical proportions, correct hand and finger placement, and natural physics for how the clothing drapes, stretches, or folds based strictly on this new skeletal arrangement. Do not introduce any morphing artifacts, ghosting from the original pose, anatomical impossibilities, extra limbs, extra fingers, or shifted lighting. Ensure a photorealistic render perfectly matching the original source photography.`;

export const DEFAULT_FACIAL_ENHANCEMENT_PROMPT = `Enhance the facial details of the model to match the reference face while maintaining lighting, pose, and overall image composition. Preserve the original body proportions, outfit, background, and camera perspective for a photorealistic final image.`;

export const POSE_VARIATIONS_SET_1: string[] = [
  "Standing straight, arms fully relaxed at sides, feet together.",
  "Standing straight, arms hanging loose, feet shoulder-width apart.",
  "Standing straight, arms slightly away from the body, feet parallel.",
  "Standing straight, one arm slightly bent at the elbow, feet together.",
  "Standing straight, both arms softly bent at the elbows, feet apart.",
  "Standing, right hand fully in front pocket, left arm relaxed.",
  "Standing, left hand fully in front pocket, right arm relaxed.",
  "Standing, right thumb hooked in front pocket, left arm relaxed.",
  "Standing, left thumb hooked in front pocket, right arm slightly bent.",
  "Standing, right hand in back pocket, left arm hanging straight.",
  "Standing, both hands fully submerged in front pockets, shoulders relaxed.",
  "Standing, both thumbs hooked into front pockets, elbows slightly flared.",
  "Standing, both hands half-way in front pockets, leaning slightly forward.",
  "Standing, both hands in back pockets, chest pushed out slightly.",
  "Standing, both thumbs hooked into back pockets, shoulders pulled back.",
  "Standing, arms tightly crossed over the chest, feet planted wide.",
  "Standing, arms loosely folded at mid-torso, feet together.",
  "Standing, one arm crossing the stomach, the other resting on top.",
  "Standing, arms crossed low near the waistline, relaxed posture.",
  "Standing, arms crossed high on the chest, leaning slightly back.",
  "Standing, weight entirely on right leg, left leg slightly bent at the knee.",
  "Standing, weight entirely on left leg, right foot resting on the toe.",
  "Standing, weight shifted back to the right leg, hips pushed to the right.",
  "Standing, weight shifted to the left leg, right leg crossed lightly over the left ankle.",
  "Standing, weight on the right leg, left foot out to the side.",
  "Walking forward, right foot landing, arms swinging naturally.",
  "Walking forward, left foot landing, right arm swinging forward.",
  "Walking forward slowly, short stride, arms held relatively still.",
  "Walking forward, long stride, shoulders slightly rotated.",
  "Walking forward casually, stopping mid-step with weight on the back foot.",
  "Stepping forward aggressively, right knee bent, torso leaning into the step.",
  "Stepping forward lightly, left toe pointed, right foot trailing.",
  "Mid-stride step, both feet off the ground for a fraction of a second.",
  "Wide step forward, planting the heel of the right foot.",
  "Short step forward, pushing off the toes of the left foot.",
  "Standing, both hands placed firmly on high hips, fingers pointing down.",
  "Standing, both hands on lower hips, thumbs wrapping forward.",
  "Standing, hands on waist, elbows pointing straight out to the sides.",
  "Standing, hands on hips, elbows pushed back to open the chest.",
  "Standing, fingers spread wide over the hip bones, relaxed shoulders.",
  "Right hand firmly on hip, left arm hanging completely straight.",
  "Left hand lightly on hip, right arm slightly bent at the side.",
  "Right hand on waist with fingers back, left arm relaxed.",
  "Left hand on lower hip, right hand resting lightly on the thigh.",
  "Right hand high on the waist, left arm hanging slightly behind the body.",
  "Torso leaning back slightly from the waist, feet shoulder-width.",
  "Leaning upper body back, one leg extended straight out front.",
  "Subtle backward lean, both arms hanging straight down the back line.",
  "Shoulders tilted back, chest elevated, legs perfectly straight.",
  "Leaning backward from the knees, creating a slight arch in the back.",
  "Sitting with both knees bent at 90 degrees, hands resting on thighs.",
  "Sitting, one leg crossed over the other knee, hands relaxed on lap.",
  "Sitting, ankles crossed, hands gripping the edge of the seat.",
  "Sitting, right leg extended straight, left knee bent, arms at sides.",
  "Sitting on the edge, leaning forward slightly with forearms on knees.",
  "Sitting on the floor, legs crossed in a relaxed posture, hands on knees.",
  "Sitting on the floor, one knee pulled up to the chest, arms wrapped around it.",
  "Sitting on the floor, both legs extended out, hands supporting weight behind.",
  "Sitting on the floor sideways, legs tucked gracefully to one side.",
  "Sitting on the floor, leaning heavily to the right, supported by the right arm.",
  "Right hand lightly touching the left collarbone area, left arm down.",
  "Left hand adjusting the neckline, fingers slightly curled, right arm down.",
  "Both hands softly gripping the front collar area, elbows down.",
  "Right thumb hooking into the neckline, left hand at the side.",
  "Left hand smoothing down the chest below the neckline, right arm relaxed.",
  "Right hand adjusting the left sleeve cuff, head neutral.",
  "Left hand gently holding the right sleeve cuff, elbows held close to the body.",
  "Right fingers buttoning or pinching the left cuff, shoulders squared.",
  "Left hand sliding up the right forearm near the cuff, relaxed stance.",
  "Both arms slightly bent in front, hands interacting with opposite cuffs.",
  "Hands clasped together with fingers intertwined resting in front of the pelvis.",
  "One hand holding the other wrist loosely in front of the waist.",
  "Palms resting over each other down at the center of the waist.",
  "Hands lightly touching fingertips together in front of the stomach.",
  "Left hand gripping right fingers loosely, held low in front.",
  "Standing tall, both hands clasped behind the lower back.",
  "Right hand holding the left wrist behind the back, chest open.",
  "Both arms resting comfortably behind the back, hands unclasped but touching.",
  "Hands clasped behind the back, leaning slightly forward from the waist.",
  "Left arm straight down behind the back, right hand holding the left fingers.",
  "Mid-air jump, both arms reaching straight up, legs perfectly straight and together.",
  "Mid-air jump, right leg bent at the knee, left leg straight, arms wide open.",
  "Mid-air jump, body tucked slightly, knees high, arms swinging forward.",
  "Mid-air jump, legs in a wide split, arms extended horizontally to the sides.",
  "Mid-air jump, arching the back, both legs kicking backwards, arms floating up.",
  "Deep forward lunge on the right leg, left arm reaching straight up to the ceiling.",
  "Deep side lunge to the left, right leg straight, both arms sweeping parallel to the ground.",
  "Low lunge on the right knee, torso twisted, left arm extending backward.",
  "Deep forward lunge, both arms extending rigidly out to the sides.",
  "Extreme low lunge, right hand touching the ground, left arm reaching vertically.",
  "Mid-spin, torso twisted sharply to the right, arms trailing behind the motion.",
  "Mid-spin on one foot, opposite leg swinging out, arms wrapped tightly to the chest.",
  "Rapid pivot, coat or fabric flaring out, arms fully extended outward from the spin.",
  "Sharp twisting motion, shoulders facing back, hips facing forward, arms loose.",
  "Turning abruptly, one heel planted, arms sweeping dramatically across the torso.",
  "Hands behind the head, elbows pointing sharply outward in a straight horizontal line.",
  "One arm framing the head with a sharp 90-degree bent elbow, the other hand on the hip.",
  "Both arms creating harsh triangles, hands resting flat on the shoulders.",
  "Deep squat, arms crossing aggressively to form straight angles in front of the knees.",
  "Body entirely rigid, arms held at exact 45-degree angles away from the hips, fingers perfectly stiff."
];

export const POSE_VARIATIONS_SET_2: string[] = [
  "Standing straight, arms fully relaxed at sides, feet together, neutral expression, gazing directly into the camera.",
  "Standing straight, arms hanging loose, feet shoulder-width apart, soft smile, looking slightly off-camera to the right.",
  "Standing straight, arms slightly away from the body, feet parallel, lips slightly parted, staring intently at the lens.",
  "Standing straight, one arm softly bent, feet together, chin tilted up, looking down at the camera with a confident smirk.",
  "Standing straight, both arms softly bent at the elbows, feet apart, relaxed face, eyes gazing thoughtfully downward.",
  "Standing, right hand fully in front pocket, left arm relaxed, serious expression, piercing eye contact.",
  "Standing, left hand fully in front pocket, right arm relaxed, subtle grin, looking toward the floor.",
  "Standing, right thumb hooked in front pocket, left arm relaxed, mouth closed, gazing softly to the left.",
  "Standing, left thumb hooked in front pocket, right arm slightly bent, chin lowered, glaring into the lens.",
  "Standing, right hand in back pocket, left arm hanging straight, playful smile, eyes looking up and away.",
  "Standing, arms tightly crossed over the chest, feet planted wide, stern expression, locking eyes with the camera.",
  "Standing, arms loosely folded at mid-torso, feet together, gentle smile, gazing softly at the lens.",
  "Standing, one arm crossing the stomach, the other resting on top, relaxed jaw, looking off to the right.",
  "Standing, arms crossed low near the waistline, relaxed posture, slight smirk, eyes cast downward.",
  "Standing, arms crossed high on the chest, leaning slightly back, confident expression, looking down the nose at the camera.",
  "Walking forward, right foot landing, arms swinging naturally, bright smile, looking straight ahead.",
  "Walking forward, left foot landing, right arm swinging forward, serious face, intense gaze into the camera.",
  "Walking forward slowly, short stride, arms held relatively still, lips parted, looking down at the feet.",
  "Walking forward, long stride, shoulders slightly rotated, fierce expression, looking off to the side.",
  "Walking forward casually, stopping mid-step with weight on the back foot, soft smirk, glancing over at the camera.",
  "Standing, both hands firmly on high hips, fingers pointing down, neutral face, staring dead ahead.",
  "Standing, both hands on lower hips, thumbs wrapping forward, slight smile, looking upwards.",
  "Standing, hands on waist, elbows pointing straight out to the sides, confident smirk, locking eyes with the lens.",
  "Standing, hands on hips, elbows pushed back to open the chest, relaxed jaw, gazing far off to the left.",
  "Right hand on hip, left arm hanging completely straight, lips slightly parted, staring intensely at the camera.",
  "Torso leaning back slightly from the waist, feet shoulder-width, chin raised, looking down at the camera with a neutral expression.",
  "Leaning upper body back, one leg extended straight out front, soft smile, looking directly at the lens.",
  "Subtle backward lean, both arms hanging straight down the back line, mouth closed, gazing thoughtfully to the right.",
  "Shoulders tilted back, chest elevated, legs perfectly straight, fierce expression, piercing eye contact.",
  "Leaning backward from the knees, creating a slight arch in the back, lips parted, eyes cast upwards.",
  "Sitting with both knees bent at 90 degrees, hands resting on thighs, neutral expression, looking straight at the camera.",
  "Sitting, one leg crossed over the other knee, hands relaxed on lap, gentle smile, looking off to the side.",
  "Sitting, ankles crossed, hands gripping the edge of the seat, serious face, intense stare into the lens.",
  "Sitting, right leg extended straight, left knee bent, arms at sides, relaxed jaw, gazing down at the floor.",
  "Sitting on the edge, leaning forward slightly with forearms on knees, confident smirk, making direct eye contact.",
  "Sitting on the floor, legs crossed in a relaxed posture, hands on knees, soft smile, looking straight ahead.",
  "Sitting on the floor, one knee pulled up to the chest, arms wrapped around it, thoughtful expression, looking away.",
  "Sitting on the floor, both legs extended out, hands supporting weight behind, neutral face, gazing upwards.",
  "Sitting on the floor sideways, legs tucked gracefully to one side, lips slightly parted, staring into the camera.",
  "Sitting on the floor, leaning heavily to the right, supported by the right arm, serious expression, looking down.",
  "Right hand lightly touching the left collarbone area, left arm down, soft smile, looking at the camera.",
  "Left hand adjusting the neckline, fingers slightly curled, right arm down, intense gaze, chin lowered.",
  "Both hands softly gripping the front collar area, elbows down, neutral expression, looking off to the right.",
  "Right hand adjusting the left sleeve cuff, head neutral, eyes focused downward on the hands.",
  "Left hand sliding up the right forearm near the cuff, relaxed stance, confident smirk, making direct eye contact.",
  "Hands clasped together with fingers intertwined resting in front of the pelvis, serene expression, looking straight ahead.",
  "One hand holding the other wrist loosely in front of the waist, slight smile, gazing softly to the left.",
  "Palms resting over each other down at the center of the waist, serious face, piercing eye contact.",
  "Hands lightly touching fingertips together in front of the stomach, lips parted, looking downwards.",
  "Left hand gripping right fingers loosely, held low in front, relaxed jaw, looking upwards.",
  "Body turned away, looking back over the right shoulder, neutral expression, direct eye contact.",
  "Body turned away, looking back over the left shoulder, soft smile, eyes gazing slightly downward.",
  "Back to the camera, head turned sharply to look over the right shoulder, fierce expression, intense stare.",
  "Back to the camera, head turned casually over the left shoulder, lips slightly parted, looking off to the side.",
  "Walking away, glancing back over the right shoulder, confident smirk, making eye contact with the lens.",
  "Right hand resting softly under the chin, left arm crossed, thoughtful expression, looking off to the side.",
  "Left index finger resting lightly on the cheek, right arm down, neutral face, staring directly into the camera.",
  "Right hand covering the mouth slightly, left arm relaxed, intense gaze, locking eyes with the lens.",
  "Left fist resting under the chin, elbow supported by the right hand, gentle smile, looking upwards.",
  "Right fingers brushing lightly against the jawline, lips slightly parted, looking down.",
  "Right hand reaching up, fingers lightly resting in the hair, left arm down, relaxed expression, making eye contact.",
  "Left hand running through the hair at the back of the neck, right hand on hip, soft smile, looking away.",
  "Right arm raised, hand resting on the top of the head, serious face, intense stare into the camera.",
  "Left hand lifting the hair slightly away from the face, neutral expression, eyes cast downward.",
  "Both hands gently gripping the hair near the temples, elbows out, fierce expression, piercing eye contact.",
  "Standing, both hands fully in back pockets, chest pushed out slightly, confident smile, looking straight ahead.",
  "Standing, both thumbs hooked into back pockets, shoulders pulled back, neutral face, gazing off to the right.",
  "Standing, right hand in back pocket, left hand resting on thigh, slight smirk, looking at the camera.",
  "Standing, left hand in back pocket, right arm hanging loose, lips parted, looking upwards.",
  "Standing, hands in back pockets, leaning slightly forward, intense gaze, locking eyes with the lens.",
  "Deep squat, both feet flat, arms resting on knees, neutral expression, looking directly into the camera.",
  "Squatting on the toes, right knee lower than the left, hands clasped in front, soft smile, looking away.",
  "Low squat, left hand touching the ground, right arm resting on the knee, fierce expression, intense stare.",
  "Squatting, leaning back slightly, hands resting loosely on the thighs, relaxed jaw, gazing downwards.",
  "Deep squat, elbows resting on knees, hands clasped together, serious face, looking off to the right.",
  "Right hand lightly touching the brim of an imaginary hat or hair, left hand on hip, confident smirk, eye contact.",
  "Both hands gripping the lapels of the jacket, shoulders squared, neutral expression, looking straight ahead.",
  "Left hand adjusting a tie or collar, right arm hanging straight, serious face, intense gaze into the lens.",
  "Right hand lightly touching an earring or earlobe, head tilted, soft smile, looking off to the side.",
  "Both hands pulling the jacket slightly off the shoulders, fierce expression, staring directly at the camera.",
  "Mid-air jump, both arms reaching straight up, legs perfectly straight, exhilarating smile, looking up at the hands.",
  "Mid-air jump, right leg bent at the knee, left leg straight, arms wide open, joyful expression, looking straight ahead.",
  "Mid-air jump, body tucked slightly, knees high, arms swinging forward, intense focus, eyes locked on the camera.",
  "Mid-air jump, legs in a wide split, arms extended horizontally, neutral face, looking off to the side.",
  "Mid-air jump, arching the back, both legs kicking backwards, arms floating up, serene expression, eyes closed.",
  "Deep forward lunge on the right leg, left arm reaching straight up, determined expression, looking up at the hand.",
  "Deep side lunge to the left, right leg straight, both arms sweeping parallel to the ground, fierce face, intense eye contact.",
  "Low lunge on the right knee, torso twisted, left arm extending backward, lips parted, looking over the back shoulder.",
  "Deep forward lunge, both arms extending rigidly out to the sides, neutral expression, staring dead ahead.",
  "Extreme low lunge, right hand touching the ground, left arm reaching vertically, intense gaze, looking down at the floor.",
  "Mid-spin, torso twisted sharply to the right, arms trailing behind, surprised expression, wide eyes looking at the camera.",
  "Mid-spin on one foot, opposite leg swinging out, arms wrapped tightly to the chest, serene smile, eyes looking off-camera.",
  "Rapid pivot, fabric flaring out, arms fully extended outward, fierce expression, piercing eye contact.",
  "Sharp twisting motion, shoulders facing back, hips facing forward, neutral face, gazing over the shoulder.",
  "Turning abruptly, one heel planted, arms sweeping dramatically across the torso, confident smirk, looking straight ahead.",
  "Hands behind the head, elbows pointing sharply outward, deep backward arch, eyes closed, face tilted to the ceiling.",
  "One arm framing the head with a sharp 90-degree bend, extreme backward lean, intense stare looking upside down at the camera.",
  "Deep backbend from the waist, both arms dangling freely toward the floor, lips parted, eyes gazing softly sideways.",
  "Extreme leaning back matrix-style, arms balancing the weight, fierce expression, eyes locked dead onto the lens.",
  "Dramatic arch backwards, hands placed on lower back for support, confident smirk, gazing down the nose at the camera."
];

export const POSE_VARIATIONS = POSE_VARIATIONS_SET_1;
