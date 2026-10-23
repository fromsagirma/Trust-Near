import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/submit_review_provider.dart';
import '../widgets/review_form.dart';

class WriteReviewScreen extends ConsumerStatefulWidget {
  final String businessId;
  final String businessName;

  const WriteReviewScreen({
    super.key,
    required this.businessId,
    required this.businessName,
  });

  @override
  ConsumerState<WriteReviewScreen> createState() => _WriteReviewScreenState();
}

class _WriteReviewScreenState extends ConsumerState<WriteReviewScreen> {
  int _rating = 5;
  final _commentController = TextEditingController();

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  void _submitReview() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await ref.read(submitReviewProvider.notifier).submitReview(
          businessId: widget.businessId,
          rating: _rating,
          comment: _commentController.text.trim().isNotEmpty
              ? _commentController.text.trim()
              : null,
        );

    if (mounted) {
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Review submitted successfully! Thank you for your feedback.'),
            backgroundColor: Color(0xFF07945E),
            duration: Duration(seconds: 3),
          ),
        );
        navigator.pop();
      } else {
        final err = ref.read(submitReviewProvider).errorMessage;
        messenger.showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to submit review'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(submitReviewProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        title: Text('Rate ${widget.businessName}', style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF172033))),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF172033)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ReviewForm(
                rating: _rating,
                onRatingChanged: (val) => setState(() => _rating = val),
                commentController: _commentController,
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: state.isLoading ? null : _submitReview,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5547E8),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: state.isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Submit Review',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

