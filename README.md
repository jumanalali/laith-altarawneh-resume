# Laith Al-Tarawneh � r�sum� and project portfolio

Project folder and package name: `laith-altarawneh-resume`. All runtime asset and module paths are relative to the project.

Run `npm run build`, then `npm run dev`. Default: http://127.0.0.1:4173. Set PORT to choose another port. No dependency installation is needed; fonts, Three.js and the licensed hand models are bundled locally.

## Content and images

All r�sum� paragraphs, five employment entries, certification, toolkit, three case studies and three external website destinations come from the reference retrieved on 2026-10-02. Edit src/content.js and run the build.

The profile remains one continuous paper. Projects now live in a separate desk scene, not below the r�sum�. Explore projects and See the work are buttons that open the portfolio; the latter selects the corresponding project. Back to my profile restores the exact saved native scroll position and keyboard focus.

Each case study has an images array in src/content.js. Replace the three src and alt values with actual screenshots, keeping files under dist/assets/gallery. The three neutral SVG placeholders were requested by the user and have descriptive alt text. Exactly three prints are displayed together; missing entries use the overview placeholder. Captions and image navigation are intentionally absent.

## Scene and interaction

- build.mjs generates the semantic profile, dedicated portfolio documents and gallery markup.
- dist/portfolio.js owns scene transitions, project selection, saved reading position and focus. Controls are briefly disabled during a turn to prevent competing animations. Escape returns to the profile. Reduced motion skips transitions.
- dist/app.js keeps the native scroll response and renders portfolio DOM transforms in the same animation frame as WebGL.
- dist/scene.js preserves the real walnut desk, lighting, soft shadows and skinned hands. dist/tabletop.js defines four thin physical sheets in desk coordinates and projects selectable DOM content with the same camera matrix. The summary and three prints lie flat, with stable rotations, contact shadows, and hands resting beside them. The camera eases into the tabletop view. On mobile native scrolling reveals the summary and the three prints together below it.
- dist/style.css provides the ivory papers, responsive split layout, gallery stack and sticky return/project controls.

All text remains selectable. External links retain their original destinations. Simple view, failed WebGL/model loading and reduced motion retain working project navigation. Without JavaScript all project documents are shown as readable static content. The original excluded menu, location and section counter remain absent.

## Verification

verification/portfolio.cjs checks entering/leaving the scene, selecting the correct project, project browsing and three synchronized photographs, exact scroll restoration, reference content/links, physical/DOM alignment and stable print placement, 320/390/800/1024/1440 layouts, reduced motion, failed-model and no-JavaScript fallbacks. Inspected screenshots and diagnostics are under verification/.

verification/requirements.cjs checks reference content across both scenes, external destinations, native full-height travel and unavailable WebGL. verification/scene-motion.cjs checks profile rest/forward/reverse motion, scrollbar-gutter alignment and settling. Older continuous-paper screenshots are historical.

## Publishing

.openai/hosting.json identifies the existing Sites project. Current address: https://laith-altarawneh-resume.chatgpt.site. Publish dist while retaining this project and its access settings.

## Refined hand model

The current hands use First Person hands rigged by DavidFischer (CC BY 4.0), supplied as refined_hands_with_sleeves.glb. Full source attribution, license links, and the exporter notes are retained in dist/assets/models/refined-hands-README.txt and embedded in the GLB. Website changes: retained detailed skin/nail geometry and independent weighted rigs; reused skin/nail #b98260 and sleeve/cuff #27292a; added small procedural offsets relative to the imported Hold pose. The static sleeve/cuff meshes are replaced by wrist-attached procedural sleeves; the imported hand skeletons remain independent.

## Original scroll handovers

The supplied playground.js hand state, coordination, startRelease, destinationFraction, critically damped trackTarget, needsHandover, updateHands, phase timing and completion scheduling are ported in dist/hand-motion.js. Scheduling feeds the existing app.js animation loop. The support hand retains its document-relative anchor while the other follows grip ? release ? depart ? travel ? approach ? regrip ? grip. Resizing preserves active progress.

The supplied starter-poses.json is retained at dist/assets/models/starter-poses.json. Right-hand Hold/Release quaternions map by unprefixed, dot-normalized names to weighted current joints; the source renderer's measured left curl/spread logic supplies left pose deltas relative to the imported Hold pose. No rig clones are made. dist/sleeve.js ports the source fixed-length centerline, tangent rings, cuff profile, fabric folds and bend updates, with the current charcoal palette and extended arm length. Original static sleeves and cuffs are removed.

verification/handover.cjs checks the complete phase sequence, alternating active hands, stable supporting anchors, reverse input and post-scroll completion. Existing viewport, reduced-motion, fallback and rig-deformation checks remain applicable.
