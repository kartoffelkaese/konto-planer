import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  prisma = global.prisma
}

// Verbindung testen
prisma.$connect()
  .then(() => {
    console.log('Prisma Client erfolgreich verbunden')
  })
  .catch((error) => {
    console.error('Fehler bei der Prisma-Verbindung:', error)
  })

export { prisma } 