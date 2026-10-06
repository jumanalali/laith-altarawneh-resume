REFINED HANDS WITH SLEEVES
Exported 1 October 2026 from the current two-hand HTML-paper experiment.

Send refined_hands_with_sleeves.glb together with this file, or send the ZIP.
Import the GLB using your 3D application's glTF 2.0 importer. Materials may
look different under the recipient's lighting and color-management settings.

INCLUDED
- Both hands in the experiment's Hold pose, with independent finger skeletons.
- Warm matte skin (#b07854) and muted matte nails (#c08b68).
- Curved cobalt sleeves (#254fc8) and cuffs (#2347b4), attached to the wrists.
- Eight meshes: skin, nails, sleeve and cuff for each side.
- Embedded geometry, materials and attribution; no external textures required.

LIMITS
- This is a model export, not the interactive website. There are no animation
  clips, scroll logic, paper, lighting or cameras in the GLB.
- Each sleeve is exported at its current bend. The website's procedural sleeve
  bending is JavaScript and is not a sleeve/elbow rig inside this file.
- The original skeleton hierarchy is retained for compatibility. Each isolated
  hand rig contains some unused original joints; visible geometry is separated.
- Scale is inherited from the experiment, not calibrated to anatomical meters.
- The preview shows the complete finite sleeves. On the website their far ends
  extend outside the camera frame and the HTML paper hides supporting fingers.

VERIFICATION
Reloaded the binary GLB with Three.js GLTFLoader and compared all 11,960 mesh
vertices to the export source. Maximum position difference: 0.000000077 units.
Verified all eight materials retain their intended colors, roughness 1 and
metalness 0. Rotating each index-finger joint deforms only its corresponding
hand. The preview was rendered from the re-imported file. Not tested in Blender
or other desktop 3D applications. Original GLB SHA-256 is unchanged:
f262f890dc499104e0fca4fb6cb011a078e1dc5909ae10c1107520c7b1f2390e

ATTRIBUTION / LICENSE
Original model: "First Person hands rigged" by DavidFischer.
Source: https://sketchfab.com/3d-models/first-person-hands-rigged-547a45535f0c4fe787948f7a7a6a88db
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/
Changes: independent hand instances and poses, matte skin/nail materials,
procedural cobalt cuffs and sleeves, and exported Hold composition.
Retain attribution when sharing or using this derivative model.

Export tool: Three.js GLTFExporter r180 (MIT), using the project's existing
Three.js dependency. The original model and all live/local prototype source
files were left unchanged. No new online deployment was made for this export.
