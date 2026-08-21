import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:brainnest/providers/auth_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/providers/mood_provider.dart';
import 'package:brainnest/providers/planner_provider.dart';
import 'package:brainnest/providers/notes_provider.dart';
import 'package:brainnest/providers/study_stats_provider.dart';
import 'package:brainnest/providers/quiz_provider.dart';
import 'package:brainnest/providers/flashcards_provider.dart';

import 'package:brainnest/screens/dashboard_screen.dart';
import 'package:brainnest/screens/companion_screen.dart';
import 'package:brainnest/screens/notes_list_screen.dart';
import 'package:brainnest/screens/planner_screen.dart';
import 'package:brainnest/screens/profile_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const DashboardScreen(),
    const AiCompanionScreen(),
    const NotesListScreen(),
    const PlannerScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchInitialData();
    });
  }

  void _fetchInitialData() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    
    // Trigger all data fetches
    Provider.of<CurriculumProvider>(context, listen: false).initialize(auth);
    Provider.of<MoodProvider>(context, listen: false).initialize(auth);
    Provider.of<PlannerProvider>(context, listen: false).initialize(auth);
    Provider.of<NotesProvider>(context, listen: false).fetchNotes();
    Provider.of<StudyStatsProvider>(context, listen: false).initialize(auth);
    Provider.of<QuizProvider>(context, listen: false).initialize(auth);
    Provider.of<FlashcardsProvider>(context, listen: false).initialize(auth);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble),
            label: 'Companion',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.note_alt_outlined),
            activeIcon: Icon(Icons.note_alt),
            label: 'Notes',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_month_outlined),
            activeIcon: Icon(Icons.calendar_month),
            label: 'Planner',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

