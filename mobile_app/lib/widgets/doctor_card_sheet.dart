import 'package:flutter/material.dart';
import '../models/doctor.dart';
import 'package:url_launcher/url_launcher.dart';

class DoctorCardSheet extends StatelessWidget {
  final List<Doctor> doctors;
  DoctorCardSheet({required this.doctors});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      minChildSize: 0.15,
      maxChildSize: 0.5,
      initialChildSize: 0.15,
      builder: (_, controller) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            boxShadow: [BoxShadow(blurRadius: 10, color: Colors.black12)],
          ),
          child: Column(
            children: [
               Container(
                 margin: EdgeInsets.only(top: 8, bottom: 8),
                 width: 40, 
                 height: 5, 
                 decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10))
               ),
               if (doctors.isEmpty)
                  Padding(padding: EdgeInsets.all(20), child: Text("No doctors found.")),
               Expanded(
                 child: ListView.separated(
                  controller: controller,
                  itemCount: doctors.length,
                  separatorBuilder: (_, __) => Divider(height: 1),
                  itemBuilder: (_, i) {
                    final d = doctors[i];
                    return ListTile(
                      leading: CircleAvatar(child: Text(d.name[0])),
                      title: Text(d.name, style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text("${d.specialty} • ${d.area}"),
                      trailing: IconButton(
                        icon: Icon(Icons.call, color: Colors.teal),
                        onPressed: () => launchUrl(Uri.parse("tel:${d.phone}")),
                      ),
                    );
                  },
                 ),
               ),
            ],
          ),
        );
      },
    );
  }
}
