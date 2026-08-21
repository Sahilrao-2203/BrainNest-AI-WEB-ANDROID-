import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_markdown/flutter_markdown.dart';
import '../widgets/markdown_renderer.dart';
import '../core/network/api_client.dart';
import '../providers/auth_provider.dart';

class ChatMessage {
  final String id;
  final String sender;
  final String senderName;
  final String content;
  final int createdAt;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.senderName,
    required this.content,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final role = json['role'] ?? 'user';
    return ChatMessage(
      id: json['messageId'] ?? 'msg-$role-$DateTime.now().millisecondsSinceEpoch',
      sender: role == 'assistant' ? 'ai' : 'user',
      senderName: json['senderName'] ?? (role == 'assistant' ? 'AI Assistant' : 'You'),
      content: json['content'] ?? '',
      createdAt: json['createdAt'] is int ? json['createdAt'] : int.tryParse(json['createdAt'].toString()) ?? DateTime.now().millisecondsSinceEpoch,
    );
  }
}

class AiCompanionScreen extends StatefulWidget {
  final String? topicId;
  final String? topicTitle;
  final String? subjectCode;

  const AiCompanionScreen({
    super.key,
    this.topicId,
    this.topicTitle,
    this.subjectCode,
  });

  @override
  State<AiCompanionScreen> createState() => _AiCompanionScreenState();
}

class _AiCompanionScreenState extends State<AiCompanionScreen> {
  final List<ChatMessage> _messages = [];
  String get _conversationId => widget.topicId != null ? 'topic-${widget.topicId}' : 'standalone';
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  
  // Speech to Text configuration
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadHistory();
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadHistory() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.userProfile == null) return;

    try {
      final response = await ApiClient.get('/chat/history?conversationId=$_conversationId');
      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final List<dynamic> raw = data['messages'] ?? [];
        setState(() {
          _messages.clear();
          _messages.addAll(raw.map((m) => ChatMessage.fromJson(m)));
          if (_messages.isEmpty && widget.topicTitle != null) {
            _messages.add(ChatMessage(
              id: 'msg-system-welcome',
              sender: 'ai',
              senderName: 'BrainNest AI',
              content: 'Welcome to your study session on **${widget.topicTitle}** (${widget.subjectCode}). Ask me anything about this topic, or let me know if you want to start with a summary, key definitions, or examples!',
              createdAt: DateTime.now().millisecondsSinceEpoch,
            ));
          }
        });
        _scrollToBottom();
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  void _listen() async {
    if (!_isListening) {
      bool available = await _speech.initialize(
        onStatus: (val) => print('onStatus: $val'),
        onError: (val) => print('onError: $val'),
      );
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) => setState(() {
            _textController.text = val.recognizedWords;
          }),
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  void _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    _textController.clear();
    final userMsgId = 'msg-user-$DateTime.now().millisecondsSinceEpoch';
    final userMsg = ChatMessage(
      id: userMsgId,
      sender: 'user',
      senderName: 'You',
      content: text,
      createdAt: DateTime.now().millisecondsSinceEpoch,
    );

    setState(() {
      _messages.add(userMsg);
      _isLoading = true;
    });
    _scrollToBottom();

    // Call save message endpoint in background
    _saveMessageToBackend(userMsg);

    // Call Gemini endpoint
    try {
      // Build conversation contents for API
      final contents = _messages.map((m) {
        return {
          'role': m.sender == 'user' ? 'user' : 'model',
          'parts': [{'text': m.content}]
        };
      }).toList();

      final systemInstruction = widget.topicTitle != null
          ? 'You are BrainNest AI, a helpful study assistant. You are helping the student study the topic: "${widget.topicTitle}" for the subject "${widget.subjectCode}". Focus strictly on this topic. Format your answers beautifully in Markdown.'
          : 'You are BrainNest AI, a helpful study assistant. Format your answers beautifully in Markdown.';

      final response = await ApiClient.post(
        '/ai/chat',
        {
          'contents': contents,
          'systemInstruction': systemInstruction,
        },
        timeout: const Duration(seconds: 60),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        final aiMsgId = 'msg-ai-$DateTime.now().millisecondsSinceEpoch';
        final aiMsg = ChatMessage(
          id: aiMsgId,
          sender: 'ai',
          senderName: 'BrainNest AI',
          content: data['text'] ?? '',
          createdAt: DateTime.now().millisecondsSinceEpoch,
        );

        setState(() {
          _messages.add(aiMsg);
        });
        _scrollToBottom();

        _saveMessageToBackend(aiMsg);
      }
    } catch (_) {}

    setState(() {
      _isLoading = false;
    });
  }

  void _saveMessageToBackend(ChatMessage msg) async {
    try {
      await ApiClient.post('/chat/messages', {
        'conversationId': _conversationId,
        'message': {
          'id': msg.id,
          'sender': msg.sender == 'ai' ? 'assistant' : 'user',
          'senderName': msg.senderName,
          'content': msg.content,
          'createdAt': msg.createdAt,
        }
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Study Companion'),
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Text('Start a conversation with your AI Study Companion!'),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final m = _messages[index];
                      final isAi = m.sender == 'ai';

                      return Align(
                        alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isAi ? const Color(0xFFE0F2F1) : const Color(0xFF1A237E),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(12),
                              topRight: const Radius.circular(12),
                              bottomLeft: isAi ? Radius.zero : const Radius.circular(12),
                              bottomRight: isAi ? const Radius.circular(12) : Radius.zero,
                            ),
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.8,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                m.senderName,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isAi ? const Color(0xFF454652) : Colors.white70,
                                ),
                              ),
                              const SizedBox(height: 4),
                              MarkdownBodyRenderer(
                                data: m.content,
                                selectable: true,
                                styleSheet: MarkdownStyleSheet(
                                  p: TextStyle(color: isAi ? const Color(0xFF191C1E) : Colors.white),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8.0),
              child: SizedBox(
                height: 16,
                width: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          
          // Input field
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFECEEF1))),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(_isListening ? Icons.mic : Icons.mic_none, color: const Color(0xFF00BFA5)),
                    onPressed: _listen,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      maxLines: null,
                      decoration: const InputDecoration(
                        hintText: 'Type or speak your question...',
                        border: InputBorder.none,
                        filled: false,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF1A237E)),
                    onPressed: _sendMessage,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

