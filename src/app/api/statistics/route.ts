import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const merchant = searchParams.get('merchant')
    const timeRange = searchParams.get('timeRange')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Startdatum basierend auf Zeitraum berechnen
    let startDateObj: Date
    if (timeRange === 'custom' && startDate && endDate) {
      startDateObj = new Date(startDate)
      // Setze das Enddatum auf den letzten Tag des Monats
      const endDateObj = new Date(endDate)
      endDateObj.setMonth(endDateObj.getMonth() + 1)
      endDateObj.setDate(0)
    } else {
      startDateObj = new Date()
      switch (timeRange) {
        case '1month':
          startDateObj.setMonth(startDateObj.getMonth() - 1)
          break
        case '3months':
          startDateObj.setMonth(startDateObj.getMonth() - 3)
          break
        case '6months':
          startDateObj.setMonth(startDateObj.getMonth() - 6)
          break
        case '1year':
          startDateObj.setFullYear(startDateObj.getFullYear() - 1)
          break
        default:
          startDateObj.setMonth(startDateObj.getMonth() - 3) // Standard: 3 Monate
      }
    }

    // Transaktionen abrufen
    const transactions = await prisma.transaction.findMany({
      where: {
        user: {
          email: session.user.email
        },
        ...(category && {
        merchantRef: {
          categoryId: category
          }
        }),
        ...(merchant && {
          merchantId: merchant
        }),
        date: {
          gte: startDateObj
        }
      },
      include: {
        merchantRef: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Daten für die Grafik vorbereiten
    const monthlyData = transactions.reduce((acc: { [key: string]: number }, transaction) => {
      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      acc[monthKey] = (acc[monthKey] || 0) + Math.abs(Number(transaction.amount))
      return acc
    }, {})

    // Daten in das Format für die Grafik umwandeln
    const chartData = Object.entries(monthlyData).map(([date, amount]) => {
      const transaction = transactions.find((t) => {
        const tDate = new Date(t.date)
        const tMonthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`
        return tMonthKey === date
      })
      return {
        date,
        amount,
        category: transaction?.merchantRef?.category?.name || '',
        color: transaction?.merchantRef?.category?.color || '#A7C7E7' // Standardfarbe falls keine Kategorie
      }
    })

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error)
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 })
  }
} 