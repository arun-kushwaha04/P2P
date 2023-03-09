import 'dart:ffi';

import 'package:flutter/material.dart';

class ChatDrawer extends StatelessWidget {
  const ChatDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Container(
        height: double.infinity,
        color: Colors.black,
        child: Column(
          children: [
            Container(
              width: double.infinity,
              height: 50,
              child: const DrawerHeader(
                decoration: BoxDecoration(
                  color: Colors.blue,
                ),
                child: Text('Chat Window'),
              ),
            ),
            Container(
              color: Colors.deepOrange,
              child: Column(
                children: [Text("Hello")],
              ),
            ),
            Column(
              children: [Text("Hello")],
            )
          ],
        ),
      ),
    );
  }
}
