import 'package:flutter/material.dart';

class TrustNearLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final bool darkText;
  final Color primaryColor;

  const TrustNearLogo({
    super.key,
    this.size = 40,
    this.showText = true,
    this.darkText = false,
    this.primaryColor = const Color.fromARGB(255, 10, 234, 43),
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomPaint(
          size: Size(size, size),
          painter: _TrustNearLogoPainter(primaryColor: primaryColor),
        ),
        if (showText) ...[
          SizedBox(width: size * .25),
          RichText(
            text: TextSpan(
              style: TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: size * .52,
                fontWeight: FontWeight.w800,
              ),
              children: [
                TextSpan(
                  text: 'Trust',
                  style: TextStyle(
                    color: darkText ? Colors.white : const Color(0xFF111827),
                  ),
                ),
                TextSpan(
                  text: 'Near',
                  style: TextStyle(color: primaryColor),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _TrustNearLogoPainter extends CustomPainter {
  final Color primaryColor;

  _TrustNearLogoPainter({required this.primaryColor});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 48;

    canvas.save();
    canvas.scale(scale);

    final pinPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.fill;

    final pin = Path()
      ..moveTo(24, 4)
      ..cubicTo(16.27, 4, 10, 10.27, 10, 18)
      ..cubicTo(10, 27, 24, 44, 24, 44)
      ..cubicTo(24, 44, 38, 27, 38, 18)
      ..cubicTo(38, 10.27, 31.73, 4, 24, 4)
      ..close();

    canvas.drawPath(pin, pinPaint);

    final shieldPaint = Paint()..color = Colors.white;

    final shield = Path()
      ..moveTo(24, 10)
      ..lineTo(18, 13)
      ..lineTo(18, 19)
      ..cubicTo(18, 22.3, 20.7, 25, 24, 25)
      ..cubicTo(27.3, 25, 30, 22.3, 30, 19)
      ..lineTo(30, 13)
      ..close();

    canvas.drawPath(shield, shieldPaint);

    final checkPaint = Paint()
      ..color = primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final check = Path()
      ..moveTo(21, 19.5)
      ..lineTo(23, 21.5)
      ..lineTo(27.5, 16);

    canvas.drawPath(check, checkPaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _TrustNearLogoPainter oldDelegate) =>
      oldDelegate.primaryColor != primaryColor;
}
