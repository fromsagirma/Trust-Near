import 'package:flutter/material.dart';

class ReviewForm extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onRatingChanged;
  final TextEditingController commentController;

  const ReviewForm({
    super.key,
    required this.rating,
    required this.onRatingChanged,
    required this.commentController,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Your Rating',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(5, (index) {
            final starNumber = index + 1;
            return IconButton(
              iconSize: 36,
              icon: Icon(
                starNumber <= rating ? Icons.star : Icons.star_border,
                color: const Color(0xFFFFA000),
              ),
              onPressed: () => onRatingChanged(starNumber),
            );
          }),
        ),
        const SizedBox(height: 20),
        const Text(
          'Your Review',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: commentController,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Share your experience (e.g. food quality, service, location landmark clarity)...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
}
