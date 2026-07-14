export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function toRefetchInterval(pollingInterval: number, enabled: boolean) {
  return enabled && pollingInterval > 0 ? pollingInterval : false;
}
