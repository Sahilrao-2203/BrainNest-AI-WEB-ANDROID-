import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF5F7FA),
      primaryColor: const Color(0xFF1A237E),
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF1A237E),
        secondary: Color(0xFF00BFA5),
        tertiary: Color(0xFFFFD600),
        surface: Color(0xFFFFFFFF),
        error: Color(0xFFBA1A1A),
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: Color(0xFF191C1E),
        onSurfaceVariant: Color(0xFF454652),
      ),
      cardTheme: const CardTheme(
        color: Colors.white,
        elevation: 2,
        shadowColor: Color(0x0D1A237E),
        margin: EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFF5F7FA),
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Color(0xFF1A237E)),
        titleTextStyle: TextStyle(
          color: Color(0xFF1A237E),
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: 'Montserrat',
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: Color(0xFF1A237E),
        unselectedItemColor: Color(0xFF767683),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: Color(0xFF191C1E),
          fontFamily: 'Montserrat',
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Color(0xFF191C1E),
          fontFamily: 'Montserrat',
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: Color(0xFF191C1E),
          fontFamily: 'Inter',
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: Color(0xFF454652),
          fontFamily: 'Inter',
        ),
      ),
    );
  }

  // Fallback for darkTheme compatibility during build
  static ThemeData get darkTheme => lightTheme;
}
