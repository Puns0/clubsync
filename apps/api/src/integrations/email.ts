/**
 * STUB: Replaced by Part 2
 * Signature to keep:
 * sendEmail({ to, template, data }) -> Promise<void>
 */
export async function sendEmail(params: { to: string; template: string; data: any }): Promise<void> {
  console.log(`[Email Stub] Sending email to ${params.to} using template '${params.template}'`);
  console.log(`[Email Stub] Data:`, JSON.stringify(params.data, null, 2));
}
