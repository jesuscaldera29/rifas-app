const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function test() {
  try {
    await p.$connect();
    console.log('DB CONNECTED OK');
    const count = await p.raffle.count();
    console.log('Raffle count:', count);
    await p.$disconnect();
  } catch (e) {
    console.error('DB ERROR:', e.message);
    process.exit(1);
  }
}
test();
