export type PlatformPrincipal = Readonly<{
  userId: string;
}>;

export type PlatformPrincipalCarrier = {
  platformPrincipal?: PlatformPrincipal;
};

export function attachPlatformPrincipal(
  request: PlatformPrincipalCarrier,
  principal: PlatformPrincipal
): void {
  if (principal.userId.trim().length === 0) {
    throw new Error("Platform principal userId must not be empty.");
  }

  request.platformPrincipal = principal;
}
