import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/location/location_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../profile/presentation/providers/profile_provider.dart';
import '../providers/create_listing_provider.dart';
import '../widgets/listing_form_fields.dart';
import '../widgets/map_location_picker_dialog.dart';

final businessCategoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  try {
    final apiClient = ApiClient(tokenStorage: ref.watch(tokenStorageProvider));
    final response = await apiClient.dio.get('/categories');
    if (response.statusCode == 200 && response.data['success'] == true) {
      final List data = response.data['data'] ?? [];
      return data.map((item) => {'id': item['id'] as int, 'name': item['name'] as String}).toList();
    }
  } catch (_) {}
  return [
    {'id': 1, 'name': 'Restaurant'},
    {'id': 2, 'name': 'Café'},
    {'id': 3, 'name': 'Hotel'},
    {'id': 4, 'name': 'Shopping'},
    {'id': 5, 'name': 'Services'},
  ];
});

class CreateListingScreen extends ConsumerStatefulWidget {
  const CreateListingScreen({super.key});

  @override
  ConsumerState<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends ConsumerState<CreateListingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _photoUrlController = TextEditingController();
  final _latController = TextEditingController(text: '9.0300');
  final _lngController = TextEditingController(text: '38.7400');

  int? _selectedCategoryId;
  File? _selectedImageFile;
  bool _fetchingLocation = false;
  bool _isUploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _landmarkController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _photoUrlController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _fetchingLocation = true);
    try {
      final locationService = LocationService();
      final pos = await locationService.getCurrentPosition();
      if (mounted) {
        setState(() {
          _latController.text = pos.latitude.toStringAsFixed(4);
          _lngController.text = pos.longitude.toStringAsFixed(4);
          _fetchingLocation = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          if (_latController.text.isEmpty) _latController.text = '9.0300';
          if (_lngController.text.isEmpty) _lngController.text = '38.7400';
          _fetchingLocation = false;
        });
      }
    }
  }

  Future<void> _pickImage() async {
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
                  'Select Business Image',
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
                      setState(() => _selectedImageFile = File(picked.path));
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
                      setState(() => _selectedImageFile = File(picked.path));
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openMapPicker() async {
    final curLat = double.tryParse(_latController.text.trim()) ?? 9.0300;
    final curLng = double.tryParse(_lngController.text.trim()) ?? 38.7400;

    final result = await showDialog<Map<String, double>>(
      context: context,
      builder: (_) => MapLocationPickerDialog(
        initialLat: curLat,
        initialLng: curLng,
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _latController.text = result['lat']!.toStringAsFixed(4);
        _lngController.text = result['lng']!.toStringAsFixed(4);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Coordinates updated: ${result['lat']!.toStringAsFixed(4)}, ${result['lng']!.toStringAsFixed(4)}'),
          backgroundColor: const Color(0xFF07945E),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    final lat = double.tryParse(_latController.text.trim());
    final lng = double.tryParse(_lngController.text.trim());

    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valid latitude and longitude coordinates are required')),
      );
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    List<String>? photoUrls;

    // Upload local image file if selected
    if (_selectedImageFile != null) {
      setState(() => _isUploadingPhoto = true);
      try {
        final uploadService = ref.read(photoUploadServiceProvider);
        final uploadedUrl = await uploadService.uploadImage(_selectedImageFile!);
        photoUrls = [uploadedUrl];
      } catch (e) {
        // If image upload failed, check if image is optional or URL is entered
        if (_photoUrlController.text.trim().isNotEmpty) {
          photoUrls = [_photoUrlController.text.trim()];
        }
      } finally {
        if (mounted) setState(() => _isUploadingPhoto = false);
      }
    } else if (_photoUrlController.text.trim().isNotEmpty) {
      photoUrls = [_photoUrlController.text.trim()];
    }

    final success = await ref.read(createListingProvider.notifier).createListing(
          name: _nameController.text.trim(),
          categoryId: _selectedCategoryId!,
          latitude: lat,
          longitude: lng,
          landmarkDescription: _landmarkController.text.trim(),
          description: _descriptionController.text.trim().isNotEmpty
              ? _descriptionController.text.trim()
              : null,
          phone: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text.trim()
              : null,
          photoUrls: photoUrls,
        );

    if (mounted) {
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Business listing submitted successfully!'),
            backgroundColor: Color(0xFF07945E),
            duration: Duration(seconds: 3),
          ),
        );
        navigator.pop();
      } else {
        final err = ref.read(createListingProvider).errorMessage;
        messenger.showSnackBar(
          SnackBar(
            content: Text(err ?? 'Failed to submit business listing'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(businessCategoriesProvider);
    final state = ref.watch(createListingProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        title: const Text('Add Business Listing', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF172033))),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF172033)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                categoriesAsync.when(
                  data: (categories) {
                    return ListingFormFields(
                      nameController: _nameController,
                      landmarkController: _landmarkController,
                      descriptionController: _descriptionController,
                      phoneController: _phoneController,
                      photoUrlController: _photoUrlController,
                      latController: _latController,
                      lngController: _lngController,
                      selectedCategoryId: _selectedCategoryId,
                      onCategoryChanged: (val) => setState(() => _selectedCategoryId = val),
                      categories: categories,
                      selectedImageFile: _selectedImageFile,
                      onPickImage: _pickImage,
                      onRemoveImage: () => setState(() => _selectedImageFile = null),
                      onUseGpsLocation: _getCurrentLocation,
                      isGpsLoading: _fetchingLocation,
                      onPickOnMap: _openMapPicker,
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('Error loading categories: $e'),
                ),

                const SizedBox(height: 30),

                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: (state.isLoading || _isUploadingPhoto) ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5547E8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: (state.isLoading || _isUploadingPhoto)
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              ),
                              SizedBox(width: 12),
                              Text('Submitting Listing...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          )
                        : const Text(
                            'Submit Listing',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

