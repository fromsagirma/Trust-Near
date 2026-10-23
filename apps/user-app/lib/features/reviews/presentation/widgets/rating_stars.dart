import 'package:flutter/material.dart';

class RatingStars extends StatelessWidget {
  final int rating;
  final double size;
  final Color activeColor;

  const RatingStars({
    super.key,
    required this.rating,
    this.size = 18.0,
    this.activeColor = const Color(0xFFFFA000),
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (index) {
        return Icon(
          index < rating ? Icons.star : Icons.star_border,
          color: activeColor,
          size: size,
        );
      }),
    );
  }
}
