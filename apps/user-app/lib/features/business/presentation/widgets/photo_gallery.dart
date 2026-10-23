import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class PhotoGallery extends StatelessWidget {
  final List<String> photoUrls;

  const PhotoGallery({super.key, required this.photoUrls});

  @override
  Widget build(BuildContext context) {
    if (photoUrls.isEmpty) {
      return Container(
        height: 220,
        width: double.infinity,
        color: Colors.grey.shade200,
        child: const Icon(
          Icons.image_outlined,
          size: 60,
          color: Colors.grey,
        ),
      );
    }

    return SizedBox(
      height: 240,
      child: PageView.builder(
        itemCount: photoUrls.length,
        itemBuilder: (context, index) {
          return CachedNetworkImage(
            imageUrl: photoUrls[index],
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(
              color: Colors.grey.shade100,
              child: const Center(child: CircularProgressIndicator()),
            ),
            errorWidget: (context, url, error) => Container(
              color: Colors.grey.shade200,
              child: const Icon(
                Icons.image_not_supported_outlined,
                size: 50,
                color: Colors.grey,
              ),
            ),
          );
        },
      ),
    );
  }
}
