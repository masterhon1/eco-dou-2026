export type QuizTopic = 'all' | 'water' | 'food' | 'energy';

export interface SustainabilityQuestion {
  id: string;
  topic: Exclude<QuizTopic, 'all'>;
  topicLabel: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  actionTip: string;
}

export const SUSTAINABILITY_QUESTIONS: SustainabilityQuestion[] = [
  {
    id: 'w1',
    topic: 'water',
    topicLabel: 'Water Conservation',
    prompt: 'Roughly how much water can a single steadily dripping faucet waste over one year?',
    options: [
      'About 50 gallons (190 liters)',
      'Over 3,000 gallons (11,300 liters)',
      'Around 200 gallons (750 liters)',
      'Less than 15 gallons (55 liters)',
    ],
    correctIndex: 1,
    explanation:
      'A faucet dripping once per second wastes over 3,000 gallons a year—enough for more than 180 showers.',
    actionTip: 'Replacing a worn tap washer stops continuous waste in minutes.',
  },
  {
    id: 'w2',
    topic: 'water',
    topicLabel: 'Water Conservation',
    prompt: 'When is the most water-efficient time of day to water outdoor gardens and courtyards?',
    options: [
      'High noon when sunlight is strongest',
      'Mid-afternoon when wind picks up',
      'Early morning or late evening',
      'Right before a midday heatwave',
    ],
    correctIndex: 2,
    explanation:
      'Watering in the cool early morning minimizes evaporation loss so moisture reaches plant roots instead of drying into the air.',
    actionTip: 'Pair morning watering with mulch around planters to retain soil moisture.',
  },
  {
    id: 'w3',
    topic: 'water',
    topicLabel: 'Water Conservation',
    prompt: 'What is "greywater" in sustainable home and community water systems?',
    options: [
      'Rainwater collected directly from metal roofs',
      'Gently used water from sinks, showers, and laundry',
      'Untreated seawater before desalination',
      'Storm runoff mixed with industrial oil',
    ],
    correctIndex: 1,
    explanation:
      'Greywater from sinks, showers, and washing machines can be filtered and reused for landscape irrigation or toilet flushing.',
    actionTip: 'Use biodegradable, plant-safe soaps if capturing sink water for gardens.',
  },
  {
    id: 'w4',
    topic: 'water',
    topicLabel: 'Water Conservation',
    prompt: 'Turning off the tap while brushing your teeth saves approximately how much water per person each day?',
    options: [
      'About 0.5 gallons (2 liters)',
      'Up to 8 gallons (30 liters)',
      'About 25 gallons (95 liters)',
      'Water flow is too small to measure',
    ],
    correctIndex: 1,
    explanation:
      'Standard bathroom faucets flow at around 2 gallons per minute—shutting it off twice a day saves up to 8 gallons daily.',
    actionTip: 'Install low-flow faucet aerators to cut sink water use by 30% without losing pressure.',
  },
  {
    id: 'f1',
    topic: 'food',
    topicLabel: 'Food Rescue',
    prompt: 'Approximately what share of all food produced globally is lost or wasted each year?',
    options: [
      'Around 5% of total food',
      'Around 10% of total food',
      'Nearly one-third (about 30%)',
      'Over 75% of total food',
    ],
    correctIndex: 2,
    explanation:
      'Roughly one-third of global food is lost or wasted along the supply chain—even while millions face food insecurity.',
    actionTip: 'Donating safe surplus bakery and kitchen portions bridges the gap immediately.',
  },
  {
    id: 'f2',
    topic: 'food',
    topicLabel: 'Food Rescue',
    prompt: 'Why is keeping leftover food out of landfills important for the climate?',
    options: [
      'Landfilled food turns into solid rock',
      'Rotting food in oxygen-free landfills releases methane',
      'Food waste blocks underground rainwater pipes',
      'Landfills freeze food so it never breaks down',
    ],
    correctIndex: 1,
    explanation:
      'When organic food decomposes buried without oxygen, it generates methane—a greenhouse gas far more potent than CO2 over 20 years.',
    actionTip: 'Prioritize eating or donating surplus food first, and compost inedible scraps.',
  },
  {
    id: 'f3',
    topic: 'food',
    topicLabel: 'Food Rescue',
    prompt: 'What does a "Best Before" date on packaged dry goods usually indicate?',
    options: [
      'The exact hour the food becomes unsafe to eat',
      'Peak flavor and texture quality, not immediate safety',
      'A legal deadline requiring disposal',
      'When the packaging plastic expires',
    ],
    correctIndex: 1,
    explanation:
      '"Best Before" reflects freshness and peak flavor; properly stored items often remain safe well past that date.',
    actionTip: 'Use sight and smell checks on "Best Before" pantry items before tossing them.',
  },
  {
    id: 'f4',
    topic: 'food',
    topicLabel: 'Food Rescue',
    prompt: 'Which food storage habit helps fresh produce stay crisp and spoil slower?',
    options: [
      'Storing apples and bananas inside the same sealed bag as leafy greens',
      'Washing all berries days before eating them',
      'Separating ethylene-producing fruits from sensitive greens',
      'Keeping tomatoes in the freezer',
    ],
    correctIndex: 2,
    explanation:
      'Fruits like apples and bananas emit natural ethylene gas that speeds ripening and wilting in nearby greens and herbs.',
    actionTip: 'Keep leafy greens in breathable crisper drawers away from ripe apples.',
  },
  {
    id: 'e1',
    topic: 'energy',
    topicLabel: 'Circular Habits',
    prompt: 'Roughly how much less electricity do LED bulbs use compared to traditional incandescent bulbs?',
    options: [
      'About 10% less electricity',
      'About 25% less electricity',
      '75% to 85% less electricity',
      'They use the same wattage',
    ],
    correctIndex: 2,
    explanation:
      'LEDs convert nearly all energy into light rather than waste heat, cutting lighting electricity use by 75%–85% and lasting 25x longer.',
    actionTip: 'Swap high-use porch and kitchen bulbs to warm LEDs first.',
  },
  {
    id: 'e2',
    topic: 'energy',
    topicLabel: 'Circular Habits',
    prompt: 'In the waste hierarchy ("Reduce, Reuse, Recycle"), which step delivers the biggest environmental benefit?',
    options: [
      'Recycling single-use items after one use',
      'Reducing consumption and repairing what you already own',
      'Incinerating mixed packaging',
      'Shipping recyclables overseas',
    ],
    correctIndex: 1,
    explanation:
      'Preventing manufacturing demand altogether—by reducing waste and repairing items—saves raw materials, water, and shipping emissions.',
    actionTip: 'Borrow rarely used tools from a community library instead of buying new.',
  },
  {
    id: 'e3',
    topic: 'energy',
    topicLabel: 'Circular Habits',
    prompt: 'What is "phantom load" (vampire power) in homes and offices?',
    options: [
      'Electricity lost when solar panels shade each other',
      'Power drawn by plugged-in electronics even when turned off or idle',
      'Static electricity on laundry dryers',
      'Surge power during lightning storms',
    ],
    correctIndex: 1,
    explanation:
      'Chargers, TVs, and microwaves on standby quietly consume 5%–10% of residential electricity around the clock.',
    actionTip: 'Use smart power strips to cut standby draw with a single switch.',
  },
  {
    id: 'e4',
    topic: 'energy',
    topicLabel: 'Circular Habits',
    prompt: 'Choosing seasonal, locally grown produce primarily helps sustainability by:',
    options: [
      'Eliminating the need for sunlight',
      'Reducing long-distance refrigerated transport and heated greenhouse energy',
      'Making fruits grow twice as fast overnight',
      'Preventing bees from pollinating crops',
    ],
    correctIndex: 1,
    explanation:
      'In-season local harvests require far less refrigerated air/truck transport and artificial greenhouse heating.',
    actionTip: 'Visit neighborhood farmers markets for fresh harvests with lighter footprints.',
  },
];

export function getQuizRank(correct: number, total: number): {
  title: string;
  message: string;
  stars: number;
} {
  if (total <= 0) {
    return { title: 'Eco Explorer', message: 'Answer questions to earn your rank.', stars: 0 };
  }
  const ratio = correct / total;
  if (ratio >= 0.88) {
    return {
      title: 'Planet Champion',
      message: 'Outstanding mastery of water conservation, food rescue, and circular habits.',
      stars: 3,
    };
  }
  if (ratio >= 0.65) {
    return {
      title: 'Harvest Guardian',
      message: 'Strong sustainability instincts! A couple more facts and you will ace every topic.',
      stars: 2,
    };
  }
  return {
    title: 'Eco Apprentice',
    message: 'Great start! Review the eco tips below and try another round to boost your score.',
    stars: 1,
  };
}
