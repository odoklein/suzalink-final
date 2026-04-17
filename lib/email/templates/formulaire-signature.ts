interface FormulaireSignatureEmailData {
  title: string;
  prospectName: string;
  missionName?: string | null;
  signUrl: string;
}

export function buildFormulaireSignatureEmail(data: FormulaireSignatureEmailData): {
  subject: string;
  html: string;
} {
  const subject = `Signature demandee - ${data.title}`;
  const missionLine = data.missionName
    ? `<p style="margin: 0 0 10px; color: #475569; font-size: 14px;">Mission: <strong>${data.missionName}</strong></p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;padding:20px 24px;">
              <h1 style="margin:0;color:#fff;font-size:20px;">Formulaire a signer</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;color:#1e293b;font-size:15px;">Bonjour ${data.prospectName},</p>
              <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
                Nous vous envoyons le formulaire <strong>${data.title}</strong>. Merci de le verifier puis le signer en cliquant sur le bouton ci-dessous.
              </p>
              ${missionLine}
              <p style="margin:22px 0;">
                <a href="${data.signUrl}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;">
                  Ouvrir et signer le formulaire
                </a>
              </p>
              <p style="margin:0;color:#64748b;font-size:12px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:
              </p>
              <p style="margin:8px 0 0;color:#334155;font-size:12px;word-break:break-all;">${data.signUrl}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
