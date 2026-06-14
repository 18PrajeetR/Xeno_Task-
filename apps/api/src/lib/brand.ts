import { prisma } from "@xeno/database";
import { HttpError } from "./http.js";

export async function getBrand() {
  const brand = await prisma.brand.findFirst({ orderBy: { createdAt: "asc" } });
  if (!brand) throw new HttpError(503, "Demo data is not seeded");
  return brand;
}
