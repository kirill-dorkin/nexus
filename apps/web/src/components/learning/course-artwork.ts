import { brand } from "@platform/brand";

/** Web-owned, reviewed presentation assets; not API data or a generic author upload. */
export function courseArtwork(organizationSlug: string, offeringSlug: string) {
  if (organizationSlug === `${brand.slug}-preview` && offeringSlug === "computer-literacy-course") {
    return { src: "/media/courses/computer-literacy-learning.svg", alt: "Рабочий стол компьютера с открытым проводником файлов, папками и клавиатурой", width: 1280, height: 720 };
  }
  return null;
}
