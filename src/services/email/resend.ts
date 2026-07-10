import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.EMAIL_FROM_ADDRESS || "hello@kinetix.ai";

export class EmailService {
  /**
   * Send a standard transactional or outreach email
   */
  static async sendEmail(to: string | string[], subject: string, htmlContent: string) {
    try {
      const data = await resend.emails.send({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: htmlContent,
      });

      return data;
    } catch (error) {
      console.error("Resend Email Error:", error);
      throw error;
    }
  }
}
