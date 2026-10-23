import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/user_profile_detail.dart';
import '../providers/profile_provider.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  final UserProfileDetail profile;

  const EditProfileScreen({super.key, required this.profile});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  String? _currentPhotoUrl;
  File? _selectedLocalImage;
  bool _isUploadingPhoto = false;

  static const List<String> _sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.profile.displayName);
    _phoneController = TextEditingController(text: widget.profile.phone ?? '');
    _currentPhotoUrl = widget.profile.profilePhotoUrl;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadPhoto() async {
    final uploadService = ref.read(photoUploadServiceProvider);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Change Profile Photo',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.photo_library_outlined, color: Color(0xFF5547E8)),
                  title: const Text('Choose from Gallery'),
                  onTap: () async {
                    Navigator.pop(ctx);
                    final picked = await uploadService.pickImageFromGallery();
                    if (picked != null) {
                      _processImageUpload(File(picked.path));
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.camera_alt_outlined, color: Color(0xFF5547E8)),
                  title: const Text('Take a Photo'),
                  onTap: () async {
                    Navigator.pop(ctx);
                    final picked = await uploadService.pickImageFromCamera();
                    if (picked != null) {
                      _processImageUpload(File(picked.path));
                    }
                  },
                ),
                const Divider(height: 24),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Or select preset avatar:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: _sampleAvatars.map((url) {
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _currentPhotoUrl = url;
                          _selectedLocalImage = null;
                        });
                        Navigator.pop(ctx);
                      },
                      child: CircleAvatar(
                        radius: 26,
                        backgroundImage: NetworkImage(url),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _processImageUpload(File imageFile) async {
    setState(() {
      _selectedLocalImage = imageFile;
      _isUploadingPhoto = true;
    });

    final messenger = ScaffoldMessenger.of(context);
    final uploadedUrl = await ref
        .read(editProfileProvider.notifier)
        .uploadAndSetProfilePhoto(imageFile);

    if (mounted) {
      setState(() {
        _isUploadingPhoto = false;
        if (uploadedUrl != null) {
          _currentPhotoUrl = uploadedUrl;
        }
      });

      if (uploadedUrl != null) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Profile photo updated successfully!'),
            backgroundColor: Color(0xFF07945E),
          ),
        );
      } else {
        final err = ref.read(editProfileProvider).errorMessage;
        messenger.showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to upload photo'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _saveChanges() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Display name cannot be empty'), backgroundColor: Colors.red),
      );
      return;
    }

    if (phone.isNotEmpty && phone.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid phone number (min 8 digits)'), backgroundColor: Colors.red),
      );
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);


    final success = await ref.read(editProfileProvider.notifier).updateProfile(
          displayName: name,
          phone: phone.isNotEmpty ? phone : null,
          profilePhotoUrl: _currentPhotoUrl,
        );

    if (mounted) {
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: Color(0xFF07945E),
          ),
        );
        navigator.pop();
      } else {
        final err = ref.read(editProfileProvider).errorMessage;
        messenger.showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to update profile'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(editProfileProvider);

    final initials = widget.profile.displayName.isNotEmpty
        ? widget.profile.displayName.substring(0, 1).toUpperCase()
        : 'U';

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: Color(0xFF273142),
          ),
        ),
        title: const Text(
          'Edit Profile',
          style: TextStyle(
            color: Color(0xFF172033),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Profile Avatar with Camera Overlay
            Center(
              child: Stack(
                children: [
                  GestureDetector(
                    onTap: _isUploadingPhoto ? null : _pickAndUploadPhoto,
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF5547E8),
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: _selectedLocalImage != null
                            ? Image.file(_selectedLocalImage!, fit: BoxFit.cover)
                            : (_currentPhotoUrl != null && _currentPhotoUrl!.isNotEmpty)
                                ? Image.network(
                                    _currentPhotoUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => Center(
                                      child: Text(
                                        initials,
                                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                    ),
                                  )
                                : Center(
                                    child: Text(
                                      initials,
                                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: GestureDetector(
                      onTap: _isUploadingPhoto ? null : _pickAndUploadPhoto,
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFF071B3A),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: _isUploadingPhoto
                            ? const Padding(
                                padding: EdgeInsets.all(6.0),
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _isUploadingPhoto ? null : _pickAndUploadPhoto,
              child: const Text(
                'Change Photo',
                style: TextStyle(
                  color: Color(0xFF5547E8),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Form container
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Email Address', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F8FC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      widget.profile.email,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF172033)),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Full Name', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      hintText: 'Enter your full name',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text('Phone Number', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: '+251 91 234 5678',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: (state.isLoading || _isUploadingPhoto) ? null : _saveChanges,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color.fromARGB(255, 61, 151, 94),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: state.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        'Save Changes',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

