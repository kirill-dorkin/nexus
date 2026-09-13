import data from "../brand.json";

export type BrandConfig = Readonly<{
  name: string;
  shortName: string;
  slug: string;
  tagline: string;
}>;

export const brand: BrandConfig = Object.freeze(data);
