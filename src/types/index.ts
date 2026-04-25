import type {
  Company,
  Clinic,
  User,
  Lead,
  LeadTag,
  LeadEvent,
  LeadNote,
  LeadAssignmentHistory,
  Appointment,
  FormDefinition,
  FormSubmission,
  Channel,
  Campaign,
  AutomationRule,
  AuditLog,
  Attachment,
  Conversation,
  Message,
  UserClinicAccess,
  CompanySettings,
  UserRole,
  LeadStatus,
  LeadPriority,
  ChannelType,
  ChannelStatus,
  AppointmentStatus,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type {
  UserRole,
  LeadStatus,
  LeadPriority,
  ChannelType,
  ChannelStatus,
  AppointmentStatus,
};

// ─── EXTENDED / RELATIONAL TYPES ─────────────────────────────────────────────

/**
 * Lead with all common relations pre-loaded.
 * Use this for detail views, kanban cards, and table rows.
 */
export type LeadWithRelations = Lead & {
  clinic: Clinic | null;
  assignedTo: (User & { firstName: string | null; lastName: string | null; avatar: string | null }) | null;
  createdBy: (User & { firstName: string | null; lastName: string | null }) | null;
  channelRef: Channel | null;
  campaign: Campaign | null;
  tags: LeadTag[];
  events: LeadEvent[];
  notes: LeadNote[];
  appointments: Appointment[];
  assignmentHistory: (LeadAssignmentHistory & {
    assignedTo: Pick<User, "id" | "name" | "email"> | null;
  })[];
  attachments: Attachment[];
  _count?: {
    events: number;
    notes: number;
    appointments: number;
    conversations: number;
  };
};

/**
 * Lead minimal type — used for tables, lists, and search results.
 * Lighter than LeadWithRelations.
 */
export type LeadListItem = Pick<
  Lead,
  | "id"
  | "firstName"
  | "lastName"
  | "phone"
  | "email"
  | "treatment"
  | "status"
  | "priority"
  | "gdprConsent"
  | "isConverted"
  | "isDuplicate"
  | "lastInteractionAt"
  | "createdAt"
  | "companyId"
  | "clinicId"
  | "assignedToId"
> & {
  clinic: Pick<Clinic, "id" | "name" | "slug" | "city"> | null;
  assignedTo: Pick<User, "id" | "name" | "email"> | null;
  tags: Pick<LeadTag, "id" | "name" | "color">[];
  _count: {
    appointments: number;
    notes: number;
    events: number;
  };
};

/**
 * Appointment with lead and user relations.
 */
export type AppointmentWithRelations = Appointment & {
  lead: Pick<
    Lead,
    | "id"
    | "firstName"
    | "lastName"
    | "phone"
    | "email"
    | "treatment"
    | "status"
  >;
  clinic: Clinic | null;
  user: Pick<User, "id" | "name" | "email"> | null;
};

/**
 * User with clinic access information.
 */
export type UserWithAccess = User & {
  clinicAccess: (UserClinicAccess & {
    clinic: Pick<Clinic, "id" | "name" | "slug" | "city">;
  })[];
  company: Pick<Company, "id" | "name" | "slug"> | null;
  _count: {
    assignedLeads: number;
    leadNotes: number;
    appointments: number;
  };
};

/**
 * Channel with integration account details.
 */
export type ChannelWithIntegration = Channel & {
  integrationAccount: {
    id: string;
    provider: string;
    accountId: string | null;
    status: string;
    lastSyncAt: Date | null;
  } | null;
  clinic: Pick<Clinic, "id" | "name" | "slug"> | null;
  _count: {
    leads: number;
    conversations: number;
  };
};

/**
 * Form definition with field count and submission stats.
 */
export type FormDefinitionWithStats = FormDefinition & {
  clinic: Pick<Clinic, "id" | "name" | "slug"> | null;
  _count: {
    submissions: number;
  };
};

/**
 * Conversation with messages and lead info.
 */
export type ConversationWithMessages = Conversation & {
  lead: Pick<Lead, "id" | "firstName" | "lastName" | "phone" | "status">;
  channel: Channel | null;
  messages: Message[];
};

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

/**
 * Dashboard KPI stats for the main overview.
 */
export interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  leadsLastMonth: number;
  leadsGrowthPercent: number;

  newLeads: number;
  pendingLeads: number;
  convertedLeads: number;
  lostLeads: number;

  conversionRate: number;
  avgResponseTimeMinutes: number;

  appointmentsThisWeek: number;
  appointmentsConfirmed: number;
  appointmentsPending: number;

  leadsPerChannel: {
    channel: string;
    channelType: string;
    count: number;
    percentage: number;
  }[];

  leadsPerStatus: {
    status: LeadStatus;
    count: number;
    percentage: number;
  }[];

  leadsPerClinic: {
    clinicId: string;
    clinicName: string;
    count: number;
    converted: number;
    conversionRate: number;
  }[];

  leadsPerAgent: {
    userId: string;
    userName: string;
    assigned: number;
    converted: number;
    conversionRate: number;
  }[];

  leadsTrend: {
    date: string; // YYYY-MM-DD
    count: number;
    converted: number;
  }[];

  topTreatments: {
    treatment: string;
    count: number;
    percentage: number;
  }[];
}

/**
 * Stats for a single agent/user.
 */
export interface AgentStats {
  userId: string;
  userName: string;
  role: UserRole;
  totalAssigned: number;
  activeLeads: number;
  convertedThisMonth: number;
  lostThisMonth: number;
  avgResponseTimeMinutes: number;
  appointmentsScheduled: number;
  conversionRate: number;
}

// ─── FILTER & PAGINATION ──────────────────────────────────────────────────────

/**
 * Lead list filter state — mirrors query params for URL serialization.
 */
export interface LeadFilterState {
  search?: string;
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  clinicId?: string | string[];
  assignedToId?: string | string[];
  channelId?: string | string[];
  campaignId?: string | string[];
  treatment?: string | string[];
  gdprConsent?: boolean;
  isConverted?: boolean;
  isDuplicate?: boolean;
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
  lastInteractionFrom?: string;
  lastInteractionTo?: string;
  tags?: string[];
  source?: string;
}

/**
 * Pagination state for tables.
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Sorting state for tables.
 */
export interface SortingState {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Generic paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationState;
}

// ─── FORM TYPES ───────────────────────────────────────────────────────────────

/**
 * Lead creation / edit form values.
 */
export interface LeadFormValues {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  company?: string;
  treatment?: string;
  status: LeadStatus;
  priority: LeadPriority;
  clinicId?: string;
  assignedToId?: string;
  channelId?: string;
  campaignId?: string;
  source?: string;
  initialMessage?: string;
  gdprConsent: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

/**
 * Appointment form values.
 */
export interface AppointmentFormValues {
  leadId: string;
  clinicId?: string;
  assignedToId?: string;
  treatment?: string;
  specialty?: string;
  status: AppointmentStatus;
  proposedAt?: Date;
  confirmedAt?: Date;
  scheduledAt?: Date;
  duration?: number;
  notes?: string;
  externalRef?: string;
}

/**
 * Lead note form values.
 */
export interface LeadNoteFormValues {
  content: string;
  isPrivate: boolean;
}

/**
 * User form values (create/edit).
 */
export interface UserFormValues {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  clinicIds?: string[];
}

// ─── API RESPONSE TYPES ───────────────────────────────────────────────────────

/**
 * Generic API success response.
 */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Generic API error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

/**
 * Union of success and error API responses.
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

// ─── NOTIFICATION TYPES ───────────────────────────────────────────────────────

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ─── NAVIGATION TYPES ─────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number | string;
  children?: NavItem[];
  requiredPermission?: {
    resource: string;
    action: string;
  };
}

// ─── WEBHOOK / INTEGRATION TYPES ─────────────────────────────────────────────

/**
 * Incoming WhatsApp webhook message payload.
 */
export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Incoming form webhook payload.
 */
export interface FormWebhookPayload {
  formSlug: string;
  data: Record<string, string | boolean | number>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
}

// ─── KANBAN TYPES ─────────────────────────────────────────────────────────────

export interface KanbanColumn {
  id: LeadStatus;
  title: string;
  leads: LeadListItem[];
  count: number;
  color: string;
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  totalLeads: number;
}

// ─── CHART / ANALYTICS TYPES ─────────────────────────────────────────────────

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PieDataPoint {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface BarDataPoint {
  category: string;
  value: number;
  secondaryValue?: number;
  label?: string;
}

// ─── SESSION / AUTH TYPES ─────────────────────────────────────────────────────

/**
 * Authenticated session user (extends next-auth User).
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: UserRole;
  companyId: string | null;
}

/**
 * Authenticated session.
 */
export interface AuthSession {
  user: SessionUser;
  expires: string;
}

// ─── UTILITY TYPES ────────────────────────────────────────────────────────────

/** Make selected fields of T required */
export type RequireFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Make selected fields of T optional */
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Unwrap Promise type */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/** Record with string keys and unknown values (JSON-like) */
export type JsonRecord = Record<string, unknown>;
