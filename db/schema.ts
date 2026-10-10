import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Mirrors old core.BaseModel: id + created_at + updated_at */
function baseColumns() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  };
}

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  isStaff: boolean("is_staff").default(false).notNull(),
  ...baseColumns(),
});

export const developers = pgTable(
  "developers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull().unique(),
    // Only name_en is unique — live prod data contains repeated name_ar values
    nameAr: text("name_ar").notNull(),
    website: text("website"),
    email: text("email"),
    logoUrl: text("logo_url"),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    socialLinks: jsonb("social_links").$type<Record<string, string>>().default({}).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    ...baseColumns(),
  },
  (t) => [index("developers_is_verified_idx").on(t.isVerified)]
);

export const categories = pgTable(
  "categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull().unique(),
    nameAr: text("name_ar").notNull().unique(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    slug: text("slug").notNull().unique(),
    icon: text("icon"),
    color: text("color"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...baseColumns(),
  },
  (t) => [
    index("categories_slug_idx").on(t.slug),
    index("categories_is_active_idx").on(t.isActive),
    index("categories_sort_order_idx").on(t.sortOrder),
  ]
);

export const apps = pgTable(
  "apps",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescriptionEn: text("short_description_en").notNull(),
    shortDescriptionAr: text("short_description_ar").notNull(),
    descriptionEn: text("description_en").notNull(),
    descriptionAr: text("description_ar").notNull(),
    applicationIcon: text("application_icon").notNull(),
    mainImageEn: text("main_image_en").notNull(),
    mainImageAr: text("main_image_ar").notNull(),
    googlePlayLink: text("google_play_link"),
    appStoreLink: text("app_store_link"),
    appGalleryLink: text("app_gallery_link"),
    screenshotsEn: jsonb("screenshots_en").$type<string[]>().default([]).notNull(),
    screenshotsAr: jsonb("screenshots_ar").$type<string[]>().default([]).notNull(),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).default("0.00").notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    platform: text("platform").default("cross_platform").notNull(),
    featured: boolean("featured").default(false).notNull(),
    riwayah: jsonb("riwayah").$type<string[]>().default([]).notNull(),
    mushafType: jsonb("mushaf_type").$type<string[]>().default([]).notNull(),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    developerId: bigint("developer_id", { mode: "number" })
      .notNull()
      .references(() => developers.id, { onDelete: "cascade" }),
    status: text("status").default("draft").notNull(),
    ...baseColumns(),
  },
  (t) => [
    index("apps_name_en_idx").on(t.nameEn),
    index("apps_name_ar_idx").on(t.nameAr),
    index("apps_slug_idx").on(t.slug),
    index("apps_status_idx").on(t.status),
    uniqueIndex("apps_name_en_unique").on(t.nameEn),
    index("apps_featured_idx").on(t.featured),
    index("apps_status_featured_idx").on(t.status, t.featured),
    index("apps_avg_rating_idx").on(t.avgRating),
    index("apps_review_count_idx").on(t.reviewCount),
    index("apps_view_count_idx").on(t.viewCount),
    index("apps_platform_idx").on(t.platform),
    index("apps_sort_order_idx").on(t.sortOrder),
    index("apps_developer_idx").on(t.developerId),
    index("apps_riwayah_gin").using("gin", t.riwayah),
    index("apps_mushaf_type_gin").using("gin", t.mushafType),
    index("apps_features_gin").using("gin", t.features),
  ]
);

export const appsCategories = pgTable(
  "apps_categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    categoryId: bigint("category_id", { mode: "number" })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("apps_categories_app_category_unique").on(t.appId, t.categoryId)]
);

export const appScreenshots = pgTable(
  "app_screenshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    language: text("language").default("en").notNull(),
    image: text("image").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("app_screenshots_app_lang_idx").on(t.appId, t.language, t.sortOrder)]
);

export const metadataTypes = pgTable(
  "metadata_types",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull().unique(),
    labelEn: text("label_en").notNull(),
    labelAr: text("label_ar").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    isMultiSelect: boolean("is_multi_select").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    icon: text("icon"),
    ...baseColumns(),
  },
  (t) => [index("metadata_types_is_active_idx").on(t.isActive)]
);

export const metadataOptions = pgTable(
  "metadata_options",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    metadataTypeId: bigint("metadata_type_id", { mode: "number" })
      .notNull()
      .references(() => metadataTypes.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    labelEn: text("label_en").notNull(),
    labelAr: text("label_ar").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    icon: text("icon"),
    color: text("color"),
    ...baseColumns(),
  },
  (t) => [
    uniqueIndex("unique_metadata_type_value").on(t.metadataTypeId, t.value),
    index("metadata_options_type_active_idx").on(t.metadataTypeId, t.isActive),
    index("metadata_options_value_idx").on(t.value),
  ]
);

export const appMetadataValues = pgTable(
  "app_metadata_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    metadataOptionId: bigint("metadata_option_id", { mode: "number" })
      .notNull()
      .references(() => metadataOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("unique_app_metadata_option").on(t.appId, t.metadataOptionId)]
);

export const appSubmissions = pgTable(
  "app_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    trackingId: text("tracking_id").notNull().unique(),
    status: text("status").default("pending").notNull(),
    submitterName: text("submitter_name").default("").notNull(),
    submitterEmail: text("submitter_email").notNull(),
    submitterPhone: text("submitter_phone").default("").notNull(),
    submitterOrganization: text("submitter_organization").default("").notNull(),
    isDeveloper: boolean("is_developer").default(false).notNull(),
    developerNameEn: text("developer_name_en").default("").notNull(),
    developerNameAr: text("developer_name_ar").default("").notNull(),
    developerWebsite: text("developer_website").default("").notNull(),
    developerEmail: text("developer_email").default("").notNull(),
    appNameEn: text("app_name_en").notNull(),
    appNameAr: text("app_name_ar").default("").notNull(),
    shortDescriptionEn: text("short_description_en").default("").notNull(),
    shortDescriptionAr: text("short_description_ar").default("").notNull(),
    descriptionEn: text("description_en").default("").notNull(),
    descriptionAr: text("description_ar").default("").notNull(),
    googlePlayLink: text("google_play_link").default("").notNull(),
    appStoreLink: text("app_store_link").default("").notNull(),
    appGalleryLink: text("app_gallery_link").default("").notNull(),
    websiteLink: text("website_link").default("").notNull(),
    crawledContent: text("crawled_content"),
    appIconUrl: text("app_icon_url").default("").notNull(),
    mainImageEn: text("main_image_en").default("").notNull(),
    mainImageAr: text("main_image_ar").default("").notNull(),
    screenshotsEn: jsonb("screenshots_en").$type<string[]>().default([]).notNull(),
    screenshotsAr: jsonb("screenshots_ar").$type<string[]>().default([]).notNull(),
    additionalNotes: text("additional_notes").default("").notNull(),
    contentConfirmation: boolean("content_confirmation").default(false).notNull(),
    adminNotes: text("admin_notes").default("").notNull(),
    rejectionReason: text("rejection_reason").default("").notNull(),
    infoRequestMessage: text("info_request_message").default("").notNull(),
    reviewedById: bigint("reviewed_by_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAppId: bigint("created_app_id", { mode: "number" }).references(() => apps.id, {
      onDelete: "set null",
    }),
    ...baseColumns(),
  },
  (t) => [
    index("app_submissions_status_idx").on(t.status),
    index("app_submissions_email_idx").on(t.submitterEmail),
    index("app_submissions_status_created_idx").on(t.status, t.createdAt),
  ]
);

export const appSubmissionsCategories = pgTable(
  "app_submissions_categories",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appsubmissionId: bigint("appsubmission_id", { mode: "number" })
      .notNull()
      .references(() => appSubmissions.id, { onDelete: "cascade" }),
    categoryId: bigint("category_id", { mode: "number" })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("app_submissions_categories_pair_unique").on(t.appsubmissionId, t.categoryId)]
);

export const submissionStatusLogs = pgTable(
  "submission_status_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    submissionId: bigint("submission_id", { mode: "number" })
      .notNull()
      .references(() => appSubmissions.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").default("").notNull(),
    toStatus: text("to_status").notNull(),
    changedById: bigint("changed_by_id", { mode: "number" }).references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes").default("").notNull(),
    ...baseColumns(),
  },
  (t) => [index("submission_status_logs_submission_idx").on(t.submissionId)]
);

export const appViewEvents = pgTable(
  "app_view_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: bigint("app_id", { mode: "number" })
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    sessionId: text("session_id"),
    countryCode: text("country_code"),
    ipHash: text("ip_hash"),
    deviceType: text("device_type").default("unknown").notNull(),
    browser: text("browser"),
    os: text("os"),
  },
  (t) => [
    index("app_view_events_app_viewed_idx").on(t.appId, t.viewedAt),
    index("app_view_events_viewed_app_idx").on(t.viewedAt, t.appId),
    index("app_view_events_app_country_idx").on(t.appId, t.countryCode),
    index("app_view_events_app_device_idx").on(t.appId, t.deviceType),
  ]
);
