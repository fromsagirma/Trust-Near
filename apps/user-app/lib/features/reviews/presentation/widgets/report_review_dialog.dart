import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/submit_review_provider.dart';

class ReportReviewDialog extends ConsumerStatefulWidget {
  final String reviewId;

  const ReportReviewDialog({super.key, required this.reviewId});

  @override
  ConsumerState<ReportReviewDialog> createState() => _ReportReviewDialogState();
}

class _ReportReviewDialogState extends ConsumerState<ReportReviewDialog> {
  final _reasonController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  void _submitReport() async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) return;

    setState(() => _isSubmitting = true);

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await ref.read(submitReviewProvider.notifier).reportReview(
          reviewId: widget.reviewId,
          reason: reason,
        );

    if (mounted) {
      navigator.pop();
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Report submitted. Thank you for helping keep TrustNear safe!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Failed to submit report. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: const Text('Report Review', style: TextStyle(fontWeight: FontWeight.bold)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Please describe why you are reporting this review:'),
          const SizedBox(height: 12),
          TextField(
            controller: _reasonController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'e.g. Spam, inappropriate language, or fake content',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submitReport,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : const Text('Submit Report', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
