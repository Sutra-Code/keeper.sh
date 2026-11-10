CREATE TABLE IF NOT EXISTS "microsoft_apps" (
	"clientId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"encryptedClientSecret" text NOT NULL,
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"tenantId" text DEFAULT 'common' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
