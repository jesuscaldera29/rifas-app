import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, phone, numbers, raffleId } = data; // numbers is an array of IDs or Values

    if (!name || !phone || !numbers || numbers.length === 0 || !raffleId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Verify all numbers are available
    const existingNumbers = await prisma.number.findMany({
      where: { 
        raffleId: parseInt(raffleId),
        value: { in: numbers }
      }
    });

    const unavailable = existingNumbers.filter(n => n.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      return NextResponse.json({ error: "Algunos números ya no están disponibles." }, { status: 400 });
    }

    // Transaction to create participant and update numbers
    const result = await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.create({
        data: { name, phone }
      });

      await tx.number.updateMany({
        where: {
          raffleId: parseInt(raffleId),
          value: { in: numbers }
        },
        data: {
          status: 'PENDING', // 'APARTADO'
          participantId: participant.id
        }
      });

      return participant;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raffleId = searchParams.get('raffleId');
    
    if (!raffleId) return NextResponse.json({ error: "Missing raffleId" }, { status: 400 });
    
    const participants = await prisma.participant.findMany({
      where: {
        numbers: {
          some: { raffleId: parseInt(raffleId) }
        }
      },
      include: {
        numbers: {
          where: { raffleId: parseInt(raffleId) }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(participants);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
