import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/markdown_renderer.dart';
import '../core/network/api_client.dart';
import '../providers/notes_provider.dart';

class NoteEditorScreen extends StatefulWidget {
  final Note? note;

  const NoteEditorScreen({super.key, this.note});

  @override
  State<NoteEditorScreen> createState() => _NoteEditorScreenState();
}

class _NoteEditorScreenState extends State<NoteEditorScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _tagsController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    if (widget.note != null) {
      _titleController.text = widget.note!.title;
      _contentController.text = widget.note!.content;
      _tagsController.text = widget.note!.tags.join(', ');
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _titleController.dispose();
    _contentController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  void _saveNote() async {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();
    if (title.isEmpty) return;

    final tags = _tagsController.text.split(',').map((t) => t.trim()).where((t) => t.isNotEmpty).toList();
    final notesProvider = Provider.of<NotesProvider>(context, listen: false);

    bool success;
    if (widget.note != null) {
      success = await notesProvider.updateNote(widget.note!.id, title, content, widget.note!.subjectCode, tags);
    } else {
      success = await notesProvider.createNote(title, content, null, tags);
    }

    if (success && mounted) {
      Navigator.of(context).pop();
    }
  }

  void _aiAssist(String action) async {
    final content = _contentController.text.trim();
    if (content.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      String prompt = '';
      if (action == 'summarize') {
        prompt = 'Provide a concise summary of the following study notes in Markdown format:\n\n$content';
      } else if (action == 'expand') {
        prompt = 'Expand and add detailed explanations to the following study notes in Markdown format:\n\n$content';
      } else if (action == 'quiz') {
        prompt = 'Create 3 quick quiz questions based on the following study notes in Markdown format:\n\n$content';
      }

      final response = await ApiClient.post(
        '/ai/chat',
        {
          'contents': [
            {
              'role': 'user',
              'parts': [{'text': prompt}]
            }
          ],
          'systemInstruction': 'You are a helpful academic study assistant. Respond in clear Markdown formatting.',
        },
        timeout: const Duration(seconds: 60),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true && data['text'] != null) {
        setState(() {
          _contentController.text = '${_contentController.text}\n\n### AI Assistant Output:\n' + data['text'];
          _tabController.animateTo(0); // Switch back to Edit tab
        });
      }
    } catch (_) {}

    setState(() => _isLoading = false);
  }

  void _showAiMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.summarize, color: Color(0xFF00BFA5)),
                title: const Text('Summarize Note'),
                onTap: () {
                  Navigator.pop(context);
                  _aiAssist('summarize');
                },
              ),
              ListTile(
                leading: const Icon(Icons.extension, color: Color(0xFF1A237E)),
                title: const Text('Expand Topics'),
                onTap: () {
                  Navigator.pop(context);
                  _aiAssist('expand');
                },
              ),
              ListTile(
                leading: const Icon(Icons.quiz, color: Color(0xFFFFD600)),
                title: const Text('Generate Study Quiz'),
                onTap: () {
                  Navigator.pop(context);
                  _aiAssist('quiz');
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.note != null ? 'Edit Note' : 'New Note'),
        actions: [
          IconButton(
            icon: const Icon(Icons.psychology, color: Color(0xFF00BFA5)),
            onPressed: _showAiMenu,
          ),
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveNote,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Write'),
            Tab(text: 'Preview'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                // Edit Tab
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      TextField(
                        controller: _titleController,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        decoration: const InputDecoration(
                          hintText: 'Note Title',
                          border: InputBorder.none,
                        ),
                      ),
                      const Divider(),
                      TextField(
                        controller: _tagsController,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF00BFA5)),
                        decoration: const InputDecoration(
                          hintText: 'tags (comma separated, e.g. chemistry, unit-1)',
                          border: InputBorder.none,
                        ),
                      ),
                      const Divider(),
                      TextField(
                        controller: _contentController,
                        maxLines: null,
                        keyboardType: TextInputType.multiline,
                        decoration: const InputDecoration(
                          hintText: 'Write in Markdown format...',
                          border: InputBorder.none,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Preview Tab
                MarkdownRenderer(
                  data: _contentController.text.isNotEmpty
                      ? '# ${_titleController.text}\n\n${_contentController.text}'
                      : '# ${_titleController.text}\n\n*No content yet. Start writing in Write tab!*',
                  selectable: true,
                ),
              ],
            ),
    );
  }
}
