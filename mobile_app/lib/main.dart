import 'package:flutter/material.dart';
import 'screens/map_home_screen.dart';
import 'package:firebase_core/firebase_core.dart';
// import 'firebase_options.dart'; // Uncomment once Firebase is configured

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform); 
  // For now, valid without firebase execution:
  // await Firebase.initializeApp(); 
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAMD Directory',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: MapHomeScreen(),
    );
  }
}
