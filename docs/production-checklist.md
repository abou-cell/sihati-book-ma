# Production Checklist

Use this checklist before promoting Sihati to production. The project is in final stabilization, so every release should prioritize security, reliability, maintainability, and operational readiness without changing UI style or adding unrelated features.

## 1. Frontend optimization

- [ ] `npm run build` succeeds with production settings.
- [ ] Public pages render without runtime errors.
- [ ] Protected pages fail safely when unauthenticated.
- [ ] Client components use only browser-safe `NEXT_PUBLIC_*` variables.
- [ ] Forms display validation errors clearly.
- [ ] No debug UI, mock banners, or development-only instructions are visible in production.
- [ ] Accessibility basics checked: keyboard navigation, labels, focus states, and contrast.

## 2. Backend optimization

- [ ] API routes validate all request inputs with Zod or equivalent schemas.
- [ ] Protected routes use centralized auth helpers.
- [ ] Mutating browser-origin routes enforce same-origin checks.
- [ ] Business logic remains in services, not duplicated in route handlers.
- [ ] Database access remains in repositories/Prisma layer.
- [ ] Error responses are sanitized and consistent.
- [ ] Long-running or provider calls have timeout/retry strategies before launch.

## 3. Bundle size

- [ ] Review Next.js build output for unexpectedly large routes.
- [ ] Avoid importing server-only libraries into client components.
- [ ] Avoid shipping admin-only or provider SDK code to public pages.
- [ ] Split heavy client components only where there is a clear benefit.
- [ ] Confirm source maps policy for production.

## 4. Image optimization

- [ ] Use Next.js image optimization where applicable.
- [ ] Serve images in modern formats when possible.
- [ ] Use appropriate dimensions to avoid layout shift.
- [ ] Store future uploaded medical/private documents in private storage, not public web paths.
- [ ] Validate uploaded file type and size server-side before enabling uploads.

## 5. Cache

- [ ] Static assets are cached with long-lived immutable headers.
- [ ] API responses containing user or appointment data are not publicly cached.
- [ ] CloudFront caching policies exclude authenticated dynamic pages unless carefully keyed.
- [ ] CDN invalidation procedure is documented.
- [ ] Database query caching, if added later, respects user ownership and role boundaries.

## 6. Secret security

- [ ] No real secrets committed to Git.
- [ ] `.env.local` and production env files are ignored.
- [ ] Production secrets stored in AWS Secrets Manager, SSM Parameter Store, or equivalent.
- [ ] `AUTH_SECRET` is at least 32 characters.
- [ ] `APP_ENCRYPTION_KEY` is generated with `openssl rand -base64 32`.
- [ ] Stripe, Firebase, email, SMS, storage, and OAuth secrets are environment-specific.
- [ ] Admin service configuration returns masked secrets only.
- [ ] Secret rotation procedure is documented.

## 7. SEO

- [ ] Canonical production URL set in `NEXT_PUBLIC_APP_URL`.
- [ ] Public pages have meaningful titles/descriptions.
- [ ] Non-public dashboard/admin pages are not indexed.
- [ ] Sitemap/robots strategy is defined before public launch.
- [ ] Public practitioner/specialty pages avoid exposing private patient data.

## 8. HTTPS

- [ ] TLS certificate issued through ACM or trusted provider.
- [ ] HTTP redirects to HTTPS.
- [ ] `NEXT_PUBLIC_APP_URL` uses `https://` in production.
- [ ] OAuth/Firebase authorized domains match production domain.
- [ ] Stripe webhook URL uses HTTPS.
- [ ] Production cookies use `Secure`, `HttpOnly`, and appropriate `SameSite` settings when session cookies are implemented.

## 9. Backups

- [ ] RDS automated backups enabled.
- [ ] Point-in-time recovery enabled.
- [ ] Manual snapshot taken before schema migrations.
- [ ] Restore procedure tested in staging.
- [ ] S3 versioning enabled for critical buckets.
- [ ] Backup retention period approved.
- [ ] Backup access restricted to operational roles.

## 10. Monitoring

- [ ] Application logs shipped to CloudWatch or equivalent.
- [ ] ALB/CloudFront 4xx and 5xx metrics monitored.
- [ ] RDS CPU, connections, storage, and latency monitored.
- [ ] App process health check configured.
- [ ] Alerts configured for high error rate, high latency, unhealthy targets, and low database storage.
- [ ] On-call/escalation procedure documented.
- [ ] Logs reviewed to confirm secrets and PHI are not exposed.

## 11. Scalability

- [ ] App can run behind a load balancer with multiple instances.
- [ ] In-memory rate limiting replaced or fronted by WAF/Redis/Upstash for multi-instance deployments.
- [ ] Database connection pooling strategy defined.
- [ ] Static assets served through CDN.
- [ ] Long-running jobs/notifications moved to a queue if volume requires it.
- [ ] File storage uses S3/private object storage rather than local disk.
- [ ] Deployment supports zero-downtime or low-downtime rolling updates.

## 12. Authentication and authorization release gate

- [ ] Demo-header auth disabled in production.
- [ ] Production auth provider integrated and server-verified.
- [ ] User roles resolved from trusted Sihati data.
- [ ] Patient appointment access scoped to owner.
- [ ] Practitioner access scoped to assigned appointments/patients.
- [ ] Admin routes restricted to admins.
- [ ] Video consultation route verifies appointment ownership/assignment/admin status and appointment state.

## 13. Database release gate

- [ ] Production database is not publicly accessible.
- [ ] Prisma migrations exist and are reviewed.
- [ ] `npx prisma migrate deploy` succeeds in staging.
- [ ] Rollback/forward-fix migration plan exists.
- [ ] Database backup taken before production migration.
- [ ] Database credentials use least privilege.

## 14. Testing release gate

Required commands:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

Expected result:

- [ ] All required checks pass in CI.
- [ ] Tests do not require real Stripe, Firebase, SMTP/Resend, Cloudflare, or production database credentials.
- [ ] Provider-facing behavior uses mocks or test providers until live integrations are approved.

## 15. Final smoke tests

Run after every staging and production deployment:

- [ ] Home page loads over HTTPS.
- [ ] Search page loads and validates filters.
- [ ] Practitioner profile page loads.
- [ ] Available slots API returns safe validated responses.
- [ ] Patient booking flow works with production auth/session.
- [ ] Patient dashboard shows only patient data.
- [ ] Practitioner dashboard shows only assigned/own operational data.
- [ ] Admin service configuration page is admin-only.
- [ ] Admin service configuration masks secrets in responses.
- [ ] Consultation route blocks unauthorized users and invalid appointment states.
- [ ] Payment placeholder or live Stripe integration behaves according to release scope.
- [ ] Logs contain no secrets or sensitive health/payment data.

## 16. Final production readiness summary

Sihati is production-ready only when the following are true:

- Authentication is provider-backed and server-verified.
- Role and ownership checks are enforced on every protected route.
- Database migrations, backups, and restore procedures are validated.
- HTTPS, secret management, monitoring, and alerts are active.
- CI checks and production builds pass consistently.
- External providers are configured with environment-specific credentials.
- No development-only auth, mock credentials, or unsafe placeholders are active in production.
