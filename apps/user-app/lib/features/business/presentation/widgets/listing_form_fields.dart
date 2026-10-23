import 'dart:io';
import 'package:flutter/material.dart';

class ListingFormFields extends StatelessWidget {

  final TextEditingController nameController;
  final TextEditingController landmarkController;
  final TextEditingController descriptionController;
  final TextEditingController phoneController;
  final TextEditingController photoUrlController;
  final TextEditingController latController;
  final TextEditingController lngController;
  final int? selectedCategoryId;
  final ValueChanged<int?> onCategoryChanged;
  final List<Map<String, dynamic>> categories;
  final File? selectedImageFile;
  final VoidCallback onPickImage;
  final VoidCallback onRemoveImage;
  final VoidCallback onUseGpsLocation;
  final bool isGpsLoading;
  final VoidCallback onPickOnMap;

  const ListingFormFields({
    super.key,
    required this.nameController,
    required this.landmarkController,
    required this.descriptionController,
    required this.phoneController,
    required this.photoUrlController,
    required this.latController,
    required this.lngController,
    required this.selectedCategoryId,
    required this.onCategoryChanged,
    required this.categories,
    this.selectedImageFile,
    required this.onPickImage,
    required this.onRemoveImage,
    required this.onUseGpsLocation,
    this.isGpsLoading = false,
    required this.onPickOnMap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Business Name *', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),
        TextFormField(
          controller: nameController,
          validator: (v) => v == null || v.trim().isEmpty ? 'Business name is required' : null,
          decoration: InputDecoration(
            hintText: 'e.g. Kaldi\'s Coffee',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        const SizedBox(height: 16),

        const Text('Category *', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),
        DropdownButtonFormField<int>(
          initialValue: selectedCategoryId,
          hint: const Text('Select a category'),
          validator: (v) => v == null ? 'Please select a category' : null,
          onChanged: onCategoryChanged,
          decoration: InputDecoration(
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          items: categories.map((cat) {
            return DropdownMenuItem<int>(
              value: cat['id'] as int,
              child: Text(cat['name'] as String),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),

        // ----------------------------------------------------
        // LOCATION SELECTION (Option A & Option B + GPS)
        // ----------------------------------------------------
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFEEF0FF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF5547E8).withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.location_on_rounded, color: Color(0xFF5547E8), size: 20),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Business Location Coordinates *',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF172033)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Specify coordinates manually (Option A) or pick interactively (Option B):',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),

              // Action buttons for Option B (Map Picker) and GPS
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onPickOnMap,
                      icon: const Icon(Icons.map_rounded, size: 16),
                      label: const Text('Select on Map', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF5547E8),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: isGpsLoading ? null : onUseGpsLocation,
                      icon: isGpsLoading
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.my_location_rounded, size: 16, color: Color(0xFF5547E8)),
                      label: const Text('Use Current GPS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5547E8))),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF5547E8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
                        const Text('Latitude', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Color(0xFF334155))),
                        const SizedBox(height: 4),
                        TextFormField(
                          controller: latController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Required';
                            final val = double.tryParse(v.trim());
                            if (val == null || val < -90 || val > 90) return 'Between -90 & 90';
                            return null;
                          },
                          decoration: InputDecoration(
                            hintText: 'e.g. 9.0300',
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
                        const Text('Longitude', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: Color(0xFF334155))),
                        const SizedBox(height: 4),
                        TextFormField(
                          controller: lngController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Required';
                            final val = double.tryParse(v.trim());
                            if (val == null || val < -180 || val > 180) return 'Between -180 & 180';
                            return null;
                          },
                          decoration: InputDecoration(
                            hintText: 'e.g. 38.7400',
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
        const SizedBox(height: 16),

        const Text('Landmark / Directions *', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),
        TextFormField(
          controller: landmarkController,
          maxLines: 2,
          validator: (v) => v == null || v.trim().isEmpty ? 'Landmark description is required' : null,
          decoration: InputDecoration(
            hintText: 'e.g. Next to Commercial Bank of Ethiopia, Bole Branch',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        const SizedBox(height: 16),

        const Text('Description', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),
        TextFormField(
          controller: descriptionController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Brief description of services, specialty items, etc.',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        const SizedBox(height: 16),

        const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),
        TextFormField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: 'e.g. +251 91 122 3344',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
        const SizedBox(height: 16),

        // ----------------------------------------------------
        // BUSINESS PHOTO UPLOAD (Gallery / Camera / Preview)
        // ----------------------------------------------------
        const Text('Business Photo', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF172033))),
        const SizedBox(height: 6),

        if (selectedImageFile != null) ...[
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
                    selectedImageFile!,
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
                      icon: const Icon(Icons.delete_outline_rounded, color: Colors.white, size: 20),
                      onPressed: onRemoveImage,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 10,
                  left: 10,
                  child: ElevatedButton.icon(
                    onPressed: onPickImage,
                    icon: const Icon(Icons.edit_rounded, size: 14),
                    label: const Text('Change Photo', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black.withValues(alpha: 0.7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ] else ...[
          InkWell(
            onTap: onPickImage,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF5547E8).withValues(alpha: 0.3), style: BorderStyle.solid),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEEF0FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add_a_photo_rounded, color: Color(0xFF5547E8), size: 26),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Upload Photo from Camera or Gallery',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5547E8)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'PNG, JPG up to 5 MB',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
          ),
        ],

        const SizedBox(height: 10),
        TextFormField(
          controller: photoUrlController,
          decoration: InputDecoration(
            hintText: 'Or enter image URL (optional)',
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }
}

