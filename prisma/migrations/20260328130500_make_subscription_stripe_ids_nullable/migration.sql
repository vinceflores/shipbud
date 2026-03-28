-- Make Stripe identifiers nullable for app-managed trials

ALTER TABLE "Subscription" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "stripeSubId" DROP NOT NULL;
