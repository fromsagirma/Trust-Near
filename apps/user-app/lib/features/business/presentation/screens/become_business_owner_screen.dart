import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/location/location_service.dart';
import '../../../../core/location/location_provider.dart';
import '../../../discovery/presentation/providers/discovery_provider.dart';
import '../../../profile/presentation/providers/profile_provider.dart';
import '../providers/create_listing_provider.dart';
import '../widgets/map_location_picker_dialog.dart';

class BecomeBusinessOwnerScreen extends ConsumerStatefulWidget {
  const BecomeBusinessOwnerScreen({super.key});

  @override
  ConsumerState<BecomeBusinessOwnerScreen> createState() =>
      _BecomeBusinessOwnerScreenState();
}

class _BecomeBusinessOwnerScreenState
    extends ConsumerState<BecomeBusinessOwnerScreen> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _hoursController = TextEditingController(
    text: 'Mon-Sat: 8:00 AM - 8:00 PM',
  );
  final _latController = TextEditingController(text: '9.0300');
  final _lngController = TextEditingController(text: '38.7400');
  final _photoUrlController = TextEditingController();

  int? _selectedCategoryId;
  File? _selectedImageFile;
  bool _submitted = false;
  bool _isUploadingPhoto = false;
  bool _isGpsLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final locAsync = ref.read(userLocationProvider);
      locAsync.whenData((loc) {
        if (_latController.text.isEmpty || _latController.text == '9.0300') {
          _latController.text = loc.latitude.toStringAsFixed(4);
          _lngController.text = loc.longitude.toStringAsFixed(4);
        }
      });
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _landmarkController.dispose();
    _descriptionController.dispose();
    _hoursController.dispose();
    _latController.dispose();
    _lngController.dispose();
    _photoUrlController.dispose();
    super.dispose();
  }

  Future<void> _fetchCurrentGps() async {
    setState(() => _isGpsLoading = true);
    try {
      final locationService = LocationService();
      final pos = await locationService.getCurrentPosition();
      if (mounted) {
        setState(() {
          _latController.text = pos.latitude.toStringAsFixed(4);
          _lngController.text = pos.longitude.toStringAsFixed(4);
          _isGpsLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Current GPS coordinates detected!'),
            backgroundColor: Color(0xFF07945E),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isGpsLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Unable to detect GPS. Please check location permissions or enter coordinates manually.',
            ),
            backgroundColor: Colors.orange,
          ),
        );
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
                  leading: const Icon(
                    Icons.photo_library_outlined,
                    color: Color(0xFF5547E8),
                  ),
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
                  leading: const Icon(
                    Icons.camera_alt_outlined,
                    color: Color(0xFF5547E8),
                  ),
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
      builder: (_) =>
          MapLocationPickerDialog(initialLat: curLat, initialLng: curLng),
    );

    if (result != null && mounted) {
      setState(() {
        _latController.text = result['lat']!.toStringAsFixed(4);
        _lngController.text = result['lng']!.toStringAsFixed(4);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Coordinates updated: ${result['lat']!.toStringAsFixed(4)}, ${result['lng']!.toStringAsFixed(4)}',
          ),
          backgroundColor: const Color(0xFF07945E),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _submitListing() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a business category'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final lat = double.tryParse(_latController.text.trim());
    final lng = double.tryParse(_lngController.text.trim());

    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Valid latitude and longitude coordinates are required',
          ),
        ),
      );
      return;
    }

    List<String>? photoUrls;

    // Upload local image file if selected
    if (_selectedImageFile != null) {
      setState(() => _isUploadingPhoto = true);
      try {
        final uploadService = ref.read(photoUploadServiceProvider);
        final uploadedUrl = await uploadService.uploadImage(
          _selectedImageFile!,
        );
        photoUrls = [uploadedUrl];
      } catch (_) {
        if (_photoUrlController.text.trim().isNotEmpty) {
          photoUrls = [_photoUrlController.text.trim()];
        }
      } finally {
        if (mounted) setState(() => _isUploadingPhoto = false);
      }
    } else if (_photoUrlController.text.trim().isNotEmpty) {
      photoUrls = [_photoUrlController.text.trim()];
    }

    final hours = _hoursController.text.trim().isNotEmpty
        ? {'schedule': _hoursController.text.trim()}
        : null;

    final success = await ref
        .read(createListingProvider.notifier)
        .submitListing(
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
          hours: hours,
          photoUrls: photoUrls,
        );

    if (mounted) {
      if (success) {
        setState(() => _submitted = true);
      } else {
        final error = ref.read(createListingProvider).errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error ?? 'Failed to submit business listing'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createListingProvider);
    final categoriesAsync = ref.watch(categoriesListProvider);

    if (_submitted) {
      return Scaffold(
        backgroundColor: const Color(0xFFF7F8FC),
        appBar: AppBar(
          backgroundColor: const Color(0xFFF7F8FC),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.close_rounded, color: Color(0xFF172033)),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 84,
                  height: 84,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: Color(0xFF07945E),
                    size: 48,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Application Submitted!',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF172033),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Your business listing for "${_nameController.text}" has been submitted for review. Once verified by our team, your listing will be published.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5547E8),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Back to Profile',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F8FC),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: Color(0xFF172033),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Become a Business Owner',
          style: TextStyle(
            color: Color.fromRGBO(5, 144, 44, 1),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Intro Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF0FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF5547E8).withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: Color.fromARGB(255, 32, 95, 197),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.storefront_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Register Your Business',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: Color.fromARGB(255, 23, 51, 41),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Reach nearby customers and gain community trust on TrustNear.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6D7481),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              const Text(
                'Business Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF172033),
                ),
              ),
              const SizedBox(height: 12),

              // Business Name
              _buildTextField(
                controller: _nameController,
                label: 'Business Name *',
                hint: 'e.g. Abyssinia Café & Bakery',
                icon: Icons.store_outlined,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Business name is required';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Category Selector
              const Text(
                'Category *',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 6),
              categoriesAsync.when(
                data: (cats) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE0E3E8)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<int>(
                        value: _selectedCategoryId,
                        isExpanded: true,
                        hint: const Text(
                          'Select a business category',
                          style: TextStyle(fontSize: 14),
                        ),
                        items: cats.map((cat) {
                          final id = cat['id'] is int
                              ? cat['id'] as int
                              : int.tryParse(cat['id'].toString()) ?? 1;
                          final name = cat['name']?.toString() ?? 'Category';
                          return DropdownMenuItem<int>(
                            value: id,
                            child: Text(name),
                          );
                        }).toList(),
                        onChanged: (val) =>
                            setState(() => _selectedCategoryId = val),
                      ),
                    ),
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (_, _) => const Text('Failed to load categories'),
              ),

              const SizedBox(height: 14),

              // Phone Number
              _buildTextField(
                controller: _phoneController,
                label: 'Phone Number',
                hint: '+251 91 123 4567',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),

              const SizedBox(height: 14),

              // Operating Hours
              _buildTextField(
                controller: _hoursController,
                label: 'Operating Hours',
                hint: 'e.g. Mon-Sat: 8:00 AM - 8:00 PM',
                icon: Icons.access_time_rounded,
              ),

              const SizedBox(height: 14),

              // Landmark Description
              _buildTextField(
                controller: _landmarkController,
                label: 'Landmark / Location Description *',
                hint: 'e.g. Near Edna Mall, Behind Commercial Bank, Bole',
                icon: Icons.location_on_outlined,
                maxLines: 2,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Landmark description is required';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 14),

              // Description
              _buildTextField(
                controller: _descriptionController,
                label: 'Business Description',
                hint: 'Tell customers what products or services you offer...',
                icon: Icons.description_outlined,
                maxLines: 3,
              ),

              const SizedBox(height: 20),

              // ----------------------------------------------------
              // BUSINESS LOCATION SELECTION (Option A & Option B + GPS)
              // ----------------------------------------------------
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF0FF),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: const Color(0xFF5547E8).withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on_rounded,
                          color: Color(0xFF5547E8),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Business Location Coordinates *',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: Color(0xFF172033),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Specify coordinates manually (Option A) or pick interactively on map (Option B):',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 12),

                    // Action buttons for Option B (Map Picker) and GPS
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _openMapPicker,
                            icon: const Icon(Icons.map_rounded, size: 16),
                            label: const Text(
                              'Select on Map',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color.fromARGB(
                                255,
                                211,
                                31,
                                76,
                              ),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isGpsLoading ? null : _fetchCurrentGps,
                            icon: _isGpsLoading
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.my_location_rounded,
                                    size: 16,
                                    color: Color(0xFF5547E8),
                                  ),
                            label: const Text(
                              'Use Current GPS',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Color.fromARGB(255, 161, 14, 201),
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFF5547E8)),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Option A: Manual Coordinates Fields
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Latitude',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                  color: Color(0xFF334155),
                                ),
                              ),
                              const SizedBox(height: 4),
                              TextFormField(
                                controller: _latController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                      signed: true,
                                    ),
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) {
                                    return 'Required';
                                  }
                                  final val = double.tryParse(v.trim());
                                  if (val == null || val < -90 || val > 90) {
                                    return 'Between -90 & 90';
                                  }
                                  return null;
                                },
                                decoration: InputDecoration(
                                  hintText: 'e.g. 9.0300',
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Longitude',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                  color: Color(0xFF334155),
                                ),
                              ),
                              const SizedBox(height: 4),
                              TextFormField(
                                controller: _lngController,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                      signed: true,
                                    ),
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) {
                                    return 'Required';
                                  }
                                  final val = double.tryParse(v.trim());
                                  if (val == null || val < -180 || val > 180) {
                                    return 'Between -180 & 180';
                                  }
                                  return null;
                                },
                                decoration: InputDecoration(
                                  hintText: 'e.g. 38.7400',
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ----------------------------------------------------
              // BUSINESS PHOTO UPLOAD (Gallery / Camera / Preview)
              // ----------------------------------------------------
              const Text(
                'Business Photo',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: Color(0xFF172033),
                ),
              ),
              const SizedBox(height: 6),

              if (_selectedImageFile != null) ...[
                Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.file(
                          _selectedImageFile!,
                          width: double.infinity,
                          height: 180,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: const Icon(
                              Icons.delete_outline_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                            onPressed: () =>
                                setState(() => _selectedImageFile = null),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 10,
                        child: ElevatedButton.icon(
                          onPressed: _pickImage,
                          icon: const Icon(Icons.edit_rounded, size: 14),
                          label: const Text(
                            'Change Photo',
                            style: TextStyle(fontSize: 12),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black.withValues(
                              alpha: 0.7,
                            ),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                InkWell(
                  onTap: _pickImage,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      vertical: 24,
                      horizontal: 16,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: const Color(0xFF5547E8).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFEEF0FF),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.add_a_photo_rounded,
                            color: Color(0xFF5547E8),
                            size: 26,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Upload Photo from Camera or Gallery',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: Color(0xFF5547E8),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'PNG, JPG up to 5 MB',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 10),
              TextFormField(
                controller: _photoUrlController,
                decoration: InputDecoration(
                  hintText: 'Or enter image URL (optional)',
                  hintStyle: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 12,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),

              const SizedBox(height: 30),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: (state.isLoading || _isUploadingPhoto)
                      ? null
                      : _submitListing,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color.fromARGB(255, 21, 194, 119),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: (state.isLoading || _isUploadingPhoto)
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Submitting Listing...',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        )
                      : const Text(
                          'Submit Business Listing',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    IconData? icon,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: icon != null
                ? Icon(icon, color: const Color(0xFF5547E8), size: 20)
                : null,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            filled: true,
            fillColor: Colors.white,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFE0E3E8)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF5547E8), width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.red),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.red, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
