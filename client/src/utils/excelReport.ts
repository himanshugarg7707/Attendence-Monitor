/**
 * ═══════════════════════════════════════════════════════════════
 *  Excel Report Generator (.xlsx)
 *  Generates professional academic attendance reports for faculty
 *  with institutional headers, summary metrics, and audit roster.
 * ═══════════════════════════════════════════════════════════════
 */

import * as XLSX from 'xlsx';
import type { StudentVerifiedPayload } from '../types';

export interface ExcelReportOptions {
  className: string;
  facultyName: string;
  facultyId: string;
  department?: string;
  sessionId: string;
  hotspotSSID?: string;
  sessionDate?: string;
  students: StudentVerifiedPayload[];
}

export function generateFacultyAttendanceExcel(options: ExcelReportOptions): void {
  const {
    className,
    facultyName,
    facultyId,
    department = 'Department of Computer Science',
    sessionId,
    hotspotSSID = 'Faculty Hotspot',
    sessionDate = new Date().toLocaleDateString(),
    students,
  } = options;

  // 1. Build Header & Metadata rows
  const metaRows = [
    ['INSTITUTE OF TECHNOLOGY & SCIENCE'],
    ['OFFICIAL CLASSROOM ATTENDANCE REPORT'],
    [],
    ['Course / Subject:', className, '', 'Session ID:', sessionId],
    ['Faculty In-Charge:', `${facultyName} (${facultyId})`, '', 'Date:', sessionDate],
    ['Department:', department, '', 'Hotspot Shield:', hotspotSSID],
    ['Total Verified Present:', students.length, '', 'Generated At:', new Date().toLocaleTimeString()],
    [],
    ['STUDENT ATTENDANCE ROSTER'],
    [
      'S.No',
      'Student ID',
      'Full Name',
      'Verification Status',
      'Timestamp',
      'Hotspot SSID',
      'Signal Strength (dBm)',
      'Signal Quality',
      'Biometric Check',
      'Verification Checks',
    ],
  ];

  // 2. Build Student Data Rows
  const studentRows = students.map((s, idx) => {
    const passedChecks = s.verificationSteps.filter((step) => step.passed).length;
    const totalChecks = s.verificationSteps.length;
    const signalQuality = s.signalStrength > -50 ? 'Strong (<1m)' : s.signalStrength > -60 ? 'Good (2-3m)' : 'Fair';

    return [
      idx + 1,
      s.studentId,
      s.studentName,
      'PRESENT',
      new Date(s.verifiedAt).toLocaleTimeString(),
      s.hotspotSSID || hotspotSSID,
      `${s.signalStrength} dBm`,
      signalQuality,
      'FIDO2 / Passkey Verified',
      `${passedChecks}/${totalChecks} Passed`,
    ];
  });

  // Combine into single worksheet data
  const sheetData = [...metaRows, ...studentRows];

  // 3. Create Worksheet and Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths for readability in Microsoft Excel
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 16 }, // Student ID
    { wch: 24 }, // Full Name
    { wch: 20 }, // Verification Status
    { wch: 14 }, // Timestamp
    { wch: 28 }, // Hotspot SSID
    { wch: 22 }, // Signal Strength
    { wch: 18 }, // Signal Quality
    { wch: 24 }, // Biometric Check
    { wch: 20 }, // Verification Checks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Roster');

  // 4. Download as real .xlsx file
  const filename = `Attendance_${className.replace(/\s+/g, '_')}_${sessionId}_${sessionDate.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

