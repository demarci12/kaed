/**
 * The 12-week Hyrox plan, 5 sessions a week (Days 1–60).
 *
 * Transcribed from screen recordings of the "Hyrox Mastery Elite" plan
 * (Endurance app), v3 of the transcription (with rest times). Static reference data: editing a session is a code change,
 * there is no table behind it. Where the recording never showed a block's
 * contents the text says "(not shown)" rather than guessing.
 */

export interface HyroxDay { day: number; title: string; duration?: string; blocks: string[] }
export interface HyroxWeek { week: number; label?: string; days: HyroxDay[] }

/** Your fresh 5k pace, in seconds per km. Pace tags like @5k+40" are resolved against it. */
export const FIVE_K_PACE_S = 4 * 60 + 10;

const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km`;

/**
 * Appends the actual running pace to every @5k tag: `@5k+40"` →
 * `@5k+40" (4:50/km)`, a bare `@5k` → `@5k (4:10/km)`. 2k (SkiErg/Row) tags
 * stay as written -- no 2k pace is on file.
 */
export function withPaces(text: string): string {
	return text.replace(/@5k(?:([+-])(\d+)")?/g, (tag, sign: string | undefined, secs: string | undefined) => {
		const offset = sign ? (sign === '+' ? 1 : -1) * Number(secs) : 0;
		return `${tag} (${fmtPace(FIVE_K_PACE_S + offset)})`;
	});
}

export const HYROX_KEY: string[] = [
	'Pace tags: @5k+40" = running pace 40 s slower than your 5k pace (per km). @2k+10" = SkiErg/Row pace 10 s slower than your 2k pace (per 500 m). @5k-10" = 10 s faster.',
	'"N rounds" = repeat the block N times. "rest X s" = rest after each round. "no rest" = no rest between the exercises.',
	'RPE = effort out of 10. Pro weight / Open weight = the Hyrox station loads; as an Open-division athlete use Open loads or lighter.',
	'Times in brackets are the estimated block or session length.',
	'(not shown) = the block was never opened in the recordings, or the number was cut off. Day 47 was never opened at all.',
	'Weekly pattern (Weeks 1–6, 8–11): Day 1 Strength + Ski · Day 2 Intervals/Running · Day 3 Strength/Power + Run · Day 4 Strength/Power + Row · Day 5 Long Run/Endurance. Week 7 is a deload, Week 12 is race week.',
];

export const HYROX_WEEKS: HyroxWeek[] = [
	{
		week: 1,
		days: [
			{ day: 1, title: 'Strength & Ski Conditioning', duration: '100–145 min', blocks: [
				'Warm-up (14 min): 3 rounds, no rest – SkiErg 2 min, Air Bike 2 min',
				'Power warm-up (4 min): 3 rounds, no rest – Push Ups 10, TRX Rows 10',
				'Strength Set (11 min): 5 rounds – Barbell Bench Press 5 (RPE 8); rest 120 s',
				'Power Circuit (14 min): 4 rounds – Reverse Lat Pulldown 8, GHD Sit Ups 10, GHD Back Extensions 10; rest 90 s',
				'Power Circuit (9 min): 3 rounds – DB Flat Bench Press 12, Bent Over Rows 12, Overhead Press 12 (all RPE 5); rest 90 s',
				'Ski Conditioning (36–56 min): 10 rounds – SkiErg 500 m @2k+5"; rest 90 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 2, title: 'Intervals & Running Drills', duration: '75–125 min', blocks: [
				'Warm-up run (9–16 min): Easy Run 2 km',
				'Speed drill (4–5 min): 3 rounds – Strides 100 m; rest 60 s',
				'Interval Run (46–67 min): 3 rounds – Tempo Run 1.2 km @5k-5", 800 m @5k-10", 400 m @5k-15"; rest 300 s',
				'Cool-down run (9–16 min): Easy Run 2 km',
			] },
			{ day: 3, title: 'Circuits & Run', duration: '90–125 min', blocks: [
				'Warm-up run (7–14 min): Prog. Run 1 round',
				'Power Circuit (10 min): 3 rounds – Push Ups (reps not shown), DB Standing Lunges 20, Toes to Bar 10; rest 60 s',
				'Run Circuit (29–36 min): 5 rounds – Tempo Run 400 m @5k-10", Burpee Box Jumps 10 (RPE 6), Step Ups 20 (RPE 6), Farmers Carry 100 m (32 kg); rest 60 s',
				'Run Circuit (22–27 min): 8 rounds – Run 200 m @5k-15", Squat Jumps 30 (RPE 6); rest 60 s',
				'Ski Finisher (6 min): 5 rounds – SkiErg Power Strokes 30 s; rest 30 s',
				'Ski cool-down (5 min): 5 min easy',
			] },
			{ day: 4, title: 'Strength & Row Conditioning', duration: '80–115 min', blocks: [
				'Row warm-up (14 min): 3 rounds – Row 2 min, Air Bike 2 min',
				'Strength Set (11 min): 5 rounds – Back Squat 5 (RPE 8); rest 120 s',
				'Power Circuit (12 min): 4 rounds – DB Romanian Deadlifts 8 (RPE 7), Bulgarian Split Squats (reps not shown); rest 90 s',
				'Row Conditioning (34–49 min): Power Row 500 m @2k+5"; rest 90 s (rounds and rest of the set not shown)',
				'Cool-down (5 min): Row 5 min',
			] },
			{ day: 5, title: 'Long Run & Recovery', duration: '100–125 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Long Run 75 min, easy @5k+90"',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 2,
		days: [
			{ day: 6, title: 'Strength & Ski Conditioning', duration: '80–105 min', blocks: [
				'Ski warm-up (7–13 min): SkiErg 500 m @2k+30", 500 m @2k+25", 500 m @2k+20" (max damper)',
				'Strength Set: 5 rounds – Bench Press 5 (RPE 8); rest 120 s',
				'Power Circuit (14 min): 4 rounds – Reverse Lat Pulldown 8, GHD Sit Ups 10, GHD Back Extensions 10; rest 90 s',
				'Power Circuit (11 min): 3 rounds – Seated Overhead Press 12, Chest Supported Row 12, Weighted Push Ups (reps not shown); rest 90 s',
				'Ski Conditioning (26 min): 4 rounds – SkiErg 60 s @2k+15", Power Strokes 45 s @2k, SkiErg 60 s @2k+15", Power Strokes 45 s @2k; rest 150 s',
				'Cool-down (5 min): SkiErg 5 min',
			] },
			{ day: 7, title: 'Intervals & Running Drills', duration: '75–105 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Speed drill (1–2 min): 2 rounds Strides 100 m',
				'Interval Run (45 min): 4 rounds – Easy Run 3 min @5k+15", Easy Run 2 min @5k, Tempo Run 60 s @5k-10"; rest 180 s',
				'Cool-down run (9–16 min): Easy Run (distance not shown)',
			] },
			{ day: 8, title: 'Power & Run Conditioning', duration: '60–95 min', blocks: [
				'Warm-up run (10–17 min): 4 rounds – Prog. Run 500 m; rest 30 s',
				'Power warm-up (6 min): 3 rounds – Push Ups 10, Air Squats 10, Hollow Hold 30 s',
				'Power Run Circuit (28–42 min): 1 round – Easy Run 1.2 km @5k+40" + Squat Jumps 40 → Easy Run 1 km @5k+40" + Squat Jumps 30 → Easy Run 800 m @5k+40" + Squat Jumps 20 → Easy Run 600 m @5k+30" + Squat Jumps 10 → Easy Run 400 m @5k+10"',
				'Cool-down run (10 min): Easy Run 10 min',
			] },
			{ day: 9, title: 'Strength & Row Conditioning', duration: '75–105 min', blocks: [
				'Row warm-up (6–11 min): Row 500 m @2k+30", 500 m @2k+25", 500 m @2k+20" (max damper)',
				'Power Circuit (opt., 7 min): 3 rounds – TRX Push Ups 10, TRX Rows 10, Air Squats 10',
				'Strength Set (11 min): 5 rounds – Back Squat 5 (RPE 8); rest 120 s',
				'Strength Circuit (12 min): 4 rounds – DB Romanian Deadlifts 8 (RPE 7), Bulgarian Split Squats; rest 90 s',
				'Row Conditioning (26–38 min): 4 rounds – Row 300 m @2k+15", Power Row 200 m @2k, Row 300 m @2k+15", Power Row 200 m @2k; rest 150 s',
				'Cool-down (5 min): Row 5 min',
			] },
			{ day: 10, title: 'Long Run & Recovery', duration: '100–125 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Long Run 75 min easy @5k+90"',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 3,
		days: [
			{ day: 11, title: 'Strength & Ski Conditioning', duration: '85–120 min', blocks: [
				'Cardio warm-up (8 min): 3 rounds – SkiErg 21/15/9 calories, Kettlebell Swings 20/15/10 reps (one value per round)',
				'Strength Set (11 min): 5 rounds – Bench Press 5 (RPE 8); rest 120 s',
				'Strength Circuit (16 min): 4 rounds – Weighted Chin Ups 5, Weighted Incline Sit Ups 20, Weighted 45° Back Extension 15; rest 90 s',
				'Strength Circuit (10 min): 3 rounds – DB Bench Press 12, Bent Over Rows 12, Overhead Press 12 (all RPE 6); rest 90 s',
				'Ski Conditioning (23–40 min): 2 rounds – SkiErg 900 m @2k+15", 700 m @2k+10", 500 m @2k+5"; rest 180 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 12, title: 'Intervals & Running Drills', duration: '75–120 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 8 min): 2 rounds – A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Speed drill (1–2 min): Strides 100 m',
				'Interval Run A (19–26 min): 10 rounds – Run 200 m @5k-30"; rest 60 s',
				'Rest Run (5 min): Easy Run 5 min',
				'Interval Run B (16–23 min): 6 rounds – Tempo Run 400 m @5k-15"; rest 90 s',
				'Cool-down run (9–16 min): Easy Run (distance not shown)',
			] },
			{ day: 13, title: 'Strength & Run Conditioning', duration: '90–135 min', blocks: [
				'Cardio warm-up (17 min): 4 rounds – Run 90 s, Single Unders 60 s; rest 90 s',
				'Power warm-up (9 min): 3 rounds – Toes to Bar 10, Broad Jumps 10, Devil Press (reps not shown)',
				'Power Run Circuit (53–75 min): 4 rounds – Easy Run 800 m @5k+40", DB Overhead Squats 20 (RPE 4), Step Ups 15 (RPE 4), Burpees 10, Easy Run 800 m @5k+20", Overhead Squats 20, Step Ups 15, Easy Run (distance not shown); rest 180 s',
				'Finisher (2 min): Barbell Walking Lunges 100 m (Pro weight)',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 14, title: 'Strength & Row Conditioning', duration: '75–100 min', blocks: [
				'Cardio warm-up (9 min): 3 rounds – Row 21/15/9 calories, Burpees 20/15/10; rest 30 s',
				'Power Circuit (opt., 7 min): 3 rounds – TRX Push Ups 10, TRX Rows 10, Air Squats 10',
				'Strength Set (11 min): 5 rounds – Back Squat 5 (RPE 8); rest 120 s',
				'Power Circuit (12 min): 4 rounds – DB Romanian Deadlifts 8 (RPE 7), Bulgarian Split Squats; rest 90 s',
				'Row Conditioning (21–34 min): 2 rounds – Row 900 m @2k+15", 700 m @2k+10", 500 m @2k+5"; rest 180 s',
				'Cool-down (5 min): Row 5 min',
			] },
			{ day: 15, title: 'Long Run & Recovery', duration: '105–130 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Trail Run 80 min',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 4,
		days: [
			{ day: 16, title: 'Strength & Ski Conditioning', duration: '115–160 min', blocks: [
				'Cardio warm-up (6–7 min): 3 rounds – SkiErg 60 s, Sled Drag 20 m (RPE 3)',
				'Power warm-up (6 min): 3 rounds – TRX Rows 10, TRX Push Ups 10, TRX Mountain Climbers 20',
				'Strength Set (20 min): 6 rounds – Bench Press 8 (RPE 7), Sled Pull (arms only) 20 m (RPE 7); rest 120 s',
				'Power Circuit (21 min): 10 rounds – GHD Seated Wall Balls 20 (RPE 5), GHD Prone Hold 40 s; rest 20 s',
				'Ski Conditioning (47–66 min): 8 rounds – SkiErg 300 m @2k+10", 200 m @2k, 100 m @2k-10"; rest 120 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 17, title: 'Intervals & Running Drills', duration: '90–150 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Speed drill: 2 rounds Strides 100 m',
				'Interval Run (42–63 min): 2 rounds – Easy Run 1.5 km @5k+10", Easy Run 1 km @5k, Tempo Run 500 m @5k-10"; rest 300 s',
				'Easy Run (5 min)',
				'Interval Run (10–14 min): 6 rounds – Tempo Run 200 m @5k-30"; rest 60 s',
				'Cool-down run (9–16 min): Easy Run (distance not shown)',
			] },
			{ day: 18, title: 'Run & Bike Conditioning', duration: '70–100 min', blocks: [
				'Warm-up (17 min): 4 rounds – Air Bike 60 s, Single Unders 60 s, Air Bike 60 s, Push Ups (reps not shown); rest 60 s',
				'Power Run Circuit (32–42 min): 5 rounds – Easy Run 500 m @5k+20", Deadlift 15 (RPE 5), Burpee Box Jumps 10, Farmers Carry 100 m (RPE 7); rest 60 s',
				'Bike Finisher (12 min): 8 rounds – Air Bike 20 s max calories; rest 60 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 19, title: 'Power & Row Conditioning', duration: '90–125 min', blocks: [
				'Cardio warm-up (9 min): 3 rounds – Row 60 s, Sled Push 20 m (RPE 3), Sled Drag 20 m (RPE 3)',
				'Power warm-up (5 min): Plank Shoulder Taps 30 s, Burpee Broad Jump (reps not shown)',
				'Power Circuit (19–20 min): 6 rounds – Back Squat 8 (RPE 7), Sled Push 20 m (RPE 7); rest 120 s',
				'Row Conditioning (45–59 min): 8 rounds – Row 300 m @2k+10", 200 m @2k, 100 m @2k-10"; rest 120 s',
				'Cool-down (5 min): Row 5 min',
			] },
			{ day: 20, title: 'Long Run & Recovery', duration: '105–130 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Long Run 80 min easy @5k+90"',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 5,
		days: [
			{ day: 21, title: 'Strength & Ski Conditioning', duration: '90–125 min', blocks: [
				'Cardio warm-up (7 min): 3 rounds – SkiErg 21/15/9 calories, Sled Drag 20/15/10 m (RPE 3)',
				'Power Circuit (opt., 8 min): 3 rounds – TRX Rows 10, TRX Push Ups 10, TRX Mountain Climbers 20; rest 60 s',
				'Strength Set (20 min): 6 rounds – Bench Press 8 (RPE 7), Sled Pull (arms only) 20 m (RPE 7); rest 120 s',
				'Power Circuit (13 min): 4 rounds – Devil Press 10 (RPE 4), Hanging Leg Raise 10, Air Bike 12 calories',
				'Ski Conditioning (27–43 min): 2 rounds – SkiErg 800 m @2k+15", 600 m @2k+10", 400 m @2k, 200 m @2k-10"; rest 180 s',
				'Cool-down (5 min): SkiErg 5 min',
			] },
			{ day: 22, title: 'Intervals & Running Drills', duration: '65–115 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Speed drill: 2 rounds Strides 100 m',
				'Interval Run (36–54 min): 15 rounds – Tempo Run 400 m @5k-10"; rest 60 s',
				'Cool-down run (9–16 min): Easy Run (distance not shown)',
			] },
			{ day: 23, title: 'Power & Run Conditioning', duration: '75–90 min', blocks: [
				'Cardio warm-up (7–10 min): 4 rounds – Prog. Run 200 m, Mountain Climbers 30 s',
				'Power warm-up (6 min): 3 rounds – Barbell Reverse Lunges (reps not shown), Single Unders 30 s',
				'Power Run Circuit (38 min): 5 rounds – Run 2 min @5k+20" (incline 2%), Box Jumps 20 (RPE 5), DB Thrusters 20 (RPE 5), Run 2 min @5k+20" (incline 2%); rest 60 s',
				'Finisher (10 min): 8 rounds – Wall Balls 15 (Pro weight); rest 30 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 24, title: 'Strength & Row Conditioning', duration: '65–105 min', blocks: [
				'Cardio warm-up (12 min): 3 rounds – Row 20 calories, Sled Push 20 m (RPE 3), Sled Drag 20 m (RPE 3)',
				'Power Circuit (opt., 6 min): V-Ups 20, Burpee Broad Jump (reps not shown)',
				'Strength Circuit (26–27 min): 8 rounds – Back Squat 8 (RPE 7), Sled Push 20 m (RPE 7); rest 120 s',
				'Row Conditioning (22–34 min): 2 rounds – Row 800 m @2k+15", 600 m @2k+10", 400 m @2k, 200 m @2k-10"; rest 180 s',
				'Cool-down (5 min): Row 5 min',
			] },
			{ day: 25, title: 'Long Run & Recovery', duration: '110–135 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Interval Long Run (82 min): 4 rounds – Easy Run 19 min @5k+90", Easy Run 60 s @5k+70"',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 6,
		days: [
			{ day: 26, title: 'Strength & Ski Conditioning', blocks: [
				'Cardio warm-up (7 min): 4 rounds – SkiErg 30 s max damper, Single Unders 30 s',
				'Power warm-up (6 min): 3 rounds – TRX Rows 10, TRX Push Ups 10, TRX Mountain Climbers 20',
				'Strength Set (7 min): Bench Press 5, 3, 1 reps (RPE 7–9); rest 180 s',
				'Power Circuit (25–26 min): 8 rounds – Sled Pull 20 m (Pro weight), Pull Ups 5; rest 120 s',
				'Ski Conditioning (31–45 min): 14 rounds – SkiErg 250 m @2k+5"; rest 60 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 27, title: 'Intervals & Running Drills', duration: '60–120 min', blocks: [
				'Warm-up run (5–8 min): Easy Run 1 km',
				'Progressive Run (4–8 min): 2 rounds Prog. Run 500 m',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Tempo Run (37–70 min): Run 10 km @5k+30"',
				'Cool-down run (5–8 min): Easy Run (distance not shown)',
			] },
			{ day: 28, title: 'Strength & Run Conditioning', duration: '65–105 min', blocks: [
				'Cardio warm-up (13–24 min): Prog. Run 2 km, Row 1.5 km (order as read)',
				'Power warm-up (5 min): 3 rounds – Hollow Hold 30 s, Chin Ups 10',
				'Power Run Circuit (29–46 min): 1 round, a Run between every station – Burpee Broad Jump 100 m → DB Walking Lunges 100 reps (Pro weight) → Run 1 km @5k+30" → Farmers Carry 200 m (Pro weight) → Wall Balls 100 (Pro weight) (other run distances not shown)',
				'Tempo Run: 1 km @5k+30"',
				'Cool-down walk (10 min): Easy Walk 10 min, incline 3%',
			] },
			{ day: 29, title: 'Strength & Row Conditioning', duration: '95–125 min', blocks: [
				'Cardio warm-up (7 min): 4 rounds – Row 30 s max damper, Jumping Jacks 30 s',
				'Power warm-up (9 min): 3 rounds – Barbell Reverse Lunges 10, Push Ups (reps not shown), Step Ups 16',
				'Strength Set (5 min): 3 rounds – Back Squat 5, 3, 1 reps (RPE 7–9); rest 120 s',
				'Power Circuit (26–27 min): 8 rounds – Sled Push 20 m (Pro weight), Broad Jumps 10; rest 120 s',
				'Row Conditioning (29–39 min): 14 rounds – Row 250 m @2k+5"; rest 60 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 30, title: 'Endurance & Recovery', duration: '115–145 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Bike Endurance 60 min (easy)',
				'Run Endurance 30 min (easy)',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 7,
		label: 'Deload',
		days: [
			{ day: 31, title: 'Conditioning', duration: '75–115 min', blocks: [
				'Bike warm-up (10 min): Easy Bike 10 min',
				'Ski warm-up (6–9 min): 4 rounds – SkiErg 200 m; rest 30 s',
				'Power warm-up (7 min): 3 rounds – Pike Push Ups 8, Back Extensions, Butterfly Sit Ups (reps not shown)',
				'Strength Set (11 min): 4 rounds – Bench Press 10 (RPE 5), Sled Pull 20 m (RPE 4); rest 90 s',
				'Ski Conditioning (25–43 min): 3 rounds – SkiErg 1.5 km @2k+30"; rest 180 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 32, title: 'Running', duration: '75–90 min', blocks: [
				'Warm-up drills (opt., 9 min): 2 rounds – A-Skips, High Knees, Butt Kicks, Leg Swings 30 s; rest 60 s',
				'Run Conditioning (60 min): Easy Run 60 min',
			] },
			{ day: 33, title: 'Conditioning', duration: '105–170 min', blocks: [
				'Bike warm-up (5 min): Air Bike 5 min',
				'Power Circuit (opt., 12 min): 4 rounds – Push Ups (reps not shown), V-Ups 5; rest 60 s',
				'Power Circuit (71–113 min): 6 rounds – Easy Bike 1 km (RPE 4), Row 500 m @2k+30", SkiErg 500 m @2k+30"; rest 60 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 34, title: 'Conditioning', duration: '70–105 min', blocks: [
				'Bike warm-up (10 min): Easy Bike 10 min',
				'Row warm-up (5–8 min): 4 rounds – Row 200 m; rest 30 s',
				'Power Circuit (opt., 9 min): 3 rounds, no rest between exercises – DB Goblet Squats 10 (RPE 3), 45° Back Extension 10, Incline Sit Ups 10; rest 60 s',
				'Power Circuit (11 min): 4 rounds – Back Squat 10 (RPE 5), Sled Push 20 m; rest 90 s',
				'Row Conditioning (23–36 min): 3 rounds – Row 1.5 km @2k+30"; rest 180 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 35, title: 'Endurance & Recovery', duration: '145–180 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Bike Endurance 120 min (easy)',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 8,
		days: [
			{ day: 36, title: 'Ski & Run Conditioning', duration: '65–110 min', blocks: [
				'Cardio warm-up (10–17 min): 4 rounds – Prog. Run 500 m, Sled Pull (distance not shown)',
				'Ski warm-up (6–10 min): 2 rounds – SkiErg 500 m; rest 60 s',
				'Power Run Circuit (32–47 min): 4 rounds – Run 400 m @5k+10", Sled Pull 25 m (RPE 7), Run 400 m @5k+10", Burpee Broad Jump (distance not shown), SkiErg 250 m @2k+10", Run 400 m @5k+10"; rest 120 s',
				'Cool-down run (9–16 min): Easy Run (distance not shown)',
			] },
			{ day: 37, title: 'Intervals & Running Drills', duration: '75–135 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Run intervals (opt., 2–3 min): 3 rounds Strides 100 m',
				'Run Conditioning (42–73 min): Run 2 km @5k+30" → Easy Run 1 km @5k+75" → Run 2 km @5k+20" → Easy Run 1 km @5k+75" → Run 2 km @5k+10" → Easy Run 1 km @5k+75" → Run 2 km @5k+30"',
				'Cool-down run (9–16 min)',
			] },
			{ day: 38, title: 'Conditioning Drills', duration: '50–65 min', blocks: [
				'Cardio warm-up (8–15 min): SkiErg 1 km, Prog. Row 1 km, SkiErg 1 km, Prog. Row 1 km',
				'Power warm-up (7 min): 2 rounds – Single Unders 60 s, Air Squats 10, Push Ups 10, DB Standing Lunges 10',
				'Power Circuit (18 min) – EMOM, 3 rounds (do the work at the start of each minute, rest the remainder): Min 1 Single Unders 60 · Min 2 Wall Balls 18 (Pro weight) · Min 3 Step Ups 12 · Min 4 Burpee Pull Ups 6 · Min 5 Row 12 calories; 60 s per minute',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 39, title: 'Conditioning Drills', duration: '95–125 min', blocks: [
				'Run warm-up (7–14 min): Prog. Run 2 km',
				'Power warm-up (11–12 min)',
				'Power Circuit (52 min): 3 rounds – Row 21/15/9 calories, Sled Push 20/15/10 m; rest 120 s. Then 6 rounds – Easy Run 3 min @5k+15", Row 2 min @2k+10", Sled Push 60 s (RPE 7); rest 120 s',
				'Ski Conditioning (13 min): 10 rounds – SkiErg 30 s @2k+5"; rest 30 s',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 40, title: 'Conditioning & Recovery', duration: '135–185 min', blocks: [
				'Cardio warm-up (20–34 min): 4 rounds – Easy Run 500 m, Row 250 m, SkiErg 250 m, Easy Run 500 m, Row 250 m, SkiErg 250 m (order as read)',
				'Run Endurance (92 min): 10 rounds – Easy Run 2 min @5k+60", SkiErg 2 min @2k+30", Row 2 min @2k+30", Farmers Carry 60 s (RPE 7); rest 60 s',
				'Power Circuit (8 min): 3 rounds – Incline Sit Ups 15, 45° Back Extension 15, Leg Raises 15',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
		],
	},
	{
		week: 9,
		days: [
			{ day: 41, title: 'Conditioning Drills', duration: '90–120 min', blocks: [
				'Warm-up run (7–14 min): Prog. Run 2 km',
				'Sled Conditioning (opt., 3–4 min): 3 rounds – Sled Push 10 m, Sled Pull (distance not shown)',
				'Power Circuit (26 min): 5 rounds – SkiErg 60 s @2k+10", Sled Push 60 s, Run 60 s @5k+15"; rest 90 s',
				'Bike Rest (5 min): Easy Bike 5 min',
				'Power Circuit (26 min): 5 rounds – Row 60 s @2k+10", Sled Pull 60 s, Run 60 s @5k+15"; rest 90 s',
				'Bike Rest (5 min) → Wall Balls (4 min): 120 reps (RPE 9)',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 42, title: 'Conditioning Drills', duration: '85–145 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 9 min): 2 rounds, rest 60 s',
				'Speed drills (2–3 min): 3 rounds Strides 100 m',
				'Run Conditioning (33–50 min): 6 rounds – Easy Run 800 m @5k-5"; rest 120 s',
				'Speed Drills (17–24 min): 5 rounds – Tempo Run 500 m @5k-30"; rest 120 s',
				'Cool-down run (9–16 min): Easy Run',
			] },
			{ day: 43, title: 'Conditioning Drills', duration: '100–130 min', blocks: [
				'Cardio warm-up (8–15 min): SkiErg 1 km, Prog. Row 1 km',
				'Power warm-up (6 min): 3 rounds – Air Squats 10, Push Ups 10, DB Standing Lunges 10',
				'Power Circuit (26 min): 5 rounds – Row 50/40/30/20/10 calories, DB Walking Lunges 50/40/30/20/10 m (Pro weight); rest 90 s',
				'Bike Rest (10 min): Easy Bike 10 min',
				'Power Circuit (32 min): 5 rounds – SkiErg 50/40/30/20/10 calories, Burpee Broad Jump 50/40/30/20/10 reps (RPE 6); rest 90 s',
				'Cool-down (10 min): Air Bike 10 min',
			] },
			{ day: 44, title: 'Conditioning Drills', duration: '60–90 min', blocks: [
				'Warm-up run (7–14 min): Prog. Run 2 km',
				'Warm-up circuit (9 min): 3 rounds – Air Bike 12/9/6 calories, Wall Balls 12/10/8; rest 120 s',
				'Power Run Circuit (21–28 min): 1 round – Run 600 m @5k+5" + Wall Balls 60 → Run 500 m @5k+15" + 50 → Run 400 m @5k+15" + 40 → Run 300 m @5k+15" + 30 → Tempo Run 200 m all-out + 20 (Pro-weight ball); Easy Walk 5 min',
				'Power Circuit (12 min): 6 rounds – Air Bike 12 calories (RPE 7), Farmers Carry 60 m (RPE 7)',
				'Cool-down (5 min): Air Bike 5 min',
			] },
			{ day: 45, title: 'Endurance & Recovery', duration: '110–135 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Warm-up drills (opt., 3 min): High Knees, Butt Kicks, Fast Feet 30 s',
				'Long Run 80 min easy',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 10,
		days: [
			{ day: 46, title: 'Conditioning Drills', duration: '100–130 min', blocks: [
				'Cardio warm-up (11–18 min): 2 rounds – SkiErg 500 m, Row 500 m, V-Ups 20; rest 60 s',
				'Power Circuit A (10 min): 4 rounds – SkiErg 60 s @2k, Sled Pull (arms only) 25 m (RPE 6)',
				'Power Circuit B (9–10 min): 4 rounds – SkiErg 60 s, Sled Pull 25 m (Pro weight + 50 kg)',
				'Power Circuit (37–38 min): 5 rounds – SkiErg 30 calories @2k+5", Sled Pull 50 m (Pro weight); rest 180 s',
				'Finisher (13 min): 10 rounds – Treadmill Run 30 s (RPE 9, incline 5%); rest 30 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 47, title: 'Intervals & Running Drills', blocks: [
				'Session (contents not shown in the recordings)',
			] },
			{ day: 48, title: 'Strength & Conditioning', duration: '100–135 min', blocks: [
				'Cardio warm-up (7 min): Air Bike 3 min, Row 2 min, Single Unders 60 s',
				'Power warm-up (6 min): 3 rounds – Broad Jumps 10, Jumping Pull Ups 10, Toes to Bar 10',
				'Strength Circuit (25 min) – EMOM, 8 rounds: Min 1 Bench Press 10 (RPE 7) · Min 2 Sled Push 25 m (RPE 7)',
				'Run (4–7 min): 1 km @5k+40", incline 3%',
				'Power Circuit (37–38 min): 5 rounds – Row 30 calories @2k+5", Sled Pull 50 m (Pro weight); rest 180 s',
				'Cool-down walk (10–15 min): Easy Walk 1 km, incline 3%',
			] },
			{ day: 49, title: 'Power & Run Conditioning', duration: '115–170 min', blocks: [
				'Cardio warm-up (12 min): 3 rounds – Easy Run 2 min, Air Bike 20 calories',
				'Warm-up circuit (7 min): Push Ups 20, Butterfly Sit Ups',
				'Run A (8–14 min): 2 km @5k+60"',
				'Power Circuit A (23–28 min): 6 rounds – SkiErg 200 m @2k-5", Burpee Box Jumps 12, Wall Balls 20; rest 60 s',
				'Run B (8–14 min): 2 km @5k+40"',
				'Power Circuit B (21–25 min): 6 rounds – Row 200 m @2k-5", DB Standing Lunges 20 (Open weight), Burpee Broad Jump 20 m; rest 60 s',
				'Run C (8–14 min): Run (distance/pace not shown)',
				'Finisher (6 min): 5 rounds – Row 30 s max damper, all out; rest 30 s',
				'Cool-down (10 min): Easy Bike 10 min',
			] },
			{ day: 50, title: 'Endurance & Recovery', duration: '110–135 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Warm-up drills (opt., 3 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Long Run 80 min easy',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 11,
		days: [
			{ day: 51, title: 'Strength & Conditioning', duration: '90–165 min', blocks: [
				'Cardio warm-up (10 min): 2 rounds – Air Bike 2 min, Single Unders 60 s, Squat Jumps 20; rest 60 s',
				'Power warm-up (12 min): 3 rounds – SkiErg 60 s @2k, Sled Push 20 m (RPE 4), Sled Pull 20 m (RPE 4), Hollow Hold 30 s',
				'Power Circuit B (26–47 min): Back Squat 8 (RPE 7) → Sled Push 13 m (Pro weight + 25 kg) → Front Squats 8 (RPE 7) → Sled Push 13 m (Pro weight) → Easy Bike 2 km (RPE 2); rest 60 s (rounds not shown)',
				'Power Circuit C (32–63 min): 3 rounds – SkiErg 500 m @2k+10", Sled Pull 13 m (Pro weight + 25 kg), SkiErg 300 m @2k, Sled Pull 13 m (Pro weight), Easy Bike 2 km (RPE 2); rest 30 s',
				'Cool-down stretch (opt., 4 min): Calf, Hip-Flexor, Quadriceps – 30 s each',
			] },
			{ day: 52, title: 'Intervals & Running Drills', duration: '90–140 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 9 min): 2 rounds, rest 60 s',
				'Speed drills (1–2 min): 3 rounds Strides 100 m',
				'Run Conditioning (49–70 min): Run 3 km @5k+25" → Easy Run 3 min → Run 2 km @5k+15" → Easy Run 3 min → Run 1 km @5k → Tempo Run 500 m all-out → Easy Run 5 min',
				'Cool-down: Easy Bike 10 min, short stretch 5 min',
			] },
			{ day: 53, title: 'Strength & Run Conditioning', duration: '105–160 min', blocks: [
				'Warm-up run (7–14 min): Prog. Run 2 km',
				'Power Circuit (opt., 11 min): 4 rounds – Row 15 calories, Burpee Pull Ups 10',
				'Run A / Run B / Run C (8–14 min each): runs between the circuits (distances/paces not clearly shown; Run B read as 2 km @5k+20")',
				'Power Circuit A (18–22 min): 4 rounds – Row 200 m @2k, Farmers Carry 100 m, Wall Balls 20 (Pro weight), Toes to Bar 10; rest 60 s',
				'Power Circuit B (16 min): 3 rounds – Air Bike 15 calories (RPE 6), Barbell Reverse Lunges 20 (Open weight), Broad Jumps 10 (RPE 6), Butterfly Sit Ups (reps not shown); rest 60 s',
				'Finisher (13 min): 10 rounds – Treadmill Run 30 s (RPE 9, incline 5%); rest 30 s',
				'Ski cool-down (4–8 min): easy SkiErg',
			] },
			{ day: 54, title: 'Drills & Race Simulation', duration: '95–155 min', blocks: [
				'Cardio warm-up (25–44 min): 3 rounds – Easy Run 1 km, Prog. Run 800 m; rest 60 s',
				'Power warm-up (8–10 min): Row 200 m, Wall Balls 10, Burpees 8, Box Jumps 6',
				'Run Conditioning (9 min): 3 rounds – Run 90 s @5k-10"; rest 90 s',
				'Race Simulation (27–44 min): Run → SkiErg 1 km @2k+10" → Run → Sled Push 50 m → Run → Sled Pull 50 m (Pro weight) → Run → DB Walking Lunges 100 m (Pro weight) → Run → Wall Balls 100 (Pro weight); run legs 1 km @5k+20" to @5k+40" (order partly inferred; the block was not expanded in full)',
				'Cool-down (20 min): Easy Bike 20 min',
			] },
			{ day: 55, title: 'Endurance & Recovery', duration: '135–170 min', blocks: [
				'Warm-up stretch (opt., 5 min): Quadriceps Stretch, Leg Swings, Calf Stretch – 30 s each',
				'Bike Conditioning 120 min (easy, RPE 4)',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
				'Cool-down rolling (opt., 9 min): foam roller – Hamstrings, Upper Back, Thigh, Calves – 60 s each',
			] },
		],
	},
	{
		week: 12,
		label: 'Deload / Race week',
		days: [
			{ day: 56, title: 'Easy Run & Power Set', duration: '60–75 min', blocks: [
				'Run Conditioning (45 min): Easy Run 45 min',
				'Power Set (7 min): 4 rounds – Burpee Broad Jump (reps not shown); rest 60 s (other exercises not shown)',
				'Cool-down stretch (opt., 5 min): Calf, Hip-Flexor, Quadriceps 30 s',
			] },
			{ day: 57, title: 'Running', duration: '60–95 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (opt., 4 min): A-Skips, High Knees, Butt Kicks, Leg Swings – 30 s each',
				'Speed drills (2–3 min): 3 rounds Strides 100 m',
				'Run Conditioning (28–41 min): 4 rounds – Run 500 m @5k+10", Run 500 m @5k+25"; rest 180 s',
				'Cool-down: Easy Bike 10 min',
			] },
			{ day: 58, title: 'Conditioning', duration: '85–105 min', blocks: [
				'Cardio warm-up: SkiErg 5 min, Row 5 min (shown twice)',
				'Power Circuit (58 min): 4 rounds – Bench Press (reps not shown), 15 cal erg, Bent Over Rows 10, 15 cal erg, Wall Balls 20, 15 cal erg, Butterfly Sit Ups 10, 15 cal erg (erg machines: Row, SkiErg, Bike); rest 120 s',
				'Cool-down walk (10 min): Easy Walk, incline 3%',
			] },
			{ day: 59, title: 'Active Rest', duration: '40–60 min', blocks: [
				'Cardio Walk (20–30 min): Easy Walk 2 km',
				'Recovery Stretch (18 min): 2 rounds – Hip-Flexor 30 s, Hamstring 30 s, Lying Twist 60 s, Seated Twist 60 s; rest 60 s',
			] },
			{ day: 60, title: 'Pre-Race Stimulation', duration: '35–60 min', blocks: [
				'Run Conditioning (14–24 min): Easy Run (distance not shown)',
				'Speed Drills (11–18 min): 5 rounds – Prog. Run 200 m, Easy Run 200 m',
				'Cool-down stretch (opt., 7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
			] },
		],
	},
];

/* ------------------------------------------------------------------ tasks */

/** One tickable line of a day: a block split into name, duration and detail. */
export interface HyroxTask {
	/** Stable per position: `<day>-<n>`. Ticks are stored under it. */
	id: string;
	name: string;
	optional: boolean;
	/** "14 min", "9–16 min", … when the block gave one. */
	duration?: string;
	/** Extra bracket notes from the name ("not shown", "lift not shown"). */
	note?: string;
	detail?: string;
}

/**
 * A block with no `:` that joins several items with ` · ` ("Warm-up stretch
 * 5 min · Long Run 75 min easy · …") is several tasks; split it. A block with
 * a `:` keeps its ` · ` -- there it separates intervals of one set.
 */
function splitBlocks(blocks: string[]): string[] {
	return blocks.flatMap((b) => (b.includes(': ') ? [b] : b.split(/ · |; /)));
}

/** "Warm-up (opt., 14 min): 3 rounds – …" → name Warm-up, optional, 14 min, detail. */
export function parseTask(text: string, id: string): HyroxTask {
	const colon = text.indexOf(': ');
	const head = colon >= 0 ? text.slice(0, colon) : text;
	const detail = colon >= 0 ? text.slice(colon + 2).trim() : undefined;
	const optional = /\(opt\.?[,)]/.test(head);

	const durations: string[] = [];
	const notes: string[] = [];
	for (const [, inner] of head.matchAll(/\(([^)]*)\)/g)) {
		for (const part of inner.split(',').map((p) => p.trim()).filter(Boolean)) {
			if (/^opt\.?$/.test(part)) continue;
			(/\bmin\b/.test(part) && /\d/.test(part) ? durations : notes).push(part);
		}
	}
	let name = head.replace(/\([^)]*\)/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
	// "Warm-up run 5–8 min" -- a duration written into the name. Only when it is
	// the one duration there, so "Bike 60 min, then Run 30 min" stays whole.
	const inline = name.match(/\s(\d+(?:–\d+)?\s*min)\b/g);
	if (!durations.length && inline?.length === 1) {
		durations.push(inline[0].trim());
		name = name.replace(inline[0], '').replace(/\s{2,}/g, ' ').trim();
	}

	return {
		id, name, optional,
		duration: durations.join(', ') || undefined,
		note: notes.join(', ') || undefined,
		detail: detail || undefined,
	};
}

export function tasksOf(day: HyroxDay): HyroxTask[] {
	return splitBlocks(day.blocks).map((b, i) => parseTask(b, `${day.day}-${i + 1}`));
}

/** The kind of session, for the card's colour: what the day's title leads with. */
export type HyroxKind = 'strength' | 'run' | 'conditioning' | 'endurance' | 'rest' | 'race';

export function dayKind(title: string): HyroxKind {
	const t = title.toLowerCase();
	if (/race/.test(t)) return 'race';
	if (/rest|recovery stretch/.test(t) && !/run|bike/.test(t)) return 'rest';
	if (/endurance|long run|run & recovery|bike endurance/.test(t)) return 'endurance';
	if (/strength/.test(t)) return 'strength';
	if (/interval|running|^run|easy run/.test(t)) return 'run';
	return 'conditioning';
}

export const KIND_LABEL: Record<HyroxKind, string> = {
	strength: 'Strength', run: 'Running', conditioning: 'Conditioning',
	endurance: 'Endurance', rest: 'Rest', race: 'Race prep',
};
