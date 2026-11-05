// skill-freshness@1 lives in @platform/contracts (ADR-0076) so the API and Web share one rule.
export {
  FRESHNESS_POLICY,
  isActive,
  skillFreshness,
  type Freshness,
  type FreshnessState
} from "@platform/contracts/browser";
