# Sihati shared contracts placeholder

This directory is reserved for shared mobile/web API contracts, examples, and generated artifacts.

Recommended future contents:

```text
packages/shared/
├── api/
│   └── openapi.yaml
├── fixtures/
│   ├── practitioner-search.json
│   ├── available-slots.json
│   └── error-envelope.json
└── README.md
```

Do not place privileged backend logic, secrets, or provider SDK credentials here. Shared assets should be contract-oriented and safe for generated mobile clients.
