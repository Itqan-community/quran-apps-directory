/**
 * Form-initialization contract for the admin AppForm — a PLAIN (non-"use
 * client") module so server components can import and spread `CREATE_DEFAULT`
 * safely. Importing values from client modules in an RSC yields an opaque
 * reference under Turbopack/PPR: spreading it would drop every key but the
 * ones the RSC adds (the metadataOptionIds regression of 2026-11-04).
 */
export type AppFormInitial = {
  slug: string; // current slug as a hint (edit only)
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  descriptionEn: string;
  descriptionAr: string;
  applicationIcon: string;
  mainImageEn: string;
  mainImageAr: string;
  googlePlayLink: string;
  appStoreLink: string;
  appGalleryLink: string;
  screenshotsEn: string[];
  screenshotsAr: string[];
  categoryIds: number[];
  metadataOptionIds: { typeId: number; optionIds: number[] }[];
  developerId: number;
  platform: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  avgRating: string;
  reviewCount: number;
  viewCount: number;
};

export const CREATE_DEFAULT: AppFormInitial = {
  slug: "",
  nameEn: "",
  nameAr: "",
  shortDescriptionEn: "",
  shortDescriptionAr: "",
  descriptionEn: "",
  descriptionAr: "",
  applicationIcon: "",
  mainImageEn: "",
  mainImageAr: "",
  googlePlayLink: "",
  appStoreLink: "",
  appGalleryLink: "",
  screenshotsEn: [],
  screenshotsAr: [],
  categoryIds: [],
  metadataOptionIds: [],
  developerId: 0,
  platform: "cross_platform",
  status: "draft",
  featured: false,
  sortOrder: 0,
  avgRating: "0.00",
  reviewCount: 0,
  viewCount: 0,
};
