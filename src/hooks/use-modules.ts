import { useQuery } from "@tanstack/react-query";
import { api, Module } from "@/lib/api";

export function useModules() {
  return useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const data = await api.listModules();
      return data.modules;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useModulesByScope() {
  const { data: modules, ...rest } = useModules();

  const tenantModules = modules?.filter((m) => m.scope === "tenant") ?? [];
  const subscriptionModules = modules?.filter((m) => m.scope === "subscription") ?? [];

  return {
    tenantModules,
    subscriptionModules,
    allModules: modules ?? [],
    ...rest,
  };
}
