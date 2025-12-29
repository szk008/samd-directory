import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/doctor.dart';

class MapView extends StatelessWidget {
  final List<Doctor> doctors;
  const MapView({Key? key, required this.doctors}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final Set<Marker> markers = doctors.map((d) {
      return Marker(
        markerId: MarkerId(d.id),
        position: LatLng(d.latitude, d.longitude),
        infoWindow: InfoWindow(title: d.name, snippet: d.specialty),
      );
    }).toSet();

    return GoogleMap(
      initialCameraPosition: const CameraPosition(
        target: LatLng(21.1702, 72.8311), // Default to Surat/Gujarat
        zoom: 12,
      ),
      markers: markers,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
    );
  }
}
