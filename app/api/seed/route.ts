import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { count } from "drizzle-orm";

const DEFAULT_CATEGORIES: { name: string; type: string }[] = [
  // Construction
  { name: "Foundation", type: "construction" },
  { name: "Framing", type: "construction" },
  { name: "Roofing", type: "construction" },
  { name: "Electrical", type: "construction" },
  { name: "Plumbing", type: "construction" },
  { name: "HVAC", type: "construction" },
  { name: "Insulation", type: "construction" },
  { name: "Drywall", type: "construction" },
  { name: "Flooring", type: "construction" },
  { name: "Painting", type: "construction" },
  { name: "Cabinets", type: "construction" },
  { name: "Countertops", type: "construction" },
  { name: "Appliances", type: "construction" },
  { name: "Fixtures", type: "construction" },
  { name: "Windows", type: "construction" },
  { name: "Doors", type: "construction" },
  { name: "Landscaping", type: "construction" },
  // Property
  { name: "Land Purchase", type: "property" },
  { name: "Property Tax", type: "property" },
  { name: "Legal Fees", type: "property" },
  { name: "Survey", type: "property" },
  { name: "Permits", type: "property" },
  { name: "Utilities Connection", type: "property" },
  { name: "Insurance", type: "property" },
  { name: "HOA Fees", type: "property" },
  { name: "Realtor Fees", type: "property" },
  { name: "Closing Costs", type: "property" },
  // Shared
  { name: "Other", type: "both" },
];

export async function POST() {
  const [existing] = await db.select({ value: count() }).from(categories);

  if (existing.value > 0) {
    return NextResponse.json({
      message: `Categories already seeded (${existing.value} rows)`,
      seeded: false,
    });
  }

  await db.insert(categories).values(DEFAULT_CATEGORIES);

  return NextResponse.json({
    message: `Seeded ${DEFAULT_CATEGORIES.length} default categories`,
    seeded: true,
  });
}
