
## Medical document privacy

Medical documents are treated as sensitive health information. Sihati stores only the metadata required for ownership, sharing, integrity verification, auditability, and lifecycle management in PostgreSQL; the file bytes are kept in private storage. Patients retain access to their own documents, while practitioners receive access only through explicit sharing or appointment linkage.

Documents are soft-deleted by setting `deletedAt` and status `DELETED` so access stops immediately while retention, recovery, and compliance workflows can be handled by operations. Administrators are limited to metadata access by default; any exceptional download workflow must be explicitly enabled, justified, audited, and reviewed under the operational break-glass policy.
