import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../widgets/trustnear_logo.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';
import '../../../../main.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  bool obscurePassword = true;

  void _showRoleRestrictedDialog(String message) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Row(
            children: [
              Icon(Icons.shield_outlined, color: Color(0xFFE11D48), size: 28),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Access Restricted',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                ),
              ),
            ],
          ),
          content: Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              height: 1.45,
              color: Color(0xFF334155),
            ),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF071B3A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Understand'),
            ),
          ],
        );
      },
    );
  }

  InputDecoration decoration(String hint, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.plusJakartaSans(color: const Color(0xFF9CA3AF)),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFFE0E3E8)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.status == AuthStatus.authenticated) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const AuthChecker()),
          (route) => false,
        );
      } else if (next.status == AuthStatus.unauthenticated &&
          next.errorMessage != null) {
        if (next.errorMessage!.contains('Business Owner') ||
            next.errorMessage!.contains('Administrative') ||
            next.errorMessage!.contains('Access denied')) {
          _showRoleRestrictedDialog(next.errorMessage!);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(next.errorMessage!),
              backgroundColor: Colors.red.shade400,
            ),
          );
        }
      }
    });

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

              const SizedBox(height: 30),

              Text(
                'Welcome back',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF071B3A),
                ),
              ),

              const SizedBox(height: 8),

              Text(
                'Sign in to discover trusted places near you.',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  color: const Color(0xFF64748B),
                ),
              ),

              const SizedBox(height: 42),

              _label('Email address or Phone'),

              const SizedBox(height: 9),

              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: decoration('you@example.com or +251...'),
              ),

              const SizedBox(height: 24),

              _label('Password'),

              const SizedBox(height: 9),

              TextField(
                controller: passwordController,
                obscureText: obscurePassword,
                decoration: decoration(
                  'Enter your password',
                  suffix: IconButton(
                    onPressed: () {
                      setState(() {
                        obscurePassword = !obscurePassword;
                      });
                    },
                    icon: Icon(
                      obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ),

              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    );
                  },
                  child: Text(
                    'Forgot password?',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF4F46E5),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 14),

              SizedBox(
                width: double.infinity,
                height: 64,
                child: ElevatedButton(
                  onPressed: authState.status == AuthStatus.loading
                      ? null
                      : () {
                          final email = emailController.text.trim();
                          final password = passwordController.text;
                          if (email.isEmpty || password.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Please enter email/phone and password',
                                ),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }
                          ref
                              .read(authProvider.notifier)
                              .login(email, password);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: authState.status == AuthStatus.loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          'Sign in',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 30),

              Center(
                child: Text.rich(
                  TextSpan(
                    text: "Don't have an account? ",
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF64748B),
                    ),
                    children: [
                      WidgetSpan(
                        child: GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => const RegisterScreen(),
                              ),
                            );
                          },
                          child: Text(
                            'Create one',
                            style: GoogleFonts.plusJakartaSans(
                              color: const Color(0xFF4F46E5),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 22),

              Center(
                child: Column(
                  children: [
                    const SizedBox(height: 2),
                    TextButton.icon(
                      onPressed: () {
                        ref.read(authProvider.notifier).loginDemoUser();
                      },
                      icon: const Icon(
                        Icons.explore_outlined,
                        size: 16,
                        color: Color(0xFF4F46E5),
                      ),
                      label: Text(
                        'Explore in Offline Demo Mode',
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.bold,
                          color: const Color.fromARGB(255, 8, 211, 31),
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) {
    return Text(
      text,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: const Color(0xFF334155),
      ),
    );
  }

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }
}
