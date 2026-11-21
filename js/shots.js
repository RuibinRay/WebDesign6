/*
 * FRAGUA: every image the site needs, as data.
 * One file feeds the website (alt, ratio, placeholder brief), higgsfield/generate.mjs (prompt, model,
 * aspect, references) and shots.html (copy a prompt into the Higgsfield app by hand).
 *
 * Consistency comes from reuse: the LOOK strings and the KNIFE descriptions are pasted byte-identical
 * into every prompt. Stage 1 makes each knife's master (a side profile, no reference) and the forge scenes.
 * Stage 2 passes the master as a reference image, so the same knife appears everywhere.
 */
(function (root) {
  /* ───────────── LOOK BIBLE ───────────── */
  var STUDIO =
    'Photoreal premium kitchen knife product photography, medium-format camera, 120mm macro lens, focus-stacked so the whole knife is sharp tip to butt. ' +
    'One long soft strip light above, its reflection running cleanly along the flat of the blade so the etched Damascus layers read as a crisp grey-and-silver pattern, ' +
    'a soft contact shadow. Seamless matte backdrop in one flat colour. Spotless steel, no fingerprints. Colour-accurate grade, very fine grain.';

  var FORGE =
    'Photoreal documentary photography in a small blacksmith forge at night, shot on ARRI Alexa 35 with a vintage lens, fine film grain. ' +
    'Light only from the fire: deep orange and yellow from the coals, everything else falling into warm black. Soot-dark brick, a worn steel anvil, leather apron. ' +
    'Palette: forge black #0E0C0B, ember #FF5A1F, hot yellow #FFD36A, soot #1B1816. No haze, no added smoke effects, no lens flare.';

  var KITCHEN =
    'Photoreal cinematic food photography in a home kitchen, 85mm lens, shallow depth of field, fine film grain, natural colour. ' +
    'One window light from the side, dark slate and end-grain walnut surfaces, warm and calm. Hands only, no faces.';

  var NEG = 'No text, no letters, no logos, no maker’s marks or stamps anywhere on the blade or in the frame, no watermark.';
  var SAME = 'The knife is exactly the knife in the reference image: identical blade shape, Damascus pattern, coloured spine, bolster and handle. Do not redesign it.';

  /* ───────────── THE KNIVES (described the same way every time) ───────────── */
  var DAMASCUS = 'a hand-forged Damascus steel blade etched to show 256 fine flowing layers in alternating dark grey and bright silver';
  var KNIFE = {
    paja:
      'a 13 cm petty knife: a slim pointed blade, ' + DAMASCUS + ' in a raindrop pattern of small concentric rings, ' +
      'the flat spine left with a thin heat-tint of pale straw yellow (#E6CC80), a short polished steel bolster, and a slim olive wood handle with flowing grain',
    oro:
      'a 21 cm chef’s knife: a classic profile with a gentle curved belly rising to a fine point and a flat heel, ' + DAMASCUS + ' in a ladder pattern of evenly spaced rippling bands, ' +
      'the flat spine left with a thin heat-tint of deep gold (#C99A3E), a polished steel bolster, and an olive wood handle with flowing grain',
    bronce:
      'a 24 cm slicer: a long, narrow blade with a straight edge and a gently dropped point, ' + DAMASCUS + ' in a twist pattern of long sweeping curls, ' +
      'the flat spine left with a thin heat-tint of bronze brown (#9A5B32), a polished steel bolster, and a walnut handle with dark straight grain',
    azul:
      'an 18 cm cleaver: a tall rectangular blade with a slightly curved edge and a square front, ' + DAMASCUS + ' in a wild random pattern of irregular swirls, ' +
      'the flat spine left with a thin heat-tint of deep steel blue (#2E5AA8), a heavy polished bolster, and a black micarta handle with steel pins',
  };
  var BACKDROP = {
    paja: 'pale straw (#EFE3C2)',
    oro: 'warm ochre gold (#C9A25A)',
    bronce: 'deep bronze brown (#6E4128)',
    azul: 'midnight steel blue (#1E2C52)',
  };
  var USE = {
    paja: 'peeling and finely slicing a shallot on a small end-grain walnut board, paper-thin rings falling away from the edge',
    oro: 'rocking through a pile of flat-leaf parsley and a halved red onion on a large walnut board, fine dice spreading across the wood',
    bronce: 'drawing one long single slice from a pink medium-rare roast beef on a carving board, the slice curling off the blade',
    azul: 'halfway through splitting a butternut squash on a heavy board with one clean blow, the two halves just parting',
  };

  var gpt = function (o, q) { o.model = 'gpt_image_2_6'; o.params = { resolution: '2k', quality: q || 'high' }; return o; };
  var soul = function (o) { o.model = 'soul_cinematic'; o.params = { quality: '2k' }; return o; };
  var IDS = ['paja', 'oro', 'bronce', 'azul'];
  var NAMES = { paja: 'Paja', oro: 'Oro', bronce: 'Bronce', azul: 'Azul' };
  var TONE = { paja: 'steel', oro: 'steel', bronce: 'wood', azul: 'dark' };
  var shots = [];

  /* ───────────── STAGE 1: the four masters ───────────── */
  IDS.forEach(function (k) {
    shots.push(gpt({
      id: k + '-side', stage: 1, aspect: '16:9', tone: TONE[k], model_of: k,
      used: ['Knife page: gallery', 'Master reference for every other ' + NAMES[k] + ' image'],
      alt: 'The Fragua ' + NAMES[k] + ' in side profile.',
      brief: NAMES[k] + ', exact side profile, tip right, edge down, on ' + BACKDROP[k].replace(/ \(.*\)/, '') + '. This image defines the knife.',
      prompt: STUDIO + ' Backdrop: ' + BACKDROP[k] + '. A single ' + KNIFE[k] + '. Exact side profile lying flat, tip pointing right, edge down, centred, ' +
        'filling about 80% of the frame width, the whole Damascus pattern visible. ' + NEG,
    }));
  });

  /* The forge: fire, hammer, oil, wheel. No finished knife, so the cheap cinematic model. */
  [
    ['forge-fire', 'A steel billet glowing yellow-orange in the coals, tongs reaching in.', 'Close, 50mm lens: a rectangular steel billet glowing bright yellow-orange, lying in a bed of burning coals, a pair of long blacksmith tongs reaching in from the right to grip it, heat shimmer above.'],
    ['forge-fold', 'The hammer coming down on a folded, glowing billet; sparks flying.', 'Close, 35mm lens, frozen motion at 1/2000 s: a hammer striking a folded, glowing orange steel billet on an anvil, a burst of bright sparks and scale flying out, the smith’s gloved hand holding the tongs, forearm only.'],
    ['forge-quench', 'A red-hot blade plunged into oil; flame licking up off the surface.', 'Close, 50mm lens: a red-hot knife blade held in tongs, half plunged into a steel tank of quenching oil, a tongue of orange flame and a curl of smoke rising off the oil’s surface.'],
    ['forge-grind', 'Grinding the bevel on a belt grinder; a fan of sparks.', 'Close, 85mm lens from the side: two hands in leather gloves pressing a dark, unpolished knife blade against a running belt grinder, a long fan of orange sparks spraying down and away, the face out of frame.'],
  ].forEach(function (f) {
    shots.push(soul({
      id: f[0], stage: 1, aspect: '3:4', tone: 'forge', used: ['Home: the forge'],
      alt: f[1], brief: f[1], prompt: FORGE + ' ' + f[2] + ' ' + NEG,
    }));
  });

  /* ───────────── STAGE 2: everything that shows a knife, referenced to its master ───────────── */
  IDS.forEach(function (k) {
    var ref = ['higgsfield/renders/' + k + '-side.png'];
    shots.push(
      gpt({
        id: k + '-board', stage: 2, aspect: '4:3', tone: 'kitchen', model_of: k, refs: ref,
        used: ['Home: the four knives', 'Knife page: its job'],
        alt: 'The Fragua ' + NAMES[k] + ' at work in the kitchen.',
        brief: { paja: 'Slicing a shallot paper-thin on a small walnut board.', oro: 'Dicing parsley and onion on a big walnut board.', bronce: 'One long slice off a roast.', azul: 'Splitting a butternut squash in one blow.' }[k],
        prompt: KITCHEN + ' Close, from the side and slightly above: a hand holding ' + KNIFE[k] + ', ' + USE[k] + '. ' + SAME + ' ' + NEG,
      }),
      gpt({
        id: k + '-spine', stage: 2, aspect: '4:5', tone: TONE[k], model_of: k, refs: ref,
        used: ['Knife page: gallery'],
        alt: 'Macro of the ' + NAMES[k] + '’s spine and Damascus layers.',
        brief: 'Macro along the spine: the heat-tinted spine colour above the flowing Damascus layers.',
        prompt: STUDIO + ' Backdrop: ' + BACKDROP[k] + '. Extreme macro, 100mm, of the blade of ' + KNIFE[k] + ', the camera low and looking along the spine toward the tip, ' +
          'the heat-tinted spine in sharp focus in the foreground, the etched Damascus layers flowing away below it, shallow depth of field. ' + SAME + ' ' + NEG,
      }),
      gpt({
        id: k + '-hand', stage: 2, aspect: '4:5', tone: 'kitchen', model_of: k, refs: ref,
        used: ['Knife page: gallery'],
        alt: 'The ' + NAMES[k] + ' held in a pinch grip.',
        brief: 'Held in a pinch grip, blade toward camera at an angle, the pattern catching the window light.',
        prompt: KITCHEN + ' Close, 85mm: a cook’s hand holding ' + KNIFE[k] + ' in a pinch grip, the blade angled toward the camera so the window light runs along the Damascus pattern, a dark blurred kitchen behind. ' + SAME + ' ' + NEG,
      })
    );
  });

  var allRefs = IDS.map(function (k) { return 'higgsfield/renders/' + k + '-side.png'; });
  shots.push(
    gpt({
      id: 'rack', stage: 2, aspect: '16:9', tone: 'wood', refs: allRefs, priority: true,
      used: ['Home: the four knives (intro)', 'Social card'],
      alt: 'The four Fragua knives hanging from a walnut magnetic rack.',
      brief: 'All four hanging tip-down from a walnut magnetic rack on a dark plaster wall, straw to blue left to right.',
      prompt: STUDIO + ' Backdrop: dark warm plaster wall (#2A2421). A walnut magnetic knife rack mounted on the wall, four knives hanging tip-down from it with equal space between them, ' +
        'from left to right: ' + KNIFE.paja + '; ' + KNIFE.oro + '; ' + KNIFE.bronce + '; ' + KNIFE.azul + '. Soft light from above. Each knife is exactly the knife in its reference image. ' + NEG,
    }),
    gpt({
      id: 'closing', stage: 2, aspect: '21:9', tone: 'dark', model_of: 'oro', refs: ['higgsfield/renders/oro-side.png'],
      used: ['Home: sharpened for life'],
      alt: 'The Oro on a dark walnut board after service, one lamp above.',
      brief: 'After service: the Oro lying on a clean walnut board, right third, one warm lamp; left 60% dark.',
      prompt: KITCHEN + ' Late night, the kitchen dark except one warm pendant lamp. Wide 35mm frame: ' + KNIFE.oro + ' lying on a clean end-grain walnut board in the right third of the frame, ' +
        'a folded linen cloth beside it. The left 60% of the frame is quiet darkness. ' + SAME + ' ' + NEG,
    })
  );

  root.FRAGUA_SHOTS = {
    look: { STUDIO: STUDIO, FORGE: FORGE, KITCHEN: KITCHEN, DAMASCUS: DAMASCUS, NEG: NEG, SAME: SAME },
    knife: KNIFE,
    shots: shots,
    byId: shots.reduce(function (a, s) { a[s.id] = s; return a; }, {}),
  };
})(typeof window !== 'undefined' ? window : globalThis);
