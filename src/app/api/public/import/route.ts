import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────

const importQuerySchema = z.object({
  companyId: z.string().min(1, "companyId es requerido"),
  clinicId: z.string().optional(),
  apiKey: z.string().optional(),
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) =>
    h.trim().replace(/^["']|["']$/g, "").toLowerCase()
  );

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^["']|["']$/g, "") ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function mapRowToLead(row: Record<string, string>): {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  treatment?: string;
} | null {
  // Map common Spanish and English column names
  const firstName =
    row.nombre ??
    row.name ??
    row.first_name ??
    row.firstname ??
    row["primer nombre"] ??
    "";

  const lastName =
    row.apellidos ??
    row.apellido ??
    row.last_name ??
    row.lastname ??
    row["segundo nombre"] ??
    undefined;

  const phone =
    row.telefono ??
    row.teléfono ??
    row.phone ??
    row.mobile ??
    row.celular ??
    row.tel ??
    undefined;

  const email =
    row.email ??
    row.correo ??
    row["correo electrónico"] ??
    row.mail ??
    undefined;

  const treatment =
    row.tratamiento ??
    row.treatment ??
    row.servicio ??
    row.service ??
    undefined;

  const trimmed = firstName.trim();
  if (!trimmed) return null;

  return {
    firstName: trimmed,
    lastName: lastName?.trim() || undefined,
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
    treatment: treatment?.trim() || undefined,
  };
}

// ─── POST /api/public/import ─────────────────────────────────────────────────
// Accepts multipart/form-data with a file field containing a CSV

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const queryResult = importQuerySchema.safeParse({
      companyId: searchParams.get("companyId"),
      clinicId: searchParams.get("clinicId") ?? undefined,
      apiKey: searchParams.get("apiKey") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, error: "Parámetros inválidos", details: queryResult.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { companyId, clinicId } = queryResult.data;

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ success: false, error: "Empresa no encontrada" }, { status: 404 });
    }

    // Verify clinic if provided
    if (clinicId) {
      const clinic = await prisma.clinic.findFirst({ where: { id: clinicId, companyId } });
      if (!clinic) {
        return NextResponse.json({ success: false, error: "Clínica no encontrada" }, { status: 404 });
      }
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No se encontró ningún archivo" }, { status: 422 });
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "El archivo supera el límite de 5 MB" }, { status: 413 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".csv") && !filename.endsWith(".txt")) {
      return NextResponse.json(
        { success: false, error: "Formato no soportado. Usa un archivo CSV." },
        { status: 422 }
      );
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "El archivo CSV está vacío o no tiene filas válidas" },
        { status: 422 }
      );
    }

    const importErrors: string[] = [];
    const leadsToCreate: Array<{
      companyId: string;
      clinicId: string | null;
      firstName: string;
      lastName?: string | null;
      phone?: string | null;
      email?: string | null;
      treatment?: string | null;
      status: "NUEVO";
      priority: "MEDIA";
      channel: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because 1-based and skip header

      const mapped = mapRowToLead(row);
      if (!mapped) {
        importErrors.push(`Fila ${rowNum}: Sin nombre — omitida`);
        continue;
      }

      // Basic phone validation
      if (mapped.phone) {
        const cleanPhone = mapped.phone.replace(/[\s\-().+]/g, "");
        if (cleanPhone.length < 7 || cleanPhone.length > 20) {
          importErrors.push(`Fila ${rowNum}: Teléfono inválido "${mapped.phone}" — omitido`);
          continue;
        }
      }

      // Basic email validation
      if (mapped.email && !mapped.email.includes("@")) {
        importErrors.push(`Fila ${rowNum}: Email inválido "${mapped.email}" — omitido`);
        continue;
      }

      leadsToCreate.push({
        companyId,
        clinicId: clinicId ?? null,
        firstName: mapped.firstName,
        lastName: mapped.lastName ?? null,
        phone: mapped.phone ?? null,
        email: mapped.email ?? null,
        treatment: mapped.treatment ?? null,
        status: "NUEVO",
        priority: "MEDIA",
        channel: "csv_import",
      });
    }

    // Batch create in chunks to avoid exceeding Prisma limits
    const CHUNK_SIZE = 100;
    let created = 0;

    for (let i = 0; i < leadsToCreate.length; i += CHUNK_SIZE) {
      const chunk = leadsToCreate.slice(i, i + CHUNK_SIZE);
      const result = await prisma.lead.createMany({
        data: chunk,
        skipDuplicates: false,
      });
      created += result.count;
    }

    return NextResponse.json({
      success: true,
      created,
      total: rows.length,
      errors: importErrors,
      message: `${created} lead${created !== 1 ? "s" : ""} creado${created !== 1 ? "s" : ""} correctamente${importErrors.length > 0 ? `, ${importErrors.length} omitido${importErrors.length !== 1 ? "s" : ""}` : ""}.`,
    });
  } catch (error) {
    console.error("[POST /api/public/import]", error);
    return NextResponse.json({ success: false, error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}
