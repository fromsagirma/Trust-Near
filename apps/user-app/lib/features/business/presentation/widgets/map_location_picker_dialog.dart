import 'package:flutter/material.dart';

class LocationPreset {
  final String name;
  final String description;
  final double lat;
  final double lng;

  const LocationPreset({
    required this.name,
    required this.description,
    required this.lat,
    required this.lng,
  });
}

const List<LocationPreset> kAddisLocationPresets = [
  LocationPreset(
    name: 'Bole / Edna Mall Area',
    description: 'Bole Medhanealem & Camerun St, Addis Ababa',
    lat: 9.0054,
    lng: 38.7881,
  ),
  LocationPreset(
    name: 'Piazza / City Center',
    description: 'Wavel St & Dejazmach Jote St, Arada',
    lat: 9.0345,
    lng: 38.7512,
  ),
  LocationPreset(
    name: 'Kazanchis / UNECA Quarter',
    description: 'Menelik II Ave, Kirkos, Addis Ababa',
    lat: 9.0180,
    lng: 38.7610,
  ),
  LocationPreset(
    name: 'Mexico Square / Stadium',
    description: 'Ras Abebe Aregay Ave, Lideta',
    lat: 9.0105,
    lng: 38.7450,
  ),
  LocationPreset(
    name: 'Megenagna / Shola Market',
    description: 'Yeka Sub-City, Addis Ababa',
    lat: 9.0220,
    lng: 38.8010,
  ),
  LocationPreset(
    name: 'Gerji / Imperial Traffic Light',
    description: 'Bole Sub-City, Addis Ababa',
    lat: 8.9950,
    lng: 38.8100,
  ),
  LocationPreset(
    name: 'Sarbet / AU Headquarters',
    description: 'Nifas Silk-Lafto, Addis Ababa',
    lat: 9.0012,
    lng: 38.7360,
  ),
  LocationPreset(
    name: 'Hawassa / Lake View',
    description: 'Hawassa City Center, Sidama Region',
    lat: 7.0504,
    lng: 38.4955,
  ),
  LocationPreset(
    name: 'Bishoftu / Lake Kuriftu',
    description: 'Bishoftu City Center, Oromia Region',
    lat: 8.7523,
    lng: 38.9880,
  ),
  LocationPreset(
    name: 'Adama / Posta Bet',
    description: 'Adama Main Commercial Ave, Oromia',
    lat: 8.5400,
    lng: 39.2700,
  ),
];

class MapLocationPickerDialog extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;

  const MapLocationPickerDialog({super.key, this.initialLat, this.initialLng});

  @override
  State<MapLocationPickerDialog> createState() =>
      _MapLocationPickerDialogState();
}

class _MapLocationPickerDialogState extends State<MapLocationPickerDialog> {
  late double _selectedLat;
  late double _selectedLng;
  String _selectedName = 'Custom Location';

  @override
  void initState() {
    super.initState();
    _selectedLat = widget.initialLat ?? 9.0300;
    _selectedLng = widget.initialLng ?? 38.7400;

    // Check if matches preset
    for (final p in kAddisLocationPresets) {
      if ((p.lat - _selectedLat).abs() < 0.001 &&
          (p.lng - _selectedLng).abs() < 0.001) {
        _selectedName = p.name;
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 420, maxHeight: 600),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF0FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.map_rounded,
                    color: Color.fromARGB(255, 32, 222, 86),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Select Location on Map',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF172033),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Active Coordinate Preview Badge
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF172033),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_pin,
                    color: Color(0xFF66E990),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Lat: ${_selectedLat.toStringAsFixed(4)}, Lng: ${_selectedLng.toStringAsFixed(4)}',
                          style: const TextStyle(
                            color: Color(0xFFD9DDF7),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),
            const Text(
              'Select City Zone or Popular Landmark:',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 8),

            // Preset List
            Expanded(
              child: ListView.separated(
                itemCount: kAddisLocationPresets.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final preset = kAddisLocationPresets[index];
                  final isSelected =
                      (preset.lat - _selectedLat).abs() < 0.001 &&
                      (preset.lng - _selectedLng).abs() < 0.001;

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    dense: true,
                    leading: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFF5547E8)
                            : const Color(0xFFEEF0FF),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.place_rounded,
                        color: isSelected
                            ? Colors.white
                            : const Color(0xFF5547E8),
                        size: 16,
                      ),
                    ),
                    title: Text(
                      preset.name,
                      style: TextStyle(
                        fontWeight: isSelected
                            ? FontWeight.bold
                            : FontWeight.w600,
                        fontSize: 13,
                        color: isSelected
                            ? const Color(0xFF5547E8)
                            : const Color(0xFF172033),
                      ),
                    ),
                    subtitle: Text(
                      preset.description,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_circle_rounded,
                            color: Color(0xFF5547E8),
                            size: 18,
                          )
                        : null,
                    onTap: () {
                      setState(() {
                        _selectedLat = preset.lat;
                        _selectedLng = preset.lng;
                        _selectedName = preset.name;
                      });
                    },
                  );
                },
              ),
            ),

            const SizedBox(height: 14),

            // Confirm Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context, {
                    'lat': _selectedLat,
                    'lng': _selectedLng,
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5547E8),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Confirm Location',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
