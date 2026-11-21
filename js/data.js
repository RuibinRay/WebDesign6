/*
 * FRAGUA: the brand as data. Copy, the four knives, the temper scale, the fold.
 *
 * CONCEPT VALUES: every price, weight, dimension, hardness figure, tempering temperature, layer
 * count, edge angle, lead time and the lifetime-sharpening promise are proposals for the concept.
 * The temper colours themselves are real: polished carbon steel shows these oxide colours at about
 * these temperatures. Replace the rest with the forge's real figures before anything is sold.
 */
(function (root) {
  var hex = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

  /* The oxide colours steel shows as it is tempered: [°C, colour]. Used for the temper scale and every spine. */
  var TEMPER = [
    [170, '#B9BCBF'], [195, '#EEDFA8'], [210, '#E6CC80'], [225, '#D7AE55'], [240, '#C08A38'],
    [252, '#9A5B32'], [262, '#7E4636'], [272, '#5B3A6E'], [282, '#3D4A92'], [292, '#2E5AA8'], [310, '#6E8FC0'],
  ].map(function (k) { return [k[0], hex(k[1])]; });
  function temperAt(t) {
    if (t <= TEMPER[0][0]) return TEMPER[0][1];
    for (var i = 0; i < TEMPER.length - 1; i++) {
      if (t <= TEMPER[i + 1][0]) {
        var a = TEMPER[i], b = TEMPER[i + 1], k = (t - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k];
      }
    }
    return TEMPER[TEMPER.length - 1][1];
  }

  var HANDLES = [
    { id: 'olivo', label: 'Olive wood', color: '#B08C5E', grain: '#7E5E38' },
    { id: 'nogal', label: 'Walnut', color: '#5E3D28', grain: '#3A2316' },
    { id: 'micarta', label: 'Black micarta', color: '#232120', grain: '#141312' },
  ];

  /*
   * The four knives. Each is named for the colour its steel turns at the temperature it is tempered to.
   * Lower temperature: harder edge. Higher: tougher blade.
   * shape: the blade outline family drawn in js/steel.js. pattern: the Damascus distortion. seed: the default pattern.
   */
  var KNIVES = [
    {
      id: 'paja', name: 'Paja', color: 'Straw', temp: 205, hrc: 62, kind: 'Petty knife', cm: 13,
      shape: 'petty', blade: 130, handle: 105, height: 30, pattern: 'raindrop', seed: 11, spine: '#E6CC80',
      kicker: 'The hardest edge we make',
      line: 'Tempered at 205 °C, where the steel turns the colour of straw. At 62 HRC the edge stays keen for months: a small blade for shallots, herbs and fruit.',
      long: [
        'Paja is tempered lowest of the four, at 205 °C, the moment polished steel blushes the pale yellow of straw. That leaves the steel at its hardest, so the thin edge holds its bite through months of small, precise work.',
        'The blade is thirteen centimetres and light in the hand: the knife you reach for when the chef’s knife feels like too much.',
      ],
      price: 240, weight: '84 g', job: 'Shallots, herbs, fruit, garnish',
    },
    {
      id: 'oro', name: 'Oro', color: 'Gold', temp: 230, hrc: 60, kind: 'Chef’s knife', cm: 21,
      shape: 'chef', blade: 210, handle: 125, height: 48, pattern: 'ladder', seed: 23, spine: '#D7AE55',
      kicker: 'The one you will use every day',
      line: 'Tempered at 230 °C, dark straw going gold. Hard enough to hold a fine edge, tough enough to forgive a slip. Twenty-one centimetres for almost everything.',
      long: [
        'Oro is tempered at 230 °C, where the straw deepens to gold. It is the balance point: hard enough to keep a fine edge, tough enough to forgive the board, the bone you didn’t see, the day you were rushing.',
        'Twenty-one centimetres with a gentle belly for rocking and a flat heel for push cuts. If you buy one Fragua, buy this one.',
      ],
      price: 420, weight: '196 g', job: 'Onions, herbs, meat, almost everything',
    },
    {
      id: 'bronce', name: 'Bronce', color: 'Bronze', temp: 260, hrc: 58, kind: 'Slicer', cm: 24,
      shape: 'slicer', blade: 240, handle: 125, height: 34, pattern: 'twist', seed: 37, spine: '#9A5B32',
      kicker: 'Long, flexible, one stroke',
      line: 'Tempered at 260 °C, bronze. A little softer, so the long, narrow blade flexes instead of snapping: a roast or a side of salmon in one stroke.',
      long: [
        'Bronce is tempered at 260 °C, past gold into bronze. The steel gives up a little hardness for spring, which a long, narrow blade needs: it bends along a roast and comes back straight.',
        'Twenty-four centimetres, so a whole side of salmon or a leg of lamb is one stroke, not a saw.',
      ],
      price: 460, weight: '168 g', job: 'Roasts, salmon, ham, long clean slices',
    },
    {
      id: 'azul', name: 'Azul', color: 'Blue', temp: 290, hrc: 55, kind: 'Cleaver', cm: 18,
      shape: 'cleaver', blade: 180, handle: 120, height: 88, pattern: 'wild', seed: 53, spine: '#2E5AA8',
      kicker: 'The toughest; it takes bones',
      line: 'Tempered at 290 °C, where steel turns blue. The softest of the four and the hardest to break: a heavy blade for joints, squash and bone.',
      long: [
        'Azul is tempered highest, at 290 °C, when the steel goes from purple to deep blue. It is the softest of the four and by far the toughest: it can meet bone and keep its edge instead of chipping.',
        'Eighteen centimetres long and nearly nine tall, with the weight to fall through a squash or a chicken joint without being pushed.',
      ],
      price: 520, weight: '412 g', job: 'Joints, bone, squash, coconuts',
    },
  ];

  /* The set: all four in a waxed-canvas roll. CONCEPT VALUES: the price (the four added up, roll included). */
  var SET = {
    id: 'juego', name: 'El Juego', roll: 'Waxed canvas roll, leather straps',
    line: 'All four tempers, from the same fire, rolled in waxed canvas with a pocket for each.',
    price: KNIVES.reduce(function (a, k) { return a + k.price; }, 0),
  };

  /* The fold: two steels welded into one bar, then folded seven times: 2 → 256 layers. */
  var FOLD = { folds: 7, start: 2, layers: 256, steels: ['1095 high-carbon steel', '15N20 nickel steel'], heat: 1150 };

  var STATS = [
    { n: 256, label: 'layers in every blade' },
    { n: 7, label: 'folds under the hammer' },
    { n: 3, label: 'days to forge one knife' },
    { n: 2, label: 'smiths, one forge' },
  ];

  var EDGE = { angle: 15, behind: 0.15 };

  var money = function (n) { return '$' + n.toLocaleString('en-US'); };

  root.FRAGUA = {
    KNIVES: KNIVES, SET: SET, HANDLES: HANDLES, TEMPER: TEMPER, temperAt: temperAt, FOLD: FOLD, STATS: STATS, EDGE: EDGE, money: money, hex: hex,
    byId: KNIVES.reduce(function (a, k) { a[k.id] = k; return a; }, {}),
  };
})(window);
