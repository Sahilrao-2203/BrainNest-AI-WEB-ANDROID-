import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:brainnest/providers/auth_provider.dart';
import 'package:brainnest/providers/curriculum_provider.dart';
import 'package:brainnest/providers/mood_provider.dart';
import 'package:brainnest/providers/planner_provider.dart';
import 'package:brainnest/config/api_config.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController();
  final _courseController = TextEditingController();
  final _branchController = TextEditingController();
  final _bioController = TextEditingController();
  final _collegeController = TextEditingController();
  final _rollController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  String? _localAvatarPath;
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    _initControllers(auth.userProfile);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _courseController.dispose();
    _branchController.dispose();
    _bioController.dispose();
    _collegeController.dispose();
    _rollController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    super.dispose();
  }

  String? _selectedYear;
  String? _selectedSemester;
  final List<String> _years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  List<String> _getValidSemestersForYear(String year) {
    if (year == '1st Year') return ['Semester 1', 'Semester 2'];
    if (year == '2nd Year') return ['Semester 3', 'Semester 4'];
    if (year == '3rd Year') return ['Semester 5', 'Semester 6'];
    if (year == '4th Year') return ['Semester 7', 'Semester 8'];
    return ['Semester 1', 'Semester 2'];
  }

  void _initControllers(Map<String, dynamic>? profile) {
    if (profile != null) {
      _nameController.text = profile['name'] ?? '';
      _courseController.text = profile['course'] ?? '';
      _branchController.text = profile['branch'] ?? '';
      _bioController.text = profile['bio'] ?? '';
      _collegeController.text = profile['collegeName'] ?? '';
      _rollController.text = profile['makautRollNumber'] ?? '';
      _phoneController.text = profile['phoneNumber'] ?? '';
      _dobController.text = profile['dateOfBirth'] ?? '';
      _localAvatarPath = profile['avatarUrl'];

      String yearVal = profile['year'] ?? '1st Year';
      if (!_years.contains(yearVal)) {
        yearVal = '1st Year';
      }
      _selectedYear = yearVal;

      final validSems = _getValidSemestersForYear(yearVal);
      String semVal = profile['semester'] ?? 'Semester 1';
      if (!validSems.contains(semVal)) {
        semVal = validSems.first;
      }
      _selectedSemester = semVal;
    }
  }

  String _formatDobForDisplay(String yyyymmdd) {
    if (yyyymmdd.isEmpty) return 'Not provided';
    final parts = yyyymmdd.split('-');
    if (parts.length == 3) {
      return '${parts[2]}/${parts[1]}/${parts[0]}';
    }
    return yyyymmdd;
  }

  Future<void> _selectDate(BuildContext context) async {
    DateTime initialDate = DateTime.now().subtract(const Duration(days: 365 * 18));
    if (_dobController.text.isNotEmpty) {
      final parts = _dobController.text.split('-');
      if (parts.length == 3) {
        initialDate = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
      }
    }

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );

    if (picked != null) {
      setState(() {
        final year = picked.year.toString();
        final month = picked.month.toString().padLeft(2, '0');
        final day = picked.day.toString().padLeft(2, '0');
        _dobController.text = '$year-$month-$day';
      });
    }
  }

  void _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);
    if (pickedFile != null) {
      setState(() {
        _localAvatarPath = pickedFile.path;
      });
      // Save avatar in profile immediately
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.updateProfile(
        name: _nameController.text,
        course: _courseController.text,
        branch: _branchController.text,
        bio: _bioController.text,
        avatarUrl: pickedFile.path,
        collegeName: _collegeController.text.trim(),
        makautRollNumber: _rollController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        dateOfBirth: _dobController.text.trim(),
        year: _selectedYear,
        semester: _selectedSemester,
      );
    }
  }

  void _showImagePickerMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _saveProfile() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    final name = _nameController.text.trim();
    final college = _collegeController.text.trim();
    final roll = _rollController.text.trim();
    final phone = _phoneController.text.trim();
    final dob = _dobController.text.trim();

    if (name.isEmpty) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Full Name is required.'), backgroundColor: Colors.red),
      );
      return;
    }
    if (college.isEmpty) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('College name is required.'), backgroundColor: Colors.red),
      );
      return;
    }
    if (dob.isEmpty) {
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Date of birth is required.'), backgroundColor: Colors.red),
      );
      return;
    }
    if (phone.isNotEmpty) {
      final digitsOnly = phone.replaceAll(RegExp(r'\D'), '');
      if (digitsOnly.length < 10) {
        scaffoldMessenger.showSnackBar(
          const SnackBar(content: Text('Please enter a valid phone number (at least 10 digits).'), backgroundColor: Colors.red),
        );
        return;
      }
    }

    final success = await auth.updateProfile(
      name: name,
      course: _courseController.text.trim(),
      branch: _branchController.text.trim(),
      bio: _bioController.text.trim(),
      avatarUrl: _localAvatarPath,
      collegeName: college,
      makautRollNumber: roll,
      phoneNumber: phone,
      dateOfBirth: dob,
      year: _selectedYear,
      semester: _selectedSemester,
    );

    if (success) {
      final curriculum = Provider.of<CurriculumProvider>(context, listen: false);
      final planner = Provider.of<PlannerProvider>(context, listen: false);
      await curriculum.loadCurriculum(auth.userProfile);
      await planner.fetchProgress(auth.userProfile);

      setState(() {
        _isEditing = false;
      });
      scaffoldMessenger.showSnackBar(
        const SnackBar(content: Text('Profile updated successfully!'), backgroundColor: Colors.green),
      );
    } else {
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Update failed'), backgroundColor: Colors.red),
      );
    }
  }

  void _resetSyllabus() async {
    final curriculum = Provider.of<CurriculumProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final mood = Provider.of<MoodProvider>(context, listen: false);
    final planner = Provider.of<PlannerProvider>(context, listen: false);
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Syllabus?'),
        content: const Text('This will delete your custom uploaded syllabus PDF and revert back to standard MAKAUT 1st Year curriculum.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await curriculum.deleteCustomSyllabus(auth);
              await planner.fetchProgress(auth.userProfile);
              mood.clearMood();
              scaffoldMessenger.showSnackBar(
                const SnackBar(content: Text('Custom syllabus deleted and reset.'), backgroundColor: Colors.green),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }

  void _showDevSettings() async {
    final ipController = TextEditingController(text: await ApiConfig.getCustomIp() ?? '10.210.220.84');
    final portController = TextEditingController(text: await ApiConfig.getCustomPort() ?? '5000');
    final scaffoldMessenger = ScaffoldMessenger.of(context);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Developer Network Settings'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Specify your local PC IP and Port to connect to the backend server.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: ipController,
                  decoration: const InputDecoration(labelText: 'PC LAN IP Address', hintText: 'e.g. 10.210.220.84'),
                  onChanged: (_) {
                    setDialogState(() {});
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: portController,
                  decoration: const InputDecoration(labelText: 'Backend Port', hintText: 'e.g. 5000'),
                  keyboardType: TextInputType.number,
                  onChanged: (_) {
                    setDialogState(() {});
                  },
                ),
                const SizedBox(height: 20),
                Text(
                  'Resolved URL:\nhttp://${ipController.text.trim()}:${portController.text.trim()}/api',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () async {
                  await ApiConfig.clearCustomConfig();
                  if (context.mounted) {
                    Navigator.pop(context);
                  }
                  scaffoldMessenger.showSnackBar(
                    const SnackBar(content: Text('Config reset to default build URL.'), backgroundColor: Colors.green),
                  );
                },
                child: const Text('Reset to Default', style: TextStyle(color: Colors.redAccent)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  final ip = ipController.text.trim();
                  final port = portController.text.trim();
                  if (ip.isNotEmpty && port.isNotEmpty) {
                    await ApiConfig.setCustomConfig(ip, port);
                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                    scaffoldMessenger.showSnackBar(
                      SnackBar(content: Text('API URL updated to: ${ApiConfig.baseUrl}'), backgroundColor: Colors.green),
                    );
                  }
                },
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final curriculum = Provider.of<CurriculumProvider>(context);

    final String studentId = auth.userProfile?['studentId'] ?? 'N/A';
    final String email = auth.userProfile?['email'] ?? 'N/A';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          if (_isEditing)
            IconButton(
              icon: const Icon(Icons.save),
              onPressed: _saveProfile,
            )
          else
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {
                setState(() {
                  _isEditing = true;
                });
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Avatar image section
            Center(
              child: GestureDetector(
                onTap: _showImagePickerMenu,
                child: Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    CircleAvatar(
                      radius: 60,
                      backgroundColor: const Color(0xFFECEEF1),
                      backgroundImage: _localAvatarPath != null && _localAvatarPath!.startsWith('/')
                          ? FileImage(File(_localAvatarPath!))
                          : null,
                      child: _localAvatarPath == null || !_localAvatarPath!.startsWith('/')
                          ? const Icon(Icons.person, size: 60, color: Color(0xFF767683))
                          : null,
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF1A237E),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Profile info inputs
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    TextFormField(
                      controller: _nameController,
                      enabled: _isEditing,
                      decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person)),
                    ),
                    const SizedBox(height: 12),
                    ListTile(
                      leading: const Icon(Icons.badge_outlined),
                      title: const Text('Student ID'),
                      subtitle: Text(studentId),
                      contentPadding: EdgeInsets.zero,
                    ),
                    ListTile(
                      leading: const Icon(Icons.email_outlined),
                      title: const Text('Email Address'),
                      subtitle: Text(email),
                      contentPadding: EdgeInsets.zero,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _collegeController,
                      enabled: _isEditing,
                      decoration: const InputDecoration(
                        labelText: 'College Name *',
                        prefixIcon: Icon(Icons.business_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _rollController,
                      enabled: _isEditing,
                      decoration: const InputDecoration(
                        labelText: 'MAKAUT Roll Number',
                        prefixIcon: Icon(Icons.assignment_ind_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      enabled: _isEditing,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: _isEditing ? () => _selectDate(context) : null,
                      child: AbsorbPointer(
                        child: TextFormField(
                          controller: TextEditingController(
                            text: _formatDobForDisplay(_dobController.text),
                          ),
                          enabled: _isEditing,
                          decoration: const InputDecoration(
                            labelText: 'Date of Birth *',
                            prefixIcon: Icon(Icons.cake_outlined),
                            suffixIcon: Icon(Icons.calendar_today),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _courseController,
                      enabled: _isEditing,
                      decoration: const InputDecoration(labelText: 'Course / Degree', prefixIcon: Icon(Icons.school)),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _branchController,
                      enabled: _isEditing,
                      decoration: const InputDecoration(labelText: 'Branch / Stream', prefixIcon: Icon(Icons.splitscreen)),
                    ),
                    const SizedBox(height: 12),
                    if (!_isEditing) ...[
                      ListTile(
                        leading: const Icon(Icons.calendar_today_outlined),
                        title: const Text('Year'),
                        subtitle: Text(auth.userProfile?['year'] ?? '1st Year'),
                        contentPadding: EdgeInsets.zero,
                      ),
                      ListTile(
                        leading: const Icon(Icons.school_outlined),
                        title: const Text('Semester'),
                        subtitle: Text(auth.userProfile?['semester'] ?? 'Semester 1'),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ] else ...[
                      DropdownButtonFormField<String>(
                        value: _selectedYear,
                        decoration: const InputDecoration(
                          labelText: 'Year',
                          prefixIcon: Icon(Icons.calendar_today_outlined),
                        ),
                        items: _years.map((y) => DropdownMenuItem(value: y, child: Text(y))).toList(),
                        onChanged: (newYear) {
                          setState(() {
                            _selectedYear = newYear;
                            final validSems = _getValidSemestersForYear(newYear!);
                            if (!validSems.contains(_selectedSemester)) {
                              _selectedSemester = validSems.first;
                            }
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _selectedSemester,
                        decoration: const InputDecoration(
                          labelText: 'Semester',
                          prefixIcon: Icon(Icons.school_outlined),
                        ),
                        items: _getValidSemestersForYear(_selectedYear ?? '1st Year')
                            .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                            .toList(),
                        onChanged: (newSem) {
                          setState(() {
                            _selectedSemester = newSem;
                          });
                        },
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _bioController,
                      enabled: _isEditing,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Short Bio', prefixIcon: Icon(Icons.info)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Reset Custom Syllabus button
            if (curriculum.customSyllabus != null) ...[
              
              OutlinedButton.icon(
                onPressed: _resetSyllabus,
                icon: const Icon(Icons.delete_sweep, color: Colors.redAccent),
                label: const Text('Reset Syllabus to Standard', style: TextStyle(color: Colors.redAccent)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.redAccent),
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Developer Network Settings Button (Development only)
            if (kDebugMode) ...[
              OutlinedButton.icon(
                onPressed: _showDevSettings,
                icon: const Icon(Icons.settings_ethernet, color: Color(0xFF06B6D4)),
                label: const Text('Developer Network Settings', style: TextStyle(color: Color(0xFF06B6D4), fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF06B6D4)),
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Logout Button
            ElevatedButton.icon(
              onPressed: () {
                auth.logout();
              },
              icon: const Icon(Icons.logout),
              label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 32),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


