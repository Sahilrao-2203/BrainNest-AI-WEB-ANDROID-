class MakautSubject {
  final String code;
  final String name;
  final int semester;
  final String icon;
  final String color;

  MakautSubject({
    required this.code,
    required this.name,
    required this.semester,
    required this.icon,
    required this.color,
  });

  factory MakautSubject.fromJson(Map<String, dynamic> json) {
    return MakautSubject(
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      semester: json['semester'] is int ? json['semester'] : int.tryParse(json['semester'].toString()) ?? 1,
      icon: json['icon'] ?? 'book',
      color: json['color'] ?? 'primary',
    );
  }

  Map<String, dynamic> toJson() => {
    'code': code,
    'name': name,
    'semester': semester,
    'icon': icon,
    'color': color,
  };
}

class CurriculumTopic {
  final String id;
  final String subject;
  final String subjectCode;
  final int semester;
  final String module;
  final String topic;
  final String subtopic;
  final String difficulty;
  final List<String> moodSuitability;
  final String learningType;
  final String priority;
  final String subjectColor;
  final String estimatedDuration;

  CurriculumTopic({
    required this.id,
    required this.subject,
    required this.subjectCode,
    required this.semester,
    required this.module,
    required this.topic,
    required this.subtopic,
    required this.difficulty,
    required this.moodSuitability,
    required this.learningType,
    required this.priority,
    required this.subjectColor,
    required this.estimatedDuration,
  });

  factory CurriculumTopic.fromJson(Map<String, dynamic> json) {
    return CurriculumTopic(
      id: json['id'] ?? '',
      subject: json['subject'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      semester: json['semester'] is int ? json['semester'] : int.tryParse(json['semester'].toString()) ?? 1,
      module: json['module'] ?? '',
      topic: json['topic'] ?? '',
      subtopic: json['subtopic'] ?? '',
      difficulty: json['difficulty'] ?? 'easy',
      moodSuitability: List<String>.from(json['moodSuitability'] ?? []),
      learningType: json['learningType'] ?? 'learning',
      priority: json['priority'] ?? 'medium',
      subjectColor: json['subjectColor'] ?? 'primary',
      estimatedDuration: json['estimatedDuration'] ?? '30 mins',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'subject': subject,
    'subjectCode': subjectCode,
    'semester': semester,
    'module': module,
    'topic': topic,
    'subtopic': subtopic,
    'difficulty': difficulty,
    'moodSuitability': moodSuitability,
    'learningType': learningType,
    'priority': priority,
    'subjectColor': subjectColor,
    'estimatedDuration': estimatedDuration,
  };
}
