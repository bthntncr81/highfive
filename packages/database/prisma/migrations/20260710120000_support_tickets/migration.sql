-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('REQUEST', 'COMPLAINT', 'ISSUE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "openedById" TEXT,
    "openedByName" TEXT,
    "type" "TicketType" NOT NULL DEFAULT 'REQUEST',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "source" TEXT NOT NULL DEFAULT 'POS',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketReply" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "ticketId" TEXT NOT NULL,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_idx" ON "SupportTicket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketReply_ticketId_idx" ON "SupportTicketReply"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicketReply_tenantId_idx" ON "SupportTicketReply"("tenantId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketReply" ADD CONSTRAINT "SupportTicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS — destek tabloları da tenant izolasyon backstop'una dahil
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupportTicket";
CREATE POLICY tenant_isolation ON "SupportTicket"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "SupportTicketReply" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupportTicketReply";
CREATE POLICY tenant_isolation ON "SupportTicketReply"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
