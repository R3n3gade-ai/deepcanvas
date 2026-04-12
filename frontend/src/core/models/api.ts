import { getBackendBaseURL } from "../config";

import type { Model } from "./types";

export async function loadModels(workspaceId?: string) {
  const url = new URL(`${getBackendBaseURL()}/api/models`);
  if (workspaceId) {
    url.searchParams.set("workspace_id", workspaceId);
  }
  const res = await fetch(url.toString());
  const { models } = (await res.json()) as { models: Model[] };
  return models;
}
