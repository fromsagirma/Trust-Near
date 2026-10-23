import 'package:flutter/material.dart';

class LandmarkDisplay extends StatelessWidget {
  final String landmarkDescription;

  const LandmarkDisplay({super.key, required this.landmarkDescription});

  @override
  Widget build(BuildContext context) {
    if (landmarkDescription.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F5FB),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E4F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.nature_people_outlined,
            color: Color.fromARGB(255, 37, 236, 40),
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Landmark & Directions',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: Color(0xFF172033),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  landmarkDescription,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade700,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
