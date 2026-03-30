import type { Question, Difficulty } from './gameLogic';

// F1-themed contexts for word problems
const F1_CONTEXTS_KARTING = [
  { item1: 'mechanics', item2: 'engineers', location: 'pit crew' },
  { item1: 'red tyres', item2: 'white tyres', location: 'tyre stack' },
  { item1: 'pit stops', item2: 'laps', location: 'race' },
  { item1: 'fuel units', item2: 'laps', location: 'tank' },
  { item1: 'safety cars', item2: 'race laps', location: 'race' },
  { item1: 'blue flags', item2: 'yellow flags', location: 'marshals' },
  { item1: 'soft tyres', item2: 'hard tyres', location: 'tyre store' },
  { item1: 'team radios', item2: 'pit boards', location: 'garage' },
];

const F1_CONTEXTS_F2_PLUS = [
  { resource: 'energy units', per: 'lap', action: 'deploys' },
  { resource: 'fuel units', per: 'lap', action: 'burns' },
  { resource: 'tyre sets', per: 'stint', action: 'uses' },
  { resource: 'DRS activations', per: 'lap', action: 'triggers' },
  { resource: 'pit stop seconds', per: 'tyre change', action: 'costs' },
  { resource: 'downforce units', per: 'km/h', action: 'generates' },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── KARTING (beginner) ─────────────────────────────────────────────────────
// "For every X [item1], there are Y [item2]. If there are Z [item1], how many [item2]?"
// Answer = Z * Y / X  — guaranteed integer by choosing Z as a multiple of X.
function generateKartingQuestion(): Question {
  const ctx = pick(F1_CONTEXTS_KARTING);
  const x = randInt(1, 5);   // base ratio part 1
  const y = randInt(1, 10);  // base ratio part 2
  const multiplier = randInt(2, 5);
  const z = x * multiplier; // guaranteed multiple of x
  const answer = y * multiplier;

  const display =
    `For every ${x} ${ctx.item1}, there are ${y} ${ctx.item2}. ` +
    `If there are ${z} ${ctx.item1}, how many ${ctx.item2}?`;

  return { display, answer, botTime: 0, num1: z, num2: y, operation: 'Ratios' };
}

// ─── F3 (easy) ──────────────────────────────────────────────────────────────
// Three sub-types rotated:
//   A) Complete equivalent ratio — missing first:  "? : b = c : d"   → a
//   B) Complete equivalent ratio — missing second: "a : b = c : ?"   → d
//   C) Simplify ratio — "Simplify X : Y. What is the first number?"  → X/gcd
function generateF3Question(): Question {
  const type = randInt(0, 2);

  if (type === 0) {
    // a : b = ? : d  →  answer = a * d / b
    const b = randInt(2, 10);
    const d = b * randInt(2, 10); // d is a multiple of b
    const a = randInt(1, 10);
    const answer = (a * d) / b; // always integer
    const display = `${a} : ${b} = ? : ${d}`;
    return { display, answer, botTime: 0, num1: a, num2: d, operation: 'Ratios' };
  }

  if (type === 1) {
    // a : b = c : ?  →  answer = b * c / a
    const a = randInt(2, 10);
    const c = a * randInt(2, 10); // c is a multiple of a
    const b = randInt(1, 10);
    const answer = (b * c) / a; // always integer
    const display = `${a} : ${b} = ${c} : ?`;
    return { display, answer, botTime: 0, num1: b, num2: c, operation: 'Ratios' };
  }

  // type === 2: Simplify
  const g = randInt(2, 8);
  const p = randInt(1, 6);
  const q = randInt(1, 6);
  // ensure p and q are coprime so the simplified form is unique
  const divisor = gcd(p, q);
  const pSimple = p / divisor;
  const qSimple = q / divisor;
  const x = pSimple * g;
  const y = qSimple * g;
  const answer = pSimple; // first number after simplification
  const display = `Simplify ${x} : ${y}. What is the first number?`;
  return { display, answer, botTime: 0, num1: x, num2: y, operation: 'Ratios' };
}

// ─── F2 (medium) ────────────────────────────────────────────────────────────
// Three sub-types:
//   A) Word proportion: "If N laps use M units, how many units for P laps?"
//   B) Inverse-flavoured F1 theme: "A car deploys D units for every H it harvests. After T deploys, how many harvests?"
//   C) Complete equivalent ratio (larger numbers): "a : b = c : ?"
function generateF2Question(): Question {
  const type = randInt(0, 2);

  if (type === 0) {
    const ctx = pick(F1_CONTEXTS_F2_PLUS);
    const n = randInt(2, 8);          // base laps
    const rateNumer = randInt(2, 12); // units per n laps (we'll make it divisible)
    // make rateNumer a multiple of n to get integer unit-rate, then scale up
    const unitRate = randInt(2, 8);
    const m = n * unitRate;
    const p = n * randInt(2, 5); // p is a multiple of n
    const answer = (m * p) / n;  // = unitRate * p, always integer
    const display =
      `If ${n} laps use ${m} ${ctx.resource}, how many ${ctx.resource} for ${p} laps?`;
    return { display, answer, botTime: 0, num1: m, num2: p, operation: 'Ratios' };
  }

  if (type === 1) {
    const deployRatio = randInt(2, 6);
    const harvestRatio = randInt(1, deployRatio - 1); // harvest < deploy to keep ratio clear
    const totalDeploys = deployRatio * randInt(2, 8);
    const answer = (harvestRatio * totalDeploys) / deployRatio; // always integer
    const display =
      `A car deploys ${deployRatio} units for every ${harvestRatio} it harvests. ` +
      `After ${totalDeploys} deploys, how many harvests?`;
    return { display, answer, botTime: 0, num1: deployRatio, num2: totalDeploys, operation: 'Ratios' };
  }

  // type === 2: complete equivalent ratio (larger numbers)
  const a = randInt(3, 12);
  const b = randInt(3, 12);
  const multiplier = randInt(3, 10);
  const c = a * multiplier;
  const answer = b * multiplier;
  const display = `${a} : ${b} = ${c} : ?`;
  return { display, answer, botTime: 0, num1: b, num2: c, operation: 'Ratios' };
}

// ─── F1 (hard) ──────────────────────────────────────────────────────────────
// Three sub-types (boosted uses larger numbers):
//   A) Unit rate: "A car uses R units per L laps. How many units in T laps?"
//   B) Ratio allocation: "Deploy:Harvest ratio is D:H. In N total actions, how many deploys?"
//   C) Multi-step rate: scale up a 2-step chain
function generateF1Question(boosted: boolean): Question {
  const type = randInt(0, 2);
  const scale = boosted ? 3 : 1;

  if (type === 0) {
    // Unit rate
    const L = randInt(2, 4 + scale);           // laps per unit period
    const R = randInt(3, 8 + scale * 2);        // units per L laps
    const multiplier = randInt(3, 7 + scale);   // how many periods
    const T = L * multiplier;
    const answer = R * multiplier;
    const display =
      `A car uses ${R} energy units per ${L} laps. How many units in ${T} laps?`;
    return { display, answer, botTime: 0, num1: R, num2: T, operation: 'Ratios' };
  }

  if (type === 1) {
    // Ratio allocation
    const D = randInt(2, 5 + scale);
    const H = randInt(1, D); // H <= D
    const total = (D + H) * randInt(2, 5 + scale);
    const answer = (D * total) / (D + H); // always integer
    const display =
      `Deploy:Harvest ratio is ${D}:${H}. In ${total} total actions, how many deploys?`;
    return { display, answer, botTime: 0, num1: D, num2: total, operation: 'Ratios' };
  }

  // type === 2: Multi-step rate chain
  // "A car earns P points per Q correct answers, and uses X points per Y laps.
  //  After Z correct answers, how many laps can it complete?"
  const Q = randInt(2, 3 + scale);
  const P = randInt(2, 5 + scale) * Q;   // points per Q answers (multiple of Q)
  const pointsPerAnswer = P / Q;
  const Y = randInt(1, 3);
  const X = randInt(2, 4 + scale) * Y;   // points per Y laps (multiple of Y)
  const pointsPerLap = X / Y;
  // choose Z so answers→points→laps is integer
  const lapsPerAnswer = pointsPerAnswer / pointsPerLap;
  // lapsPerAnswer might not be integer; pick Z to make it so
  const denominator = X / gcd(P, X); // laps = Z * P/Q / (X/Y) = Z * P*Y / (Q*X)
  const Z = Q * denominator * randInt(1, 3 + scale); // Z is multiple of Q*denominator
  const answer = Math.round((Z * P * Y) / (Q * X));

  if (!Number.isInteger((Z * P * Y) / (Q * X)) || answer <= 0) {
    // Fallback to type 0 if arithmetic doesn't work out cleanly
    const L2 = randInt(2, 4 + scale);
    const R2 = randInt(3, 8 + scale * 2);
    const m2 = randInt(3, 7 + scale);
    const T2 = L2 * m2;
    const ans2 = R2 * m2;
    const display2 =
      `A car uses ${R2} energy units per ${L2} laps. How many units in ${T2} laps?`;
    return { display: display2, answer: ans2, botTime: 0, num1: R2, num2: T2, operation: 'Ratios' };
  }

  const display =
    `A car earns ${P} points per ${Q} correct answers and spends ${X} points per ${Y} laps. ` +
    `After ${Z} correct answers, how many laps?`;
  return { display, answer, botTime: 0, num1: P, num2: Z, operation: 'Ratios' };
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function generateRatioQuestion(
  difficulty: Difficulty,
  boosted?: boolean,
  previousDisplay?: string,
): Question {
  const MAX_RETRIES = 20;

  for (let i = 0; i < MAX_RETRIES; i++) {
    let q: Question;

    switch (difficulty) {
      case 'beginner':
        q = generateKartingQuestion();
        break;
      case 'easy':
        q = generateF3Question();
        break;
      case 'medium':
        q = generateF2Question();
        break;
      case 'hard':
        q = generateF1Question(!!boosted);
        break;
      default:
        q = generateKartingQuestion();
    }

    // Avoid back-to-back duplicate display text
    if (q.display !== previousDisplay) {
      return q;
    }
  }

  // After MAX_RETRIES just return whatever we get
  switch (difficulty) {
    case 'easy':   return generateF3Question();
    case 'medium': return generateF2Question();
    case 'hard':   return generateF1Question(!!boosted);
    default:       return generateKartingQuestion();
  }
}
