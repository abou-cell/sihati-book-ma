import { ServiceConfigAdminClient } from "@/app/admin/service-config/ServiceConfigAdminClient";
import { appConfigService } from "@/lib/services/app-config.service";
import { requireRolesForPage } from "@/lib/auth/current-user";

const providerDescriptions: Record<string, string> = {
  STRIPE: "Payment provider credentials and webhook metadata.",
  CLOUDFLARE_STREAM_WEBRTC: "Video consultation media service metadata and tokens.",
  FIREBASE: "Firebase project metadata and server credentials.",
  SMTP: "Transactional email host, sender, and authentication settings.",
  SMS_PROVIDER: "SMS gateway account metadata and API credentials.",
  PUSH_NOTIFICATIONS: "Push notification app metadata and signing keys.",
  CLOUD_STORAGE: "Private document storage bucket metadata and credentials.",
  GOOGLE_OAUTH: "Google OAuth client metadata and client secret.",
  FACEBOOK_OAUTH: "Facebook OAuth app metadata and client secret.",
};

function formatProvider(provider: string) {
  return provider
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminServiceConfigPage() {
  await requireRolesForPage(["ADMIN"]);
  const configs = process.env.GITHUB_PAGES === "true" ? [] : await appConfigService.listServiceConfigurations();
  const configByProvider = new Map(configs.map((config) => [config.provider, config]));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Admin · External service configuration</h1>
      <p className="mt-2 text-sm text-slate-600">
        Configure external API metadata and encrypted secrets. Secrets are masked and are never returned to the browser.
      </p>

      <ServiceConfigAdminClient configs={configs} providers={appConfigService.getSupportedProviders()} />

      <section className="mt-8 grid gap-4">
        {appConfigService.getSupportedProviders().map((provider) => {
          const config = configByProvider.get(provider);
          const metadata = config?.metadata ?? {};
          const secrets = config?.secrets ?? {};

          return (
            <article key={provider} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{config?.displayName ?? formatProvider(provider)}</h2>
                  <p className="mt-1 text-sm text-slate-600">{providerDescriptions[provider]}</p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                    config?.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {config?.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Metadata</dt>
                  <dd className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {Object.keys(metadata).length > 0 ? <pre>{JSON.stringify(metadata, null, 2)}</pre> : "No metadata configured"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Secrets</dt>
                  <dd className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {Object.keys(secrets).length > 0 ? <pre>{JSON.stringify(secrets, null, 2)}</pre> : "No encrypted secrets stored"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-slate-500">
                Update through <code className="rounded bg-slate-100 px-1 py-0.5">/api/admin/service-config</code>. Last updated: {config?.updatedAt ?? "never"}.
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
