const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // 1. Clean existing records (Cascade delete should handle relationships)
  await prisma.checkinLog.deleteMany({});
  await prisma.checkinDevice.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.scheduleRule.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("Cleared existing database records.");

  // 2. Seed Tenants
  const sfera = await prisma.tenant.create({
    data: {
      id: "sfera",
      name: "Sféra Pardubice",
      domain: "sfera.localhost:3000",
      vertical: "EDUCATIONAL_COURSE",
      ssoClientId: "sfera-sso-client",
      ssoClientSec: "sfera-client-secret-12345",
      attributes: {
        tagline: "Vědecko-technologické centrum a laboratoře",
        openTime: "08:00",
        closeTime: "18:00",
        adminEmails: ["josef.novak@deepvision.cz"],
      }
    },
  });

  const umelka = await prisma.tenant.create({
    data: {
      id: "umelka",
      name: "Umělka Pardubice",
      domain: "umelka.localhost:3000",
      vertical: "SPORTS_GROUND", // Sport pitch vertical
      ssoClientId: "umelka-sso-client",
      ssoClientSec: "umelka-client-secret-abcde",
      attributes: {
        tagline: "Zažijte nefalšovanou fotbalovou zábavu i bez přírodní trávy. Pronájem hřiště s umělým trávníkem 3. generace s certifikací FIFA.",
        openTime: "08:00",
        closeTime: "22:00", // Extends to 22:00 for evening rentals with lighting
        adminEmails: ["josef.novak@deepvision.cz"],
      }
    },
  });

  console.log("Seeded Tenants: Sféra (Educational) and Umělka (Sports).");

  // 3. Seed Resources for Sféra (Educational Courses / Labs)
  const chemLab = await prisma.resource.create({
    data: {
      tenantId: sfera.id,
      name: "Laboratoř chemie",
      type: "COURSE_PROGRAM",
      maxCapacity: 12,
      attributes: {
        instructor: "Markéta Sodomková",
        room: "Učebna A",
      },
    },
  });

  const physLab = await prisma.resource.create({
    data: {
      tenantId: sfera.id,
      name: "Dílna fyziky",
      type: "COURSE_PROGRAM",
      maxCapacity: 15,
      attributes: {
        instructor: "Markéta Sodomková",
        room: "Učebna B",
      },
    },
  });

  const techLab = await prisma.resource.create({
    data: {
      tenantId: sfera.id,
      name: "Klub robotiky",
      type: "COURSE_PROGRAM",
      maxCapacity: 8,
      attributes: {
        instructor: "Petr Horák",
        room: "Dílna Robotiky",
      },
    },
  });

  // 4. Seed Resources for Umělka (Soccer Pitch Fields / Sectors)
  const celaplocha = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Celá plocha",
      type: "SPACE",
      maxCapacity: 1,
      attributes: {
        surface: "Umělá tráva 3. generace",
        equipment: "Pevné branky, 18x přenosné branky, osvětlení",
      },
    },
  });

  const sektorA = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Sektor A (1/2 hřiště)",
      type: "SPACE",
      maxCapacity: 1,
      attributes: {
        parentId: celaplocha.id,
        surface: "Umělá tráva 3. generace",
        equipment: "Tréninkové branky",
      },
    },
  });

  const sektorB = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Sektor B (1/2 hřiště)",
      type: "SPACE",
      maxCapacity: 1,
      attributes: {
        parentId: celaplocha.id,
        surface: "Umělá tráva 3. generace",
        equipment: "Tréninkové branky",
      },
    },
  });

  console.log("Seeded bookable resources.");

  // 5. Seed Schedule Rules (Slots)
  // Sféra Tuesday (dayIndex 1 -> Tuesday is 2 in Prisma)
  const sfRule1 = await prisma.scheduleRule.create({
    data: {
      resourceId: chemLab.id,
      name: "Učebna: Přírodopis (Chemie)",
      dayOfWeek: 2, // Tuesday
      startTime: "12:30",
      endTime: "14:00",
      price: 150.00,
      maxCapacity: 12,
    },
  });

  const sfRule2 = await prisma.scheduleRule.create({
    data: {
      resourceId: chemLab.id,
      name: "Učebna: Přírodopis (Chemie)",
      dayOfWeek: 2, // Tuesday
      startTime: "14:30",
      endTime: "16:00",
      price: 150.00,
      maxCapacity: 12,
    },
  });

  // Sféra Friday (dayIndex 4 -> Friday is 5 in Prisma)
  const sfRule3 = await prisma.scheduleRule.create({
    data: {
      resourceId: physLab.id,
      name: "Učebna: Přírodopis (Fyzika)",
      dayOfWeek: 5, // Friday
      startTime: "08:30",
      endTime: "10:00",
      price: 120.00,
      maxCapacity: 15,
    },
  });

  const sfRule4 = await prisma.scheduleRule.create({
    data: {
      resourceId: physLab.id,
      name: "Učebna: Přírodopis (Fyzika)",
      dayOfWeek: 5, // Friday
      startTime: "10:30",
      endTime: "12:00",
      price: 120.00,
      maxCapacity: 15,
    },
  });

  const sfRule5 = await prisma.scheduleRule.create({
    data: {
      resourceId: physLab.id,
      name: "Učebna: Přírodopis (Fyzika)",
      dayOfWeek: 5, // Friday
      startTime: "12:30",
      endTime: "14:00",
      price: 120.00,
      maxCapacity: 15,
    },
  });

  // Seed default pricing rules for Umělka (to let admins see default options)
  // These represent available slots that can be blocked or default pricing templates.
  await prisma.scheduleRule.create({
    data: {
      resourceId: celaplocha.id,
      name: "Letní sezóna - celá plocha",
      dayOfWeek: 1, // Monday default template
      startTime: "08:00",
      endTime: "22:00",
      price: 1500.00,
      maxCapacity: 1,
    }
  });

  console.log("Seeded schedule rules.");

  // 6. Seed Check-in Devices
  const sferaToken = "sec_tok_xyz...";
  const hashedSferaToken = crypto.createHash("sha256").update(sferaToken).digest("hex");

  const umelkaToken = "sec_tok_umelka_xyz...";
  const hashedUmelkaToken = crypto.createHash("sha256").update(umelkaToken).digest("hex");

  await prisma.checkinDevice.create({
    data: {
      id: "gate_north_001",
      tenantId: sfera.id,
      name: "Sféra North Gate Turnstile",
      tokenHash: hashedSferaToken,
      active: true,
    },
  });

  await prisma.checkinDevice.create({
    data: {
      id: "gate_umelka_001",
      tenantId: umelka.id,
      name: "Umělka Entrance Tablet",
      tokenHash: hashedUmelkaToken,
      active: true,
    },
  });

  console.log("Seeded check-in devices.");

  // 7. Seed Confirmed Bookings for Umělka (to match the screenshot calendar events)
  // Target week starts Monday, June 8, 2026.
  const seedBookings = [
    // 1. Tuesday, June 9: Sektor A (8:00 - 9:00)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-09T08:00:00",
      to: "2026-06-09T09:00:00",
    },
    // 2. Wednesday, June 10: Sektor B (8:00 - 9:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-10T08:00:00",
      to: "2026-06-10T09:00:00",
    },
    // 3. Monday, June 8: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-08T14:30:00",
      to: "2026-06-08T16:00:00",
    },
    // 4. Tuesday, June 9: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-09T14:30:00",
      to: "2026-06-09T16:00:00",
    },
    // 5. Wednesday, June 10: Sektor B (15:30 - 16:30)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-10T15:30:00",
      to: "2026-06-10T16:30:00",
    },
    // 6. Thursday, June 11: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-11T14:30:00",
      to: "2026-06-11T16:00:00",
    },
    // 7. Friday, June 12: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-12T14:30:00",
      to: "2026-06-12T16:00:00",
    },
    // 8. Monday, June 8: Sektor A (16:00 - 17:00)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "amater@seznam.cz",
      from: "2026-06-08T16:00:00",
      to: "2026-06-08T17:00:00",
    },
    // 9. Tuesday, June 9: Sektor B (16:00 - 17:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "amater@seznam.cz",
      from: "2026-06-09T16:00:00",
      to: "2026-06-09T17:00:00",
    },
    // 10. Thursday, June 11: Sektor B (16:00 - 17:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "amater@seznam.cz",
      from: "2026-06-11T16:00:00",
      to: "2026-06-11T17:00:00",
    },
    // 11. Friday, June 12: Celá plocha (16:00 - 22:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "firemka@era.cz",
      from: "2026-06-12T16:00:00",
      to: "2026-06-12T22:00:00",
    },
    // 12. Monday, June 8: Sektor A (17:00 - 17:30)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "soused@gmail.com",
      from: "2026-06-08T17:00:00",
      to: "2026-06-08T17:30:00",
    },
    // 13. Wednesday, June 10: Sektor B (17:00 - 18:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "soused@gmail.com",
      from: "2026-06-10T17:00:00",
      to: "2026-06-10T18:00:00",
    },
  ];

  for (let i = 0; i < seedBookings.length; i++) {
    const sb = seedBookings[i];
    await prisma.booking.create({
      data: {
        tenantId: umelka.id,
        resourceId: sb.resourceId,
        scheduleRuleId: null, // Custom one-off bookings
        oneidUserId: "9999",
        userName: sb.userName,
        userEmail: sb.userEmail,
        reservedFrom: new Date(sb.from),
        reservedTo: new Date(sb.to),
        status: "CONFIRMED",
      },
    });
  }

  // Seed dummy Sféra booking
  const sferaBookingFrom = new Date();
  sferaBookingFrom.setHours(sferaBookingFrom.getHours() - 1);
  const sferaBookingTo = new Date();
  sferaBookingTo.setHours(sferaBookingTo.getHours() + 1);

  await prisma.booking.create({
    data: {
      id: "mock_dev_ticket_uuid",
      tenantId: sfera.id,
      resourceId: chemLab.id,
      scheduleRuleId: sfRule1.id,
      oneidUserId: "9999",
      userName: "Josef Novák (Dev Mock)",
      userEmail: "josef.novak@deepvision.cz",
      reservedFrom: sferaBookingFrom,
      reservedTo: sferaBookingTo,
      status: "CONFIRMED",
    },
  });

  console.log("Seeded confirmed bookings.");
  console.log("Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
