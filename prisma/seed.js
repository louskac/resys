const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Starting database seed...");

  // 1. Clean existing records (Cascade delete should handle relationships)
  await prisma.checkinLog.deleteMany({});
  await prisma.checkinDevice.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.scheduleRule.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.user.deleteMany({}); // Delete users
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
      timezone: "Europe/Prague",
      locale: "cs-CZ",
      currency: "CZK",
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
      timezone: "Europe/Prague",
      locale: "cs-CZ",
      currency: "CZK",
      attributes: {
        tagline: "Zažijte nefalšovanou fotbalovou zábavu i bez přírodní trávy. Pronájem hřiště s umělým trávníkem 3. generace s certifikací FIFA.",
        openTime: "08:00",
        closeTime: "22:00", // Extends to 22:00 for evening rentals with lighting
        adminEmails: ["josef.novak@deepvision.cz"],
        bannerImage: "/uploads/umelka-banner.jpg",
      }
    },
  });

  const zskomenskeho = await prisma.tenant.create({
    data: {
      id: "zskomenskeho",
      name: "ZŠ Komenského",
      domain: "zskomenskeho.localhost:3000",
      vertical: "SPORTS_GROUND",
      ssoClientId: "zskomenskeho-sso-client",
      ssoClientSec: "zskomenskeho-client-secret-xyz",
      timezone: "Europe/Prague",
      locale: "cs-CZ",
      currency: "CZK",
      attributes: {
        tagline: "Rezervační portál sportovišť a tělocvičen ZŠ Komenského",
        openTime: "08:00",
        closeTime: "21:00",
        adminEmails: ["josef.novak@deepvision.cz"],
        bannerImage: "/uploads/zskomenskeho-banner.jpg",
      }
    },
  });

  const londonfit = await prisma.tenant.create({
    data: {
      id: "londonfit",
      name: "London Fitness Hub",
      domain: "londonfit.localhost:3000",
      vertical: "CAPACITY_CLASS",
      ssoClientId: "londonfit-sso-client",
      ssoClientSec: "londonfit-client-secret-xyz",
      timezone: "Europe/London",
      locale: "en-GB",
      currency: "GBP",
      attributes: {
        tagline: "Premium boutique fitness classes in the heart of London.",
        openTime: "06:00",
        closeTime: "21:00",
        adminEmails: ["josef.novak@deepvision.cz"],
      }
    },
  });

  console.log("Seeded Tenants: Sféra, Umělka, ZŠ Komenského and London Fitness Hub.");

  // Seed Users
  await prisma.user.create({
    data: {
      email: "superadmin@resys.cz",
      passwordHash: hashPassword("superadmin"),
      name: "Platform Superadmin",
      role: "SUPERADMIN",
    }
  });

  await prisma.user.create({
    data: {
      email: "admin@sfera.cz",
      passwordHash: hashPassword("sfera"),
      name: "Sféra Administrator",
      role: "ADMIN",
      tenantId: sfera.id,
    }
  });

  await prisma.user.create({
    data: {
      email: "admin@umelka.cz",
      passwordHash: hashPassword("umelka"),
      name: "Umělka Administrator",
      role: "ADMIN",
      tenantId: umelka.id,
    }
  });

  await prisma.user.create({
    data: {
      email: "admin@zskomenskeho.cz",
      passwordHash: hashPassword("zskomenskeho"),
      name: "ZŠ Komenského Administrator",
      role: "ADMIN",
      tenantId: zskomenskeho.id,
    }
  });

  await prisma.user.create({
    data: {
      email: "admin@londonfit.co.uk",
      passwordHash: hashPassword("londonfit"),
      name: "London Fitness Administrator",
      role: "ADMIN",
      tenantId: londonfit.id,
    }
  });

  const partner = await prisma.partner.create({
    data: {
      id: "mock-partner-uuid",
      tenantId: sfera.id,
      name: "DeepVision Corporate",
      email: "billing@deepvision.cz",
      companyId: "28812345",
      vatId: "CZ28812345",
      addressStreet: "17. listopadu 237",
      addressCity: "Pardubice",
      addressZip: "53002",
      addressCountry: "Česká republika",
      discount: 15,
      creditBalance: 25000,
      creditLimit: 50000,
      billingCycle: "MONTHLY",
      paymentTermsDays: 14,
      autoBillingEnabled: true,
    }
  });

  await prisma.user.create({
    data: {
      id: "9999", // Match mock_dev_session_secret
      email: "josef.novak@deepvision.cz",
      passwordHash: hashPassword("josef"),
      name: "Josef Novák (Customer)",
      role: "USER",
      phone: "+420123456789",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      addressStreet: "17. listopadu 237",
      addressCity: "Pardubice",
      addressZip: "53002",
      addressCountry: "Česká republika",
      organization: "DeepVision s.r.o.",
      partnerId: partner.id,
    }
  });

  await prisma.user.create({
    data: {
      email: "employee@deepvision.cz",
      passwordHash: hashPassword("employee"),
      name: "Jan Svoboda (Employee)",
      role: "USER",
      partnerId: partner.id,
    }
  });

  await prisma.user.create({
    data: {
      email: "user@gmail.com",
      passwordHash: hashPassword("user"),
      name: "Jan Novotný",
      role: "USER",
      phone: "+420987654321",
    }
  });

  console.log("Seeded default users.");

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

  const hriste2 = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Hřiště 2",
      type: "SPACE",
      maxCapacity: 10,
      attributes: {
        room: "",
        surface: "Umělá tráva 3. generace",
        equipment: "Osvětlení, přenosné branky",
        instructor: ""
      }
    }
  });

  const sektorAlfa = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Sektor Alfa",
      type: "SPACE",
      maxCapacity: 10,
      attributes: {
        room: "",
        surface: "Umělá tráva 3. generace",
        parentId: hriste2.id,
        equipment: "Menší přenosné branky",
        instructor: ""
      }
    }
  });

  const sektorBeta = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Sektro Beta",
      type: "SPACE",
      maxCapacity: 10,
      attributes: {
        room: "",
        surface: "Umělá tráva 3. generace",
        parentId: hriste2.id,
        equipment: "Menší přenosné branky",
        instructor: ""
      }
    }
  });

  const sektorGamma = await prisma.resource.create({
    data: {
      tenantId: umelka.id,
      name: "Sektor Gamma",
      type: "SPACE",
      maxCapacity: 10,
      attributes: {
        room: "",
        price: "100",
        surface: "Umělá tráva 3. generace",
        parentId: hriste2.id,
        equipment: "Menší přenosné branky",
        instructor: ""
      }
    }
  });

  const velkaHala = await prisma.resource.create({
    data: {
      tenantId: zskomenskeho.id,
      name: "Velká sportovní hala",
      type: "SPACE",
      maxCapacity: 1,
      attributes: {
        surface: "Palubovka",
        price: "450",
        equipment: "Branky na florbal/futsal, basketbalové koše, volejbalová síť",
      },
    },
  });

  const malaTelocvicna = await prisma.resource.create({
    data: {
      tenantId: zskomenskeho.id,
      name: "Malá tělocvična",
      type: "SPACE",
      maxCapacity: 1,
      attributes: {
        surface: "Parkety",
        price: "250",
        equipment: "Švédské bedny, žebřiny, kruhy, žíněnky",
      },
    },
  });

  const spinStudio = await prisma.resource.create({
    data: {
      tenantId: londonfit.id,
      name: "Spin Studio",
      type: "SEAT",
      maxCapacity: 20,
      attributes: {
        instructor: "Sarah Jenkins",
        room: "Studio 2",
        equipment: "Peloton Stage Bike",
      },
    },
  });

  const yogaStudio = await prisma.resource.create({
    data: {
      tenantId: londonfit.id,
      name: "Yoga & Pilates Space",
      type: "SEAT",
      maxCapacity: 15,
      attributes: {
        instructor: "Michael Chang",
        room: "Studio 4",
        equipment: "Yoga Mats, Blocks, Straps",
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

  for (let day = 1; day <= 5; day++) {
    await prisma.scheduleRule.create({
      data: {
        resourceId: velkaHala.id,
        name: "Provozní doba - hala",
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "21:00",
        price: 600.00,
        maxCapacity: 1,
      }
    });

    await prisma.scheduleRule.create({
      data: {
        resourceId: malaTelocvicna.id,
        name: "Provozní doba - tělocvična",
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "21:00",
        price: 400.00,
        maxCapacity: 1,
      }
    });
  }

  // Seed schedule rules for London Fitness Hub
  for (let day = 1; day <= 5; day++) {
    await prisma.scheduleRule.create({
      data: {
        resourceId: spinStudio.id,
        name: "Morning Spin Session",
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "09:00",
        price: 15.00,
        maxCapacity: 20,
      }
    });

    await prisma.scheduleRule.create({
      data: {
        resourceId: spinStudio.id,
        name: "Evening Power Spin",
        dayOfWeek: day,
        startTime: "17:00",
        endTime: "18:00",
        price: 20.00,
        maxCapacity: 20,
      }
    });

    await prisma.scheduleRule.create({
      data: {
        resourceId: yogaStudio.id,
        name: "Vinyasa Flow Yoga",
        dayOfWeek: day,
        startTime: "10:00",
        endTime: "11:30",
        price: 18.00,
        maxCapacity: 15,
      }
    });
  }

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

  const zskomenskehoToken = "sec_tok_zskomenskeho_xyz123";
  const hashedZskomenskehoToken = crypto.createHash("sha256").update(zskomenskehoToken).digest("hex");

  await prisma.checkinDevice.create({
    data: {
      id: "gate_zskomenskeho_001",
      tenantId: zskomenskeho.id,
      name: "Turniket Hlavní Vstup ZŠ",
      tokenHash: hashedZskomenskehoToken,
      active: true,
    }
  });

  console.log("Seeded check-in devices.");

  // 7. Seed Confirmed Bookings for Umělka (to match the screenshot calendar events)
  // Target week starts Monday, June 8, 2026.
  const seedBookings = [
    // Tuesday, June 9: Sektor Alfa (10:00 - 11:30)
    {
      resourceId: sektorAlfa.id,
      userName: "Sektor Alfa",
      userEmail: "alfa-team@seznam.cz",
      from: "2026-06-09T10:00:00Z",
      to: "2026-06-09T11:30:00Z",
    },
    // Wednesday, June 10: Sektro Beta (11:00 - 12:00)
    {
      resourceId: sektorBeta.id,
      userName: "Sektro Beta",
      userEmail: "beta-team@seznam.cz",
      from: "2026-06-10T11:00:00Z",
      to: "2026-06-10T12:00:00Z",
    },
    // Wednesday, June 10: Sektor Gamma (12:30 - 14:00)
    {
      resourceId: sektorGamma.id,
      userName: "Sektor Gamma",
      userEmail: "gamma-team@seznam.cz",
      from: "2026-06-10T12:30:00Z",
      to: "2026-06-10T14:00:00Z",
    },
    // Thursday, June 11: Hřiště 2 (18:00 - 20:00)
    {
      resourceId: hriste2.id,
      userName: "Hřiště 2",
      userEmail: "vecerni-fotbal@seznam.cz",
      from: "2026-06-11T18:00:00Z",
      to: "2026-06-11T20:00:00Z",
    },
    // 1. Tuesday, June 9: Sektor A (8:00 - 9:00)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-09T08:00:00Z",
      to: "2026-06-09T09:00:00Z",
    },
    // 2. Wednesday, June 10: Sektor B (8:00 - 9:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-10T08:00:00Z",
      to: "2026-06-10T09:00:00Z",
    },
    // 3. Monday, June 8: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-08T14:30:00Z",
      to: "2026-06-08T16:00:00Z",
    },
    // 4. Tuesday, June 9: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-09T14:30:00Z",
      to: "2026-06-09T16:00:00Z",
    },
    // 5. Wednesday, June 10: Sektor B (15:30 - 16:30)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "klub@fkpardubice.cz",
      from: "2026-06-10T15:30:00Z",
      to: "2026-06-10T16:30:00Z",
    },
    // 6. Thursday, June 11: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-11T14:30:00Z",
      to: "2026-06-11T16:00:00Z",
    },
    // 7. Friday, June 12: Celá plocha (14:30 - 16:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "hc@dynamopardubice.cz",
      from: "2026-06-12T14:30:00Z",
      to: "2026-06-12T16:00:00Z",
    },
    // 8. Monday, June 8: Sektor A (16:00 - 17:00)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "amater@seznam.cz",
      from: "2026-06-08T16:00:00Z",
      to: "2026-06-08T17:00:00Z",
    },
    // 9. Tuesday, June 9: Sektor B (16:00 - 17:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "amater@seznam.cz",
      from: "2026-06-09T16:00:00Z",
      to: "2026-06-09T17:00:00Z",
    },
    // 10. Thursday, June 11: Sektor B (16:00 - 17:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "amater@seznam.cz",
      from: "2026-06-11T16:00:00Z",
      to: "2026-06-11T17:00:00Z",
    },
    // 11. Friday, June 12: Celá plocha (16:00 - 22:00)
    {
      resourceId: celaplocha.id,
      userName: "Celá plocha",
      userEmail: "firemka@era.cz",
      from: "2026-06-12T16:00:00Z",
      to: "2026-06-12T22:00:00Z",
    },
    // 12. Monday, June 8: Sektor A (17:00 - 17:30)
    {
      resourceId: sektorA.id,
      userName: "Sektor A",
      userEmail: "soused@gmail.com",
      from: "2026-06-08T17:00:00Z",
      to: "2026-06-08T17:30:00Z",
    },
    // 13. Wednesday, June 10: Sektor B (17:00 - 18:00)
    {
      resourceId: sektorB.id,
      userName: "Sektor B",
      userEmail: "soused@gmail.com",
      from: "2026-06-10T17:00:00Z",
      to: "2026-06-10T18:00:00Z",
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

  const booking1 = await prisma.booking.create({
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
      partnerId: partner.id,
      price: 150.00,
    },
  });

  const empBookingFrom = new Date();
  empBookingFrom.setDate(empBookingFrom.getDate() - 1);
  empBookingFrom.setHours(10, 0, 0, 0);
  const empBookingTo = new Date();
  empBookingTo.setDate(empBookingTo.getDate() - 1);
  empBookingTo.setHours(12, 0, 0, 0);

  await prisma.booking.create({
    data: {
      tenantId: sfera.id,
      resourceId: chemLab.id,
      scheduleRuleId: sfRule1.id,
      oneidUserId: "8888",
      userName: "Jan Svoboda (Employee)",
      userEmail: "employee@deepvision.cz",
      reservedFrom: empBookingFrom,
      reservedTo: empBookingTo,
      status: "ATTENDED",
      partnerId: partner.id,
      price: 300.00,
    }
  });

  const invoiceDueDate = new Date();
  invoiceDueDate.setDate(invoiceDueDate.getDate() + 14);

  await prisma.invoice.create({
    data: {
      id: "mock-invoice-uuid-1",
      tenantId: sfera.id,
      partnerId: partner.id,
      number: "INV-2026-0001",
      status: "SENT",
      issueDate: new Date(),
      dueDate: invoiceDueDate,
      amount: 450.00,
      bookings: {
        connect: [
          { id: booking1.id }
        ]
      }
    }
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
