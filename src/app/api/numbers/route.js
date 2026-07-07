import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req) {
  try {
    const data = await req.json();
    const { numberIds, status } = data; // status: 'AVAILABLE', 'PENDING', 'PAID'

    if (!numberIds || numberIds.length === 0 || !status) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const validStatuses = ['AVAILABLE', 'PENDING', 'PAID'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updateData = { status };
    if (status === 'AVAILABLE') {
      updateData.participantId = null; // Unlink participant if made available again
    }

    const updatedNumbers = await prisma.number.updateMany({
      where: {
        id: { in: numberIds }
      },
      data: updateData
    });

    return NextResponse.json(updatedNumbers);
  } catch (error) {
    console.error("Update numbers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
