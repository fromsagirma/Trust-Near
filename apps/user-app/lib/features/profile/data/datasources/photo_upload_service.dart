import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/network/api_client.dart';

class PhotoUploadService {
  final ApiClient apiClient;
  final ImagePicker _picker = ImagePicker();

  PhotoUploadService({required this.apiClient});

  Future<XFile?> pickImageFromGallery() async {
    try {
      return await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 80,
      );
    } catch (_) {
      return null;
    }
  }

  Future<XFile?> pickImageFromCamera() async {
    try {
      return await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 80,
      );
    } catch (_) {
      return null;
    }
  }

  Future<String> uploadImage(File file) async {
    try {
      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await apiClient.dio.post(
        '/upload',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      if ((response.statusCode == 200 || response.statusCode == 201) &&
          response.data['success'] == true) {
        final data = response.data['data'];
        return (data['url'] ?? data['secure_url']).toString();
      }
    } catch (_) {}

    // Fallback: If /upload fails or server is unconfigured, encode file as Data URL
    try {
      final bytes = await file.readAsBytes();
      final base64String = base64Encode(bytes);
      final ext = file.path.split('.').last.toLowerCase();
      final mime = ext == 'png' ? 'image/png' : 'image/jpeg';
      return 'data:$mime;base64,$base64String';
    } catch (_) {
      throw Exception('Photo upload failed. Please try again.');
    }
  }
}
