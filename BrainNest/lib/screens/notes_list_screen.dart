import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notes_provider.dart';
import '../providers/curriculum_provider.dart';
import 'note_editor_screen.dart';

class NotesListScreen extends StatefulWidget {
  const NotesListScreen({super.key});

  @override
  State<NotesListScreen> createState() => _NotesListScreenState();
}

class _NotesListScreenState extends State<NotesListScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddNoteMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.edit_note, color: Color(0xFF1A237E)),
                title: const Text('Write Note Manually'),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const NoteEditorScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.auto_awesome, color: Color(0xFF00BFA5)),
                title: const Text('Generate with AI'),
                onTap: () {
                  Navigator.pop(context);
                  _showAiGenerationDialog(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAiGenerationDialog(BuildContext context) {
    final curriculumProvider = Provider.of<CurriculumProvider>(context, listen: false);
    final notesProvider = Provider.of<NotesProvider>(context, listen: false);
    
    final topicController = TextEditingController();
    final focusAreasController = TextEditingController();
    
    String? selectedSubjectCode;
    String? selectedSubjectName;
    
    if (curriculumProvider.subjects.isNotEmpty) {
      selectedSubjectCode = curriculumProvider.subjects.first.code;
      selectedSubjectName = curriculumProvider.subjects.first.name;
    }

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setStateDialog) {
          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.auto_awesome, color: Color(0xFF00BFA5)),
                SizedBox(width: 8),
                Text('AI Study Note Generator', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Topic or Concept *',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: topicController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Simple Harmonic Motion (SHM)',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setStateDialog(() {}),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Subject Context (Optional)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 6),
                  if (curriculumProvider.subjects.isEmpty)
                    const Text('No subjects loaded. Sync syllabus first.', style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic))
                  else
                    DropdownButtonFormField<String>(
                      value: selectedSubjectCode,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                      ),
                      items: curriculumProvider.subjects.map((sub) {
                        return DropdownMenuItem<String>(
                          value: sub.code,
                          child: Text('${sub.code} - ${sub.name}'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setStateDialog(() {
                          selectedSubjectCode = val;
                          selectedSubjectName = curriculumProvider.subjects
                              .firstWhere((s) => s.code == val)
                              .name;
                        });
                      },
                    ),
                  const SizedBox(height: 16),
                  const Text(
                    'Specific Focus or Subtopics (Optional)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: focusAreasController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      hintText: 'e.g. time period, velocity, differential equation',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: topicController.text.trim().isEmpty
                    ? null
                    : () async {
                        final navigator = Navigator.of(context);
                        final scaffoldMessenger = ScaffoldMessenger.of(context);
                        
                        navigator.pop(); // Close settings dialog
                        
                        // Show overlay loading dialog
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (_) => const Center(
                            child: Card(
                              child: Padding(
                                padding: EdgeInsets.all(24.0),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CircularProgressIndicator(color: Color(0xFF00BFA5)),
                                    SizedBox(height: 16),
                                    Text(
                                      'AI is generating study notes...\nThis might take up to a minute.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );

                        final topic = topicController.text.trim();
                        final focus = focusAreasController.text.trim();

                        final generatedNote = await notesProvider.generateStudyNote(
                          topic: topic,
                          subjectCode: selectedSubjectCode,
                          subjectName: selectedSubjectName,
                          focusAreas: focus,
                        );

                        navigator.pop(); // Close loading dialog

                        if (generatedNote != null) {
                          scaffoldMessenger.showSnackBar(
                            const SnackBar(
                              content: Text('✨ AI study note generated and saved!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                          // Auto open the newly generated note in NoteEditorScreen
                          navigator.push(
                            MaterialPageRoute(
                              builder: (_) => NoteEditorScreen(note: generatedNote),
                            ),
                          );
                        } else {
                          scaffoldMessenger.showSnackBar(
                            SnackBar(
                              content: Text(notesProvider.errorMessage ?? 'Failed to generate AI note. Please try again.'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1A237E),
                  foregroundColor: Colors.white,
                ),
                child: const Text('Generate'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notesProvider = Provider.of<NotesProvider>(context);
    final displayedNotes = notesProvider.searchNotes(_searchQuery);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Study Notes'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search notes by title, tags or content...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          setState(() {
                            _searchController.clear();
                            _searchQuery = '';
                          });
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFFFFFFF),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFC6C5D4)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: Color(0xFFC6C5D4)),
                ),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
            ),
          ),
          
          Expanded(
            child: notesProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : displayedNotes.isEmpty
                    ? const Center(
                        child: Text(
                          'No notes found. Create your first note!',
                          style: TextStyle(color: Colors.grey),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: displayedNotes.length,
                        itemBuilder: (context, index) {
                          final note = displayedNotes[index];
                          
                          return Card(
                            margin: const EdgeInsets.symmetric(vertical: 6),
                            child: ListTile(
                              title: Text(
                                note.title,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                    note.content,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF454652)),
                                  ),
                                  if (note.tags.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 6,
                                      children: note.tags.map((t) {
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFECEEF1),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            t,
                                            style: const TextStyle(fontSize: 10, color: Color(0xFF1A237E)),
                                          ),
                                        );
                                      }).toList(),
                                    ),
                                  ],
                                ],
                              ),
                              isThreeLine: true,
                              trailing: IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                onPressed: () {
                                  notesProvider.deleteNote(note.id);
                                },
                              ),
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => NoteEditorScreen(note: note),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddNoteMenu(context),
        backgroundColor: const Color(0xFF1A237E),
        foregroundColor: Colors.white,
        child: const Icon(Icons.add),
      ),
    );
  }
}
