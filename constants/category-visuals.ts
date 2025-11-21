import { Category } from '@/lib/types/api';

export type CategoryVisual = {
  iconUri: string;
  backgroundColor: string;
  accentColor: string;
};

const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/shopping-bag.png',
  backgroundColor: '#F5F5F5',
  accentColor: '#9A9A9A',
};

const produceVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/apple.png',
  backgroundColor: '#F1FBEF',
  accentColor: '#3B8C24',
};

const deliVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/sandwich.png',
  backgroundColor: '#FFF5EF',
  accentColor: '#D9793B',
};

const bakeryVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/croissant.png',
  backgroundColor: '#FFF8EE',
  accentColor: '#D18C36',
};

const dairyVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/cheese.png',
  backgroundColor: '#FDF8E6',
  accentColor: '#E2B400',
};

const chipsVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/potato-chips.png',
  backgroundColor: '#FFF1F0',
  accentColor: '#F25C5C',
};

const nutsVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/peanuts.png',
  backgroundColor: '#FFF6EE',
  accentColor: '#C27A39',
};

const candyVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/candy.png',
  backgroundColor: '#FFF0FA',
  accentColor: '#C7469E',
};

const jerkyVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/steak.png',
  backgroundColor: '#FDEFEF',
  accentColor: '#B83E3E',
};

const instantVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/noodles.png',
  backgroundColor: '#FFF7E6',
  accentColor: '#E3941E',
};

const cannedVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/soup-plate.png',
  backgroundColor: '#F4F6FF',
  accentColor: '#4E6FD3',
};

const cerealVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/cereal.png',
  backgroundColor: '#FFF8E8',
  accentColor: '#E38C19',
};

const waterVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/water-bottle.png',
  backgroundColor: '#E8F4FF',
  accentColor: '#1B7FCC',
};

const sodaVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/soda-can.png',
  backgroundColor: '#FFF1F1',
  accentColor: '#E04155',
};

const juiceVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/orange-juice.png',
  backgroundColor: '#FFF5E8',
  accentColor: '#FF9122',
};

const energyVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/energy-drink.png',
  backgroundColor: '#F2F4FF',
  accentColor: '#6A5AE0',
};

const coffeeVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/iced-coffee.png',
  backgroundColor: '#F9F2EC',
  accentColor: '#B46A3B',
};

const frozenMealsVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/pizza.png',
  backgroundColor: '#FFF4F0',
  accentColor: '#E25D3B',
};

const frozenTreatsVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/ice-cream-cone.png',
  backgroundColor: '#FFF1F6',
  accentColor: '#D858A8',
};

const tobaccoVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/smoking.png',
  backgroundColor: '#F5F5F5',
  accentColor: '#6C6C6C',
};

const lotteryVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/lottery.png',
  backgroundColor: '#F3F8FF',
  accentColor: '#2F7AE5',
};

const healthOtcVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/color/96/pill.png',
  backgroundColor: '#F5F5FF',
  accentColor: '#5A5AD6',
};

const personalCareVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/soap-dispenser.png',
  backgroundColor: '#F0FEFF',
  accentColor: '#33A4B4',
};

const householdVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/broom.png',
  backgroundColor: '#F4F9F1',
  accentColor: '#6C9B3D',
};

const autoVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/car-service.png',
  backgroundColor: '#F1F5FF',
  accentColor: '#3E6FEA',
};

const electronicsVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/battery.png',
  backgroundColor: '#F2F6FF',
  accentColor: '#3B82F6',
};

const babyVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/baby-bottle.png',
  backgroundColor: '#FFF0F4',
  accentColor: '#E0598B',
};

const petVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/dog-bowl.png',
  backgroundColor: '#F0F8FF',
  accentColor: '#2A7BB5',
};

const seasonalVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/snowflake.png',
  backgroundColor: '#EEF7FF',
  accentColor: '#3C8DDE',
};

const servicesVisual: CategoryVisual = {
  iconUri: 'https://img.icons8.com/fluency/96/gift-card.png',
  backgroundColor: '#FFF9EC',
  accentColor: '#F2AB27',
};

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  FRESH_PRODUCE: produceVisual,
  PRODUCE: produceVisual,
  DELI_PREPARED: deliVisual,
  DELI: deliVisual,
  BAKERY_BREAKFAST: bakeryVisual,
  BREAD: bakeryVisual,
  DAIRY_EGGS: dairyVisual,
  DAIRY: dairyVisual,
  SNACKS_CHIPS: chipsVisual,
  CHIPS: chipsVisual,
  SNACKS_NUTS: nutsVisual,
  NUTS: nutsVisual,
  SNACKS_CANDY: candyVisual,
  CANDY: candyVisual,
  SNACKS_JERKY: jerkyVisual,
  JERKY: jerkyVisual,
  PANTRY_INSTANT: instantVisual,
  INSTANT_MEALS: instantVisual,
  PANTRY_CANNED: cannedVisual,
  CANNED: cannedVisual,
  BREAKFAST_CEREAL: cerealVisual,
  CEREAL: cerealVisual,
  BEV_WATER: waterVisual,
  WATER: waterVisual,
  BEV_SODA: sodaVisual,
  SODA: sodaVisual,
  BEV_JUICE: juiceVisual,
  JUICE: juiceVisual,
  BEV_ENERGY: energyVisual,
  ENERGY: energyVisual,
  BEV_RTD: coffeeVisual,
  COFFEE: coffeeVisual,
  BEV_COFFEE: coffeeVisual,
  FROZEN_MEALS: frozenMealsVisual,
  FROZEN: frozenMealsVisual,
  FROZEN_TREATS: frozenTreatsVisual,
  ICE_CREAM: frozenTreatsVisual,
  TOBACCO_GENERAL: tobaccoVisual,
  TOBACCO: tobaccoVisual,
  LOTTERY: lotteryVisual,
  GAMES: lotteryVisual,
  HEALTH_OTC: healthOtcVisual,
  MEDICINES: healthOtcVisual,
  HEALTH_PERSONAL: personalCareVisual,
  PERSONAL_CARE: personalCareVisual,
  HOUSEHOLD_SUPPLIES: householdVisual,
  HOUSEHOLD: householdVisual,
  AUTO_ACCESSORIES: autoVisual,
  AUTO: autoVisual,
  ELECTRONICS_BATTERY: electronicsVisual,
  ELECTRONICS: electronicsVisual,
  BABY_CARE: babyVisual,
  BABY: babyVisual,
  PET_SUPPLIES: petVisual,
  PET_SUPPLY: petVisual,
  PETS: petVisual,
  SEASONAL: seasonalVisual,
  WINTER: seasonalVisual,
  SERVICES: servicesVisual,
};

function normalizeKey(value?: string) {
  return value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function getCategoryVisual(category?: Pick<Category, 'code' | 'displayName'> | null): CategoryVisual {
  if (!category) {
    return DEFAULT_CATEGORY_VISUAL;
  }

  const codeKey = normalizeKey(category.code);
  if (codeKey && CATEGORY_VISUALS[codeKey]) {
    return CATEGORY_VISUALS[codeKey];
  }

  const nameKey = normalizeKey(category.displayName);
  if (nameKey && CATEGORY_VISUALS[nameKey]) {
    return CATEGORY_VISUALS[nameKey];
  }

  return DEFAULT_CATEGORY_VISUAL;
}
