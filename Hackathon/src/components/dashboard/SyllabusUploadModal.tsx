import React, { useState, useRef } from 'react';
import { useUserProfile } from '../../mock/userProfile';
import { processSelectedFile } from '../../services/fileProcessingService';
import { curriculumService } from '../../services/curriculumService';

interface SyllabusUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface ExtractedTopic {
  name: string;
  subtopics: string[];
}

interface ExtractedSubject {
  name: string;
  code: string;
  type?: 'Theory' | 'Practical';
  credits: number | null;
  marks: number | null;
  units: Array<{
    name: string;
    topics: ExtractedTopic[];
  }>;
}

interface ExtractedSyllabus {
  course: string;
  branch: string;
  year: string;
  semester: string;
  subjects: ExtractedSubject[];
}

export const SyllabusUploadModal: React.FC<SyllabusUploadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { profile, updateProfile } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'loading' | 'review' | 'mismatch_warning' | 'replace_warning'>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [syllabus, setSyllabus] = useState<ExtractedSyllabus | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExtractionIncomplete, setIsExtractionIncomplete] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file (.pdf only).');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile || isProcessing) return;

    setStep('loading');
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Step 1: Uploading/Reading
      setLoadingStep(1);
      setLoadingMessage('Reading syllabus file...');
      await new Promise((r) => setTimeout(r, 800));

      // Step 2: PDF Parsing
      setLoadingStep(2);
      setLoadingMessage('Extracting text from PDF...');
      const processed = await processSelectedFile(selectedFile);
      if (!processed.content || processed.content.trim().length < 50 || processed.content.includes('[PDF Document:')) {
        throw new Error("This PDF appears to be scanned or image-based. We couldn't extract reliable text.");
      }
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: AI Analysis
      setLoadingStep(3);
      setLoadingMessage('Analyzing curriculum structure with AI...');

      const prompt = `Here is the syllabus text extracted from a PDF course document:
---
${processed.content.slice(0, 150000)}
---
Analyze the syllabus, identify the course, branch, year, semester, and extract all subjects with their code, credits, marks, and units (with unit name and topics list. Topics must contain nested subtopics if available).
Respond ONLY with a valid JSON object matching the requested schema. Do NOT wrap the JSON in markdown code blocks like \`\`\`json ... \`\`\`. Do NOT add any extra text or commentary. Verify that the output is strictly valid JSON.`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: `You are an expert academic curriculum parser. Your task is to analyze the syllabus text and return a valid JSON object.
JSON Schema:
{
  "course": "String (e.g. B.Tech, M.Tech)",
  "branch": "String (e.g. Computer Science & Engineering)",
  "year": "String (e.g. 1st Year, 2nd Year)",
  "semester": "String (e.g. Semester 2, 1st Semester)",
  "subjects": [
    {
      "name": "String",
      "code": "String",
      "type": "String (Theory or Practical)",
      "credits": Number or null,
      "marks": Number or null,
      "units": [
        {
          "name": "String (Unit name)",
          "topics": [
            {
              "name": "String (Topic title)",
              "subtopics": ["String (Subtopic title)"]
            }
          ]
        }
      ]
    }
  ]
}
Return only the raw JSON. Do not include markdown code block syntax. Verify JSON syntax before outputting.
CRITICAL REQUIREMENTS FOR COMPLETENESS:
- You must extract the COMPLETE syllabus. Do not stop after the first unit or first subject.
- Do not summarize units or omit topics. Every detected unit must be included.
- Process the entire supplied syllabus text. Preserve the original order of units and topics.
- Do not merge separate units. Do not silently discard topics. Continue until the entire syllabus has been processed.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze syllabus with Gemini. Please try again.');
      }

      const data = await response.json();
      if (!data.success || !data.text) {
        throw new Error('AI analysis failed to return curriculum structure.');
      }

      // Step 4: Preparing Review
      setLoadingStep(4);
      setLoadingMessage('Preparing review screen...');

      let cleanText = data.text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
      }

      const parsedSyllabus = JSON.parse(cleanText.trim()) as ExtractedSyllabus;

      // Basic schema verification
      if (!parsedSyllabus.subjects || !Array.isArray(parsedSyllabus.subjects)) {
        throw new Error('AI analysis returned invalid syllabus structure.');
      }

      // Enforce nested structures
      parsedSyllabus.subjects.forEach((subj) => {
        if (!Array.isArray(subj.units)) {
          subj.units = [];
        }
        subj.units.forEach((unit) => {
          if (!Array.isArray(unit.topics)) {
            unit.topics = [];
          }
          unit.topics = unit.topics.map((t: any) => {
            if (typeof t === 'string') {
              return { name: t, subtopics: [] };
            }
            return {
              name: t.name || '',
              subtopics: Array.isArray(t.subtopics) ? t.subtopics : [],
            };
          });
        });
      });

      // Completeness check
      const isComplete = checkExtractionCompleteness(parsedSyllabus, processed.content);
      if (!isComplete) {
        setIsExtractionIncomplete(true);
        setErrorMessage('Some syllabus content could not be extracted completely. Please review the extracted syllabus before continuing.');
      } else {
        setIsExtractionIncomplete(false);
      }

      setSyllabus(parsedSyllabus);
      await new Promise((r) => setTimeout(r, 600));
      setStep('review');
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Syllabus analysis error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during syllabus processing.');
      setStep('select');
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (field: keyof ExtractedSyllabus, value: string) => {
    if (!syllabus) return;
    setSyllabus({ ...syllabus, [field]: value });
  };

  const handleSubjectChange = (subjectIdx: number, field: keyof ExtractedSubject, value: any) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], [field]: value };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleUnitNameChange = (subjectIdx: number, unitIdx: number, value: string) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units];
    updatedUnits[unitIdx] = { ...updatedUnits[unitIdx], name: value };
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleTopicNameChange = (subjectIdx: number, unitIdx: number, topicIdx: number, value: string) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units];
    const updatedTopics = [...updatedUnits[unitIdx].topics];
    updatedTopics[topicIdx] = { ...updatedTopics[topicIdx], name: value };
    updatedUnits[unitIdx] = { ...updatedUnits[unitIdx], topics: updatedTopics };
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleSubtopicsChange = (subjectIdx: number, unitIdx: number, topicIdx: number, value: string) => {
    if (!syllabus) return;
    const subtopicArray = value.split(',').map((s) => s.trim()).filter(Boolean);
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units];
    const updatedTopics = [...updatedUnits[unitIdx].topics];
    updatedTopics[topicIdx] = { ...updatedTopics[topicIdx], subtopics: subtopicArray };
    updatedUnits[unitIdx] = { ...updatedUnits[unitIdx], topics: updatedTopics };
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleAddTopic = (subjectIdx: number, unitIdx: number) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units];
    const updatedTopics = [...updatedUnits[unitIdx].topics, { name: 'New Topic', subtopics: [] }];
    updatedUnits[unitIdx] = { ...updatedUnits[unitIdx], topics: updatedTopics };
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleRemoveTopic = (subjectIdx: number, unitIdx: number, topicIdx: number) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units];
    const updatedTopics = updatedUnits[unitIdx].topics.filter((_, idx) => idx !== topicIdx);
    updatedUnits[unitIdx] = { ...updatedUnits[unitIdx], topics: updatedTopics };
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleAddUnit = (subjectIdx: number) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = [...updatedSubjects[subjectIdx].units, { name: 'New Unit', topics: [{ name: 'New Topic', subtopics: [] }] }];
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleRemoveUnit = (subjectIdx: number, unitIdx: number) => {
    if (!syllabus) return;
    const updatedSubjects = [...syllabus.subjects];
    const updatedUnits = updatedSubjects[subjectIdx].units.filter((_, idx) => idx !== unitIdx);
    updatedSubjects[subjectIdx] = { ...updatedSubjects[subjectIdx], units: updatedUnits };
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const handleAddSubject = () => {
    if (!syllabus) return;
    const newSubject: ExtractedSubject = {
      name: 'New Subject',
      code: 'SUBJ-NEW',
      type: 'Theory',
      credits: 3,
      marks: 100,
      units: [{ name: 'Unit 1: Introduction', topics: [{ name: 'Introduction Topic', subtopics: [] }] }]
    };
    setSyllabus({ ...syllabus, subjects: [...syllabus.subjects, newSubject] });
  };

  const handleRemoveSubject = (subjectIdx: number) => {
    if (!syllabus) return;
    const updatedSubjects = syllabus.subjects.filter((_, idx) => idx !== subjectIdx);
    setSyllabus({ ...syllabus, subjects: updatedSubjects });
  };

  const extractNum = (str?: string) => {
    const m = (str || '').match(/\d+/);
    return m ? m[0] : '';
  };

  const checkProfileMismatch = (): boolean => {
    if (!profile || !syllabus) return false;

    const norm = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/and/g, '');

    const syllabusCourse = norm(syllabus.course);
    const profileCourse = norm(profile.course);

    const syllabusBranch = norm(syllabus.branch);
    const profileBranch = norm(profile.branch);

    const syllabusYear = extractNum(syllabus.year);
    const profileYear = extractNum(profile.year);

    const syllabusSem = extractNum(syllabus.semester);
    const profileSem = extractNum(profile.semester);

    const courseMismatch = syllabusCourse !== profileCourse;
    const branchMatch = syllabusBranch !== profileBranch;
    const yearMatch = syllabusYear !== profileYear;
    const semMatch = syllabusSem !== profileSem;

    return courseMismatch || branchMatch || yearMatch || semMatch;
  };

  const checkExtractionCompleteness = (extracted: ExtractedSyllabus, sourceText: string): boolean => {
    if (!extracted.subjects || extracted.subjects.length === 0) return true;

    // Sort subjects by their appearance in the source text to slice segments correctly
    const subjectsWithPositions = extracted.subjects.map((sub) => {
      let pos = -1;
      if (sub.code) {
        pos = sourceText.indexOf(sub.code);
      }
      if (pos === -1 && sub.name) {
        pos = sourceText.indexOf(sub.name);
      }
      return { subject: sub, pos };
    }).filter(s => s.pos !== -1);

    // Sort by ascending position
    subjectsWithPositions.sort((a, b) => a.pos - b.pos);

    let isAnyIncomplete = false;

    for (let i = 0; i < subjectsWithPositions.length; i++) {
      const current = subjectsWithPositions[i];
      const next = subjectsWithPositions[i + 1];
      const startIdx = current.pos;
      const endIdx = next ? next.pos : sourceText.length;

      const subjectText = sourceText.slice(startIdx, endIdx);

      // Count units in source text
      const patternA = /\b(?:unit|module|mod)\b\s*(?:[0-9]+|[ivx]+)/gi;
      const matchesA = subjectText.match(patternA) || [];
      const patternB = /(?:^|[\n\r]|Unit\s+Content\s+Hrs\/Unit\s+Marks\/Unit|[\d\]L])\s*([1-9])\.?\s+[A-Z][a-zA-Z\s\-\&\,]{10,80}/g;
      let matchesB = [];
      let match;
      patternB.lastIndex = 0;
      while ((match = patternB.exec(subjectText)) !== null) {
        matchesB.push(match[0].trim());
      }
      const sourceUnitsDetected = Math.max(matchesA.length, matchesB.length);
      const aiUnitsExtracted = current.subject.units ? current.subject.units.length : 0;

      console.log(`[SYLLABUS] Subject: ${current.subject.name} (${current.subject.code})`);
      console.log(`[SYLLABUS] Source units detected: ${sourceUnitsDetected}`);
      console.log(`[SYLLABUS] AI units extracted: ${aiUnitsExtracted}`);
      console.log(`[SYLLABUS] Extraction incomplete: ${sourceUnitsDetected >= 3 && aiUnitsExtracted <= 2 ? 'YES' : 'NO'}`);

      // If source detected 3 or more units but AI returned 1 or 2: it's incomplete
      if (sourceUnitsDetected >= 3 && aiUnitsExtracted <= 2) {
        isAnyIncomplete = true;
      }
    }

    return !isAnyIncomplete;
  };

  const hasDuplicateCodes = (): boolean => {
    if (!syllabus || !syllabus.subjects) return false;
    const codes = syllabus.subjects
      .map((s) => s.code?.trim().toUpperCase())
      .filter(Boolean);
    const uniqueCodes = new Set(codes);
    return uniqueCodes.size !== codes.length;
  };

  const isSyllabusInvalid = (): boolean => {
    if (!syllabus) return true;
    if (isExtractionIncomplete) return true;
    if (!syllabus.subjects || syllabus.subjects.length === 0) return true;
    if (syllabus.subjects.some((s) => !s.name?.trim() || !s.code?.trim())) return true;
    if (hasDuplicateCodes()) return true;
    return false;
  };

  const handleReviewSubmit = () => {
    if (!syllabus) return;

    if (syllabus.subjects.length === 0) {
      setErrorMessage("Couldn't detect any subjects from this PDF. Please add or review the subjects before continuing.");
      return;
    }

    if (syllabus.subjects.some((s) => !s.name?.trim() || !s.code?.trim())) {
      setErrorMessage("Please complete all required subject fields before continuing.");
      return;
    }

    if (hasDuplicateCodes()) {
      setErrorMessage("Duplicate subject codes detected. Please make sure all subject codes are unique.");
      return;
    }

    if (checkProfileMismatch()) {
      setStep('mismatch_warning');
    } else if (curriculumService.hasCustomSyllabus()) {
      setStep('replace_warning');
    } else {
      executeConfirmation();
    }
  };

  const executeConfirmation = async () => {
    if (!syllabus || !profile || isProcessing) return;

    setIsProcessing(true);
    setStep('loading');
    setLoadingStep(1);
    setLoadingMessage('Saving syllabus...');
    await new Promise((r) => setTimeout(r, 600));

    try {
      // Update profile to match the syllabus semester, year, etc.
      try {
        await updateProfile({
          course: syllabus.course,
          branch: syllabus.branch,
          year: syllabus.year,
          semester: syllabus.semester,
        });
      } catch (profileError) {
        console.warn('Failed to update profile to match syllabus:', profileError);
      }

      await curriculumService.saveCustomSyllabus(syllabus);
      console.log('[SYLLABUS] Upload completed', syllabus);

      setLoadingMessage('Generating study plan...');
      await new Promise((r) => setTimeout(r, 800));

      onConfirm();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErrorMessage('Failed to save syllabus plan. Reason: ' + (e.message || 'Please try again.'));
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-surface-container border border-white/10 rounded-lg flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">auto_stories</span>
            <div>
              <h2 className="text-lg font-bold text-on-surface">Upload Your Syllabus</h2>
              <p className="text-xs text-on-surface-variant">Extract and generate a study plan from your syllabus PDF</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {errorMessage && (
            <div className="mb-6 p-4 bg-error-container/30 border border-error/20 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
              <p className="text-xs text-error leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-primary/45 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Click to select course syllabus PDF</p>
                  <p className="text-xs text-on-surface-variant mt-1.5">Only PDF files up to 10MB are accepted</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="p-4 rounded-xl bg-surface-container-high/60 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-primary text-2xl">picture_as_pdf</span>
                    <div className="min-w-0">
                      <p className="font-medium text-on-surface truncate text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-on-surface-variant">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-on-surface-variant hover:text-error p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center p-8 space-y-6">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <span className="material-symbols-outlined text-primary text-2xl animate-pulse">auto_awesome</span>
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg text-on-surface">{loadingMessage}</p>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4].map((s) => (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all duration-300 ${s < loadingStep
                          ? 'w-4 bg-primary'
                          : s === loadingStep
                            ? 'w-8 bg-primary animate-pulse'
                            : 'w-1.5 bg-white/10'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'review' && syllabus && (
            <div className="space-y-6">
              {/* Profile Details Edit Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-high/40 border border-white/10">
                 <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Course</label>
                  <input
                    type="text"
                    value={syllabus.course}
                    onChange={(e) => handleFieldChange('course', e.target.value)}
                    className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Branch</label>
                  <input
                    type="text"
                    value={syllabus.branch}
                    onChange={(e) => handleFieldChange('branch', e.target.value)}
                    className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Year</label>
                  <input
                    type="text"
                    value={syllabus.year}
                    onChange={(e) => handleFieldChange('year', e.target.value)}
                    className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Semester</label>
                  <input
                    type="text"
                    value={syllabus.semester}
                    onChange={(e) => handleFieldChange('semester', e.target.value)}
                    className="w-full bg-surface-container border border-white/10 rounded-lg px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                  />
                </div>
              </div>

              {/* Completeness Warning Banner */}
              {isExtractionIncomplete && (
                <div className="p-4 bg-warning-container/20 border border-warning/20 rounded-xl flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-warning text-xl shrink-0">warning</span>
                    <div>
                      <p className="text-xs text-warning font-semibold">Incomplete Syllabus Extracted</p>
                      <p className="text-xs text-warning/80 mt-0.5 font-normal">
                        Some syllabus content could not be extracted completely. Please review the extracted syllabus before continuing.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExtractionIncomplete(false);
                      setErrorMessage(null);
                    }}
                    className="px-3 py-1 rounded bg-warning/10 hover:bg-warning/20 text-warning text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Mark as Reviewed
                  </button>
                </div>
              )}

              {/* Validation Warning Banners */}
              {syllabus.subjects.length === 0 ? (
                <div className="p-4 bg-error-container/20 border border-error/20 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-error text-xl shrink-0">warning</span>
                  <p className="text-xs text-error">
                    Couldn't detect any subjects from this PDF. Please add or review the subjects before continuing.
                  </p>
                </div>
              ) : syllabus.subjects.some((s) => !s.name?.trim() || !s.code?.trim()) ? (
                <div className="p-4 bg-error-container/20 border border-error/20 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-error text-xl shrink-0">warning</span>
                  <p className="text-xs text-error">
                    Please complete all required subject fields before continuing.
                  </p>
                </div>
              ) : hasDuplicateCodes() ? (
                <div className="p-4 bg-error-container/20 border border-error/20 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-error text-xl shrink-0">warning</span>
                  <p className="text-xs text-error">
                    Duplicate subject codes detected. Please make sure all subject codes are unique.
                  </p>
                </div>
              ) : null}

              {/* Subjects and Topics List */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-semibold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                    <span>Subjects List</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-3 py-1 text-xs font-semibold rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    <span>Add Subject</span>
                  </button>
                </div>

                {syllabus.subjects.map((subj, subjIdx) => (
                  <div
                    key={subjIdx}
                    className="p-5 rounded-xl bg-surface-container-high/40 border border-white/10 space-y-4"
                  >
                    {/* Subject Detail Line */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                         <input
                          type="text"
                          value={subj.name}
                          placeholder="Subject Name"
                          onChange={(e) => handleSubjectChange(subjIdx, 'name', e.target.value)}
                          className="flex-1 font-semibold text-sm bg-surface-container border border-white/15 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                        />
                        <input
                          type="text"
                          value={subj.code}
                          placeholder="Code"
                          onChange={(e) => handleSubjectChange(subjIdx, 'code', e.target.value)}
                          className="w-24 font-mono text-xs bg-surface-container border border-white/15 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                        />
                        <select
                          value={subj.type || 'Theory'}
                          onChange={(e) => handleSubjectChange(subjIdx, 'type', e.target.value)}
                          className="w-28 text-xs bg-surface-container border border-white/15 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all cursor-pointer"
                        >
                          <option value="Theory">Theory</option>
                          <option value="Practical">Practical</option>
                        </select>
                        <input
                          type="number"
                          value={subj.credits || ''}
                          placeholder="Credits"
                          onChange={(e) => handleSubjectChange(subjIdx, 'credits', e.target.value ? parseInt(e.target.value, 10) : null)}
                          className="w-20 text-xs bg-surface-container border border-white/15 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                        />
                        <input
                          type="number"
                          value={subj.marks || ''}
                          placeholder="Marks"
                          onChange={(e) => handleSubjectChange(subjIdx, 'marks', e.target.value ? parseInt(e.target.value, 10) : null)}
                          className="w-20 text-xs bg-surface-container border border-white/15 rounded-lg px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/40 transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(subjIdx)}
                        className="text-on-surface-variant hover:text-error p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete Subject"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>

                    {/* Units & Modules */}
                    <div className="space-y-4 pl-4 border-l border-white/10">
                      {subj.units.map((unit, unitIdx) => (
                        <div key={unitIdx} className="space-y-2">
                          <div className="flex items-center justify-between gap-2.5">
                            <input
                              type="text"
                              value={unit.name}
                              placeholder="Unit/Module Name"
                              onChange={(e) => handleUnitNameChange(subjIdx, unitIdx, e.target.value)}
                              className="flex-1 font-semibold text-xs text-on-surface-variant bg-transparent border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none py-0.5"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAddTopic(subjIdx, unitIdx)}
                                className="p-1 hover:bg-white/5 rounded-lg text-primary transition-colors cursor-pointer"
                                title="Add Topic"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveUnit(subjIdx, unitIdx)}
                                className="p-1 hover:bg-white/5 rounded-lg text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                title="Delete Unit"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Topics List */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                            {unit.topics.map((topic, topicIdx) => (
                              <div
                                key={topicIdx}
                                className="flex flex-col gap-1.5 bg-surface-container/50 border border-white/5 rounded-lg p-2.5 group relative"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={topic.name}
                                    placeholder="Topic title"
                                    onChange={(e) => handleTopicNameChange(subjIdx, unitIdx, topicIdx, e.target.value)}
                                    className="flex-1 bg-transparent text-xs text-on-surface font-semibold focus:outline-none border-b border-transparent focus:border-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTopic(subjIdx, unitIdx, topicIdx)}
                                    className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                                    title="Delete Topic"
                                  >
                                    <span className="material-symbols-outlined text-xs">close</span>
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={topic.subtopics ? topic.subtopics.join(', ') : ''}
                                  placeholder="Subtopics (comma-separated)"
                                  onChange={(e) => handleSubtopicsChange(subjIdx, unitIdx, topicIdx, e.target.value)}
                                  className="w-full bg-transparent text-[11px] text-on-surface-variant focus:outline-none border-b border-transparent focus:border-primary"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddUnit(subjIdx)}
                        className="text-xs text-primary hover:text-primary-fixed font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Unit/Module</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'mismatch_warning' && syllabus && profile && (
            <div className="space-y-6 max-w-md mx-auto py-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <span className="material-symbols-outlined text-yellow-500 text-5xl animate-bounce">warning</span>
                <h3 className="text-lg font-bold text-on-surface">Profile Mismatch Warning</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  The uploaded syllabus structure appears to deviate from your registered academic profile details:
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-high/60 border border-white/10 space-y-3.5 text-xs">
                <div className="grid grid-cols-3 font-semibold pb-1.5 border-b border-white/10 text-on-surface-variant">
                  <span>Field</span>
                  <span>Registered Profile</span>
                  <span>Extracted Syllabus</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-semibold text-on-surface-variant">Course</span>
                  <span className="text-on-surface">{profile.course || 'N/A'}</span>
                  <span className={profile.course?.toLowerCase() !== syllabus.course?.toLowerCase() ? 'text-yellow-500 font-semibold' : 'text-on-surface'}>{syllabus.course || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-semibold text-on-surface-variant">Branch</span>
                  <span className="text-on-surface">{profile.branch || 'N/A'}</span>
                  <span className={profile.branch?.toLowerCase() !== syllabus.branch?.toLowerCase() &&
                    !(profile.branch?.toLowerCase().includes('computer science') && syllabus.branch?.toLowerCase().includes('computer science'))
                    ? 'text-yellow-500 font-semibold' : 'text-on-surface'}>{syllabus.branch || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-semibold text-on-surface-variant">Year</span>
                  <span className="text-on-surface">{profile.year || 'N/A'}</span>
                  <span className={extractNum(profile.year) !== extractNum(syllabus.year) ? 'text-yellow-500 font-semibold' : 'text-on-surface'}>{syllabus.year || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-semibold text-on-surface-variant">Semester</span>
                  <span className="text-on-surface">{profile.semester || 'N/A'}</span>
                  <span className={extractNum(profile.semester) !== extractNum(syllabus.semester) ? 'text-yellow-500 font-semibold' : 'text-on-surface'}>{syllabus.semester || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-on-surface hover:bg-white/5 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Back to Correction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (curriculumService.hasCustomSyllabus()) {
                      setStep('replace_warning');
                    } else {
                      executeConfirmation();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          )}

          {step === 'replace_warning' && (
            <div className="space-y-6 max-w-md mx-auto py-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
                <h3 className="text-lg font-bold text-on-surface font-headline-sm">Replace Existing Study Plan?</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  An active custom study plan was detected. Overwriting will replace your current subjects and daily checklist.
                  Your previously completed topic history will NOT be destroyed.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-on-surface hover:bg-white/5 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmation}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-semibold text-sm shadow-md transition-colors cursor-pointer"
                >
                  Replace Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-surface-container-high/40 flex items-center justify-between shrink-0">
          <span className="text-xs text-on-surface-variant/80">
            {step === 'select' && 'Select a course curriculum PDF.'}
            {step === 'review' && 'Correct any AI inaccuracies directly.'}
            {step === 'loading' && 'Analysis can take 10-15 seconds.'}
          </span>
          <div className="flex items-center gap-3">
            {step === 'select' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl font-semibold text-sm text-on-surface-variant hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile}
                  onClick={handleStartAnalysis}
                  className="px-5 py-2 rounded-xl font-semibold text-sm bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Analyze Syllabus</span>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </button>
              </>
            )}

            {step === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-4 py-2 rounded-xl font-semibold text-sm text-on-surface-variant hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Re-upload PDF
                </button>
                <button
                  type="button"
                  disabled={isSyllabusInvalid()}
                  onClick={handleReviewSubmit}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>Confirm & Generate Study Plan</span>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
