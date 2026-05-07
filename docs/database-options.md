# Database Installation Options

Sihati currently uses Prisma with a PostgreSQL datasource. AWS RDS PostgreSQL is the recommended production database. Supabase can be used as a managed PostgreSQL alternative. SQL Server requires schema/provider changes and compatibility validation before use.

## Option 1 — AWS RDS

### PostgreSQL setup

Recommended production settings:

- Engine: PostgreSQL 16 or newer.
- Deployment: Multi-AZ for production.
- Storage: gp3, encrypted.
- Backups: automated backups and point-in-time recovery enabled.
- Network: private subnets, not publicly accessible.
- Protection: deletion protection enabled.

Create database values:

- Database name: `sihati`.
- App user: `sihati_app`.
- Password: generated and stored in Secrets Manager.

Connection string:

```env
DATABASE_URL=postgresql://sihati_app:<password>@<rds-endpoint>:5432/sihati?schema=public
```

### MySQL setup

MySQL can be considered only if the Prisma datasource is intentionally changed from PostgreSQL to MySQL.

Required work before MySQL production use:

- Change `provider = "postgresql"` to `provider = "mysql"` in `prisma/schema.prisma`.
- Review field types and enum behavior.
- Regenerate Prisma client.
- Create and review MySQL migrations.
- Run the full test suite and manual booking/availability smoke tests.

MySQL is not currently the default path.

### Networking

RDS should be isolated in private subnets.

Security group rules:

- Inbound: database port from the application security group only.
- Outbound: default or restricted according to organization policy.
- No direct public internet access for production RDS.

For local administration, prefer:

- AWS Systems Manager Session Manager port forwarding.
- Bastion host with restricted IP access.
- Temporary security group rule with approval and expiration.

### Security groups

PostgreSQL default port: `5432`.

Example rule:

```text
Type: PostgreSQL
Port: 5432
Source: sg-application-server
```

Do not use `0.0.0.0/0` for production database access.

### Backups

Enable:

- Automated backups.
- Point-in-time recovery.
- Manual snapshots before schema migrations.
- Snapshot retention policy.
- Restore test schedule.

### Remote access

Recommended secure options:

```bash
aws ssm start-session --target <instance-id>
```

or SSM port forwarding through an EC2 instance in the VPC. Avoid exposing RDS publicly.

### Migration commands

Production:

```bash
npx prisma generate
npx prisma migrate deploy
```

Local/stabilization only:

```bash
npx prisma db push
```

## Option 2 — Supabase

Supabase provides managed PostgreSQL with a dashboard, SQL editor, connection pooling, optional auth, and row-level security tooling.

### Project creation

1. Create a Supabase organization/project.
2. Choose the region closest to users or app servers.
3. Save database password in a secret manager.
4. Copy the direct database connection string and pooled connection string.
5. Restrict network access if the selected plan supports it.

### Database setup

Use the PostgreSQL connection string in Sihati:

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

For pooled/serverless workloads, use the pooler connection string if compatible with the Prisma runtime and deployment model.

Run:

```bash
npx prisma generate
npx prisma migrate deploy
```

### Policies

Sihati currently enforces authorization in the Next.js backend. If using Supabase RLS directly in future features, define policies that mirror Sihati ownership rules:

- Patients can access only their own records.
- Practitioners can access assigned appointments/patient documents only.
- Admins can access operational records.
- Public discovery data should expose only non-sensitive practitioner information.

Do not expose service-role keys to browser code.

### Auth considerations

Supabase Auth can be an alternative to Firebase Auth. If selected:

- Verify JWTs server-side.
- Map Supabase users to Sihati `User` records.
- Resolve Sihati roles from the database.
- Keep authorization helpers centralized.
- Avoid trusting client-provided role values.

### Connection from frontend/backend

Current Sihati backend should connect to Supabase PostgreSQL with Prisma through `DATABASE_URL`. Browser code should not connect directly to privileged database APIs.

If future browser-side Supabase features are added:

- Use anon keys only for safe public operations.
- Enforce RLS policies.
- Keep service role keys server-only.

## Option 3 — SQL Server

SQL Server is not currently the default database and is not a drop-in replacement for the checked-in PostgreSQL datasource.

### Installation

Deployment options:

- AWS RDS for SQL Server.
- Azure SQL Database.
- Self-managed SQL Server on a VM.
- Local Docker SQL Server for evaluation.

Local Docker example:

```bash
docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='<StrongPassword123!>' -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest
```

### Users

Create a least-privilege app user:

```sql
CREATE LOGIN sihati_app WITH PASSWORD = '<strong-password>';
CREATE USER sihati_app FOR LOGIN sihati_app;
ALTER ROLE db_datareader ADD MEMBER sihati_app;
ALTER ROLE db_datawriter ADD MEMBER sihati_app;
```

Migration users may need elevated schema permissions. Avoid running the app permanently as an admin user.

### Scripts

Prisma SQL Server connection string shape:

```env
DATABASE_URL=sqlserver://<host>:1433;database=sihati;user=sihati_app;password=<password>;encrypt=true;trustServerCertificate=false
```

Required Prisma changes:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

Then run compatibility validation:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev --name init-sqlserver
npm run check
```

### Connection from API/backend

Only the backend should connect to SQL Server. Keep the connection string server-only and do not expose database credentials through `NEXT_PUBLIC_*` variables.

### Prisma compatibility notes and limitations

- SQL Server support exists in Prisma, but provider behavior differs from PostgreSQL.
- Existing migrations generated for PostgreSQL cannot be blindly reused.
- Native types, index behavior, JSON handling, and enum mapping must be reviewed.
- SQL Server should be selected only after a dedicated migration/test cycle.
- Production cutover requires data migration scripts, downtime/dual-write planning, and rollback procedures.

## Recommendation

Use AWS RDS PostgreSQL for the production launch unless there is a strong operational reason to choose Supabase PostgreSQL. Treat SQL Server as a separate migration project rather than a deployment option for the current stabilization cycle.
