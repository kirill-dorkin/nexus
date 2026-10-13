import { StudioShell } from "../../components/studio/studio-shell";
import { StudioHome } from "./studio-home";
export const metadata = {
  title: "Studio",
  robots: { index: false, follow: false }
};
export default function Page() {
  return (
    <StudioShell>
      <StudioHome />
    </StudioShell>
  );
}
