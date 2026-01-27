import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Code } from "lucide-react";
import { api, Subscription } from "@/lib/api";
import { useModulesByScope } from "@/hooks/use-modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

function ModuleCard({
  name,
  description,
  hasOverride,
  hasTenantOverride,
  enabled,
  onClick,
}: {
  name: string;
  description?: string;
  hasOverride: boolean;
  hasTenantOverride?: boolean;
  enabled?: string;
  onClick: () => void;
}) {
  let sourceLabel = "Default";
  let sourceVariant: "default" | "modified" | "tenant" = "default";
  if (hasOverride) {
    sourceLabel = "Modified";
    sourceVariant = "modified";
  } else if (hasTenantOverride) {
    sourceLabel = "Tenant";
    sourceVariant = "tenant";
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-foreground">{name}</h4>
          <div className="flex gap-1.5 flex-shrink-0">
            <StatusBadge variant={sourceVariant}>{sourceLabel}</StatusBadge>
            {enabled === "1" && <StatusBadge variant="enabled">Enabled</StatusBadge>}
            {enabled === "0" && <StatusBadge variant="disabled">Disabled</StatusBadge>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{description || "No description"}</p>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard({
  subscription,
  tenantId,
  onDelete,
}: {
  subscription: Subscription;
  tenantId: string;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { subscriptionModules } = useModulesByScope();

  const { data: subDetails } = useQuery({
    queryKey: ["subscription", tenantId, subscription.id],
    queryFn: () => api.getSubscription(tenantId, subscription.id),
    enabled: isOpen,
  });

  const configuredModules = subDetails?.configuredModules ?? subscription.configuredModules ?? {};

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  {subscription.name || subscription.id}
                </CardTitle>
                {subscription.name && (
                  <p className="text-sm text-muted-foreground font-mono">{subscription.id}</p>
                )}
                <StatusBadge variant="default" className="mt-2">
                  {Object.keys(configuredModules).length} configured modules
                </StatusBadge>
              </div>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subscriptionModules.map((module) => {
                const config = configuredModules[module.name];
                return (
                  <ModuleCard
                    key={module.path}
                    name={module.name}
                    description={module.description}
                    hasOverride={config?.hasOverride ?? false}
                    hasTenantOverride={config?.hasTenantOverride ?? false}
                    enabled={config?.enabled}
                    onClick={() =>
                      navigate(`/tenants/${tenantId}/subscriptions/${subscription.id}/modules/${module.path}`)
                    }
                  />
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateSubDialogOpen, setIsCreateSubDialogOpen] = useState(false);
  const [newSubId, setNewSubId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);
  const [showComposedJson, setShowComposedJson] = useState(false);
  const [composedJson, setComposedJson] = useState<string | null>(null);

  const { tenantModules, subscriptionModules } = useModulesByScope();

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: () => api.getTenant(tenantId!),
    enabled: !!tenantId,
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ["subscriptions", tenantId],
    queryFn: () => api.listSubscriptions(tenantId!),
    enabled: !!tenantId,
  });

  const createSubMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      return api.createSubscription(tenantId!, id, name || null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", tenantId] });
      setIsCreateSubDialogOpen(false);
      setNewSubId("");
      setNewSubName("");
      toast.success("Subscription added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add subscription: ${error.message}`);
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return api.deleteSubscription(tenantId!, subscriptionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", tenantId] });
      setDeleteSubId(null);
      toast.success("Subscription removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove subscription: ${error.message}`);
    },
  });

  const handleShowComposedJson = async () => {
    try {
      const composed = await api.getTenantComposed(tenantId!, false);
      setComposedJson(JSON.stringify(composed, null, 2));
      setShowComposedJson(true);
    } catch (error: any) {
      if (error.data?.partialOutput) {
        setComposedJson(JSON.stringify(error.data.partialOutput, null, 2));
        setShowComposedJson(true);
        toast.warning(`${error.data.errors?.length || 0} validation error(s) found`);
      } else {
        toast.error(`Failed to load composed config: ${error.message}`);
      }
    }
  };

  const handleCopyJson = () => {
    if (composedJson) {
      navigator.clipboard.writeText(composedJson);
      toast.success("JSON copied to clipboard");
    }
  };

  if (tenantError) {
    return (
      <EmptyState
        title="Error loading tenant"
        description={tenantError instanceof Error ? tenantError.message : "An error occurred"}
        action={
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenants
          </Button>
        }
      />
    );
  }

  const subscriptionOverrideModules = tenant?.subscriptionModulesWithTenantOverride ?? {};

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">Tenant: {tenantId}</h1>
        </div>
        <Button variant="outline" onClick={handleShowComposedJson}>
          <Code className="h-4 w-4 mr-2" />
          View JSON
        </Button>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search modules by name..."
        className="mb-6 max-w-md"
      />

      {tenantLoading ? (
        <div className="space-y-8">
          <div className="h-48 bg-muted rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tenant Modules */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Tenant Modules</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure tenant-level modules that apply to all subscriptions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenantModules
                .filter((m) => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((module) => {
                  const config = tenant?.tenantModules?.[module.name];
                  return (
                    <ModuleCard
                      key={module.path}
                      name={module.name}
                      description={module.description}
                      hasOverride={config?.hasOverride ?? false}
                      enabled={config?.enabled}
                      onClick={() => navigate(`/tenants/${tenantId}/modules/${module.path}`)}
                    />
                  );
                })}
            </div>
          </section>

          {/* Subscription Modules - Tenant Level Overrides */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">Subscription Module Defaults</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Configure default values for subscription modules that apply to all subscriptions unless overridden
            </p>
            {Object.keys(subscriptionOverrideModules).length === 0 ? (
              <EmptyState title="No subscription modules support tenant-level overrides" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(subscriptionOverrideModules)
                  .filter(([name]) => !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(([name, config]) => (
                    <ModuleCard
                      key={config.path}
                      name={name}
                      description={config.description}
                      hasOverride={config.hasOverride}
                      enabled={config.enabled}
                      onClick={() => navigate(`/tenants/${tenantId}/modules/${config.path}`)}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Subscriptions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Subscriptions</h2>
                <p className="text-sm text-muted-foreground">
                  Manage Azure subscriptions and their module configurations
                </p>
              </div>
              <Button onClick={() => setIsCreateSubDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </div>
            {subsLoading ? (
              <div className="h-32 bg-muted rounded animate-pulse" />
            ) : (subsData?.subscriptions.length ?? 0) === 0 ? (
              <EmptyState
                title="No subscriptions added"
                description="Add a subscription to start configuring modules"
                action={
                  <Button onClick={() => setIsCreateSubDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subscription
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {subsData?.subscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    tenantId={tenantId!}
                    onDelete={() => setDeleteSubId(sub.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create Subscription Dialog */}
      <Dialog open={isCreateSubDialogOpen} onOpenChange={setIsCreateSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
            <DialogDescription>Add an Azure subscription to this tenant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-id">Subscription ID (UUID)</Label>
              <Input
                id="sub-id"
                placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                value={newSubId}
                onChange={(e) => setNewSubId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-name">Subscription Name</Label>
              <Input
                id="sub-name"
                placeholder="e.g., Production Workloads"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createSubMutation.mutate({ id: newSubId.trim(), name: newSubName.trim() || undefined })}
              disabled={createSubMutation.isPending || !newSubId.trim()}
            >
              {createSubMutation.isPending ? "Adding..." : "Add Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subscription Dialog */}
      <Dialog open={!!deleteSubId} onOpenChange={() => setDeleteSubId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove subscription <span className="font-mono">{deleteSubId}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSubId && deleteSubMutation.mutate(deleteSubId)}
              disabled={deleteSubMutation.isPending}
            >
              {deleteSubMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Composed JSON Dialog */}
      <Dialog open={showComposedJson} onOpenChange={setShowComposedJson}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Composed Configuration - {tenantId}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-auto max-h-[60vh]">
              {composedJson}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyJson}>
              Copy to Clipboard
            </Button>
            <Button onClick={() => setShowComposedJson(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
