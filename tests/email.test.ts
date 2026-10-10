import { describe, it, expect, vi, afterEach } from "vitest";
import type { Transporter } from "nodemailer";
import {
  emailBackend,
  trackUrl,
  sendSubmissionReceived,
  sendAdminNewSubmission,
  sendAll,
  type EmailSubmission,
} from "@/lib/services/email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const stubConsoleBackend = () => {
  vi.stubEnv("SMTP_HOST", "");
  vi.stubEnv("SMTP_PORT", "");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASS", "");
  vi.stubEnv("SMTP_FROM", "");
  vi.stubEnv("ADMIN_EMAIL", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
};

const sub: EmailSubmission = {
  trackingId: "QAD-ABC123",
  appNameEn: "Test App",
  appNameAr: "تطبيق تجريبي",
  submitterName: "Ahmed",
  submitterEmail: "ahmed@test.dev",
};

describe("emailBackend", () => {
  it("is console when SMTP vars are unset", () => {
    stubConsoleBackend();
    expect(emailBackend()).toBe("console");
  });

  it("flips to smtp once SMTP_HOST is set", () => {
    stubConsoleBackend();
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    expect(emailBackend()).toBe("smtp");
  });
});

describe("trackUrl", () => {
  it("pins the /en prefix and appends the id", () => {
    stubConsoleBackend();
    expect(trackUrl("QAD-ABC123")).toBe(
      "http://localhost:3000/en/track-submission?id=QAD-ABC123",
    );
  });
});

describe("console backend", () => {
  it("logs the header line and the bilingual body", async () => {
    stubConsoleBackend();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendSubmissionReceived(sub);

    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain(
      "[email:console to=ahmed@test.dev] subject=Submission Received: Test App (QAD-ABC123)",
    );
    expect(out).toContain("السلام عليكم Ahmed");
  });
});

describe("sendAll with an injected transport", () => {
  it("sends the submission received email through the transport", async () => {
    stubConsoleBackend();
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    const sendMail = vi.fn().mockResolvedValue({});
    const transport = { sendMail } as unknown as Transporter;

    await sendAll(
      { ...sub, trackingId: "QAD-XYZ789", appNameEn: "App Two", submitterEmail: "dev@mail.dev" },
      transport,
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(mail.to).toBe("dev@mail.dev");
    expect(mail.subject).toBe("Submission Received: App Two (QAD-XYZ789)");
    expect(mail.html).toContain("السلام عليكم Ahmed");
    expect(mail.html).toContain("QAD-XYZ789");
  });
});

describe("sendAdminNewSubmission", () => {
  it("is a no-op when ADMIN_EMAIL is unset", async () => {
    stubConsoleBackend();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendAdminNewSubmission(sub);
    expect(log).not.toHaveBeenCalled();
  });

  it("links the review URL to submissionId when set", async () => {
    stubConsoleBackend();
    vi.stubEnv("ADMIN_EMAIL", "admin@itqan.dev");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendAdminNewSubmission({ ...sub, submissionId: 42 });
    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain("http://localhost:3000/admin/submissions/42");
  });

  it("renders no submission link when submissionId is unset, even with createdAppId", async () => {
    stubConsoleBackend();
    vi.stubEnv("ADMIN_EMAIL", "admin@itqan.dev");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendAdminNewSubmission({ ...sub, createdAppId: 99, createdAppSlug: "some-app" });
    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).not.toContain("/admin/submissions/");
    expect(out).not.toContain("/en/app/some_app_99");
    expect(out).not.toContain("Review in Admin Panel");
    expect(out).toContain("View Public Tracking");
  });
});
