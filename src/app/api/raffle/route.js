import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let raffle = await prisma.raffle.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        numbers: {
          include: { participant: true }
        }
      }
    });

    if (!raffle) {
      raffle = await prisma.raffle.create({
        data: {
          name: 'Gran Rifa',
          totalNumbers: 100,
          pricePerNumber: 5000,
          lotteryName: 'Sinuano Noche',
          drawDate: 'Por definir',
          prizes: 'Gran Premio Sorpresa',
          digits: 2,
          numbers: {
            create: Array.from({ length: 100 }).map((_, i) => ({ value: i }))
          }
        },
        include: { 
          numbers: {
            include: { participant: true }
          }
        }
      });
    }

    return NextResponse.json(raffle);
  } catch (error) {
    console.error("Error fetching raffle:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const data = await req.json();
    const { id, lotteryName, launchDate, drawDate, prizes, digits, totalNumbers, pricePerNumber, name } = data;

    if (!id) return NextResponse.json({ error: "Falta el ID" }, { status: 400 });

    const currentRaffle = await prisma.raffle.findUnique({ where: { id } });

    // If totalNumbers changed and no numbers are paid/pending yet, we could recreate numbers.
    // For safety, we only update text fields if the raffle has already started.
    // Assuming simple update for now:
    const updated = await prisma.raffle.update({
      where: { id },
      data: {
        name: name || currentRaffle.name,
        lotteryName: lotteryName !== undefined ? lotteryName : currentRaffle.lotteryName,
        launchDate: launchDate !== undefined ? launchDate : currentRaffle.launchDate,
        drawDate: drawDate !== undefined ? drawDate : currentRaffle.drawDate,
        prizes: prizes !== undefined ? prizes : currentRaffle.prizes,
        digits: digits !== undefined ? Number(digits) : currentRaffle.digits,
        totalNumbers: totalNumbers !== undefined ? Number(totalNumbers) : currentRaffle.totalNumbers,
        pricePerNumber: pricePerNumber || currentRaffle.pricePerNumber,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { action, payload } = data;

    if (action === 'DRAW_WINNERS') {
      const { raffleId, winningNumber } = payload;
      
      const raffle = await prisma.raffle.findUnique({
        where: { id: raffleId },
        include: { numbers: { where: { status: 'PAID' } } }
      });
      
      if (!raffle) throw new Error("Rifa no encontrada");
      if (!winningNumber) throw new Error("Debe ingresar el número ganador de la lotería");
      
      const digitsStr = String(winningNumber);
      const neededDigits = raffle.digits; // e.g. 2
      
      // We extract the last N digits of the lottery number
      let winningSubstr = digitsStr.slice(-neededDigits);
      if (winningSubstr.length < neededDigits) {
        winningSubstr = winningSubstr.padStart(neededDigits, '0');
      }

      // Find the participant(s) who have this number
      const winningInternalValue = parseInt(winningSubstr, 10);
      
      const winnersList = [winningInternalValue].join(',');
      
      const updatedRaffle = await prisma.raffle.update({
        where: { id: raffleId },
        data: { 
          winningNumber: digitsStr,
          winners: winnersList
        }
      });
      
      return NextResponse.json(updatedRaffle);
    }
    
    if (action === 'GENERATE_NUMBERS') {
      const { raffleId } = payload;
      const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
      if (!raffle) throw new Error("Rifa no encontrada");

      // Borrar todos los números actuales
      await prisma.number.deleteMany({ where: { raffleId } });

      // Generar los nuevos números basados en el totalNumbers configurado
      const count = raffle.totalNumbers;

      // Prisma SQLite bulk insert limit can be hit for 10000 rows, so we can use createMany, 
      // but in SQLite sometimes the chunk limit is 999. Let's do it in chunks.
      const numbersData = Array.from({ length: count }).map((_, i) => ({ value: i, raffleId }));
      
      const chunkSize = 500;
      for (let i = 0; i < numbersData.length; i += chunkSize) {
        const chunk = numbersData.slice(i, i + chunkSize);
        await prisma.number.createMany({ data: chunk });
      }

      await prisma.raffle.update({
        where: { id: raffleId },
        data: { totalNumbers: count }
      });

      return NextResponse.json({ success: true, generated: count });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
