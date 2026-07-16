import {
  alertAnalystApplication,
  alertCreatorPaypalOnboarded,
  alertCronResult,
  alertCustomerContact,
  alertNewSignup,
  alertPaypalWebhookError,
  alertReportPurchase,
  alertReportPublished,
} from "./alerts";
import type { SlackChannel } from "./channels";

export type AlertTestResult = {
  id: string;
  label: string;
  channel: SlackChannel;
  ok: boolean;
};

const TEST_PREFIX = "[TEST] ";
const force = { forceImmediate: true as const };

async function runTest(
  id: string,
  label: string,
  channel: SlackChannel,
  fn: () => Promise<void>,
): Promise<AlertTestResult> {
  try {
    await fn();
    return { id, label, channel, ok: true };
  } catch {
    return { id, label, channel, ok: false };
  }
}

export async function runAllAlertTests(): Promise<AlertTestResult[]> {
  const now = new Date().toISOString();

  return Promise.all([
    runTest("contact", "Customer contact", "support", () =>
      alertCustomerContact(
        {
          id: "test-contact-id",
          name: `${TEST_PREFIX}Jane Investor`,
          email: "test@stoamarket.ai",
          topic: "general",
          subject: `${TEST_PREFIX}Integration smoke test`,
          message: "This is a test contact alert from /admin/integrations.",
          submittedAt: now,
        },
        force,
      ),
    ),
    runTest("analyst-application", "Analyst application", "customers-ops", () =>
      alertAnalystApplication(
        {
          applicationId: "test-app-id",
          displayName: `${TEST_PREFIX}Demo Analyst`,
          handle: "demo_analyst_test",
          coverageAreas: "Semiconductors, AI infrastructure",
        },
        force,
      ),
    ),
    runTest("report-purchase", "Report purchase", "revenue", () =>
      alertReportPurchase(
        {
          reportId: "test-report-id",
          reportTitle: `${TEST_PREFIX}Sample research report`,
          analystName: "Marcus Webb",
          analystHandle: "marcus_webb",
          grossCents: 2500,
          platformFeeCents: 250,
          netCents: 2250,
          providerTransferId: "TEST-PAYPAL-CAPTURE",
        },
        force,
      ),
    ),
    runTest("paypal-onboarded", "Creator PayPal connected", "revenue", () =>
      alertCreatorPaypalOnboarded(
        {
          displayName: `${TEST_PREFIX}Demo Analyst`,
          handle: "demo_analyst_test",
          paymentsReceivable: true,
          emailConfirmed: true,
        },
        force,
      ),
    ),
    runTest("signup", "New signup", "marketing", () =>
      alertNewSignup(
        {
          userId: "test-user-id",
          email: "newuser@stoamarket.ai",
          displayName: `${TEST_PREFIX}New Investor`,
          handle: "new_investor_test",
        },
        force,
      ),
    ),
    runTest("publish", "Report published", "marketing", () =>
      alertReportPublished(
        {
          reportId: "test-report-id",
          title: `${TEST_PREFIX}First locked call on NVDA`,
          type: "research",
          ticker: "NVDA",
          analystName: "Priya Raman",
          analystHandle: "priya_raman",
          isFirstPublish: true,
        },
        force,
      ),
    ),
    runTest("cron-failure", "Cron failure", "bugs", () =>
      alertCronResult({
        job: `${TEST_PREFIX}grade`,
        ok: false,
        error: "Simulated cron failure for integration testing.",
      }),
    ),
    runTest("paypal-webhook", "PayPal webhook error", "bugs", () =>
      alertPaypalWebhookError({
        eventType: "PAYMENT.CAPTURE.COMPLETED",
        eventId: "TEST-EVENT-ID",
        error: "Simulated webhook handler failure.",
      }),
    ),
    runTest("cron-success", "Cron success", "ops", () =>
      alertCronResult({
        job: `${TEST_PREFIX}grade`,
        ok: true,
        summary: { graded: 0, skipped: 0, test: true },
      }),
    ),
  ]);
}
