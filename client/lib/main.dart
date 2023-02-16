import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        title: 'P2P',
        home: Scaffold(
          appBar: AppBar(
            actions: [
              Container(
                width: 500,
                color: Colors.blueGrey,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: const [
                    Icon(Icons.download),
                    Icon(Icons.pause),
                    Icon(Icons.share),
                    Icon(Icons.search),
                    Icon(Icons.menu)
                  ],
                ),
              ),
            ],
            leading: SizedBox(
              width: 100,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: const [
                  Text("P2P"),
                ],
              ),
            ),
          ),
          body: const Center(
            child: Text("Hi am here"),
          ),
        ));
  }
}
