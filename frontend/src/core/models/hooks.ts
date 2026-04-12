import { useQuery } from "@tanstack/react-query";
import { useWorkspaceContext } from "@/core/workspaces/workspace-context";

import { loadModels } from "./api";

export function useModels({ enabled = true }: { enabled?: boolean } = {}) {
  const { activeWorkspaceId } = useWorkspaceContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ["models", activeWorkspaceId],
    queryFn: () => loadModels(activeWorkspaceId),
    enabled: enabled && !!activeWorkspaceId,
    refetchOnWindowFocus: false,
  });
  return { models: data ?? [], isLoading, error };
}
