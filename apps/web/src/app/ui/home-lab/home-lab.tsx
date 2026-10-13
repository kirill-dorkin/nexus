import type { ReactNode } from "react";
import { HomeDiscoveryShell } from "../../../components/learning/home-discovery";

export function HomeLab({
  children,
  layout = "open",
}: {
  children: ReactNode;
  layout?: "open" | "editorial";
}) {
  return (
    <HomeDiscoveryShell preview layout={layout}>
      {children}
    </HomeDiscoveryShell>
  );
}
