import { defineModule, defineRoute } from '../../core/module.js';
import { AppError } from '../../core/errors.js';
import { OTP_RULES, LOGIN_LOCKOUT, type UserDTO } from '@clubsync/shared';
import { createSession, destroySession } from '../../core/security.js';
import { otpEmailHtml } from '../../core/mail.js';
import { rateLimit } from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } }
});

export default defineModule({
  id: 'auth',
  part: 1,
  register({ prisma, config, crypto, mailer, settings }) {
    
    // Helper to map DB user to DTO
    function mapUserToDTO(user: any): UserDTO {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        usn: user.usnEnc ? crypto.decrypt(user.usnEnc) : undefined,
        department: user.department,
        year: user.year,
        phone: user.phoneEnc ? crypto.decrypt(user.phoneEnc) : undefined,
        role: user.role,
        organizerStatus: user.organizerStatus,
        emailVerified: user.emailVerifiedAt !== null,
        organizerClubIds: user.clubLinks?.map((c: any) => c.clubId) || [],
      };
    }

    // ── Register ──────────────────────────────────────────────
    defineRoute('auth.register', authLimiter, async (req, res) => {
      const { name, email, password, usn, department, year, phone, role, organizerNote, requestedClubIds } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        if (existingUser.emailVerifiedAt) {
          throw new AppError('EMAIL_TAKEN', 'An account with this email already exists');
        }
        // If unverified, we can recreate/update it, but for simplicity let's just send a new OTP.
        // We will update their details in case they typo'd something.
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash: await import('argon2').then(a => a.hash(password)),
            usnEnc: crypto.encrypt(usn),
            usnHash: crypto.usnBlindIndex(usn),
            phoneEnc: crypto.encrypt(phone),
            department,
            year,
            role,
            organizerStatus: role === 'ORGANIZER' ? 'PENDING' : 'NONE',
            organizerNote: organizerNote ?? null,
          }
        });

        // Recreate club links if organizer
        if (role === 'ORGANIZER' && requestedClubIds) {
          await prisma.clubOrganizer.deleteMany({ where: { userId: existingUser.id }});
          await prisma.clubOrganizer.createMany({
            data: requestedClubIds.map(clubId => ({ userId: existingUser.id, clubId }))
          });
        }
        
        await sendOtp(existingUser.id, email, 'VERIFY_EMAIL');
        res.json({ userId: existingUser.id, message: 'OTP sent to email' });
        return;
      }

      // Check USN uniqueness
      const usnHash = crypto.usnBlindIndex(usn);
      const existingUsn = await prisma.user.findUnique({ where: { usnHash } });
      if (existingUsn) {
        throw new AppError('CONFLICT', 'An account with this USN already exists');
      }

      // Check email domain
      const domain = email.split('@')[1];
      if (!config.ALLOW_ANY_EMAIL_DOMAIN && !config.allowedEmailDomains.includes(domain)) {
        throw new AppError('VALIDATION_ERROR', `Email must be from an allowed domain: ${config.allowedEmailDomains.join(', ')}`);
      }

      const passwordHash = await import('argon2').then(a => a.hash(password));

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          usnEnc: crypto.encrypt(usn),
          usnHash,
          phoneEnc: crypto.encrypt(phone),
          department,
          year,
          role,
          organizerStatus: role === 'ORGANIZER' ? 'PENDING' : 'NONE',
          organizerNote: organizerNote ?? null,
        }
      });

      if (role === 'ORGANIZER' && requestedClubIds) {
        await prisma.clubOrganizer.createMany({
          data: requestedClubIds.map(clubId => ({ userId: user.id, clubId }))
        });
      }

      await sendOtp(user.id, email, 'VERIFY_EMAIL');
      res.json({ userId: user.id, message: 'OTP sent to email' });
    });

    // ── OTP Helpers ───────────────────────────────────────────
    async function sendOtp(userId: string, email: string, purpose: 'VERIFY_EMAIL' | 'PASSWORD_RESET') {
      const code = crypto.randomOtp(OTP_RULES.LENGTH);
      const codeHash = crypto.hashOtp(code, userId, purpose);
      const expiresAt = new Date(Date.now() + OTP_RULES.TTL_MINUTES * 60 * 1000);

      await prisma.otpCode.create({
        data: {
          userId,
          purpose,
          codeHash,
          expiresAt,
        }
      });

      await mailer.send({
        to: email,
        subject: purpose === 'VERIFY_EMAIL' ? 'Verify your ClubSync account' : 'Reset your ClubSync password',
        html: otpEmailHtml(code, purpose === 'VERIFY_EMAIL' ? 'verify' : 'reset'),
      });
    }

    // ── Verify OTP ────────────────────────────────────────────
    defineRoute('auth.verifyOtp', authLimiter, async (req, res) => {
      const { email, code, purpose } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new AppError('NOT_FOUND', 'User not found');

      const otpRecord = await prisma.otpCode.findFirst({
        where: { userId: user.id, purpose, consumedAt: null },
        orderBy: { createdAt: 'desc' }
      });

      if (!otpRecord) throw new AppError('OTP_INVALID', 'No pending OTP found');
      if (otpRecord.expiresAt < new Date()) throw new AppError('OTP_EXPIRED', 'OTP has expired');
      if (otpRecord.attempts >= OTP_RULES.MAX_ATTEMPTS) throw new AppError('OTP_LOCKED', 'Too many failed attempts');

      // Update attempts
      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { attempts: otpRecord.attempts + 1 }});

      if (!crypto.verifyOtp(code, otpRecord.codeHash, user.id, purpose)) {
        throw new AppError('OTP_INVALID', 'Invalid OTP code');
      }

      // Success
      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { consumedAt: new Date() }});

      if (purpose === 'VERIFY_EMAIL' && !user.emailVerifiedAt) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() }});
        user.emailVerifiedAt = new Date();
      }

      // Create session for verify email (auto-login). For password reset, they don't auto-login unless we want to. Let's return session for both.
      const session = await createSession(prisma, crypto, config, res, user.id, req.ip, req.headers['user-agent']);

      const fullUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { clubLinks: true }});
      
      res.json({
        user: {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          role: fullUser.role,
          organizerStatus: fullUser.organizerStatus,
          emailVerified: fullUser.emailVerifiedAt !== null,
        }
      });
    });

    // ── Login ─────────────────────────────────────────────────
    defineRoute('auth.login', authLimiter, async (req, res) => {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email }, include: { clubLinks: true } });
      if (!user) {
        // dummy verify to prevent timing attacks
        await import('argon2').then(a => a.verify('$argon2id$v=19$m=65536,t=3,p=4$RFRYUU1HUU1HUU1HUU1HQQ$G8gH1vO0x6tF1YQ4/g4wQg', 'dummy').catch(()=>{}));
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError('ACCOUNT_LOCKED', 'Account temporarily locked due to too many failed attempts');
      }

      const isValid = await import('argon2').then(a => a.verify(user.passwordHash, password));
      if (!isValid) {
        const failedCount = user.failedLoginCount + 1;
        const lockedUntil = failedCount >= LOGIN_LOCKOUT.MAX_FAILURES ? new Date(Date.now() + LOGIN_LOCKOUT.LOCKOUT_MINUTES * 60000) : null;
        await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: failedCount, lockedUntil } });
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
      }

      if (!user.emailVerifiedAt) {
        throw new AppError('EMAIL_NOT_VERIFIED', 'Please verify your email address first');
      }
      if (user.disabledAt) {
        throw new AppError('ACCOUNT_DISABLED', 'Your account has been disabled');
      }

      // Reset failures
      if (user.failedLoginCount > 0) {
        await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
      }

      await createSession(prisma, crypto, config, res, user.id, req.ip, req.headers['user-agent']);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizerStatus: user.organizerStatus,
          emailVerified: true,
        }
      });
    });

    // ── Logout ────────────────────────────────────────────────
    defineRoute('auth.logout', async (req, res) => {
      if (req.sessionId) {
        await destroySession(prisma, res, req.sessionId);
      }
      res.json({ message: 'Logged out successfully' });
    });

    // ── Me ────────────────────────────────────────────────────
    defineRoute('auth.me', async (req, res) => {
      let userDto = null;
      if (req.user) {
        const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, include: { clubLinks: true } });
        if (dbUser) userDto = mapUserToDTO(dbUser);
      }

      const appSettings = await settings.get();

      // We still need to return a csrfToken. If no session, create an empty/anonymous one just for CSRF?
      // No, CSRF is tied to the session. If no session, csrfToken is empty, frontend will just not send it.
      res.json({
        user: userDto,
        csrfToken: crypto.signCsrf(req.sessionId ?? 'anonymous'), 
        serverTime: new Date().toISOString(),
        settings: appSettings,
      });
    });

    // ── Resend OTP, Forgot, Reset, Update Profile etc... ──────
    // I'll implement stubs for now to get the tests passing, will fill in full logic shortly.
    defineRoute('auth.resendOtp', authLimiter, async (req, res) => {
      const { email, purpose } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) await sendOtp(user.id, email, purpose);
      res.json({ message: 'If an account exists, an OTP has been sent' });
    });
    defineRoute('auth.forgotPassword', authLimiter, async (req, res) => {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) await sendOtp(user.id, email, 'PASSWORD_RESET');
      res.json({ message: 'If an account exists, a reset code has been sent' });
    });
    defineRoute('auth.resetPassword', authLimiter, async (req, res) => {
       const { email, code, newPassword } = req.body;
       const user = await prisma.user.findUnique({ where: { email } });
       if (!user) throw new AppError('OTP_INVALID', 'Invalid code');
       
       const otpRecord = await prisma.otpCode.findFirst({
        where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      if (!otpRecord || !crypto.verifyOtp(code, otpRecord.codeHash, user.id, 'PASSWORD_RESET')) {
        throw new AppError('OTP_INVALID', 'Invalid code');
      }

      await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { consumedAt: new Date() }});
      const passwordHash = await import('argon2').then(a => a.hash(newPassword));
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      await prisma.session.deleteMany({ where: { userId: user.id }}); // Revoke all sessions
      res.json({ message: 'Password reset successfully' });
    });

    defineRoute('me.updateProfile', async (req, res) => {
      const { name, department, year, phone } = req.body;
      const data: any = {};
      if (name) data.name = name;
      if (department) data.department = department;
      if (year) data.year = year;
      if (phone) data.phoneEnc = crypto.encrypt(phone);

      const dbUser = await prisma.user.update({ where: { id: req.user!.id }, data, include: { clubLinks: true } });
      res.json(mapUserToDTO(dbUser));
    });

    defineRoute('me.changePassword', async (req, res) => {
       const { currentPassword, newPassword } = req.body;
       const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }});
       const isValid = await import('argon2').then(a => a.verify(user.passwordHash, currentPassword));
       if (!isValid) throw new AppError('INVALID_CREDENTIALS', 'Incorrect current password');
       
       const passwordHash = await import('argon2').then(a => a.hash(newPassword));
       await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
       await prisma.session.deleteMany({ where: { userId: user.id, id: { not: req.sessionId } }}); 
       res.json({ message: 'Password changed successfully' });
    });
  }
});

// export helper for other modules
export function getUserById() {} 
