-- AlterTable
ALTER TABLE "Achievement" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Address" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BillingTransaction" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BuilderBase" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BuilderIngredient" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BundleDeal" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BundleItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BundleOptionGroup" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "BundleOptionGroupAssignment" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CouponUsage" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CourierLocation" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CustomerAchievement" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CustomerLoyaltyProgress" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "CustomerOrder" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "DailyReport" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "DeviceToken" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "ExpenseCategory" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "FavoriteItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "HappyHour" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "HappyHourItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "IntegrationPartner" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "LoyaltyClaim" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "LoyaltyProgram" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "LoyaltyTier" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MenuItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MenuItemCrossSell" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MenuItemIngredient" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MenuItemLocation" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MenuItemUpsell" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Modifier" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MysteryBoxConfig" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "MysteryBoxOpen" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "OptionGroup" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "OptionGroupItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "PizzaGameScore" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "PointsTransaction" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "PrintJob" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Printer" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "PushNotification" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "RawMaterial" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "SavedBuilderDesign" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "ScratchReward" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Settings" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "SpinAttempt" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "SpinWheelConfig" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "StoredCard" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Table" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "WebhookLog" ALTER COLUMN "tenantId" SET DEFAULT '';

-- AlterTable
ALTER TABLE "WhatsAppMessage" ALTER COLUMN "tenantId" SET DEFAULT '';

-- 3. katman koruma: extension damgalamayı atlarsa placeholder DB tarafından reddedilir
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "StoredCard" ADD CONSTRAINT "StoredCard_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Table" ADD CONSTRAINT "Table_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MenuItemLocation" ADD CONSTRAINT "MenuItemLocation_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MenuItemUpsell" ADD CONSTRAINT "MenuItemUpsell_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MenuItemCrossSell" ADD CONSTRAINT "MenuItemCrossSell_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "RawMaterial" ADD CONSTRAINT "RawMaterial_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "HappyHour" ADD CONSTRAINT "HappyHour_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "HappyHourItem" ADD CONSTRAINT "HappyHourItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BundleDeal" ADD CONSTRAINT "BundleDeal_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BundleOptionGroup" ADD CONSTRAINT "BundleOptionGroup_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "OptionGroupItem" ADD CONSTRAINT "OptionGroupItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BundleOptionGroupAssignment" ADD CONSTRAINT "BundleOptionGroupAssignment_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "IntegrationPartner" ADD CONSTRAINT "IntegrationPartner_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "LoyaltyClaim" ADD CONSTRAINT "LoyaltyClaim_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "CustomerLoyaltyProgress" ADD CONSTRAINT "CustomerLoyaltyProgress_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "FavoriteItem" ADD CONSTRAINT "FavoriteItem_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "SpinWheelConfig" ADD CONSTRAINT "SpinWheelConfig_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "SpinAttempt" ADD CONSTRAINT "SpinAttempt_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "CustomerAchievement" ADD CONSTRAINT "CustomerAchievement_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "ScratchReward" ADD CONSTRAINT "ScratchReward_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MysteryBoxConfig" ADD CONSTRAINT "MysteryBoxConfig_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "MysteryBoxOpen" ADD CONSTRAINT "MysteryBoxOpen_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BuilderBase" ADD CONSTRAINT "BuilderBase_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "BuilderIngredient" ADD CONSTRAINT "BuilderIngredient_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "CourierLocation" ADD CONSTRAINT "CourierLocation_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "SavedBuilderDesign" ADD CONSTRAINT "SavedBuilderDesign_tenantId_not_placeholder" CHECK ("tenantId" <> '');
ALTER TABLE "PizzaGameScore" ADD CONSTRAINT "PizzaGameScore_tenantId_not_placeholder" CHECK ("tenantId" <> '');
