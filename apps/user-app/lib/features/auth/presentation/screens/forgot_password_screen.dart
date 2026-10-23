import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../widgets/trustnear_logo.dart';
import 'reset_password_screen.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final emailController = TextEditingController();
  bool sent = false;
  bool isLoading = false;
  String submittedIdentifier = '';

  @override
  void dispose() {
    emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF172033)),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(28, 10, 28, 30),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const TrustNearLogo(size: 34),
              const SizedBox(height: 35),
              if (!sent) ...[
                Text(
                  'Forgot your password?',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF071B3A),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  "Enter the email address or phone number associated with your TrustNear account to request a password reset.",
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    height: 1.5,
                    color: const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 30),
                Text(
                  'Email or Phone Number',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 9),
                TextField(
                  controller: emailController,
                  decoration: InputDecoration(
                    hintText: 'you@example.com or +251 91...',
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                    contentPadding: const EdgeInsets.all(18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                const SizedBox(height: 25),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: isLoading
                        ? null
                        : () async {
                            final identifier = emailController.text.trim();
                            if (identifier.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please enter your email or phone')),
                              );
                              return;
                            }
                            setState(() => isLoading = true);
                            try {
                              await ref
                                  .read(authApiServiceProvider)
                                  .forgotPassword(identifier);
                              if (!context.mounted) return;
                              setState(() {
                                submittedIdentifier = identifier;
                                sent = true;
                                isLoading = false;
                              });
                            } catch (e) {
                              if (!context.mounted) return;
                              setState(() => isLoading = false);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    e.toString().replaceAll('Exception: ', ''),
                                  ),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Request Password Reset', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                  child: TextButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ResetPasswordScreen()),
                      );
                    },
                    child: const Text(
                      'Already have a reset token? Click here',
                      style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ] else ...[
                const Center(
                  child: Icon(
                    Icons.mark_email_read_outlined,
                    size: 80,
                    color: Color(0xFF4F46E5),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    'Reset Request Recorded',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF071B3A),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  "Password reset instructions have been initiated for \"$submittedIdentifier\".",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    height: 1.5,
                    color: const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF0FF),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF5547E8).withValues(alpha: 0.2)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline_rounded, color: Color(0xFF5547E8), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Note: External email/SMS transport service is not yet active on the backend. Reset tokens are generated and printed on the backend server console log for testing.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF172033), height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ResetPasswordScreen(),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Enter Reset Token & Set Password',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() => sent = false),
                    child: const Text('Back to Forgot Password', style: TextStyle(color: Colors.grey)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

