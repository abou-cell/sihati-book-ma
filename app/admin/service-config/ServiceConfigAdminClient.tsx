"use client";

import { useMemo, useState } from "react";

import type { SafeServiceConfiguration } from "@/lib/services/app-config.service";
import type { ServiceProvider } from "@/lib/validators/service-config";

type Props = {
  configs: SafeServiceConfiguration[];
  providers: readonly ServiceProvider[];
};

type Status = { type: "idle" | "success" | "error"; message: string };

const isGithubPagesPreview = process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";

function formatProvider(provider: string) {
  return provider
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function toSecretBag(value: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, secretValue]) => typeof secretValue === "string" && secretValue.trim().length > 0)
      .map(([key, secretValue]) => [key, secretValue as string]),
  );
}

export function ServiceConfigAdminClient({ configs, providers }: Props) {
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider>(providers[0]);
  const selectedConfig = useMemo(
    () => configs.find((config) => config.provider === selectedProvider),
    [configs, selectedProvider],
  );
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitConfig(formData: FormData) {
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      if (isGithubPagesPreview) {
        setStatus({ type: "error", message: "GitHub Pages preview: service configuration APIs are unavailable." });
        return;
      }

      const metadata = parseJsonObject(String(formData.get("metadata") ?? ""), "Metadata");
      const secrets = toSecretBag(parseJsonObject(String(formData.get("secrets") ?? ""), "Secrets"));
      const response = await fetch("/api/admin/service-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          displayName: String(formData.get("displayName") ?? ""),
          isEnabled: formData.get("isEnabled") === "on",
          metadata,
          ...(Object.keys(secrets).length > 0 ? { secrets } : {}),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Service configuration update failed.");
      }

      setStatus({ type: "success", message: "Configuration saved. Refresh to view the latest masked values." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Configuration update failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleService(isEnabled: boolean) {
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      if (isGithubPagesPreview) {
        setStatus({ type: "error", message: "GitHub Pages preview: service configuration APIs are unavailable." });
        return;
      }

      const response = await fetch("/api/admin/service-config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, isEnabled }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Service toggle failed.");
      }

      setStatus({ type: "success", message: `Service ${isEnabled ? "enabled" : "disabled"}. Refresh to view the latest state.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Service toggle failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create or update configuration</h2>
      <p className="mt-1 text-sm text-slate-600">
        Enter non-sensitive metadata as JSON. Enter only new or rotated secrets; saved secrets remain encrypted and masked.
      </p>

      <form key={selectedProvider} action={submitConfig} className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Provider
          <select
            name="provider"
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value as ServiceProvider)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {formatProvider(provider)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Display name
          <input
            name="displayName"
            defaultValue={selectedConfig?.displayName ?? formatProvider(selectedProvider)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="isEnabled" type="checkbox" defaultChecked={selectedConfig?.isEnabled ?? false} />
          Enabled
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Metadata JSON
          <textarea
            name="metadata"
            defaultValue={JSON.stringify(selectedConfig?.metadata ?? {}, null, 2)}
            className="min-h-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          New secrets JSON
          <textarea
            name="secrets"
            placeholder={'{\n  "apiKey": "new-secret-value"\n}'}
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        {selectedConfig && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Currently stored masked secrets</p>
            <pre className="mt-2">{JSON.stringify(selectedConfig.secrets, null, 2)}</pre>
          </div>
        )}

        {status.type !== "idle" && (
          <p className={`text-sm ${status.type === "success" ? "text-emerald-700" : "text-red-700"}`}>{status.message}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Save configuration
          </button>
          <button
            type="button"
            disabled={isSubmitting || !selectedConfig}
            onClick={() => toggleService(!(selectedConfig?.isEnabled ?? false))}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
          >
            {selectedConfig?.isEnabled ? "Disable service" : "Enable service"}
          </button>
        </div>
      </form>
    </section>
  );
}
