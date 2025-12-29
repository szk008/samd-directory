import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/analytics.dart';
import '../models/doctor.dart';
import '../widgets/map_view.dart';
import '../widgets/search_bar.dart';
import '../widgets/doctor_card_sheet.dart';

class MapHomeScreen extends StatefulWidget {
  @override
  State<MapHomeScreen> createState() => _MapHomeScreenState();
}

class _MapHomeScreenState extends State<MapHomeScreen> {
  List<Doctor> doctors = [];
  bool loading = true;

  void search(String q) async {
    Analytics.search(q);
    setState(() => loading = true);
    try {
      doctors = await ApiClient.search(q);
    } catch (e) {
      print("Search Error: $e");
    }
    if (mounted) setState(() => loading = false);
  }

  @override
  void initState() {
    super.initState();
    search("");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false, // Prevent map resize on keyboard
      body: Stack(
        children: [
          MapView(doctors: doctors),
          Positioned(
            top: 50, 
            left: 16,
            right: 16,
            child: SearchBarWidget(onChanged: search),
          ),
          if (loading)
            const Positioned(
              top: 120,
              left: 0,
              right: 0,
              child: Center(
                child: SizedBox(
                  width: 40, height: 40, 
                  child: CircularProgressIndicator(strokeWidth: 3)
                )
              ),
            ),
          DoctorCardSheet(doctors: doctors),
        ],
      ),
    );
  }
}
