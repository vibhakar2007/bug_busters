import * as XLSX from 'xlsx';
import { Participant, ParticipantResult } from '@/types/participant';
import { calculateAuthoritativeDuration } from '@/lib/utils/time';

export interface ScoreExportItem {
  rank: number | string;
  name: string;
  phone: string;
  start_time?: string;
  end_time?: string;
  time_taken_formatted?: string;
  score: number;
  total_questions: number;
  total_marks?: number;
  total_max_marks?: number;
  hands_on_score?: number;
  hands_on_total?: number;
  hands_on_marks?: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  violation_count: number;
  integrity_status: string;
  validation_status: string;
  submitted_at?: string;
  quiz_title?: string;
}

export function exportScoresToExcel(
  items: ScoreExportItem[],
  filename: string = 'BugBusters_Final_Scores.xlsx'
) {
  const formattedData = items.map((item) => {
    const mcqMarks = item.score * 1;
    const handsOnMarks = (item.hands_on_score ?? 0) * 5;
    const totalMarks = item.total_marks ?? (mcqMarks + handsOnMarks);
    const totalMaxMarks = item.total_max_marks ?? (item.total_questions + ((item.hands_on_total ?? 10) * 5));

    return {
      'Rank': item.rank,
      'Participant Name': item.name,
      'Phone Number': item.phone,
      'MCQ Marks (40 Max)': `${mcqMarks} / ${item.total_questions}`,
      'Hands-On Debug Marks (50 Max)': `${handsOnMarks} / 50`,
      'Total Marks (90 Max)': `${totalMarks} / 90`,
      'Time Taken': item.time_taken_formatted || 'N/A',
      'Start Time': item.start_time || 'N/A',
      'End Time': item.end_time || 'N/A',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 10 }, // Rank
    { wch: 24 }, // Name
    { wch: 18 }, // Phone
    { wch: 22 }, // MCQ Marks
    { wch: 28 }, // Hands-On Debug Marks
    { wch: 22 }, // Total Marks
    { wch: 16 }, // Time Taken
    { wch: 16 }, // Start Time
    { wch: 16 }, // End Time
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard Scores');

  XLSX.writeFile(workbook, filename);
}

function formatTimeString(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'N/A';
  }
}

function calculateDurationFormatted(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime) return 'N/A';
  try {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return 'N/A';

    let end = endTime ? new Date(endTime).getTime() : Date.now();
    if (isNaN(end) || end < start) end = Date.now();

    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  } catch {
    return 'N/A';
  }
}

export function buildExportItemsFromData(
  participants: Participant[],
  results: ParticipantResult[]
): ScoreExportItem[] {
  const resultMap = new Map<number, ParticipantResult>();
  results.forEach((r) => resultMap.set(r.participant_id, r));

  const validSorted = participants
    .filter((p) => (p.score !== null || p.status === 'completed') && p.status !== 'flagged' && (p.violation_count || 0) < 2)
    .sort((a, b) => {
      const resA = resultMap.get(a.participant_id);
      const resB = resultMap.get(b.participant_id);
      const handsOnA = resA?.hands_on_score ?? a.hands_on_score ?? (a.hands_on_submissions ? Object.values(a.hands_on_submissions).filter((s) => s.is_solved).length : 0);
      const handsOnB = resB?.hands_on_score ?? b.hands_on_score ?? (b.hands_on_submissions ? Object.values(b.hands_on_submissions).filter((s) => s.is_solved).length : 0);
      const totalMarksA = ((a.score || 0) * 1) + (handsOnA * 5);
      const totalMarksB = ((b.score || 0) * 1) + (handsOnB * 5);

      const scoreDiff = totalMarksB - totalMarksA;
      if (scoreDiff !== 0) return scoreDiff;
      return (a.violation_count || 0) - (b.violation_count || 0);
    });

  const rankMap = new Map<number, number>();
  validSorted.forEach((item, index) => {
    rankMap.set(item.participant_id, index + 1);
  });

  return participants
    .filter((p) => p.score !== null || p.status === 'completed')
    .map((p) => {
      const res = resultMap.get(p.participant_id) || null;
      const totalQ = res?.total_questions || p.total_questions || 40;
      const score = res?.score ?? (p.score || 0);
      const correct = res?.correct_count ?? score;
      const incorrect = res?.incorrect_count ?? Math.max(0, totalQ - correct);
      const unanswered = res?.unanswered_count ?? 0;

      const violations = p.violation_count || 0;
      const isFlagged = p.status === 'flagged' || violations >= 2;
      const isValid = !isFlagged;
      const rank = isValid ? `#${rankMap.get(p.participant_id) || 1}` : 'Disqualified';

      const integrity =
        violations === 0
          ? 'Verified Clean'
          : violations >= 2
          ? 'Audit Flagged'
          : 'Minor Warning';

      const handsOnSolved =
        res?.hands_on_score ??
        p.hands_on_score ??
        (p.hands_on_submissions ? Object.values(p.hands_on_submissions).filter((s) => s.is_solved).length : 0);
      const handsOnTotal = res?.hands_on_total ?? p.hands_on_total ?? 10;

      const mcqMarks = score * 1;
      const handsOnMarks = handsOnSolved * 5;
      const totalMarks = mcqMarks + handsOnMarks;
      const totalMaxMarks = (totalQ * 1) + (handsOnTotal * 5);

      const durationFormatted = calculateAuthoritativeDuration(p.start_time, p.end_time).formatted;

      return {
        rank,
        name: p.name,
        phone: p.phone,
        start_time: formatTimeString(p.start_time),
        end_time: p.end_time ? formatTimeString(p.end_time) : 'In Progress',
        time_taken_formatted: durationFormatted,
        score,
        total_questions: totalQ,
        total_marks: totalMarks,
        total_max_marks: totalMaxMarks,
        hands_on_score: handsOnSolved,
        hands_on_total: handsOnTotal,
        hands_on_marks: handsOnMarks,
        correct_count: correct,
        incorrect_count: incorrect,
        unanswered_count: unanswered,
        violation_count: violations,
        integrity_status: integrity,
        validation_status: isValid ? 'Valid Standing' : 'Disqualified',
        submitted_at: p.end_time || res?.submitted_at || 'In Progress',
        quiz_title: res?.quiz_title || 'BugBusters Elimination',
      };
    });
}
