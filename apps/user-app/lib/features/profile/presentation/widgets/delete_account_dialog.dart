import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/delete_account_provider.dart';

class DeleteAccountDialog extends ConsumerStatefulWidget {
  const DeleteAccountDialog({super.key});

  @override
  ConsumerState<DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends ConsumerState<DeleteAccountDialog> {
  final TextEditingController _confirmController = TextEditingController();
  bool _canDelete = false;

  @override
  void dispose() {
    _confirmController.dispose();
    super.dispose();
  }

  void _onTextChanged(String text) {
    setState(() {
      _canDelete = text.trim().toUpperCase() == 'DELETE';
    });
  }

  void _handleDelete() async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await ref.read(deleteAccountProvider.notifier).deleteAccount();

    if (mounted) {
      navigator.pop();
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Account permanently deleted.'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        final err = ref.read(deleteAccountProvider).errorMessage;
        messenger.showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to delete account'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(deleteAccountProvider);

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
          SizedBox(width: 8),
          Text(
            'Delete Account',
            style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 18),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This action is permanent and cannot be undone. All your saved places, reviews, and account data will be permanently removed.',
            style: TextStyle(fontSize: 13, color: Color(0xFF4A5568)),
          ),
          const SizedBox(height: 16),
          const Text(
            'Type DELETE to confirm:',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1A202C)),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _confirmController,
            onChanged: _onTextChanged,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'DELETE',
              isDense: true,
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: state.isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: (_canDelete && !state.isLoading) ? _handleDelete : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
          ),
          child: state.isLoading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : const Text('Delete Permanently'),
        ),
      ],
    );
  }
}
