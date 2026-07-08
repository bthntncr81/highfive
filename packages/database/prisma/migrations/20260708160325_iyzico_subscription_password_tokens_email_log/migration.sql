-- CreateEnum
CREATE TYPE "PasswordTokenPurpose" AS ENUM ('SETUP', 'RESET');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "iyzicoAnnualRefCode" TEXT,
ADD COLUMN     "iyzicoMonthlyRefCode" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "iyzicoCustomerReferenceCode" TEXT,
ADD COLUMN     "iyzicoSubscriptionReferenceCode" TEXT,
ADD COLUMN     "pendingCheckoutToken" TEXT,
ADD COLUMN     "pendingCycle" "BillingCycle",
ADD COLUMN     "pendingPlanId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" "PasswordTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_token_key" ON "PasswordToken"("token");

-- CreateIndex
CREATE INDEX "PasswordToken_userId_idx" ON "PasswordToken"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_template_createdAt_idx" ON "EmailLog"("template", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_iyzicoSubscriptionReferenceCode_key" ON "Subscription"("iyzicoSubscriptionReferenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_pendingCheckoutToken_key" ON "Subscription"("pendingCheckoutToken");

-- AddForeignKey
ALTER TABLE "PasswordToken" ADD CONSTRAINT "PasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

