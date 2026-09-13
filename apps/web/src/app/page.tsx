import { brand } from "@platform/brand";

export default function HomePage() {
  return (
    <main>
      <p>{brand.tagline}</p>
      <h1>{brand.name}</h1>
      <p>Foundation scaffold: domain first, evidence driven, brand independent.</p>
    </main>
  );
}
