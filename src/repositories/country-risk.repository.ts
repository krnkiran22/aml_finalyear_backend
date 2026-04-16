import prisma from '../db';

export class CountryRiskRepository {
  async findByCode(countryCode: string) {
    return prisma.countryRisk.findUnique({ where: { countryCode } });
  }

  async findAll() {
    return prisma.countryRisk.findMany({ orderBy: { countryName: 'asc' } });
  }
}

export const countryRiskRepository = new CountryRiskRepository();
