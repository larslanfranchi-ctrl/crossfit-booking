// Mail-Versand über die Resend-REST-API. Bewusst ohne SDK: ein einziger
// POST-Aufruf, dafür keine weitere Abhängigkeit im Function-Bundle.
//
// Zwei Umgebungsvariablen, beide serverseitig (kein NEXT_PUBLIC_):
//   RESEND_API_KEY - der API-Key aus dem Resend-Dashboard
//   MAIL_FROM      - Absender, z.B. 'Lionsoul Performance <kurse@example.ch>'
//                    Die Domain muss in Resend verifiziert sein; zum Testen
//                    funktioniert onboarding@resend.dev.
//
// sendMail wirft nie. Ein fehlgeschlagener Versand darf die auslösende Aktion
// (z.B. eine Buchung) nicht rückgängig machen - die Aufrufer melden den Grund
// stattdessen als Hinweis zurück.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Harte Obergrenze, damit eine hängende Mail-API nicht die Server Action
// blockiert, die auf sie wartet.
const TIMEOUT_MS = 10_000;

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type MailResult = { sent: true } | { sent: false; reason: string };

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      reason:
        "Mail-Versand ist nicht konfiguriert (RESEND_API_KEY und MAIL_FROM fehlen).",
    };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Resend antwortet bei Fehlern mit JSON ({ name, message }); der
      // Rohtext ist hier aussagekräftig genug und kann nicht selbst wieder
      // fehlschlagen.
      const body = await response.text();
      return {
        sent: false,
        reason: `Resend antwortete mit ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      reason:
        e instanceof Error
          ? `Mail-Versand fehlgeschlagen: ${e.message}`
          : "Mail-Versand fehlgeschlagen.",
    };
  }
}
