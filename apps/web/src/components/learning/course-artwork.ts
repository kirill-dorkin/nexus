import { brand } from "@platform/brand";

/** Web-owned, reviewed presentation assets; not API data or a generic author upload. */
export function courseArtwork(organizationSlug: string, offeringSlug: string) {
  if (organizationSlug === `${brand.slug}-preview` && offeringSlug === "computer-literacy-course") {
    return { src: "/media/courses/computer-literacy-v1.webp", alt: "Ноутбук, мышь и блокнот на рабочем столе", width: 1279, height: 720 };
  }
  return null;
}
