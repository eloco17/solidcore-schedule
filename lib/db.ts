import { PrismaClient } from "@prisma/client"

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Configure Prisma Client with serverless-specific settings
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Use existing client if available, otherwise create a new one
export const db = globalForPrisma.prisma || prismaClientSingleton()

// In development, preserve the client across hot reloads
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

// Type definitions for Solidcore users
interface SolidcoreUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  solidcoreEmail: string;
  solidcorePassword: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SolidcoreUserCreateInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  solidcoreEmail: string;
  solidcorePassword: string;
}

// Database operations for Solidcore users
export const solidcoreDb = {
  users: {
    create: async (data: SolidcoreUserCreateInput): Promise<SolidcoreUser> => {
      return db.solidcoreUser.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    },
    findByEmail: async (email: string): Promise<SolidcoreUser | null> => {
      return db.solidcoreUser.findUnique({
        where: { email },
      });
    },
  },
};

export default db;
