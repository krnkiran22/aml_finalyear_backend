import { PrismaClient, FATFStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface CountrySeedData {
  countryCode: string;
  countryName: string;
  baseScore: number;
  fatfStatus: FATFStatus;
}

const countries: CountrySeedData[] = [
  // Low Risk — Compliant Countries (0–39)
  { countryCode: 'US', countryName: 'United States', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'GB', countryName: 'United Kingdom', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'DE', countryName: 'Germany', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'IN', countryName: 'India', baseScore: 20, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'FR', countryName: 'France', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'CA', countryName: 'Canada', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'AU', countryName: 'Australia', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'JP', countryName: 'Japan', baseScore: 12, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'SG', countryName: 'Singapore', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'CH', countryName: 'Switzerland', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'NL', countryName: 'Netherlands', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'SE', countryName: 'Sweden', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'NO', countryName: 'Norway', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'DK', countryName: 'Denmark', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'NZ', countryName: 'New Zealand', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'KR', countryName: 'South Korea', baseScore: 15, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'ES', countryName: 'Spain', baseScore: 15, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'IT', countryName: 'Italy', baseScore: 18, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'AT', countryName: 'Austria', baseScore: 12, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'BE', countryName: 'Belgium', baseScore: 15, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'PT', countryName: 'Portugal', baseScore: 14, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'FI', countryName: 'Finland', baseScore: 8, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'IE', countryName: 'Ireland', baseScore: 10, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'HK', countryName: 'Hong Kong', baseScore: 20, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'IL', countryName: 'Israel', baseScore: 25, fatfStatus: FATFStatus.LOW_RISK },

  // Grey List Countries (40–69)
  { countryCode: 'AE', countryName: 'United Arab Emirates', baseScore: 55, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'PK', countryName: 'Pakistan', baseScore: 62, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'NG', countryName: 'Nigeria', baseScore: 58, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'ZA', countryName: 'South Africa', baseScore: 50, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'TR', countryName: 'Turkey', baseScore: 52, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'PH', countryName: 'Philippines', baseScore: 48, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'VN', countryName: 'Vietnam', baseScore: 45, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'MA', countryName: 'Morocco', baseScore: 42, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'CM', countryName: 'Cameroon', baseScore: 55, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'SN', countryName: 'Senegal', baseScore: 48, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'TZ', countryName: 'Tanzania', baseScore: 50, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'KE', countryName: 'Kenya', baseScore: 45, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'HT', countryName: 'Haiti', baseScore: 65, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'JO', countryName: 'Jordan', baseScore: 44, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'MM', countryName: 'Myanmar', baseScore: 68, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'LB', countryName: 'Lebanon', baseScore: 60, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'ML', countryName: 'Mali', baseScore: 62, fatfStatus: FATFStatus.GREY_LIST },
  { countryCode: 'SS', countryName: 'South Sudan', baseScore: 66, fatfStatus: FATFStatus.GREY_LIST },

  // High Risk Countries (70–85)
  { countryCode: 'IR', countryName: 'Iran', baseScore: 82, fatfStatus: FATFStatus.HIGH_RISK },
  { countryCode: 'KP', countryName: 'North Korea', baseScore: 85, fatfStatus: FATFStatus.BLACKLISTED },
  { countryCode: 'MM_HR', countryName: 'Myanmar (High Risk)', baseScore: 78, fatfStatus: FATFStatus.HIGH_RISK },
  { countryCode: 'RU', countryName: 'Russia', baseScore: 75, fatfStatus: FATFStatus.HIGH_RISK },
  { countryCode: 'BY', countryName: 'Belarus', baseScore: 72, fatfStatus: FATFStatus.HIGH_RISK },
  { countryCode: 'SY', countryName: 'Syria', baseScore: 83, fatfStatus: FATFStatus.BLACKLISTED },
  { countryCode: 'CU', countryName: 'Cuba', baseScore: 70, fatfStatus: FATFStatus.HIGH_RISK },

  // Other important countries
  { countryCode: 'BR', countryName: 'Brazil', baseScore: 30, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'MX', countryName: 'Mexico', baseScore: 35, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'AR', countryName: 'Argentina', baseScore: 38, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'CN', countryName: 'China', baseScore: 35, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'MY', countryName: 'Malaysia', baseScore: 28, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'TH', countryName: 'Thailand', baseScore: 30, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'ID', countryName: 'Indonesia', baseScore: 32, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'BD', countryName: 'Bangladesh', baseScore: 38, fatfStatus: FATFStatus.LOW_RISK },
  { countryCode: 'LK', countryName: 'Sri Lanka', baseScore: 36, fatfStatus: FATFStatus.LOW_RISK },
];

async function main() {
  console.log('Seeding CountryRisk table...');

  for (const country of countries) {
    await prisma.countryRisk.upsert({
      where: { countryCode: country.countryCode },
      update: {
        countryName: country.countryName,
        baseScore: country.baseScore,
        fatfStatus: country.fatfStatus,
      },
      create: country,
    });
  }

  console.log(`Seeded ${countries.length} countries.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
