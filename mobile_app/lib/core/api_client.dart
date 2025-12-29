import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/doctor.dart';

class ApiClient {
  static const baseUrl = "https://szk008.pythonanywhere.com"; // Updated to real domain

  static Future<List<Doctor>> search(String query) async {
    try {
      final res = await http.get(
        Uri.parse("$baseUrl/api/search?q=${Uri.encodeComponent(query)}"),
      );

      if (res.statusCode != 200) {
        throw Exception("API error: ${res.statusCode}");
      }

      final List data = json.decode(res.body);
      return data.map((e) => Doctor.fromJson(e)).toList();
    } catch (e) {
        print("API Error: $e");
        return []; // Fail safe
    }
  }
}
