-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "BillingTransactionType" AS ENUM ('SUBSCRIPTION_PAYMENT', 'SUBSCRIPTION_UPGRADE', 'REFUND', 'MANUAL_CREDIT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'WAITER', 'KITCHEN', 'CASHIER', 'COURIER');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('FREE', 'OCCUPIED', 'RESERVED', 'CLEANING');

-- CreateEnum
CREATE TYPE "Allergen" AS ENUM ('GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH', 'NUTS', 'PEANUTS', 'SOY', 'SESAME', 'CELERY', 'MUSTARD', 'SULPHITES', 'LUPIN', 'MOLLUSCS');

-- CreateEnum
CREATE TYPE "RawMaterialUnit" AS ENUM ('GRAM', 'KILOGRAM', 'LITRE', 'MILLILITRE', 'ADET', 'PORSIYON');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SERVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ROOM_SERVICE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'ONLINE', 'MULTINET', 'SODEXO', 'TICKET', 'TAB', 'DIGITAL_COIN', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'ON_TAB');

-- CreateEnum
CREATE TYPE "PrinterType" AS ENUM ('RECEIPT', 'KITCHEN', 'BAR', 'LABEL');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BuilderType" AS ENUM ('PIZZA', 'SANDWICH');

-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('DOUGH', 'BASE_SAUCE', 'CHEESE', 'MEAT', 'VEGETABLE', 'TOP_SAUCE', 'SAUCE', 'EXTRA');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "annualPrice" DECIMAL(10,2) NOT NULL,
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "features" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "iyzicoCardUserKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "iyzicoToken" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "cardBrand" TEXT,
    "cardHolder" TEXT,
    "expireMonth" TEXT NOT NULL,
    "expireYear" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "BillingTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "iyzicoPaymentId" TEXT,
    "iyzicoConversationId" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WAITER',
    "pin" TEXT,
    "locationId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "serviceCharge" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "serviceChargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenLat" DOUBLE PRECISION,
    "lastSeenLng" DOUBLE PRECISION,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'FREE',
    "positionX" DOUBLE PRECISION,
    "positionY" DOUBLE PRECISION,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "section" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mergedWithId" TEXT,
    "sessionToken" TEXT,
    "sessionStartedAt" TIMESTAMP(3),
    "tabEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "printToKitchen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "badges" TEXT[],
    "allergens" "Allergen"[],
    "calories" INTEGER,
    "prepTime" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "outOfStockReason" TEXT,
    "outOfStockUntil" TIMESTAMP(3),
    "stockQuantity" INTEGER,
    "lowStockAlert" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "discountPrice" DECIMAL(10,2),
    "discountUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemUpsell" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromItemId" TEXT NOT NULL,
    "toItemId" TEXT NOT NULL,
    "message" TEXT,
    "discountAmount" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemUpsell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemCrossSell" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromItemId" TEXT NOT NULL,
    "toItemId" TEXT NOT NULL,
    "message" TEXT,
    "discountAmount" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemCrossSell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "RawMaterialUnit" NOT NULL DEFAULT 'GRAM',
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHour" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "discountType" TEXT,
    "discountPercent" DECIMAL(5,2),
    "discountAmount" DECIMAL(10,2),
    "campaignId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HappyHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHourItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "happyHourId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "specialPrice" DECIMAL(10,2),
    "discountPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HappyHourItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" SERIAL NOT NULL,
    "locationId" TEXT,
    "tableId" TEXT,
    "userId" TEXT,
    "courierId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerLatitude" DOUBLE PRECISION,
    "customerLongitude" DOUBLE PRECISION,
    "roomNumber" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isTab" BOOLEAN NOT NULL DEFAULT false,
    "tabClosedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "courierAcceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryPhotoUrl" TEXT,
    "deliveryNotes" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "externalOrderId" TEXT,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "menuItemName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paidQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "modifiers" TEXT[],
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "isUpsell" BOOLEAN NOT NULL DEFAULT false,
    "isCrossSell" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "paidItems" JSONB,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "refundedAt" TIMESTAMP(3),
    "refundedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerTaxId" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL,
    "serviceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PrinterType" NOT NULL DEFAULT 'RECEIPT',
    "ipAddress" TEXT,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "usbVendorId" TEXT,
    "usbProductId" TEXT,
    "paperWidth" INTEGER NOT NULL DEFAULT 80,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "categories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "orderId" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" TIMESTAMP(3),

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "date" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cashAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "onlineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceChargeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cancelCount" INTEGER NOT NULL DEFAULT 0,
    "avgOrderTime" INTEGER,
    "avgOrderValue" DECIMAL(10,2),
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "topItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "expenseDate" DATE NOT NULL,
    "vendor" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "receiptUrl" TEXT,
    "notes" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'APPROVED',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "sessionId" TEXT,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "password" TEXT,
    "loyaltyTierId" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "emailConsent" BOOLEAN NOT NULL DEFAULT false,
    "pushConsent" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "kvkkAcceptedAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationCodeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastOrderAt" TIMESTAMP(3),
    "lastWinbackAt" TIMESTAMP(3),
    "lastSpinAt" TIMESTAMP(3),
    "cashbackBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "referralCode" TEXT,
    "referredByCode" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDate" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "pointsMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "benefits" JSONB,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "pointsSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "type" TEXT NOT NULL,
    "minPurchase" DECIMAL(10,2),
    "minItems" INTEGER,
    "loyaltyTierIds" TEXT[],
    "applicableItems" TEXT[],
    "excludedItems" TEXT[],
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "freeItemId" TEXT,
    "maxDiscount" DECIMAL(10,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysOfWeek" INTEGER[],
    "startTime" TEXT,
    "endTime" TEXT,
    "usageLimit" INTEGER,
    "usagePerCustomer" INTEGER,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleDeal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "bundlePrice" DECIMAL(10,2) NOT NULL,
    "savings" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "daysOfWeek" INTEGER[],
    "startTime" TEXT,
    "endTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleOptionGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pickCount" INTEGER NOT NULL DEFAULT 1,
    "priceMode" TEXT NOT NULL DEFAULT 'INCLUDED',
    "categoryId" TEXT,
    "eligibleItemIds" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minSelect" INTEGER NOT NULL DEFAULT 1,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionGroupItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptionGroupItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleOptionGroupAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleOptionGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "optionGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxDiscount" DECIMAL(10,2),
    "minPurchase" DECIMAL(10,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "usagePerCustomer" INTEGER NOT NULL DEFAULT 1,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "loyaltyTierIds" TEXT[],
    "isFirstOrder" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationPartner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY['menu:read', 'orders:write', 'orders:read']::TEXT[],
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT,
    "appType" TEXT,
    "deviceId" TEXT,
    "appVersion" TEXT,
    "locale" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "imageUrl" TEXT,
    "campaignId" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'ALL',
    "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "segmentCriteria" JSONB,
    "recurrence" JSONB,
    "lastSentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "tierConfig" JSONB,
    "applicableMenuItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rewardMenuItemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rewardCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "proofImageUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLoyaltyProgress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLoyaltyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderStatus" BOOLEAN NOT NULL DEFAULT true,
    "campaigns" BOOLEAN NOT NULL DEFAULT true,
    "loyalty" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinWheelConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Şans Çarkı',
    "description" TEXT,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "minCartTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "slices" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpinWheelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "prizeIndex" INTEGER NOT NULL,
    "prizeLabel" TEXT NOT NULL,
    "prizeType" TEXT NOT NULL,
    "prizeValue" DECIMAL(10,2),
    "couponId" TEXT,
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardCouponCode" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAchievement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "CustomerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScratchReward" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "prizeType" TEXT NOT NULL,
    "prizeLabel" TEXT NOT NULL,
    "prizeValue" DECIMAL(10,2),
    "couponId" TEXT,
    "scratchedAt" TIMESTAMP(3),
    "redeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScratchReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryBoxConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '📦',
    "pointsCost" INTEGER NOT NULL,
    "prizes" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MysteryBoxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryBoxOpen" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "prizeIndex" INTEGER NOT NULL,
    "prizeLabel" TEXT NOT NULL,
    "prizeType" TEXT NOT NULL,
    "prizeValue" DECIMAL(10,2),
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MysteryBoxOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderBase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "BuilderType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "baseImage" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderIngredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "BuilderType" NOT NULL,
    "category" "IngredientCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "layerImage" TEXT NOT NULL,
    "layerOrder" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calories" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "batteryLevel" INTEGER,
    "isMoving" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'FOREGROUND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedBuilderDesign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "builderType" "BuilderType" NOT NULL,
    "baseId" TEXT NOT NULL,
    "ingredientIds" TEXT[],
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedBuilderDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PizzaGameScore" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PizzaGameScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "StoredCard_tenantId_idx" ON "StoredCard"("tenantId");

-- CreateIndex
CREATE INDEX "BillingTransaction_tenantId_createdAt_idx" ON "BillingTransaction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_pin_key" ON "Membership"("tenantId", "pin");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_tenantId_code_key" ON "Location"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_tenantId_idx" ON "Session"("tenantId");

-- CreateIndex
CREATE INDEX "ActivityLog_tenantId_idx" ON "ActivityLog"("tenantId");

-- CreateIndex
CREATE INDEX "Table_tenantId_idx" ON "Table"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_tenantId_locationId_number_key" ON "Table"("tenantId", "locationId", "number");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE INDEX "MenuItem_tenantId_idx" ON "MenuItem"("tenantId");

-- CreateIndex
CREATE INDEX "MenuItemLocation_tenantId_idx" ON "MenuItemLocation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemLocation_menuItemId_locationId_key" ON "MenuItemLocation"("menuItemId", "locationId");

-- CreateIndex
CREATE INDEX "MenuItemUpsell_tenantId_idx" ON "MenuItemUpsell"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemUpsell_fromItemId_toItemId_key" ON "MenuItemUpsell"("fromItemId", "toItemId");

-- CreateIndex
CREATE INDEX "MenuItemCrossSell_tenantId_idx" ON "MenuItemCrossSell"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemCrossSell_fromItemId_toItemId_key" ON "MenuItemCrossSell"("fromItemId", "toItemId");

-- CreateIndex
CREATE INDEX "Modifier_tenantId_idx" ON "Modifier"("tenantId");

-- CreateIndex
CREATE INDEX "RawMaterial_tenantId_idx" ON "RawMaterial"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterial_tenantId_name_key" ON "RawMaterial"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MenuItemIngredient_tenantId_idx" ON "MenuItemIngredient"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_rawMaterialId_key" ON "MenuItemIngredient"("menuItemId", "rawMaterialId");

-- CreateIndex
CREATE INDEX "HappyHour_tenantId_idx" ON "HappyHour"("tenantId");

-- CreateIndex
CREATE INDEX "HappyHourItem_tenantId_idx" ON "HappyHourItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "HappyHourItem_happyHourId_menuItemId_key" ON "HappyHourItem"("happyHourId", "menuItemId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "Printer_tenantId_idx" ON "Printer"("tenantId");

-- CreateIndex
CREATE INDEX "PrintJob_tenantId_idx" ON "PrintJob"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_tenantId_idx" ON "WhatsAppMessage"("tenantId");

-- CreateIndex
CREATE INDEX "DailyReport_tenantId_idx" ON "DailyReport"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_tenantId_locationId_date_key" ON "DailyReport"("tenantId", "locationId", "date");

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_idx" ON "ExpenseCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_tenantId_name_key" ON "ExpenseCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_locationId_expenseDate_idx" ON "Expense"("locationId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Settings_tenantId_idx" ON "Settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_tenantId_key_key" ON "Settings"("tenantId", "key");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_idx" ON "AnalyticsEvent"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_referralCode_idx" ON "Customer"("referralCode");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_phone_key" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_email_key" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_referralCode_key" ON "Customer"("tenantId", "referralCode");

-- CreateIndex
CREATE INDEX "LoyaltyTier_tenantId_idx" ON "LoyaltyTier"("tenantId");

-- CreateIndex
CREATE INDEX "PointsTransaction_tenantId_idx" ON "PointsTransaction"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_orderId_key" ON "CustomerOrder"("orderId");

-- CreateIndex
CREATE INDEX "CustomerOrder_tenantId_idx" ON "CustomerOrder"("tenantId");

-- CreateIndex
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- CreateIndex
CREATE INDEX "BundleDeal_tenantId_idx" ON "BundleDeal"("tenantId");

-- CreateIndex
CREATE INDEX "BundleOptionGroup_tenantId_idx" ON "BundleOptionGroup"("tenantId");

-- CreateIndex
CREATE INDEX "OptionGroup_tenantId_idx" ON "OptionGroup"("tenantId");

-- CreateIndex
CREATE INDEX "OptionGroupItem_tenantId_idx" ON "OptionGroupItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroupItem_optionGroupId_menuItemId_key" ON "OptionGroupItem"("optionGroupId", "menuItemId");

-- CreateIndex
CREATE INDEX "BundleOptionGroupAssignment_tenantId_idx" ON "BundleOptionGroupAssignment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleOptionGroupAssignment_bundleId_optionGroupId_key" ON "BundleOptionGroupAssignment"("bundleId", "optionGroupId");

-- CreateIndex
CREATE INDEX "BundleItem_tenantId_idx" ON "BundleItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleItem_bundleId_menuItemId_key" ON "BundleItem"("bundleId", "menuItemId");

-- CreateIndex
CREATE INDEX "Coupon_tenantId_idx" ON "Coupon"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "Coupon"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CouponUsage_tenantId_idx" ON "CouponUsage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationPartner_apiKey_key" ON "IntegrationPartner"("apiKey");

-- CreateIndex
CREATE INDEX "IntegrationPartner_tenantId_idx" ON "IntegrationPartner"("tenantId");

-- CreateIndex
CREATE INDEX "WebhookLog_tenantId_idx" ON "WebhookLog"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_customerId_idx" ON "DeviceToken"("customerId");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_appType_idx" ON "DeviceToken"("appType");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_isActive_idx" ON "DeviceToken"("isActive");

-- CreateIndex
CREATE INDEX "DeviceToken_tenantId_idx" ON "DeviceToken"("tenantId");

-- CreateIndex
CREATE INDEX "PushNotification_status_idx" ON "PushNotification"("status");

-- CreateIndex
CREATE INDEX "PushNotification_campaignId_idx" ON "PushNotification"("campaignId");

-- CreateIndex
CREATE INDEX "PushNotification_scheduledAt_idx" ON "PushNotification"("scheduledAt");

-- CreateIndex
CREATE INDEX "PushNotification_tenantId_idx" ON "PushNotification"("tenantId");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_type_idx" ON "LoyaltyProgram"("type");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_isActive_idx" ON "LoyaltyProgram"("isActive");

-- CreateIndex
CREATE INDEX "LoyaltyProgram_tenantId_idx" ON "LoyaltyProgram"("tenantId");

-- CreateIndex
CREATE INDEX "LoyaltyClaim_customerId_programId_idx" ON "LoyaltyClaim"("customerId", "programId");

-- CreateIndex
CREATE INDEX "LoyaltyClaim_status_createdAt_idx" ON "LoyaltyClaim"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyClaim_tenantId_idx" ON "LoyaltyClaim"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyProgress_customerId_idx" ON "CustomerLoyaltyProgress"("customerId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyProgress_programId_idx" ON "CustomerLoyaltyProgress"("programId");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyProgress_tenantId_idx" ON "CustomerLoyaltyProgress"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyaltyProgress_customerId_programId_key" ON "CustomerLoyaltyProgress"("customerId", "programId");

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");

-- CreateIndex
CREATE INDEX "FavoriteItem_customerId_idx" ON "FavoriteItem"("customerId");

-- CreateIndex
CREATE INDEX "FavoriteItem_menuItemId_idx" ON "FavoriteItem"("menuItemId");

-- CreateIndex
CREATE INDEX "FavoriteItem_tenantId_idx" ON "FavoriteItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteItem_customerId_menuItemId_key" ON "FavoriteItem"("customerId", "menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_customerId_key" ON "NotificationPreference"("customerId");

-- CreateIndex
CREATE INDEX "NotificationPreference_tenantId_idx" ON "NotificationPreference"("tenantId");

-- CreateIndex
CREATE INDEX "SpinWheelConfig_tenantId_idx" ON "SpinWheelConfig"("tenantId");

-- CreateIndex
CREATE INDEX "SpinAttempt_customerId_createdAt_idx" ON "SpinAttempt"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "SpinAttempt_tenantId_idx" ON "SpinAttempt"("tenantId");

-- CreateIndex
CREATE INDEX "Achievement_tenantId_idx" ON "Achievement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_tenantId_key_key" ON "Achievement"("tenantId", "key");

-- CreateIndex
CREATE INDEX "CustomerAchievement_customerId_idx" ON "CustomerAchievement"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAchievement_tenantId_idx" ON "CustomerAchievement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAchievement_customerId_achievementId_key" ON "CustomerAchievement"("customerId", "achievementId");

-- CreateIndex
CREATE INDEX "ScratchReward_customerId_scratchedAt_idx" ON "ScratchReward"("customerId", "scratchedAt");

-- CreateIndex
CREATE INDEX "ScratchReward_tenantId_idx" ON "ScratchReward"("tenantId");

-- CreateIndex
CREATE INDEX "MysteryBoxConfig_tenantId_idx" ON "MysteryBoxConfig"("tenantId");

-- CreateIndex
CREATE INDEX "MysteryBoxOpen_customerId_createdAt_idx" ON "MysteryBoxOpen"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "MysteryBoxOpen_tenantId_idx" ON "MysteryBoxOpen"("tenantId");

-- CreateIndex
CREATE INDEX "BuilderBase_tenantId_idx" ON "BuilderBase"("tenantId");

-- CreateIndex
CREATE INDEX "BuilderIngredient_type_category_isActive_idx" ON "BuilderIngredient"("type", "category", "isActive");

-- CreateIndex
CREATE INDEX "BuilderIngredient_tenantId_idx" ON "BuilderIngredient"("tenantId");

-- CreateIndex
CREATE INDEX "CourierLocation_courierId_createdAt_idx" ON "CourierLocation"("courierId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CourierLocation_createdAt_idx" ON "CourierLocation"("createdAt");

-- CreateIndex
CREATE INDEX "CourierLocation_tenantId_idx" ON "CourierLocation"("tenantId");

-- CreateIndex
CREATE INDEX "SavedBuilderDesign_customerId_createdAt_idx" ON "SavedBuilderDesign"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SavedBuilderDesign_tenantId_idx" ON "SavedBuilderDesign"("tenantId");

-- CreateIndex
CREATE INDEX "PizzaGameScore_score_idx" ON "PizzaGameScore"("score");

-- CreateIndex
CREATE INDEX "PizzaGameScore_tenantId_idx" ON "PizzaGameScore"("tenantId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoredCard" ADD CONSTRAINT "StoredCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_mergedWithId_fkey" FOREIGN KEY ("mergedWithId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemLocation" ADD CONSTRAINT "MenuItemLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemLocation" ADD CONSTRAINT "MenuItemLocation_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemLocation" ADD CONSTRAINT "MenuItemLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemUpsell" ADD CONSTRAINT "MenuItemUpsell_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemUpsell" ADD CONSTRAINT "MenuItemUpsell_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemUpsell" ADD CONSTRAINT "MenuItemUpsell_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCrossSell" ADD CONSTRAINT "MenuItemCrossSell_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCrossSell" ADD CONSTRAINT "MenuItemCrossSell_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemCrossSell" ADD CONSTRAINT "MenuItemCrossSell_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHour" ADD CONSTRAINT "HappyHour_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHour" ADD CONSTRAINT "HappyHour_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHour" ADD CONSTRAINT "HappyHour_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourItem" ADD CONSTRAINT "HappyHourItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourItem" ADD CONSTRAINT "HappyHourItem_happyHourId_fkey" FOREIGN KEY ("happyHourId") REFERENCES "HappyHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourItem" ADD CONSTRAINT "HappyHourItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_loyaltyTierId_fkey" FOREIGN KEY ("loyaltyTierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleDeal" ADD CONSTRAINT "BundleDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleDeal" ADD CONSTRAINT "BundleDeal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOptionGroup" ADD CONSTRAINT "BundleOptionGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOptionGroup" ADD CONSTRAINT "BundleOptionGroup_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupItem" ADD CONSTRAINT "OptionGroupItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupItem" ADD CONSTRAINT "OptionGroupItem_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionGroupItem" ADD CONSTRAINT "OptionGroupItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOptionGroupAssignment" ADD CONSTRAINT "BundleOptionGroupAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOptionGroupAssignment" ADD CONSTRAINT "BundleOptionGroupAssignment_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleOptionGroupAssignment" ADD CONSTRAINT "BundleOptionGroupAssignment_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BundleDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationPartner" ADD CONSTRAINT "IntegrationPartner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationPartner" ADD CONSTRAINT "IntegrationPartner_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "IntegrationPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyClaim" ADD CONSTRAINT "LoyaltyClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyClaim" ADD CONSTRAINT "LoyaltyClaim_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyClaim" ADD CONSTRAINT "LoyaltyClaim_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyProgress" ADD CONSTRAINT "CustomerLoyaltyProgress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyProgress" ADD CONSTRAINT "CustomerLoyaltyProgress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyProgress" ADD CONSTRAINT "CustomerLoyaltyProgress_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinWheelConfig" ADD CONSTRAINT "SpinWheelConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinAttempt" ADD CONSTRAINT "SpinAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinAttempt" ADD CONSTRAINT "SpinAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinAttempt" ADD CONSTRAINT "SpinAttempt_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SpinWheelConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinAttempt" ADD CONSTRAINT "SpinAttempt_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAchievement" ADD CONSTRAINT "CustomerAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAchievement" ADD CONSTRAINT "CustomerAchievement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAchievement" ADD CONSTRAINT "CustomerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScratchReward" ADD CONSTRAINT "ScratchReward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScratchReward" ADD CONSTRAINT "ScratchReward_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScratchReward" ADD CONSTRAINT "ScratchReward_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBoxConfig" ADD CONSTRAINT "MysteryBoxConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBoxOpen" ADD CONSTRAINT "MysteryBoxOpen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBoxOpen" ADD CONSTRAINT "MysteryBoxOpen_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBoxOpen" ADD CONSTRAINT "MysteryBoxOpen_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MysteryBoxConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MysteryBoxOpen" ADD CONSTRAINT "MysteryBoxOpen_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderBase" ADD CONSTRAINT "BuilderBase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderIngredient" ADD CONSTRAINT "BuilderIngredient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLocation" ADD CONSTRAINT "CourierLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierLocation" ADD CONSTRAINT "CourierLocation_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuilderDesign" ADD CONSTRAINT "SavedBuilderDesign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedBuilderDesign" ADD CONSTRAINT "SavedBuilderDesign_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PizzaGameScore" ADD CONSTRAINT "PizzaGameScore_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
