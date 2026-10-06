# Asset provenance

## Rigged 3D hands

Source: Immersive Web, WebXR Input Profiles, generic-hand assets.

- https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/generic-hand
- https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/generic-hand/left.glb
- https://raw.githubusercontent.com/immersive-web/webxr-input-profiles/main/packages/assets/profiles/generic-hand/right.glb

MIT License, Copyright (c) 2019 Amazon. Full asset license bundled in dist/licenses/webxr-assets-MIT.txt. Each hand is an actual skinned mesh with 25 skeleton joints. Local modifications are made at runtime: finger hierarchy, grip pose, skin material, model orientation and charcoal sleeve meshes. No hand photograph is displayed or loaded.

These are lightweight XR meshes, not scanned hands. For additional realism, replace with higher-resolution licensed hand meshes and skin/normal/roughness maps. Retain named joints or adapt the bone map in hands.js. The renderer anchors thumb-tip to the paper grip and uses a depth-only paper plane for occlusion.

## Renderer

Three.js 0.180.0, MIT License. Vendored module, core, GLTFLoader and BufferGeometryUtils files. Relative import paths adjusted for local static hosting. License in dist/licenses/three.txt.

## Desk and props

Original code-generated 3D geometry in dist/desk.js. The tabletop is a closed beveled extrusion, 2700 x 2100 with 64 units of physical thickness plus bevel overhang. Apron, legs, notebook covers/pages, pen barrel/nib, lathed ceramic cup, torus handle and coaster are actual meshes. The original desk photograph is removed from both the active page and bundled assets.

Walnut surface detail is a deterministic 1024 x 512 procedural CanvasTexture generated at startup. It only modulates a real mesh material; it is not a desk image, billboard or substitute for geometry. No downloaded desk assets or third-party desk license is needed.

## Font

DM Sans, bundled locally from Google Fonts. SIL Open Font License in dist/licenses/dm-sans-OFL.txt. All renderer, hand and font licenses are retained in the distribution.
