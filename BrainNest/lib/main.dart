import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:brainnest/core/theme/app_theme.dart';
import 'package:brainnest/providers/auth_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/providers/mood_provider.dart';
import 'package:brainnest/providers/planner_provider.dart';
import 'package:brainnest/providers/notes_provider.dart';
import 'package:brainnest/providers/study_stats_provider.dart';
import 'package:brainnest/providers/quiz_provider.dart';
import 'package:brainnest/providers/flashcards_provider.dart';
import 'package:brainnest/config/api_config.dart';
import 'package:brainnest/screens/login_screen.dart';
import 'package:brainnest/screens/main_layout.dart';

// Global navigator key so AuthGate can replace the stack from anywhere
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.loadConfig();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CurriculumProvider()),
        ChangeNotifierProvider(create: (_) => MoodProvider()),
        ChangeNotifierProvider(create: (_) => PlannerProvider()),
        ChangeNotifierProvider(create: (_) => NotesProvider()),
        ChangeNotifierProvider(create: (_) => StudyStatsProvider()),
        ChangeNotifierProvider(create: (_) => QuizProvider()),
        ChangeNotifierProvider(create: (_) => FlashcardsProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BrainNest',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme.copyWith(
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFFFFFFF),
          labelStyle: const TextStyle(color: Color(0xFF454652)),
          floatingLabelStyle: const TextStyle(color: Color(0xFF1A237E)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFFC6C5D4)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFF1A237E), width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Colors.redAccent),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Colors.redAccent, width: 2),
          ),
        ),
      ),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/home': (_) => const MainLayout(),
      },
      // AuthGate is the single entry point. It watches auth state and
      // replaces the full Navigator stack whenever auth changes.
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    if (auth.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (auth.isAuthenticated) {
      return const MainLayout();
    }

    return const LoginScreen();
  }
}
