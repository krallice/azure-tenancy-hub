import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { SchemaForm } from "@/components/schema-form/SchemaForm";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ModuleEditorPage() {
  const { tenantId, subscriptionId, modulePath } = useParams<{
    tenantId: string;
    subscriptionId?: string;
    modulePath: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formValue, setFormValue] = useState<Record<string, unknown> | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const scope = subscriptionId ? "subscription" : "tenant";

  const { data: moduleInfo, isLoading: moduleLoading, error: moduleError } = useQuery({
    queryKey: ["module", modulePath],
    queryFn: () => api.getModule(modulePath!),
    enabled: !!modulePath,
  });

  const { data: configData, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ["moduleConfig", tenantId, subscriptionId, modulePath],
    queryFn: () =>
      subscriptionId
        ? api.getSubscriptionModuleConfig(tenantId!, subscriptionId, modulePath!)
        : api.getTenantModuleConfig(tenantId!, modulePath!),
    enabled: !!tenantId && !!modulePath,
  });

  const { data: subscriptionInfo } = useQuery({
    queryKey: ["subscription", tenantId, subscriptionId],
    queryFn: () => api.getSubscription(tenantId!, subscriptionId!),
    enabled: !!subscriptionId,
  });

  useEffect(() => {
    if (configData?.composed) {
      setFormValue(configData.composed);
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      if (subscriptionId) {
        return api.setSubscriptionModuleConfig(tenantId!, subscriptionId, modulePath!, config);
      }
      return api.setTenantModuleConfig(tenantId!, modulePath!, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moduleConfig", tenantId, subscriptionId, modulePath] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      if (subscriptionId) {
        queryClient.invalidateQueries({ queryKey: ["subscription", tenantId, subscriptionId] });
      }
      toast.success("Configuration saved successfully");
    },
    onError: (error: any) => {
      if (error.data?.code === "VALIDATION_ERROR") {
        const details = error.data.details?.map((d: any) => `${d.path}: ${d.message}`).join("\n") || error.message;
        toast.error(`Validation error: ${details}`);
      } else {
        toast.error(`Failed to save: ${error.message}`);
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (subscriptionId) {
        return api.deleteSubscriptionModuleConfig(tenantId!, subscriptionId, modulePath!);
      }
      return api.deleteTenantModuleConfig(tenantId!, modulePath!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moduleConfig", tenantId, subscriptionId, modulePath] });
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      if (subscriptionId) {
        queryClient.invalidateQueries({ queryKey: ["subscription", tenantId, subscriptionId] });
      }
      setShowResetConfirm(false);
      toast.success("Configuration reset to defaults");
    },
    onError: (error: any) => {
      if (error.status === 404) {
        toast.info("Already using defaults");
        setShowResetConfirm(false);
      } else {
        toast.error(`Failed to reset: ${error.message}`);
      }
    },
  });

  const handleSave = () => {
    if (formValue) {
      saveMutation.mutate(formValue);
    }
  };

  const handleBack = () => {
    if (subscriptionId) {
      navigate(`/tenants/${tenantId}`);
    } else {
      navigate(`/tenants/${tenantId}`);
    }
  };

  const isLoading = moduleLoading || configLoading;
  const error = moduleError || configError;

  if (error) {
    return (
      <EmptyState
        title="Error loading module"
        description={error instanceof Error ? error.message : "An error occurred"}
        action={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        }
      />
    );
  }

  const hasOverride = scope === "tenant"
    ? configData?.sources.tenantOverride
    : configData?.sources.subscriptionOverride;

  // Clean schema for form
  const schema = moduleInfo?.schema ? { ...moduleInfo.schema } : { type: "object", properties: {} };
  delete (schema as any).$schema;
  delete (schema as any).$id;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Configure: {moduleInfo?.name || "Loading..."}
          </h1>
          {modulePath && (
            <p className="text-sm text-muted-foreground font-mono">/{modulePath}</p>
          )}
        </div>
      </div>

      {/* Context Info */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        {moduleInfo?.description && (
          <p className="text-sm text-muted-foreground mb-4">{moduleInfo.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tenant:</span>{" "}
            <span className="font-mono text-foreground">{tenantId}</span>
          </div>
          {subscriptionId && (
            <div>
              <span className="text-muted-foreground">Subscription:</span>{" "}
              <span className="font-mono text-foreground">
                {subscriptionInfo?.name || subscriptionId}
                {subscriptionInfo?.name && (
                  <span className="text-muted-foreground ml-1">({subscriptionId})</span>
                )}
              </span>
            </div>
          )}
          <div className="ml-auto">
            <StatusBadge variant={hasOverride ? "configured" : "default"}>
              {hasOverride ? "Custom configuration" : "Using defaults"}
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading configuration...</div>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-6">
          <SchemaForm
            schema={schema as any}
            value={formValue ?? {}}
            onChange={setFormValue}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 sticky bottom-6">
        <Button onClick={handleSave} disabled={saveMutation.isPending || !formValue}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
        <Button variant="destructive" onClick={() => setShowResetConfirm(true)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset this module to defaults? This will remove your custom configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetMutation.isPending ? "Resetting..." : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
