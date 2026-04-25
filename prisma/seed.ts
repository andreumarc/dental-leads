import { PrismaClient, UserRole, LeadStatus, LeadPriority, AppointmentStatus, AuditAction } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

async function main() {
  console.log("🌱 Starting seed...");

  // ─── CLEANUP ──────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.leadAssignmentHistory.deleteMany();
  await prisma.leadNote.deleteMany();
  await prisma.leadEvent.deleteMany();
  await prisma.leadTag.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.formSubmission.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formDefinition.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.integrationAccount.deleteMany();
  await prisma.channelLog.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.clinicSettings.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.userClinicAccess.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.company.deleteMany();

  console.log("🧹 Cleaned existing data");

  // ─── COMPANY ──────────────────────────────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      name: "Grupo Dental Mediterráneo",
      slug: "grupo-dental-mediterraneo",
      plan: "professional",
      isActive: true,
    },
  });

  console.log(`✅ Company created: ${company.name}`);

  // ─── COMPANY SETTINGS ─────────────────────────────────────────────────────
  await prisma.companySettings.create({
    data: {
      companyId: company.id,
      timezone: "Europe/Madrid",
      language: "es",
      responseTimeAlert: 60,
      duplicateDetection: true,
      gdprRequired: true,
      notifications: {
        emailOnNewLead: true,
        emailOnAssignment: true,
        slackWebhook: null,
      },
    },
  });

  // ─── CLINICS ──────────────────────────────────────────────────────────────
  const clinicBcn = await prisma.clinic.create({
    data: {
      companyId: company.id,
      name: "Clínica Dental Barcelona Centro",
      slug: "bcn-centro",
      address: "Carrer de Provença, 142, 3º 2ª",
      city: "Barcelona",
      province: "Barcelona",
      phone: "+34 932 456 789",
      email: "bcncentro@grupomediterraneo.es",
      isActive: true,
    },
  });

  const clinicTgn = await prisma.clinic.create({
    data: {
      companyId: company.id,
      name: "Clínica Dental Tarragona",
      slug: "tarragona",
      address: "Rambla Nova, 87, Baixos",
      city: "Tarragona",
      province: "Tarragona",
      phone: "+34 977 234 567",
      email: "tarragona@grupomediterraneo.es",
      isActive: true,
    },
  });

  const clinicLleida = await prisma.clinic.create({
    data: {
      companyId: company.id,
      name: "Clínica Dental Lleida",
      slug: "lleida",
      address: "Avinguda de les Garrigues, 23",
      city: "Lleida",
      province: "Lleida",
      phone: "+34 973 123 456",
      email: "lleida@grupomediterraneo.es",
      isActive: true,
    },
  });

  console.log(`✅ Clinics created: BCN, Tarragona, Lleida`);

  // ─── CLINIC SETTINGS ──────────────────────────────────────────────────────
  await prisma.clinicSettings.create({
    data: {
      clinicId: clinicBcn.id,
      workingHours: { monday: "09:00-20:00", friday: "09:00-18:00" },
      treatments: ["Implantes", "Ortodoncia", "Carillas", "Blanqueamiento", "Revisión", "Urgencia"],
      specialties: ["Implantología", "Ortodoncia", "Estética", "Periodoncia"],
    },
  });

  await prisma.clinicSettings.create({
    data: {
      clinicId: clinicTgn.id,
      workingHours: { monday: "09:00-19:00", friday: "09:00-17:00" },
      treatments: ["Implantes", "Ortodoncia", "Endodoncia", "Cirugía", "Revisión"],
      specialties: ["Implantología", "Ortodoncia", "Endodoncia", "Cirugía Oral"],
    },
  });

  await prisma.clinicSettings.create({
    data: {
      clinicId: clinicLleida.id,
      workingHours: { monday: "09:30-19:30", friday: "09:30-17:00" },
      treatments: ["Implantes", "Ortodoncia", "Higiene", "Blanqueamiento", "Revisión"],
      specialties: ["Implantología", "Ortodoncia", "Higiene Dental"],
    },
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  const superadminHash = await hashPassword("Admin1234!");

  const userSuperadmin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "marcandreuguerao@gmail.com",
      name: "Marc Andreu",
      firstName: "Marc",
      lastName: "Andreu",
      role: UserRole.SUPERADMIN,
      isActive: true,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ User created: ${userSuperadmin.email} (SUPERADMIN)`);

  // Create credential account (password stored as access_token)
  await prisma.account.create({
    data: {
      userId: userSuperadmin.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: userSuperadmin.email,
      access_token: superadminHash,
    },
  });

  console.log(`✅ Credential account created`);

  // ─── USER CLINIC ACCESS ───────────────────────────────────────────────────
  for (const clinicId of [clinicBcn.id, clinicTgn.id, clinicLleida.id]) {
    await prisma.userClinicAccess.create({
      data: { userId: userSuperadmin.id, clinicId, role: UserRole.SUPERADMIN },
    });
  }

  console.log(`✅ User clinic access configured`);

  // ─── CHANNELS ─────────────────────────────────────────────────────────────
  const channelWhatsapp = await prisma.channel.create({
    data: {
      companyId: company.id,
      clinicId: clinicBcn.id,
      name: "WhatsApp BCN Centro",
      type: "WHATSAPP",
      status: "ACTIVO",
      isActive: true,
      config: {
        phoneNumberId: "123456789012345",
        wabaId: "987654321098765",
        webhook: "https://dental-leads.vercel.app/api/webhook/whatsapp",
        autoReply: true,
        autoReplyMessage: "Gracias por contactar con Clínica Dental Barcelona Centro. En breve nos pondremos en contacto con usted.",
      },
    },
  });

  const channelForm = await prisma.channel.create({
    data: {
      companyId: company.id,
      name: "Formulario Web Principal",
      type: "FORM_WEB",
      status: "ACTIVO",
      isActive: true,
      config: {
        formSlug: "contacto-general",
        redirectUrl: "https://grupomediterraneo.es/gracias",
        webhookUrl: null,
      },
    },
  });

  const channelManual = await prisma.channel.create({
    data: {
      companyId: company.id,
      name: "Entrada Manual / Teléfono",
      type: "MANUAL",
      status: "ACTIVO",
      isActive: true,
      config: {
        description: "Leads introducidos manualmente desde recepción o callcenter",
      },
    },
  });

  console.log(`✅ Channels created (3)`);

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────────
  const campaignImplantes = await prisma.campaign.create({
    data: {
      companyId: company.id,
      name: "Implantes Q1 2025 - Google Ads",
      description: "Campaña Google Ads enfocada en implantes dentales con financiación",
      source: "google",
      medium: "cpc",
      utmCampaign: "implantes-q1-2025",
      isActive: true,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-31"),
    },
  });

  const campaignOrtodoncia = await prisma.campaign.create({
    data: {
      companyId: company.id,
      name: "Ortodoncia Invisible - Meta Ads",
      description: "Campaña de ortodoncia invisible en Instagram y Facebook",
      source: "facebook",
      medium: "social",
      utmCampaign: "ortodoncia-invisible-2025",
      isActive: true,
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-04-30"),
    },
  });

  const campaignRevision = await prisma.campaign.create({
    data: {
      companyId: company.id,
      name: "Revisión Gratuita - Email Marketing",
      description: "Campaña email para captar pacientes con revisión gratuita de bienvenida",
      source: "email",
      medium: "newsletter",
      utmCampaign: "revision-gratuita-primavera-2025",
      isActive: false,
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-05-31"),
    },
  });

  console.log(`✅ Campaigns created (3)`);

  // ─── FORM DEFINITIONS ─────────────────────────────────────────────────────
  const formContacto = await prisma.formDefinition.create({
    data: {
      companyId: company.id,
      name: "Formulario de Contacto General",
      slug: "contacto-general",
      description: "Formulario principal de la web para captar leads interesados en cualquier tratamiento",
      isActive: true,
      isPublic: true,
      embedCode: `<script src="https://dental-leads.vercel.app/embed/contacto-general.js" async></script>`,
      webhookUrl: null,
      redirectUrl: "https://grupomediterraneo.es/gracias",
      fields: {
        create: [
          { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Tu nombre", mapToLead: "firstName", order: 1 },
          { name: "apellidos", label: "Apellidos", type: "text", required: true, placeholder: "Tus apellidos", mapToLead: "lastName", order: 2 },
          { name: "telefono", label: "Teléfono", type: "phone", required: true, placeholder: "+34 600 000 000", mapToLead: "phone", order: 3 },
          { name: "email", label: "Email", type: "email", required: false, placeholder: "tu@email.com", mapToLead: "email", order: 4 },
          { name: "tratamiento", label: "¿Qué tratamiento te interesa?", type: "select", required: true, options: ["Implantes", "Ortodoncia", "Estética", "Higiene", "Urgencia", "Otros"], mapToLead: "treatment", order: 5 },
          { name: "mensaje", label: "Mensaje (opcional)", type: "textarea", required: false, placeholder: "Cuéntanos más sobre lo que necesitas...", mapToLead: "initialMessage", order: 6 },
          { name: "gdpr", label: "Acepto la política de privacidad y el tratamiento de mis datos", type: "checkbox", required: true, mapToLead: "gdprConsent", order: 7 },
        ],
      },
    },
  });

  const formImplantes = await prisma.formDefinition.create({
    data: {
      companyId: company.id,
      clinicId: clinicBcn.id,
      name: "Landing Page Implantes Dentales",
      slug: "implantes-oferta",
      description: "Formulario específico para la landing page de implantes con financiación al 0%",
      isActive: true,
      isPublic: true,
      embedCode: `<script src="https://dental-leads.vercel.app/embed/implantes-oferta.js" async></script>`,
      webhookUrl: "https://dental-leads.vercel.app/api/webhook/form",
      redirectUrl: "https://grupomediterraneo.es/implantes/gracias",
      fields: {
        create: [
          { name: "nombre", label: "Nombre completo", type: "text", required: true, placeholder: "Tu nombre completo", mapToLead: "firstName", order: 1 },
          { name: "telefono", label: "Teléfono móvil", type: "phone", required: true, placeholder: "+34 6XX XXX XXX", mapToLead: "phone", order: 2 },
          { name: "email", label: "Correo electrónico", type: "email", required: true, placeholder: "tu@correo.com", mapToLead: "email", order: 3 },
          { name: "cuantos_implantes", label: "¿Cuántos implantes necesitas?", type: "select", required: false, options: ["1 implante", "2-3 implantes", "4-6 implantes", "Implante completo", "No sé, quiero revisión"], order: 4 },
          { name: "financiacion", label: "¿Te interesa la financiación al 0%?", type: "select", required: false, options: ["Sí, me interesa", "No, pagaré al contado", "Quiero más información"], order: 5 },
          { name: "gdpr", label: "Acepto la política de privacidad", type: "checkbox", required: true, mapToLead: "gdprConsent", order: 6 },
        ],
      },
    },
  });

  console.log(`✅ Form definitions created (2)`);

  // ─── AUTOMATION RULES ─────────────────────────────────────────────────────
  await prisma.automationRule.create({
    data: {
      companyId: company.id,
      name: "Asignación automática de lead nuevo",
      description: "Cuando entra un lead nuevo sin asignar, asignarlo al gestor por defecto",
      trigger: { type: "LEAD_CREADO" },
      conditions: [{ field: "status", operator: "equals", value: "NUEVO" }],
      actions: [{ type: "ASIGNAR_A", params: { userId: userSuperadmin.id } }],
      isActive: true,
      priority: 1,
    },
  });

  await prisma.automationRule.create({
    data: {
      companyId: company.id,
      name: "Alerta por falta de respuesta",
      description: "Si un lead lleva más de 2 horas sin respuesta, enviar alerta",
      trigger: { type: "LEAD_SIN_RESPUESTA" },
      conditions: [{ field: "status", operator: "in", value: ["NUEVO", "ASIGNADO", "PENDIENTE_RESPUESTA"] }],
      actions: [{ type: "ENVIAR_ALERTA", params: { message: "Lead sin respuesta durante más de 2 horas", severity: "medium" } }],
      isActive: true,
      priority: 2,
    },
  });

  await prisma.automationRule.create({
    data: {
      companyId: company.id,
      name: "Tag automático en cita confirmada",
      description: "Cuando un lead confirma cita, añadir tag 'cita-confirmada'",
      trigger: { type: "LEAD_ACTUALIZADO" },
      conditions: [{ field: "status", operator: "equals", value: "CITA_CONFIRMADA" }],
      actions: [{ type: "AÑADIR_ETIQUETA", params: { tag: "cita-confirmada" } }],
      isActive: true,
      priority: 3,
    },
  });

  console.log(`✅ Automation rules created (3)`);

  // ─── LEADS ────────────────────────────────────────────────────────────────
  const leadsData = [
    // 1
    {
      firstName: "María",
      lastName: "García López",
      phone: "+34 612 345 678",
      email: "maria.garcia@gmail.com",
      treatment: "Implantes dentales",
      status: LeadStatus.CITA_CONFIRMADA,
      priority: LeadPriority.ALTA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      campaignId: campaignImplantes.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(14),
      firstResponseAt: daysAgo(14),
      lastInteractionAt: daysAgo(1),
      initialMessage: "Hola, me gustaría información sobre implantes dentales. Me faltan 2 piezas y me interesa la financiación.",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "implantes-q1-2025",
      utmContent: "ad-financiacion",
      isConverted: false,
      createdAt: daysAgo(14),
    },
    // 2
    {
      firstName: "Josep",
      lastName: "Martínez Soler",
      phone: "+34 663 234 567",
      email: "josep.martinez@hotmail.com",
      treatment: "Ortodoncia invisible",
      status: LeadStatus.EN_SEGUIMIENTO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignOrtodoncia.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(20),
      firstResponseAt: daysAgo(20),
      lastInteractionAt: daysAgo(3),
      initialMessage: "Tengo 28 años y nunca me puse ortodoncia. Quiero información sobre la invisible.",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "ortodoncia-invisible-2025",
      createdAt: daysAgo(20),
    },
    // 3
    {
      firstName: "Ana",
      lastName: "Fernández Puig",
      phone: "+34 687 456 789",
      email: null,
      treatment: "Primera visita / revisión",
      status: LeadStatus.NUEVO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicTgn.id,
      assignedToId: null,
      channelId: channelWhatsapp.id,
      gdprConsent: false,
      initialMessage: "Buenos días, quería pedir una revisión general. ¿Hacéis la primera visita gratis?",
      createdAt: hoursAgo(2),
    },
    // 4
    {
      firstName: "Carlos",
      lastName: "Ruiz Domínguez",
      phone: "+34 655 789 012",
      email: "carlos.ruiz@empresa.com",
      treatment: "Carillas de porcelana",
      status: LeadStatus.PENDIENTE_LLAMADA,
      priority: LeadPriority.ALTA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: null,
      gdprConsent: true,
      gdprConsentDate: daysAgo(7),
      firstResponseAt: daysAgo(7),
      lastInteractionAt: daysAgo(2),
      initialMessage: "Me interesa mejorar la estética de mi sonrisa. Vi en Instagram un antes/después impresionante.",
      utmSource: "instagram",
      utmMedium: "social",
      utmCampaign: "estetica-sonrisa",
      createdAt: daysAgo(7),
    },
    // 5
    {
      firstName: "Laura",
      lastName: "Sánchez Bosch",
      phone: "+34 634 567 890",
      email: "laura.sanchez@gmail.com",
      treatment: "Implante unitario",
      status: LeadStatus.CITA_PROPUESTA,
      priority: LeadPriority.ALTA,
      clinicId: clinicTgn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      campaignId: campaignImplantes.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(10),
      firstResponseAt: daysAgo(10),
      lastInteractionAt: hoursAgo(4),
      initialMessage: "Me rompí el diente hace meses y quiero ponerme un implante. ¿Cuánto tiempo tarda?",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "implantes-q1-2025",
      createdAt: daysAgo(10),
    },
    // 6
    {
      firstName: "Miquel",
      lastName: "Torres Vidal",
      phone: "+34 611 890 123",
      email: "miquel.torres@icloud.com",
      treatment: "Ortodoncia infantil",
      status: LeadStatus.ASIGNADO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicLleida.id,
      assignedToId: userSuperadmin.id,
      channelId: channelManual.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(5),
      firstResponseAt: daysAgo(5),
      lastInteractionAt: daysAgo(1),
      initialMessage: "Mi hijo tiene 11 años y el dentista de cabecera dice que necesita ortodoncia. Quiero una segunda opinión.",
      createdAt: daysAgo(5),
    },
    // 7
    {
      firstName: "Elena",
      lastName: "López Castillo",
      phone: "+34 678 901 234",
      email: "elena.lopez@outlook.es",
      treatment: "Higiene dental + blanqueamiento",
      status: LeadStatus.RESPONDIDO,
      priority: LeadPriority.BAJA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignRevision.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(30),
      firstResponseAt: daysAgo(30),
      lastInteractionAt: daysAgo(25),
      initialMessage: "Quiero hacerme una limpieza y aprovechar para blanquear. ¿Hacéis pack?",
      utmSource: "email",
      utmMedium: "newsletter",
      utmCampaign: "revision-gratuita-primavera-2025",
      createdAt: daysAgo(30),
    },
    // 8
    {
      firstName: "Francesc",
      lastName: "Mas Oliveras",
      phone: "+34 699 012 345",
      email: null,
      treatment: "Urgencia dental",
      status: LeadStatus.CONVERTIDO,
      priority: LeadPriority.URGENTE,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(45),
      firstResponseAt: daysAgo(45),
      lastInteractionAt: daysAgo(44),
      initialMessage: "Tengo un dolor horrible en una muela. ¿Podéis atenderme hoy? Es urgente.",
      isConverted: true,
      createdAt: daysAgo(45),
    },
    // 9
    {
      firstName: "Rosa",
      lastName: "Giménez Ribas",
      phone: "+34 645 123 456",
      email: "rosa.gimenez@gmail.com",
      treatment: "Prótesis removible",
      status: LeadStatus.NO_LOCALIZADO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicTgn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelManual.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(18),
      firstResponseAt: daysAgo(18),
      lastInteractionAt: daysAgo(12),
      initialMessage: "Me interesa información sobre prótesis. Mi madre necesita una dentadura completa.",
      createdAt: daysAgo(18),
    },
    // 10
    {
      firstName: "Àlex",
      lastName: "Prat Nogués",
      phone: "+34 633 456 789",
      email: "alex.prat@gmail.com",
      treatment: "Implantes all-on-4",
      status: LeadStatus.CITA_SOLICITADA,
      priority: LeadPriority.ALTA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignImplantes.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(3),
      firstResponseAt: daysAgo(3),
      lastInteractionAt: hoursAgo(6),
      initialMessage: "Quiero información sobre el all-on-4. Tengo pocas piezas y quiero solucionar todo de una vez.",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "implantes-q1-2025",
      utmContent: "all-on-4",
      createdAt: daysAgo(3),
    },
    // 11
    {
      firstName: "Silvia",
      lastName: "Costa Jordà",
      phone: "+34 676 789 012",
      email: "silvia.costa@empresa.net",
      treatment: "Ortodoncia adultos",
      status: LeadStatus.PERDIDO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicLleida.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignOrtodoncia.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(55),
      firstResponseAt: daysAgo(55),
      lastInteractionAt: daysAgo(50),
      lossReason: "Precio demasiado elevado respecto a competencia",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "ortodoncia-invisible-2025",
      createdAt: daysAgo(55),
    },
    // 12
    {
      firstName: "Jordi",
      lastName: "Bosch Ferrer",
      phone: "+34 622 345 678",
      email: "jordi.bosch@hotmail.com",
      treatment: "Revisión general",
      status: LeadStatus.SIN_ASIGNAR,
      priority: LeadPriority.BAJA,
      clinicId: clinicBcn.id,
      assignedToId: null,
      channelId: channelWhatsapp.id,
      gdprConsent: false,
      initialMessage: "Hola, me gustaría saber el precio de una revisión.",
      createdAt: hoursAgo(5),
    },
    // 13
    {
      firstName: "Marta",
      lastName: "Vila Serra",
      phone: "+34 659 901 234",
      email: "marta.vila@gmail.com",
      treatment: "Blanqueamiento dental",
      status: LeadStatus.PENDIENTE_RESPUESTA,
      priority: LeadPriority.MEDIA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignRevision.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(8),
      firstResponseAt: daysAgo(8),
      lastInteractionAt: daysAgo(6),
      initialMessage: "Quiero hacer el blanqueamiento antes de mi boda en junio. ¿Tenéis disponibilidad?",
      utmSource: "email",
      utmMedium: "newsletter",
      utmCampaign: "revision-gratuita-primavera-2025",
      createdAt: daysAgo(8),
    },
    // 14
    {
      firstName: "Pere",
      lastName: "Carbonell Mas",
      phone: "+34 611 234 567",
      email: null,
      treatment: "Endodoncia urgente",
      status: LeadStatus.ASIGNADO,
      priority: LeadPriority.URGENTE,
      clinicId: clinicTgn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelManual.id,
      gdprConsent: true,
      gdprConsentDate: hoursAgo(3),
      firstResponseAt: hoursAgo(3),
      lastInteractionAt: hoursAgo(1),
      initialMessage: "Tengo mucho dolor, necesito endodoncia con urgencia. Llamada recibida en recepción.",
      createdAt: hoursAgo(3),
    },
    // 15
    {
      firstName: "Neus",
      lastName: "Roca Expósito",
      phone: "+34 696 678 901",
      email: "neus.roca@gmail.com",
      treatment: "Implante molar",
      status: LeadStatus.EN_SEGUIMIENTO,
      priority: LeadPriority.ALTA,
      clinicId: clinicLleida.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      campaignId: campaignImplantes.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(25),
      firstResponseAt: daysAgo(25),
      lastInteractionAt: daysAgo(4),
      initialMessage: "Me extrajeron el molar hace 2 meses y quiero ponerme el implante. ¿Puedo pedirme cita directamente?",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "implantes-q1-2025",
      createdAt: daysAgo(25),
    },
    // 16
    {
      firstName: "Ingrid",
      lastName: "Sánchez Palau",
      phone: "+34 667 890 123",
      email: "ingrid.sanchez@icloud.com",
      treatment: "Ortodoncia invisible Invisalign",
      status: LeadStatus.CITA_CONFIRMADA,
      priority: LeadPriority.ALTA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignOrtodoncia.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(12),
      firstResponseAt: daysAgo(12),
      lastInteractionAt: daysAgo(2),
      initialMessage: "Tengo presupuesto para hacer Invisalign. Quiero empezar cuanto antes.",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "ortodoncia-invisible-2025",
      utmContent: "reel-transformacion",
      createdAt: daysAgo(12),
    },
    // 17
    {
      firstName: "David",
      lastName: "Martí Closa",
      phone: "+34 634 123 456",
      email: "david.marti@gmail.com",
      treatment: "Revisión + radiografía",
      status: LeadStatus.SPAM,
      priority: LeadPriority.BAJA,
      clinicId: clinicBcn.id,
      assignedToId: null,
      channelId: channelWhatsapp.id,
      gdprConsent: false,
      initialMessage: "hola necesito infooo sobre precios",
      isDuplicate: false,
      createdAt: daysAgo(35),
    },
    // 18
    {
      firstName: "Montse",
      lastName: "Puig Nadal",
      phone: "+34 689 456 789",
      email: "montse.puig@outlook.com",
      treatment: "Periodontitis / periodoncia",
      status: LeadStatus.EN_SEGUIMIENTO,
      priority: LeadPriority.ALTA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelManual.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(22),
      firstResponseAt: daysAgo(22),
      lastInteractionAt: daysAgo(7),
      initialMessage: "Tengo sangrado en las encías desde hace tiempo. Me dijeron que tengo periodontitis.",
      createdAt: daysAgo(22),
    },
    // 19
    {
      firstName: "Antoni",
      lastName: "Llull Comas",
      phone: "+34 644 567 890",
      email: null,
      treatment: "Primera visita",
      status: LeadStatus.NUEVO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicTgn.id,
      assignedToId: null,
      channelId: channelWhatsapp.id,
      gdprConsent: false,
      initialMessage: "Buenas tardes, ¿tienen plazas para primera visita esta semana?",
      createdAt: hoursAgo(1),
    },
    // 20
    {
      firstName: "Pilar",
      lastName: "Morales Gutiérrez",
      phone: "+34 655 678 901",
      email: "pilar.morales@gmail.com",
      treatment: "Carillas composite",
      status: LeadStatus.NO_INTERESADO,
      priority: LeadPriority.BAJA,
      clinicId: clinicLleida.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(40),
      firstResponseAt: daysAgo(40),
      lastInteractionAt: daysAgo(38),
      lossReason: "No está dispuesta a pagar el precio del tratamiento. Irá a clínica low cost.",
      createdAt: daysAgo(40),
    },
    // 21
    {
      firstName: "Raül",
      lastName: "Ferrer Solà",
      phone: "+34 622 789 012",
      email: "raul.ferrer@gmail.com",
      treatment: "Implante full-arch inferior",
      status: LeadStatus.PENDIENTE_LLAMADA,
      priority: LeadPriority.URGENTE,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignImplantes.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(2),
      firstResponseAt: daysAgo(2),
      lastInteractionAt: hoursAgo(8),
      initialMessage: "No tengo dientes en la mandíbula inferior y llevo años con prótesis removible. Quiero implantes fijos.",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "implantes-q1-2025",
      utmTerm: "implantes fijos mandibula",
      createdAt: daysAgo(2),
    },
    // 22
    {
      firstName: "Gemma",
      lastName: "Sala Montserrat",
      phone: "+34 678 012 345",
      email: "gemma.sala@empresa.cat",
      treatment: "Ortodoncia invisible",
      status: LeadStatus.ASIGNADO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      campaignId: campaignOrtodoncia.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(4),
      firstResponseAt: daysAgo(4),
      lastInteractionAt: daysAgo(2),
      initialMessage: "Tengo 35 años, siempre he querido corregir mis dientes. ¿Invisalign va bien para adultos mayores?",
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "ortodoncia-invisible-2025",
      createdAt: daysAgo(4),
    },
    // 23
    {
      firstName: "Bernat",
      lastName: "Puigdomènech Rius",
      phone: "+34 611 345 678",
      email: "bernat.puig@hotmail.com",
      treatment: "Implante + corona cerámica",
      status: LeadStatus.RESPONDIDO,
      priority: LeadPriority.ALTA,
      clinicId: clinicTgn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelManual.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(9),
      firstResponseAt: daysAgo(9),
      lastInteractionAt: daysAgo(7),
      initialMessage: "Me falta un premolar y quiero implante con corona. Preguntaré si hay financiación.",
      createdAt: daysAgo(9),
    },
    // 24
    {
      firstName: "Irene",
      lastName: "Martínez Alba",
      phone: "+34 699 234 567",
      email: "irene.martinez@gmail.com",
      treatment: "Consulta financiación implantes",
      status: LeadStatus.DUPLICADO,
      priority: LeadPriority.MEDIA,
      clinicId: clinicBcn.id,
      assignedToId: userSuperadmin.id,
      channelId: channelWhatsapp.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(15),
      isDuplicate: true,
      createdAt: daysAgo(15),
    },
    // 25
    {
      firstName: "Tomàs",
      lastName: "Carbonell Vidal",
      phone: "+34 656 789 012",
      email: "tomas.carbonell@gmail.com",
      treatment: "Revisión y presupuesto integral",
      status: LeadStatus.CITA_CONFIRMADA,
      priority: LeadPriority.ALTA,
      clinicId: clinicLleida.id,
      assignedToId: userSuperadmin.id,
      channelId: channelForm.id,
      campaignId: campaignRevision.id,
      gdprConsent: true,
      gdprConsentDate: daysAgo(6),
      firstResponseAt: daysAgo(6),
      lastInteractionAt: daysAgo(1),
      initialMessage: "Hace 5 años que no voy al dentista. Quiero una revisión completa y saber qué tratamientos necesito.",
      utmSource: "email",
      utmMedium: "newsletter",
      utmCampaign: "revision-gratuita-primavera-2025",
      createdAt: daysAgo(6),
    },
  ];

  const createdLeads: Awaited<ReturnType<typeof prisma.lead.create>>[] = [];

  for (const leadData of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        createdById: userSuperadmin.id,
        ...leadData,
        createdAt: leadData.createdAt ?? new Date(),
      },
    });
    createdLeads.push(lead);
  }

  console.log(`✅ Leads created (${createdLeads.length})`);

  // ─── LEAD TAGS ────────────────────────────────────────────────────────────
  await prisma.leadTag.create({ data: { leadId: createdLeads[0].id, name: "financiacion", color: "#10b981" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[0].id, name: "implante-urgente", color: "#ef4444" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[1].id, name: "invisalign", color: "#8b5cf6" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[3].id, name: "estetica", color: "#f59e0b" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[7].id, name: "urgencia-resuelta", color: "#10b981" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[9].id, name: "all-on-4", color: "#3b82f6" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[9].id, name: "financiacion", color: "#10b981" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[14].id, name: "seguimiento-largo", color: "#f59e0b" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[15].id, name: "cita-confirmada", color: "#10b981" } });
  await prisma.leadTag.create({ data: { leadId: createdLeads[20].id, name: "full-arch", color: "#ef4444" } });

  console.log(`✅ Lead tags created`);

  // ─── LEAD EVENTS ──────────────────────────────────────────────────────────
  // Events for lead 1 (María García - Cita Confirmada)
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "LEAD_CREATED", description: "Lead creado desde WhatsApp", createdAt: daysAgo(14) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "FIRST_CONTACT", description: "Primera respuesta enviada por WhatsApp", metadata: { channel: "whatsapp" }, createdAt: daysAgo(14) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "STATUS_CHANGED", description: "Estado cambiado de NUEVO a ASIGNADO", metadata: { from: "NUEVO", to: "ASIGNADO" }, createdAt: daysAgo(13) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "ASSIGNMENT_CHANGED", description: "Lead asignado a Núria Castellà (Recepción BCN)", createdAt: daysAgo(13) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "APPOINTMENT_CREATED", description: "Cita solicitada para primera visita implantes", createdAt: daysAgo(5) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[0].id, userId: userSuperadmin.id, type: "STATUS_CHANGED", description: "Estado cambiado a CITA_CONFIRMADA", metadata: { from: "CITA_PROPUESTA", to: "CITA_CONFIRMADA" }, createdAt: daysAgo(1) } });

  // Events for lead 2 (Josep - Ortodoncia)
  await prisma.leadEvent.create({ data: { leadId: createdLeads[1].id, userId: userSuperadmin.id, type: "LEAD_CREATED", description: "Lead creado desde formulario web", createdAt: daysAgo(20) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[1].id, userId: userSuperadmin.id, type: "FIRST_CONTACT", description: "Contactado por teléfono, interesado pero quiere pensarlo", createdAt: daysAgo(19) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[1].id, userId: userSuperadmin.id, type: "CALL_MADE", description: "Llamada de seguimiento realizada. Pide presupuesto por email.", metadata: { duration: "8 min", outcome: "enviar_presupuesto" }, createdAt: daysAgo(10) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[1].id, userId: userSuperadmin.id, type: "EMAIL_SENT", description: "Presupuesto de ortodoncia invisible enviado por email", createdAt: daysAgo(9) } });

  // Events for lead 4 (Carlos - Carillas)
  await prisma.leadEvent.create({ data: { leadId: createdLeads[3].id, userId: userSuperadmin.id, type: "LEAD_CREATED", description: "Lead creado desde formulario web (landing estética)", createdAt: daysAgo(7) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[3].id, userId: userSuperadmin.id, type: "ASSIGNMENT_CHANGED", description: "Asignado a Pau Roca (Comercial) por interés en tratamiento premium", createdAt: daysAgo(7) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[3].id, userId: userSuperadmin.id, type: "CALL_MADE", description: "Llamada inicial. Muy interesado. Precio principal preocupación.", metadata: { duration: "15 min" }, createdAt: daysAgo(6) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[3].id, userId: userSuperadmin.id, type: "STATUS_CHANGED", description: "Estado actualizado a PENDIENTE_LLAMADA para seguimiento en 2 días", metadata: { from: "EN_SEGUIMIENTO", to: "PENDIENTE_LLAMADA" }, createdAt: daysAgo(2) } });

  // Events for lead 8 (Francesc - Urgencia convertido)
  await prisma.leadEvent.create({ data: { leadId: createdLeads[7].id, userId: userSuperadmin.id, type: "LEAD_CREATED", description: "Urgencia dental. Paciente con dolor agudo.", createdAt: daysAgo(45) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[7].id, userId: userSuperadmin.id, type: "APPOINTMENT_CREATED", description: "Cita de urgencia asignada para el mismo día", createdAt: daysAgo(45) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[7].id, userId: userSuperadmin.id, type: "STATUS_CHANGED", description: "Paciente atendido. Endodoncia realizada. Presupuesto aceptado.", metadata: { from: "CITA_CONFIRMADA", to: "CONVERTIDO" }, createdAt: daysAgo(44) } });

  // Events for lead 10 (Àlex - All-on-4)
  await prisma.leadEvent.create({ data: { leadId: createdLeads[9].id, userId: userSuperadmin.id, type: "LEAD_CREATED", description: "Lead creado desde formulario web. Interés en all-on-4.", createdAt: daysAgo(3) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[9].id, userId: userSuperadmin.id, type: "ASSIGNMENT_CHANGED", description: "Asignado a Pau Roca por ticket alto (all-on-4)", createdAt: daysAgo(3) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[9].id, userId: userSuperadmin.id, type: "FIRST_CONTACT", description: "Primer contacto por WhatsApp. Paciente muy motivado.", createdAt: daysAgo(2) } });
  await prisma.leadEvent.create({ data: { leadId: createdLeads[9].id, userId: userSuperadmin.id, type: "STATUS_CHANGED", description: "Cita de primera visita solicitada por el paciente", metadata: { from: "EN_SEGUIMIENTO", to: "CITA_SOLICITADA" }, createdAt: hoursAgo(6) } });

  console.log(`✅ Lead events created`);

  // ─── LEAD NOTES ───────────────────────────────────────────────────────────
  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[0].id,
      userId: userSuperadmin.id,
      content: "Paciente muy interesada. Tiene seguro dental privado pero el implante no está cubierto. Confirmar precio final antes de la cita.",
      isPrivate: false,
      createdAt: daysAgo(13),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[0].id,
      userId: userSuperadmin.id,
      content: "NOTA INTERNA: aplicar descuento del 5% si confirma antes de finales de mes.",
      isPrivate: true,
      createdAt: daysAgo(12),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[1].id,
      userId: userSuperadmin.id,
      content: "Josep prefiere que le llamemos por las tardes (después de las 17h). Trabaja en oficina por las mañanas.",
      isPrivate: false,
      createdAt: daysAgo(19),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[3].id,
      userId: userSuperadmin.id,
      content: "Carlos tiene presupuesto para 6 carillas. Ha visto presupuesto en otra clínica por 900€/carilla. Nuestro precio es competitivo. Hay que destacar la calidad del material y experiencia del doctor.",
      isPrivate: false,
      createdAt: daysAgo(6),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[9].id,
      userId: userSuperadmin.id,
      content: "Àlex lleva más de 10 años con prótesis removible y está harto. Motivación muy alta. Hay que ofrecerle financiación y la visita de diagnóstico gratuita.",
      isPrivate: false,
      createdAt: daysAgo(2),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[14].id,
      userId: userSuperadmin.id,
      content: "Neus vive en Balaguer (40km de Lleida). Hay que coordinar citas agrupadas para minimizar desplazamientos.",
      isPrivate: false,
      createdAt: daysAgo(20),
    },
  });

  await prisma.leadNote.create({
    data: {
      leadId: createdLeads[20].id,
      userId: userSuperadmin.id,
      content: "LEAD PRIORITARIO: full-arch implantes, presupuesto estimado 12.000-18.000€. Necesita financiación a 36 meses. Llamar HOY.",
      isPrivate: false,
      createdAt: daysAgo(2),
    },
  });

  console.log(`✅ Lead notes created`);

  // ─── APPOINTMENTS ─────────────────────────────────────────────────────────
  // Appointment for lead 1 (María - Cita Confirmada)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[0].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "Implantes dentales - Primera visita y diagnóstico",
      specialty: "Implantología",
      status: AppointmentStatus.CONFIRMADA,
      proposedAt: daysAgo(5),
      confirmedAt: daysAgo(1),
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      duration: 60,
      notes: "Traer radiografías previas si las tiene. Ayuno no necesario.",
      createdAt: daysAgo(5),
    },
  });

  // Appointment for lead 5 (Laura - Cita Propuesta)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[4].id,
      clinicId: clinicTgn.id,
      userId: userSuperadmin.id,
      treatment: "Implante unitario - Consulta inicial",
      specialty: "Implantología",
      status: AppointmentStatus.PROPUESTA,
      proposedAt: hoursAgo(4),
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      duration: 45,
      notes: "Consulta de diagnóstico. Presentar opciones de implante.",
      createdAt: hoursAgo(4),
    },
  });

  // Appointment for lead 8 (Francesc - Urgencia convertida)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[7].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "Urgencia - Endodoncia molar",
      specialty: "Endodoncia",
      status: AppointmentStatus.REALIZADA,
      confirmedAt: daysAgo(45),
      scheduledAt: daysAgo(44),
      duration: 90,
      notes: "Urgencia resuelta. Endodoncia molar 46. Paciente aliviado. Próxima cita corona.",
      createdAt: daysAgo(45),
    },
  });

  // Appointment for lead 10 (Àlex - Cita Solicitada)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[9].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "All-on-4 - Primera visita diagnóstico gratuita",
      specialty: "Implantología",
      status: AppointmentStatus.SOLICITADA,
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
      duration: 60,
      notes: "Primera visita gratuita. Realizar radiografía panorámica.",
      createdAt: hoursAgo(6),
    },
  });

  // Appointment for lead 16 (Ingrid - Ortodoncia Cita Confirmada)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[15].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "Invisalign - Estudio de caso inicial",
      specialty: "Ortodoncia",
      status: AppointmentStatus.CONFIRMADA,
      proposedAt: daysAgo(5),
      confirmedAt: daysAgo(2),
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      duration: 45,
      notes: "Primera visita Invisalign. Tomar medidas y fotografías. Presentar plan de tratamiento.",
      createdAt: daysAgo(5),
    },
  });

  // Appointment for lead 21 (Raül - Full-arch urgente)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[20].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "Full-arch inferior - Valoración implantología",
      specialty: "Implantología",
      status: AppointmentStatus.SOLICITADA,
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // in 4 days
      duration: 90,
      notes: "Caso complejo. Necesita TAC 3D. Disponibilidad para cirugía en 3-4 meses.",
      createdAt: daysAgo(1),
    },
  });

  // Appointment for lead 25 (Tomàs - Revisión Cita Confirmada)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[24].id,
      clinicId: clinicLleida.id,
      userId: userSuperadmin.id,
      treatment: "Revisión integral + presupuesto",
      specialty: "Odontología General",
      status: AppointmentStatus.CONFIRMADA,
      proposedAt: daysAgo(4),
      confirmedAt: daysAgo(1),
      scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // in 6 days
      duration: 60,
      notes: "Revisión completa tras 5 años sin dentista. Hacer radiografía panorámica y periapicales.",
      createdAt: daysAgo(4),
    },
  });

  // Appointment for lead 18 (Montse - Periodoncia)
  await prisma.appointment.create({
    data: {
      leadId: createdLeads[17].id,
      clinicId: clinicBcn.id,
      userId: userSuperadmin.id,
      treatment: "Periodoncia - Valoración y diagnóstico",
      specialty: "Periodoncia",
      status: AppointmentStatus.AGENDADA_EXTERNO,
      scheduledAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // in 10 days
      duration: 60,
      notes: "Caso de periodontitis moderada. Posible raspado y alisado radicular.",
      externalRef: "GCAL-BCN-20250428-001",
      createdAt: daysAgo(7),
    },
  });

  console.log(`✅ Appointments created (8)`);

  // ─── ASSIGNMENT HISTORY ───────────────────────────────────────────────────
  await prisma.leadAssignmentHistory.create({
    data: {
      leadId: createdLeads[0].id,
      assignedToId: userSuperadmin.id,
      assignedById: userSuperadmin.id,
      createdAt: daysAgo(14),
    },
  });
  await prisma.leadAssignmentHistory.create({
    data: {
      leadId: createdLeads[0].id,
      assignedToId: userSuperadmin.id,
      assignedById: userSuperadmin.id,
      createdAt: daysAgo(13),
    },
  });
  await prisma.leadAssignmentHistory.create({
    data: {
      leadId: createdLeads[3].id,
      assignedToId: userSuperadmin.id,
      assignedById: userSuperadmin.id,
      createdAt: daysAgo(7),
    },
  });
  await prisma.leadAssignmentHistory.create({
    data: {
      leadId: createdLeads[3].id,
      assignedToId: userSuperadmin.id,
      assignedById: userSuperadmin.id,
      reason: "Ticket alto, especialista comercial",
      createdAt: daysAgo(7),
    },
  });

  console.log(`✅ Assignment history created`);

  // ─── FORM SUBMISSIONS ─────────────────────────────────────────────────────
  await prisma.formSubmission.create({
    data: {
      formId: formContacto.id,
      leadId: createdLeads[1].id,
      data: {
        nombre: "Josep",
        apellidos: "Martínez Soler",
        telefono: "+34 663 234 567",
        email: "josep.martinez@hotmail.com",
        tratamiento: "Ortodoncia",
        mensaje: "Tengo 28 años y nunca me puse ortodoncia. Quiero información sobre la invisible.",
        gdpr: true,
      },
      ipAddress: "83.42.115.23",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      createdAt: daysAgo(20),
    },
  });

  await prisma.formSubmission.create({
    data: {
      formId: formImplantes.id,
      leadId: createdLeads[9].id,
      data: {
        nombre: "Àlex Prat Nogués",
        telefono: "+34 633 456 789",
        email: "alex.prat@gmail.com",
        cuantos_implantes: "Implante completo",
        financiacion: "Sí, me interesa",
        gdpr: true,
      },
      ipAddress: "212.136.89.45",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      createdAt: daysAgo(3),
    },
  });

  await prisma.formSubmission.create({
    data: {
      formId: formContacto.id,
      leadId: createdLeads[24].id,
      data: {
        nombre: "Tomàs",
        apellidos: "Carbonell Vidal",
        telefono: "+34 656 789 012",
        email: "tomas.carbonell@gmail.com",
        tratamiento: "Revisión",
        mensaje: "Hace 5 años que no voy al dentista. Quiero una revisión completa.",
        gdpr: true,
      },
      ipAddress: "84.77.34.98",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      createdAt: daysAgo(6),
    },
  });

  console.log(`✅ Form submissions created`);

  // ─── CONVERSATIONS + MESSAGES ─────────────────────────────────────────────
  const conv1 = await prisma.conversation.create({
    data: {
      leadId: createdLeads[0].id,
      channelId: channelWhatsapp.id,
      isOpen: false,
      createdAt: daysAgo(14),
    },
  });

  await prisma.message.create({ data: { conversationId: conv1.id, direction: "inbound", content: "Hola, me gustaría información sobre implantes dentales. Me faltan 2 piezas y me interesa la financiación.", sentAt: daysAgo(14), createdAt: daysAgo(14) } });
  await prisma.message.create({ data: { conversationId: conv1.id, direction: "outbound", content: "Hola María, gracias por contactar con Clínica Dental Barcelona Centro. Con mucho gusto te informamos sobre nuestros implantes dentales. ¿Cuándo te vendría bien hablar por teléfono?", sentAt: daysAgo(14), createdAt: daysAgo(14) } });
  await prisma.message.create({ data: { conversationId: conv1.id, direction: "inbound", content: "Me viene bien esta tarde o mañana por la mañana.", sentAt: daysAgo(13), createdAt: daysAgo(13) } });
  await prisma.message.create({ data: { conversationId: conv1.id, direction: "outbound", content: "Perfecto, te llamamos mañana a las 10h. ¿Te parece bien?", sentAt: daysAgo(13), createdAt: daysAgo(13) } });

  const conv2 = await prisma.conversation.create({
    data: {
      leadId: createdLeads[4].id,
      channelId: channelWhatsapp.id,
      isOpen: true,
      createdAt: daysAgo(10),
    },
  });

  await prisma.message.create({ data: { conversationId: conv2.id, direction: "inbound", content: "Me rompí el diente hace meses y quiero ponerme un implante. ¿Cuánto tiempo tarda?", sentAt: daysAgo(10), createdAt: daysAgo(10) } });
  await prisma.message.create({ data: { conversationId: conv2.id, direction: "outbound", content: "Hola Laura, un implante dental completo suele tardar entre 3 y 6 meses según cada caso. El proceso incluye colocación del implante, período de osteointegración y colocación de la corona. ¿Quieres que te expliquemos los pasos con más detalle?", sentAt: daysAgo(10), createdAt: daysAgo(10) } });
  await prisma.message.create({ data: { conversationId: conv2.id, direction: "inbound", content: "Sí por favor, y también quiero saber los precios aproximados.", sentAt: daysAgo(9), createdAt: daysAgo(9) } });

  console.log(`✅ Conversations and messages created`);

  // ─── AUDIT LOGS ───────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      action: AuditAction.CREATE,
      entity: "Lead",
      entityId: createdLeads[0].id,
      changes: { status: "NUEVO", priority: "ALTA", assignedTo: null },
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome/120",
      createdAt: daysAgo(14),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      action: AuditAction.STATUS_CHANGE,
      entity: "Lead",
      entityId: createdLeads[0].id,
      changes: { from: "NUEVO", to: "ASIGNADO" },
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome/120",
      createdAt: daysAgo(13),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      leadId: createdLeads[0].id,
      action: AuditAction.ASSIGNMENT_CHANGE,
      entity: "Lead",
      entityId: createdLeads[0].id,
      changes: { fromUser: null, toUser: userSuperadmin.id },
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome/120",
      createdAt: daysAgo(13),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      action: AuditAction.LOGIN,
      entity: "User",
      entityId: userSuperadmin.id,
      changes: null,
      ipAddress: "83.42.115.23",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605",
      createdAt: daysAgo(1),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      action: AuditAction.EXPORT,
      entity: "Lead",
      entityId: "bulk",
      changes: { count: 25, filters: { status: "CONVERTIDO", clinic: clinicBcn.id } },
      ipAddress: "212.136.89.45",
      userAgent: "Mozilla/5.0 Chrome/121",
      createdAt: daysAgo(5),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: userSuperadmin.id,
      action: AuditAction.CREATE,
      entity: "AutomationRule",
      entityId: "automation-001",
      changes: { name: "Asignación automática de lead nuevo" },
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome/120",
      createdAt: daysAgo(30),
    },
  });

  console.log(`✅ Audit logs created`);

  // ─── INTEGRATION ACCOUNT ─────────────────────────────────────────────────
  await prisma.integrationAccount.create({
    data: {
      channelId: channelWhatsapp.id,
      provider: "meta",
      accountId: "123456789012345",
      accessToken: "EAAxxxxxxxxxxxxxxxx",
      metadata: {
        wabaId: "987654321098765",
        phoneNumber: "+34 600 000 001",
        displayName: "Dental BCN Centro",
        verifiedName: "Grupo Dental Mediterráneo",
      },
    },
  });

  console.log(`✅ Integration account created`);

  console.log("\n🎉 Seed completed successfully!");
  console.log("─────────────────────────────────────────");
  console.log("📊 Summary:");
  console.log(`  • 1 Company: ${company.name}`);
  console.log("  • 3 Clinics: Barcelona, Tarragona, Lleida");
  console.log("  • 1 User: SUPERADMIN");
  console.log("  • 3 Channels (WhatsApp, Form, Manual)");
  console.log("  • 3 Campaigns");
  console.log("  • 2 Form definitions");
  console.log("  • 3 Automation rules");
  console.log(`  • ${createdLeads.length} Leads with full pipeline coverage`);
  console.log("  • 8 Appointments");
  console.log("  • Lead events, notes, tags, conversations");
  console.log("  • Audit log entries");
  console.log("─────────────────────────────────────────");
  console.log("\n🔑 Login credentials:");
  console.log("  marcandreuguerao@gmail.com   → Admin1234! (SUPERADMIN)");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
