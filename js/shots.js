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

  /* ───────────── KNIFE PAGE, v2: a hero photograph and "the cut", a scroll film of each knife at its job ───────────── */
  var SLATE =
    'Photoreal cinematic still life, medium-format camera, 90mm lens, f/8, focus-stacked so the whole knife is sharp. ' +
    'A slab of dark honed slate fills the frame. One hard, narrow light from the far left rakes low across it and runs along the flat of the blade, ' +
    'so the etched Damascus layers flash silver while the rest falls into deep warm shadow. A faint haze of forge-orange (#FF5A1F) light bleeds in from the bottom right edge. ' +
    'Palette: soot #0E0C0B, slate #24211F, steel silver, ember orange. Very fine grain.';
  var CUT = {
    paja: { start: 'the hand has just set the petty knife’s edge on a peeled shallot lying on a small end-grain walnut board, two paper-thin rings already fallen beside it',
      end: 'the shallot has been sliced right through into a fan of paper-thin rings spread across the board, the knife lifted a finger’s width above them',
      move: 'The knife slices down through the shallot again and again in slow motion, each paper-thin ring falling away and fanning out across the board.' },
    oro: { start: 'the chef’s knife rests with its tip on the board at the edge of a loose heap of flat-leaf parsley, a halved red onion beside it',
      end: 'the parsley has become a neat fine pile, the knife lying flat beside it with a few green flecks on the blade',
      move: 'The knife rocks through the parsley in slow motion, tip on the board, the heap becoming a fine, even pile.' },
    bronce: { start: 'the slicer has just entered the end of a medium-rare roast beef on a carving board, a fork steadying the meat',
      end: 'one long, even slice has come free and lies folded over on the board, the slicer resting along the cut face of the roast',
      move: 'The long blade draws through the roast in one slow, single stroke and a thin pink slice peels away and folds over onto the board.' },
    azul: { start: 'the cleaver is raised a hand’s height above a whole butternut squash lying on a heavy end-grain board',
      end: 'the squash lies split cleanly into two halves that have rocked apart, orange flesh and seeds showing, the cleaver resting on the board between them',
      move: 'The cleaver falls in slow motion and splits the squash in one clean blow, the two halves rocking apart.' },
  };
  var BEATS = {
    paja: [{ at: 0, text: 'The edge meets the shallot.' }, { at: 0.35, text: '62 HRC: the edge does not drag.' }, { at: 0.75, text: 'Paper-thin, ring after ring.' }],
    oro: [{ at: 0, text: 'Tip down, heel up.' }, { at: 0.35, text: 'Rock, do not chop.' }, { at: 0.75, text: 'Fine and even, no bruising.' }],
    bronce: [{ at: 0, text: 'Into the roast at the heel.' }, { at: 0.4, text: 'One stroke, the full 24 cm.' }, { at: 0.8, text: 'One slice, no sawing.' }],
    azul: [{ at: 0, text: 'Raised a hand’s height.' }, { at: 0.35, text: 'Let the weight do it.' }, { at: 0.7, text: 'Through, in one blow.' }],
  };
  var films = [];
  IDS.forEach(function (k) {
    var ref = ['higgsfield/renders/' + k + '-side.png'];
    shots.push(
      gpt({
        id: k + '-hero', stage: 2, aspect: '16:9', tone: 'dark', model_of: k, refs: ref,
        used: ['Knife page: hero'],
        alt: 'The Fragua ' + NAMES[k] + ' on dark slate, light running along the blade.',
        brief: 'Dark slate, one raking light: the knife diagonally in the right half, its layers flashing silver; left 45% dark for the words.',
        prompt: SLATE + ' A single ' + KNIFE[k] + ', lying on the slate on a gentle diagonal in the right 55% of the frame, the tip toward the upper right, the handle lower left of the blade. ' +
          'The left 45% of the frame is quiet, dark slate: negative space. ' + SAME + ' ' + NEG,
      }),
      gpt({
        id: k + '-cut-start', stage: 2, aspect: '16:9', tone: 'kitchen', model_of: k, refs: ref, focus: [0.66, 0.55],
        used: ['Knife page: the cut (first frame)'],
        alt: 'The ' + NAMES[k] + ' about to cut.',
        brief: 'First frame of the cut film: ' + CUT[k].start.replace(/^the /, '') + '. Subject in the right half.',
        prompt: KITCHEN + ' Locked-off wide 50mm frame, the action in the right half and dark kitchen in the left 40%: ' + CUT[k].start + '. The knife: ' + KNIFE[k] + '. ' + SAME + ' ' + NEG,
      }),
      gpt({
        id: k + '-cut-end', stage: 3, aspect: '16:9', tone: 'kitchen', model_of: k, focus: [0.66, 0.55], refs: ['higgsfield/renders/' + k + '-cut-start.png'],
        used: ['Knife page: the cut (last frame)'],
        alt: 'The ' + NAMES[k] + ' after the cut.',
        brief: 'Last frame: the same frame a moment later: ' + CUT[k].end.replace(/^the /, '') + '.',
        prompt: 'The same frame as the reference image, a few seconds later: identical camera, lens, framing, light, board, background, hands and knife. Only this has changed: ' +
          CUT[k].end + '. Nothing else has moved. ' + NEG,
      })
    );
    films.push({
      id: 'cut-' + k, kind: 'film', stage: 4, model: 'kling4_0', aspect: '16:9', name: 'cut-' + k,
      params: { mode: 'image-to-video', duration: 5, resolution: '1080p' },
      start: k + '-cut-start', end: k + '-cut-end', focus: 0.66,
      used: ['Knife page: the cut, scrubbed by scrolling'],
      alt: 'The ' + NAMES[k] + ' at work, in slow motion.',
      brief: 'Locked-off, 5 s, slow motion: ' + CUT[k].move,
      beats: BEATS[k],
      prompt: 'One continuous locked-off shot, no cuts, no camera movement. ' + CUT[k].move +
        ' The knife keeps its exact shape and Damascus pattern throughout. Natural slow motion, constant light and exposure, crisp detail. No text, no logos.',
    });
  });

  var all = shots.concat(films);
  root.FRAGUA_SHOTS = {
    look: { STUDIO: STUDIO, FORGE: FORGE, KITCHEN: KITCHEN, SLATE: SLATE, DAMASCUS: DAMASCUS, NEG: NEG, SAME: SAME },
    knife: KNIFE,
    shots: shots, films: films, refs: [], models3d: [], all: all,
    byId: all.reduce(function (a, s) { a[s.id] = s; return a; }, {}),
  };
})(typeof window !== 'undefined' ? window : globalThis);
