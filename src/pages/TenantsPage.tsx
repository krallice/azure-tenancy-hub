import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Trash2 } from "lucide-react";
import { api, Tenant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";

export default function TenantsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTenantId, setNewTenantId] = useState("");
  const [newTenantName, setNewTenantName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: tenantsData, isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const data = await api.listTenants();
      return data.tenants;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      return api.createTenant(id, name || null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setIsCreateDialogOpen(false);
      setNewTenantId("");
      setNewTenantName("");
      toast.success("Tenant created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create tenant: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return api.deleteTenant(tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setDeleteConfirmId(null);
      toast.success("Tenant deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });

  const filteredTenants = useMemo(() => {
    if (!tenantsData) return [];
    if (!searchQuery.trim()) return tenantsData;

    const query = searchQuery.toLowerCase().trim();
    return tenantsData.filter(
      (tenant) =>
        tenant.id.toLowerCase().startsWith(query) ||
        tenant.id.toLowerCase().endsWith(query)
    );
  }, [tenantsData, searchQuery]);

  const handleCreateTenant = () => {
    if (!newTenantId.trim()) {
      toast.error("Tenant ID is required");
      return;
    }
    createMutation.mutate({ id: newTenantId.trim(), name: newTenantName.trim() || undefined });
  };

  if (error) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Error loading tenants"
        description={error instanceof Error ? error.message : "An error occurred"}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Manage Azure tenant configurations"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Tenant
          </Button>
        }
      />

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search tenants by ID..."
        className="mb-6 max-w-md"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={searchQuery ? `No tenants found matching "${searchQuery}"` : "No tenants configured"}
          description={searchQuery ? "Try a different search term" : "Create your first tenant to get started"}
          action={
            !searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-border"
              onClick={() => navigate(`/tenants/${tenant.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-mono break-all">{tenant.id}</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <StatusBadge variant="default">
                  {tenant.subscriptionCount} subscription{tenant.subscriptionCount !== 1 ? "s" : ""}
                </StatusBadge>
                {tenant.configuredModules.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Configured: {tenant.configuredModules.slice(0, 3).join(", ")}
                    {tenant.configuredModules.length > 3 && "..."}
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tenants/${tenant.id}`);
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(tenant.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Tenant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Add a new Azure tenant configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-id">Tenant ID (UUID)</Label>
              <Input
                id="tenant-id"
                placeholder="e.g., 12345678-1234-1234-1234-123456789abc"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Tenant Name (optional)</Label>
              <Input
                id="tenant-name"
                placeholder="e.g., Contoso Corp"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTenant} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete tenant <span className="font-mono">{deleteConfirmId}</span>? This will remove all configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
