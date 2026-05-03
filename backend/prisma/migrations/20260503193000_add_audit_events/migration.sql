-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorEmail" TEXT,
    "role" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- CreateIndex
CREATE INDEX "audit_events_userId_idx" ON "audit_events"("userId");

-- CreateIndex
CREATE INDEX "audit_events_status_idx" ON "audit_events"("status");

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
