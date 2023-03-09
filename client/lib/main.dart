import 'package:client2/Components/drawer.dart';
import 'package:client2/Components/drawer.dart';
import 'package:client2/Components/drawer.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  final GlobalKey<ScaffoldState> _key = GlobalKey();
  MyApp({super.key});
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        title: 'P2P',
        home: Scaffold(
          key: _key,
          appBar: AppBar(
            actions: [
              Container(
                width: 500,
                color: Colors.blueGrey,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                        onPressed: () => {}, icon: const Icon(Icons.download)),
                    IconButton(
                        onPressed: () => {}, icon: const Icon(Icons.pause)),
                    IconButton(
                        onPressed: () => {}, icon: const Icon(Icons.share)),
                    IconButton(
                        onPressed: () => {}, icon: const Icon(Icons.search)),
                    IconButton(
                        onPressed: () => _key.currentState!.openDrawer(),
                        icon: const Icon(Icons.menu))
                  ],
                ),
              ),
            ],
            leading: const SizedBox(
              width: 100,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text("P2P"),
                ],
              ),
            ),
          ),
          drawer: const ChatDrawer(),
          body: const Center(
            child: Text("Hi am here"),
          ),
        ));
  }
}
