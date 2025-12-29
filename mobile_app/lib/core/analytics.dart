import 'package:firebase_analytics/firebase_analytics.dart';

class Analytics {
  // static final FirebaseAnalytics _fa = FirebaseAnalytics.instance;

  static Future<void> search(String query) async {
    // await _fa.logEvent(name: "search", parameters: {"query_length": query.length});
    print("Analytics: Search $query");
  }

  static Future<void> doctorViewed(String id) async {
    // await _fa.logEvent(name: "doctor_view", parameters: {"doctor_id": id});
      print("Analytics: View $id");
  }
}
