"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SERVICE_CONFIG_LABELS, SERVICE_CONFIG_PROVIDERS, type ServiceConfigProvider } from "@/lib/validators/service-config";

type MaskedServiceConfiguration = {
  id: string | null;
  provider: ServiceConfigProvider;
  displayName: string;
  isEnabled: boolean;
  metadata: Record<string, unknown>;
  secrets: Record<string, { configured: boolean; maskedValue: string | null }>;
  updatedAt: string | null;
};

type FormState = {
  provider: ServiceConfigProvider;
  displayName: string;
  isEnabled: boolean;
  metadataText: string;
  secretsText: string;
};

const defaultProvider = SERVICE_CONFIG_PROVIDERS[0];

function buildFormState(configuration?: MaskedServiceConfiguration): FormState {
  const provider = configuration?.provider ?? defaultProvider;

  return {
    provider,
    displayName: configuration?.displayName ?? SERVICE_CONFIG_LABELS[provider],
    isEnabled: configuration?.isEnabled ?? false,
    metadataText: JSON.stringify(configuration?.metadata ?? {}, null, 2),
    secretsText: "{}",
  };
}

function parseJsonRecord(value: string, label: string) {
  const parsed = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function ServiceConfigAdminClient({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [configurations, setConfigurations] = useState<MaskedServiceConfiguration[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceConfigProvider>(defaultProvider);
  const [form, setForm] = useState<FormState>(buildFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedConfiguration = useMemo(
    () => configurations.find((configuration) => configuration.provider === selectedProvider),
    [configurations, selectedProvider],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadConfigurations() {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/service-config", { cache: "no-store", headers: authHeaders });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to load service configurations");
      }

      if (isMounted) {
        setConfigurations(payload.data.configurations);
        const first = payload.data.configurations.find(
          (configuration: MaskedServiceConfiguration) => configuration.provider === defaultProvider,
        );
        setForm(buildFormState(first));
      }
    }

    loadConfigurations()
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Unable to load service configurations");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authHeaders]);

  function selectProvider(provider: ServiceConfigProvider) {
    setSelectedProvider(provider);
    const configuration = configurations.find((item) => item.provider === provider);
    setForm(buildFormState(configuration ?? { ...buildFormState(), id: null, provider, metadata: {}, secrets: {}, updatedAt: null }));
    setError(null);
    setStatus(null);
  }

  async function saveConfiguration() {
    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const metadata = parseJsonRecord(form.metadataText, "Metadata");
      const secrets = parseJsonRecord(form.secretsText, "Secrets");

      const response = await fetch("/api/admin/service-config", {
        method: "PUT",
        headers: { "content-type": "application/json", ...authHeaders },
        body: JSON.stringify({
          provider: form.provider,
          displayName: form.displayName,
          isEnabled: form.isEnabled,
          metadata,
          secrets,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to save service configuration");
      }

      const updated = payload.data.configuration as MaskedServiceConfiguration;
      setConfigurations((current) => current.map((item) => (item.provider === updated.provider ? updated : item)));
      setForm(buildFormState(updated));
      setStatus("Configuration saved. Secrets remain encrypted and are not returned to the browser.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save service configuration");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Services</h2>
        <div className="mt-3 space-y-2">
          {SERVICE_CONFIG_PROVIDERS.map((provider) => {
            const configuration = configurations.find((item) => item.provider === provider);
            return (
              <button
                key={provider}
                type="button"
                onClick={() => selectProvider(provider)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  selectedProvider === provider
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block font-medium">{SERVICE_CONFIG_LABELS[provider]}</span>
                <span className="mt-1 block text-xs text-slate-500">{configuration?.isEnabled ? "Enabled" : "Disabled"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{SERVICE_CONFIG_LABELS[selectedProvider]}</h2>
            <p className="mt-1 text-sm text-slate-600">Only metadata and masked secret status are displayed.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(event) => setForm((current) => ({ ...current, isEnabled: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Enabled
          </label>
        </div>

        {isLoading ? <p className="mt-6 text-sm text-slate-600">Loading service configuration…</p> : null}
        {error ? <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {status ? <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p> : null}

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="displayName">Display name</label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              className="mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="metadata">Non-sensitive metadata (JSON)</label>
            <textarea
              id="metadata"
              value={form.metadataText}
              onChange={(event) => setForm((current) => ({ ...current, metadataText: event.target.value }))}
              className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="secrets">Secrets to replace (JSON)</label>
            <textarea
              id="secrets"
              value={form.secretsText}
              onChange={(event) => setForm((current) => ({ ...current, secretsText: event.target.value }))}
              placeholder='{"apiKey":"new secret"}'
              className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            />
            <p className="mt-2 text-xs text-slate-500">Leave as {'{}'} to keep existing encrypted secrets unchanged.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Configured secrets</h3>
            {selectedConfiguration && Object.keys(selectedConfiguration.secrets).length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {Object.entries(selectedConfiguration.secrets).map(([key, secret]) => (
                  <li key={key} className="flex justify-between gap-3">
                    <span>{key}</span>
                    <span>{secret.maskedValue ?? "Configured"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No secrets configured yet.</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={saveConfiguration} disabled={isSaving || isLoading}>
              {isSaving ? "Saving…" : "Save configuration"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
