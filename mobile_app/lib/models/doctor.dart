class Doctor {
  final String id;
  final String name;
  final String specialty;
  final String area;
  final double latitude;
  final double longitude;
  final String phone;

  Doctor({
    required this.id,
    required this.name,
    required this.specialty,
    required this.area,
    required this.latitude,
    required this.longitude,
    required this.phone,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) {
    return Doctor(
      id: json["id"].toString(),
      name: json["name"] ?? "",
      specialty: json["specialty"] ?? "",
      area: json["area"] ?? "",
      latitude: (json["latitude"] ?? 0).toDouble(),
      longitude: (json["longitude"] ?? 0).toDouble(),
      phone: json["phone"] ?? "",
    );
  }
}
