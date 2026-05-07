# Debugging and Maintenance Guide

This guide provides practical procedures for diagnosing Sihati issues in local, Docker, staging, and production environments. It focuses on logs, common errors, provider integrations, database problems, deployment recovery, and safe operational practices.

## 1. Logging principles

Sihati should log enough information to diagnose operational issues without exposing sensitive data.

Log safely:

- Request path, method, status, duration.
- Auth source and user ID only when needed for audit trails.
- Provider name and event type.
- Error code and sanitized message.
- Deployment version or Git SHA.

Never log:

- Passwords or password hashes.
- `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, API keys, webhook secrets, OAuth secrets, service account private keys.
- Payment card data.
- Private health information beyond strictly necessary audit identifiers.
- Decrypted service configuration secrets.

## 2. Useful diagnostic commands

### Local app checks

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

### Prisma/database checks

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma db push
```

Use `prisma db push` only for local/stabilization databases, not production releases.

### Docker checks

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
docker compose logs -f app-prod
docker compose down -v
docker compose up --build app db
```

### Network checks

```bash
curl -I http://localhost:3000
curl -I https://your-domain.example
curl -sS http://localhost:3000/api/practitioners/search
```

### Process and port checks

```bash
lsof -i :3000
ps aux | grep next
```

## 3. Common application errors

### Environment validation failure

Symptoms:

- Startup fails before serving traffic.
- Error references invalid or missing environment variables.

Checks:

```bash
cat .env.example
printenv | sort
```

Fix:

- Ensure `NEXT_PUBLIC_APP_URL` is a valid URL.
- Provide all required production variables when `NODE_ENV=production`.
- Generate a valid `APP_ENCRYPTION_KEY` with `openssl rand -base64 32`.
- Ensure `AUTH_SECRET` is at least 32 characters.

### Access denied on protected pages

Symptoms:

- Redirect to `/access-denied`.
- API returns `401` or `403`.

Likely causes:

- No authenticated user.
- User role is not allowed.
- Demo headers are unavailable or disabled in production.
- Ownership check failed for appointment/consultation access.

Fix:

- Use production auth provider in staging/production.
- Confirm role in the Sihati database.
- Do not rely on spoofable headers in production.

### Validation error from API

Symptoms:

- API returns `400` with structured error details.

Fix:

- Review Zod schema under `lib/validators/`.
- Confirm request body/query types and allowed enum values.
- Keep route validation before service execution.

## 4. Docker issues

### Container fails to start

Check:

```bash
docker compose ps
docker compose logs app
docker compose logs db
```

Common fixes:

- Rebuild images: `docker compose up --build app db`.
- Recreate volumes if local data can be discarded: `docker compose down -v`.
- Confirm `.env`/compose variables are present.

### Database readiness issues

Symptoms:

- App starts before database accepts connections.
- Prisma `P1001` or connection refused errors.

Check:

```bash
docker compose logs db
docker compose exec app npx prisma validate
```

Fix:

- Wait for PostgreSQL healthcheck.
- Confirm container connection string uses host `db`, not `localhost`.
- Restart the stack after database initialization.

### Production-like image build fails

Check:

```bash
docker compose --profile prod up --build app-prod db
```

Fix:

- Run `npm run build` on the host to reproduce.
- Confirm standalone output is enabled in `next.config.ts` if required by the Dockerfile.
- Ensure production environment variables are supplied at runtime.

## 5. Firebase issues

Firebase is a planned production auth option. Common integration issues once implemented:

### Invalid token

Causes:

- Token expired.
- Token from the wrong Firebase project.
- Backend service account project ID mismatch.
- Clock skew on server.

Fix:

- Verify `FIREBASE_PROJECT_ID` matches frontend project config.
- Refresh token on the client.
- Confirm server time synchronization.

### Unauthorized domain

Fix:

- Add local, staging, and production domains to Firebase authorized domains.
- Update OAuth provider redirect URLs.

### Private key newline errors

Fix:

- Store private key using deployment secret manager multiline support, or replace escaped `\n` sequences at runtime in the Firebase adapter.
- Never commit the service account JSON file.

## 6. CORS and same-origin issues

Sihati internal APIs are intended for same-origin application use.

Symptoms:

- Browser blocks requests.
- Mutating API returns a same-origin/access-control error.

Fix:

- Use relative URLs from the frontend.
- Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS domain.
- Ensure proxy/load balancer forwards `Host`, `X-Forwarded-Proto`, and relevant headers correctly.
- Do not loosen CORS broadly unless there is a documented cross-origin client requirement.

## 7. Deployment issues

### Build fails in production

Check:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Fix:

- Reproduce locally with the same Node.js version.
- Confirm environment variables required during build are available.
- Do not bypass typecheck/lint failures for production.

### App starts locally but fails behind load balancer

Check:

- ALB target health.
- App listening port.
- Security group rules.
- Health check path and expected status.
- `NEXT_PUBLIC_APP_URL` and HTTPS forwarding.

Useful AWS checks:

```bash
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
aws logs tail <log-group-name> --follow
```

### 502 or 504 from ALB/CloudFront

Likely causes:

- App process down.
- Target group unhealthy.
- Security group blocks traffic.
- Timeout from slow route/database.

Fix:

- Restart app process.
- Review application and ALB logs.
- Check database connectivity and query latency.
- Roll back if issue correlates with a new release.

## 8. Database errors

### Prisma `P1001`: cannot reach database

Fix:

- Confirm `DATABASE_URL` host/port.
- Confirm database security group allows app traffic.
- Confirm RDS is available.
- Confirm Docker host is `db` inside compose and `localhost` from host machine.

### Prisma schema drift

Local fix:

```bash
npx prisma db push
```

Production fix:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

Do not use `db push` to force production schema changes.

### Too many connections

Fix:

- Review Prisma client singleton usage.
- Add connection pooling if deploying many instances.
- Increase RDS capacity only after checking for leaks.
- Use RDS metrics and logs to confirm connection counts.

### Slow queries

Fix:

- Review indexes in `prisma/schema.prisma`.
- Inspect database query plans.
- Add pagination to list endpoints where needed.
- Avoid logging full query payloads with sensitive data.

## 9. WebRTC/Jitsi/video issues

Current video support is an entry flow, not a completed provider integration.

Common production issues once integrated:

- Browser blocks camera/microphone permissions.
- Corporate network blocks UDP.
- Missing TURN server causes failed calls behind NAT.
- Room tokens expire too early or are reusable too long.
- Cancelled appointments still allow room entry.

Fix:

- Require HTTPS for camera/microphone access.
- Configure STUN/TURN or provider-managed relay.
- Generate signed, short-lived room tokens server-side.
- Re-check appointment status before joining.
- Log join failures with appointment ID and sanitized error code.

## 10. Stripe issues

Current payment routes are placeholders until verified Stripe checkout/webhooks are implemented.

Common future issues:

### Webhook signature verification fails

Fix:

- Use the exact `STRIPE_WEBHOOK_SECRET` for the endpoint environment.
- Read the raw request body for verification.
- Do not parse/modify the body before verifying the signature.

### Checkout session creation fails

Fix:

- Confirm `STRIPE_SECRET_KEY` matches environment (`sk_test` vs `sk_live`).
- Confirm product/price IDs exist.
- Confirm amount/currency are validated server-side.
- Confirm success/cancel URLs use the canonical HTTPS app URL.

### Duplicate webhook events

Fix:

- Store processed event IDs.
- Make webhook handlers idempotent.
- Reconcile appointment/payment status with Stripe dashboard if needed.

## 11. Recovery procedures

### Failed deployment rollback

1. Stop routing new traffic to unhealthy targets if possible.
2. Re-deploy the previous known-good artifact or Git tag.
3. Run `npm ci`, `npx prisma generate`, and `npm run build` for the rollback artifact.
4. Restart app processes gracefully.
5. Verify health checks and smoke tests.
6. Review whether database migrations require a forward fix rather than rollback.

### Database restore

1. Identify restore point/snapshot.
2. Restore to a new database instance first.
3. Validate schema and data integrity.
4. Point staging to restored database for verification.
5. Schedule production cutover if required.
6. Preserve audit logs for incident review.

### Secret compromise

1. Revoke compromised key in provider dashboard.
2. Rotate the value in Secrets Manager/SSM/deployment platform.
3. Restart application instances.
4. Review logs for suspicious use.
5. Rotate dependent credentials if needed.
6. Document incident timeline and corrective actions.

### Corrupted local Docker database

If local data can be discarded:

```bash
docker compose down -v
docker compose up --build app db
```

## 12. Maintenance schedule

Weekly:

- Review production errors and alerts.
- Confirm backups completed.
- Review dependency/security advisories.

Before every release:

- Run `npm run check`.
- Run `npm run build`.
- Review migrations.
- Take database snapshot for production schema changes.
- Run smoke tests after deployment.

Monthly:

- Test backup restore.
- Review IAM permissions and secrets access.
- Rotate credentials according to policy.
- Review monitoring thresholds.
