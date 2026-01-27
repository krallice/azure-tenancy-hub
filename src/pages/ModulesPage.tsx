import { useState, useMemo } from "react";
import { useModulesByScope } from "@/hooks/use-modules";
import { Package } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ModulesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { tenantModules, subscriptionModules, isLoading, error } = useModulesByScope();

  const filteredTenantModules = useMemo(() => {
    if (!searchQuery.trim()) return tenantModules;
    const query = searchQuery.toLowerCase();
    return tenantModules.filter((m) => m.name.toLowerCase().includes(query));
  }, [tenantModules, searchQuery]);

  const filteredSubscriptionModules = useMemo(() => {
    if (!searchQuery.trim()) return subscriptionModules;
    const query = searchQuery.toLowerCase();
    return subscriptionModules.filter((m) => m.name.toLowerCase().includes(query));
  }, [subscriptionModules, searchQuery]);

  if (error) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12" />}
        title="Error loading modules"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Available Modules"
        description="View all configuration modules available in the system"
      />

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search modules by name..."
        className="mb-6 max-w-md"
      />

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-6 bg-muted rounded w-48 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tenant-Scoped Modules */}
          {(filteredTenantModules.length > 0 || !searchQuery) && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Tenant-Scoped Modules</h2>
              {filteredTenantModules.length === 0 ? (
                <EmptyState
                  title="No tenant-scoped modules"
                  description={searchQuery ? "Try a different search term" : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {filteredTenantModules.map((module) => (
                    <Card key={module.path} className="hover:shadow-sm transition-shadow">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <h3 className="font-medium text-foreground">{module.name}</h3>
                          <p className="text-sm text-muted-foreground">{module.description || "No description"}</p>
                        </div>
                        <StatusBadge variant="default" className="font-mono text-xs">
                          {module.path}
                        </StatusBadge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Subscription-Scoped Modules */}
          {(filteredSubscriptionModules.length > 0 || !searchQuery) && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Subscription-Scoped Modules</h2>
              {filteredSubscriptionModules.length === 0 ? (
                <EmptyState
                  title="No subscription-scoped modules"
                  description={searchQuery ? "Try a different search term" : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {filteredSubscriptionModules.map((module) => (
                    <Card key={module.path} className="hover:shadow-sm transition-shadow">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <h3 className="font-medium text-foreground">{module.name}</h3>
                          <p className="text-sm text-muted-foreground">{module.description || "No description"}</p>
                        </div>
                        <StatusBadge variant="default" className="font-mono text-xs">
                          {module.path}
                        </StatusBadge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* No results */}
          {searchQuery && filteredTenantModules.length === 0 && filteredSubscriptionModules.length === 0 && (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title={`No modules found matching "${searchQuery}"`}
              description="Try a different search term"
            />
          )}
        </div>
      )}
    </div>
  );
}
