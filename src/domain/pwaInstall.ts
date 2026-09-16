export function isIosDevice(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function shouldShowIosInstallHint(options: {
  userAgent: string;
  isStandalone: boolean;
  dismissed: boolean;
}): boolean {
  return (
    isIosDevice(options.userAgent) && !options.isStandalone && !options.dismissed
  );
}
