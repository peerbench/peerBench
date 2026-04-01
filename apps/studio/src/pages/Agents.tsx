import { useState } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash2, HeartPulse } from "lucide-react";
import { type Agent } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Link } from "react-router-dom";
import {
  useAgents,
  useDeleteAgent,
  useImportAgents,
  useAgentHealthCheck,
  useAllHealthChecks,
} from "@/lib/queries";
import { AgentName } from "@/components/AgentName";
import { formatTimeAgo } from "@/lib/format-utils";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function Agents() {
  const [showImportForm, setShowImportForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: agentsData, isLoading: loading } = useAgents();
  const agents = agentsData?.agents ?? [];

  const deleteAgentMutation = useDeleteAgent();
  const importAgentsMutation = useImportAgents();
  const healthCheckMutation = useAgentHealthCheck();
  const allHealthChecksMutation = useAllHealthChecks();

  const requestAgentDelete = (id: string) => setDeleteConfirm(id);
  const confirmAgentDelete = (id: string) => {
    deleteAgentMutation.mutate(id, {
      onSettled: () => setDeleteConfirm(null),
    });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    importAgentsMutation.mutate(importUrl, {
      onSuccess: (result) => {
        setShowImportForm(false);
        setImportUrl("");
        toastSuccess(
          `Imported ${result.imported} agent${result.imported !== 1 ? "s" : ""}`
        );
      },
    });
  };

  const handleCheckAgent = (agentId: string) => {
    healthCheckMutation.mutate(agentId, {
      onSuccess: ({ result }) => {
        if (result.status === "healthy") {
          toastSuccess("Health check passed");
        } else {
          toastError(
            new Error(result.errorMessage || "Health check failed"),
            "Health check failed"
          );
        }
      },
    });
  };

  const handleCheckAll = () => {
    if (agents.length === 0) return;
    allHealthChecksMutation.mutate(undefined, {
      onSuccess: ({ results }) => {
        const healthy = results.filter((r) => r.status === "healthy").length;
        const unhealthy = results.filter(
          (r) => r.status === "unhealthy"
        ).length;

        if (unhealthy === 0) {
          toastSuccess(`All ${healthy} agents healthy`);
        } else {
          toastError(
            new Error(
              `${unhealthy} of ${healthy + unhealthy} agents unhealthy`
            ),
            "Some health checks failed"
          );
        }
      },
    });
  };

  const columns: ColumnDef<Agent>[] = [
    {
      id: "healthStatus",
      header: "Health",
      cell: ({ row }) => {
        const hc = row.original.lastHealthCheck;
        if (!hc) {
          return (
            <div>
              <span
                className="text-xs font-medium text-muted-foreground"
                title="Not yet checked"
              >
                Unknown
              </span>
            </div>
          );
        }
        const badge =
          hc.status === "healthy" ? (
            <span
              className="text-xs font-medium text-green-600"
              title={`Healthy • ${hc.checkedPath || ""}`}
            >
              Healthy
            </span>
          ) : (
            <span
              className="text-xs font-medium text-red-600"
              title={hc.errorMessage || "Health check failed"}
            >
              Unhealthy
            </span>
          );
        return (
          <div className="flex flex-col gap-0.5">
            {badge}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimeAgo(hc.checkedAt)}
              {hc.responseTimeMs !== null && (
                <span className="ml-1">({hc.responseTimeMs}ms)</span>
              )}
            </span>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => row.name || row.agentId,
      cell: ({ row }) => (
        <Link
          to={`/agents/${row.original.id}`}
          className="text-primary hover:text-primary/80"
        >
          <AgentName
            name={row.original.name || row.original.agentId}
            provider={row.original.provider}
            endpointUrl={row.original.endpointUrl}
            description={row.original.description}
          />
        </Link>
      ),
    },
    {
      accessorKey: "provider",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Provider
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.provider}
        </span>
      ),
    },
    {
      accessorKey: "endpointUrl",
      header: "Endpoint",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground font-mono truncate max-w-xs block">
          {row.original.endpointUrl}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
              aria-label="Open menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleCheckAgent(row.original.id)}
              disabled={
                healthCheckMutation.isPending &&
                healthCheckMutation.variables === row.original.id
              }
            >
              <HeartPulse className="h-4 w-4" />
              {healthCheckMutation.isPending &&
              healthCheckMutation.variables === row.original.id
                ? "Checking..."
                : "Health Check"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (deleteConfirm === row.original.id) {
                  confirmAgentDelete(row.original.id);
                } else {
                  requestAgentDelete(row.original.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              {deleteConfirm === row.original.id ? "Confirm Delete?" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: agents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agents</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCheckAll}
            disabled={allHealthChecksMutation.isPending || agents.length === 0}
          >
            {allHealthChecksMutation.isPending ? "Checking..." : "Check All"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportForm(!showImportForm)}
          >
            Import from Mastra
          </Button>
        </div>
      </div>

      {showImportForm && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">
              Import from Mastra Server
            </h3>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mastra Server Base URL
                </label>
                <Input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://your-mastra-server.com"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={importAgentsMutation.isPending}>
                  {importAgentsMutation.isPending ? "Importing..." : "Import"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <DataTable
        table={table}
        columnCount={columns.length}
        isLoading={loading}
        emptyMessage="No agents or endpoints registered yet. Add an agent or import from a Mastra server to get started."
      />
    </div>
  );
}
