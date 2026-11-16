/**
 * The 12-week Hyrox plan, 5 sessions a week (Days 1–60).
 *
 * Transcribed from screen recordings of the "Hyrox Mastery Elite" plan
 * (Endurance app). Static reference data: editing a session is a code change,
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
	'RPE = effort out of 10. Pro weight / Open weight = the Hyrox station loads; as an Open-division athlete use Open loads or lighter.',
	'Times in brackets are the estimated session length.',
	'Weekly pattern (Weeks 1–6, 8–11): Day 1 Strength + Ski · Day 2 Intervals/Running · Day 3 Strength/Power + Run · Day 4 Strength/Power + Row · Day 5 Long Run/Endurance. Week 7 is a deload, Week 12 is race week.',
];

export const HYROX_RACE_NOTES: string[] = [
	'Start the plan 12 weeks before race day so Week 12 is race week; Day 60 is the day before the race.',
	'Running paces are worked out from a 4:10/km 5k. SkiErg/Row tags need your own 2k pace.',
	'The (not shown) items can be filled in by re-recording those days with every block expanded.',
];

const STRETCH_ROLL = [
	'Warm-up stretch (5 min): Quad stretch, Leg Swings, Calf Stretch – 30 s each',
	'Cool-down stretch (7 min): Hip-Flexor 45 s, Hamstring 45 s, Lying Twist 60 s, Seated Twist 60 s',
	'Foam rolling (9 min): Hamstring, Upper Back, Thigh, Calves – 60 s each',
];

export const HYROX_WEEKS: HyroxWeek[] = [
	{
		week: 1,
		days: [
			{ day: 1, title: 'Strength & Ski Conditioning', duration: '100–145 min', blocks: [
				'Warm-up (opt., 14 min): 3 rounds – SkiErg 2 min, Air Bike 2 min',
				'Power warm-up (opt., 4 min): 3 rounds, no rest – Push Ups 10, TRX Rows 10',
				'Strength Set (11 min): Barbell Bench Press – 5 rounds × 5 reps (RPE 8)',
				'Power Circuit (14 min): 4 rounds – Reverse Lat Pulldown 8, GHD Sit Ups 10, GHD Back Extensions 10; rest 90 s',
				'Power Circuit (9 min): 3 rounds – DB Flat Bench Press 12, Bent Over Rows 12, Overhead Press 12 (all RPE 5)',
				'Ski Conditioning (36–56 min): 10 rounds – SkiErg 500 m @2k+5"',
				'Cool-down: Air Bike 5 min',
			] },
			{ day: 2, title: 'Intervals & Running Drills', duration: '75–125 min', blocks: [
				'Warm-up run (opt., 9–16 min)',
				'Speed drill (opt., 4–5 min): Strides 100 m, rest 60 s after each',
				'Interval Run (46–67 min): Tempo Run 1.2 km @5k-5" · 800 m @5k-10" · 400 m @5k-15"; rest 300 s',
				'Cool-down run (opt., 9–16 min)',
			] },
			{ day: 3, title: 'Circuits & Run', duration: '90–125 min', blocks: [
				'Warm-up run (opt., 7–14 min): Prog. Run 2 km',
				'Power Circuit (10 min): DB Standing Lunges 20, Toes to Bar (reps not shown)',
				'Run Circuit (29–36 min): 5 rounds – Run 400 m @5k-10", Burpee Box Jumps 10 (RPE 6), Step Ups 20 (RPE 6), Farmers Carry 100 m (32 kg)',
				'Run Circuit (22–27 min): 8 rounds – Run 200 m @5k-15", Squat Jumps 30 (RPE 6)',
				'Ski Finisher (6 min): SkiErg Power Strokes 30 s',
				'Ski cool-down (opt., 5 min)',
			] },
			{ day: 4, title: 'Strength & Row Conditioning', duration: '80–115 min', blocks: [
				'Row warm-up (opt., 14 min): Air Bike 2 min, Row 2 min',
				'Strength Set (11 min): Barbell Back Squat 5 reps (RPE 8) (rounds not shown)',
				'Power Circuit (12 min): DB Romanian Deadlifts 8 (RPE 7), Bulgarian Split Squats (reps not shown)',
				'Row Conditioning (34–49 min): Power Row 300 m @2k+15" / 200 m @2k (round count not shown)',
				'Row cool-down (opt., 5 min)',
			] },
			{ day: 5, title: 'Long Run & Recovery', duration: '100–125 min', blocks: [
				STRETCH_ROLL[0],
				'Long Run 75 min, easy @5k+90"',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 2,
		days: [
			{ day: 6, title: 'Strength & Ski Conditioning', duration: '80–105 min', blocks: [
				'Ski warm-up (7–13 min): SkiErg 500 m @2k+30", 500 m @2k+25", 500 m @2k+20"',
				'Strength Set: 5 reps (RPE 8) – chest/trap (lift name not shown, likely Bench Press)',
				'Power Circuit (14 min): Reverse Lat Pulldown 10 reps + back/abs work (rest not shown)',
				'Power Circuit (11 min): shoulder/back/biceps (exercises not shown)',
				'Ski Conditioning (26 min): 60 s @2k+15", 45 s @2k, 60 s @2k+15", 45 s @2k; rest 150 s',
				'Ski cool-down (5 min)',
			] },
			{ day: 7, title: 'Intervals & Running Drills', duration: '75–105 min', blocks: [
				'Warm-up drills (4 min): A-Skips, High Knees, Butt Kicks – 30 s each, 2 rounds',
				'Speed drill (1–2 min)',
				'Interval Run (45 min): Easy Run 3 min @5k+15", 2 min @5k, 60 s @5k-10"; rest 180 s',
				'Cool-down run (9–16 min)',
			] },
			{ day: 8, title: 'Power & Run Conditioning', duration: '60–95 min', blocks: [
				'Warm-up run (10–17 min): Prog. Run 500 m',
				'Power warm-up (6 min): Air Squats, Hollow Hold (reps not shown)',
				'Power Run Circuit (28–42 min), descending ladder: Easy Run 1.2 km @5k+40" + Squat Jumps 40 → 1 km @5k+40" + Squat Jumps 30 + Push Ups 10 → 800 m @5k+40" + Squat Jumps 20 → 600 m @5k+30" → … → 400 m @5k+10" + Squat Jumps 10 (middle steps partly unreadable)',
				'Cool-down run (10 min)',
			] },
			{ day: 9, title: 'Strength & Row Conditioning', duration: '≈66 min', blocks: [
				'Row warm-up (6–11 min): Row 500 m @2k+25", 500 m @2k+20"',
				'Power Circuit (7 min): TRX Push Ups, TRX Rows, Air Squats 10',
				'Strength Set (11 min): Back Squat 5 reps (RPE 8)',
				'Strength Circuit (12 min) (not shown)',
				'Row Conditioning (26–38 min): Power Row 300 m @2k+15", 200 m @2k',
				'Row cool-down (5 min)',
			] },
			{ day: 10, title: 'Run & Recovery', blocks: [
				STRETCH_ROLL[0],
				'Long Run 75 min easy',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 3,
		days: [
			{ day: 11, title: 'Strength & Ski Conditioning', blocks: [
				'Cardio warm-up (8 min): SkiErg 21/15/9 cal alternating with Kettlebell Swings 20/15/10',
				'Strength Set (11 min): Bench Press 5 reps (RPE 8); rest 120 s',
				'Strength Circuit (16 min): Chin Ups, Weighted Incline Sit Ups, Weighted 45° Back Extension (reps not shown)',
				'Strength Circuit (10 min): DB Bench Press 12, Bent Over Rows 12, Overhead Press 12 (all RPE 6)',
				'Ski Conditioning (23–40 min): SkiErg 900 m @2k+15" … (remaining intervals not shown)',
				'Cool-down: Easy Bike 10 min',
			] },
			{ day: 12, title: 'Intervals & Running Drills', duration: '75–120 min', blocks: [
				'Warm-up run: Easy Run 2 km',
				'Warm-up drills (8 min): A-Skips, High Knees, Butt Kicks, Leg Swings 30 s, 2 rounds',
				'Speed drill: Strides 100 m',
				'Interval Run A (19–26 min): 10 rounds – Run 200 m @5k-30"',
				'Rest Run 5 min easy',
				'Interval Run B (16–23 min): 6 rounds – Tempo Run 400 m @5k-15"',
				'Cool-down run (9–16 min)',
			] },
			{ day: 13, title: 'Strength & Run Conditioning', duration: '90–135 min', blocks: [
				'Cardio warm-up (17 min): 4 rounds – Run 90 s, Single Unders 60 s',
				'Power warm-up (9 min): 3 rounds – Toes to Bar 10, Broad Jumps 10, Devil Press (reps not shown)',
				'Power Run Circuit (53–75 min): Easy Run 800 m @5k+40", Overhead Squats 20 (RPE 4), Step Ups 15 (RPE 4), Burpees (reps not shown), Easy Run 800 m @5k+20"',
				'Finisher (2 min): Barbell Walking Lunges 100 m (Pro weight)',
				'Bike cool-down 5 min',
			] },
			{ day: 14, title: 'Strength & Row Conditioning', duration: '75–100 min', blocks: [
				'Cardio warm-up (9 min): Row 21/15/9 cal + Burpees 20/15/10',
				'Power Circuit (7 min): TRX Push Ups, TRX Rows, Air Squats 10',
				'Strength Set (11 min) (lift not shown)',
				'Power Circuit (12 min): DB Romanian Deadlifts 8 (RPE 7), Bulgarian Split Squats',
				'Row Conditioning (21–34 min): 900 m @2k+15", 700 m @2k+10", 500 m @2k+5"',
				'Row cool-down 5 min',
			] },
			{ day: 15, title: 'Long Run & Recovery', duration: '105–130 min', blocks: [
				STRETCH_ROLL[0],
				'Trail Run 80 min',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 4,
		days: [
			{ day: 16, title: 'Strength & Ski Conditioning', duration: '115–160 min', blocks: [
				'Cardio warm-up (6–7 min): SkiErg, Sled Drag 20 m (RPE 3)',
				'Power warm-up (6 min): TRX Rows, TRX Mountain Climbers 20',
				'Strength Set (20 min): Sled / Rope Sled / Barbell Bench Press, no rest between (reps not shown)',
				'Power Circuit (21 min): GHD Seated Wall Balls (Med Ball) 20 (RPE 5), GHD Prone Hold 40 s',
				'Ski Conditioning (47–66 min): 8 rounds – SkiErg 300 m @2k+10", 200 m @2k, 100 m @2k-10"; rest 120 s',
				'Bike cool-down 5 min',
			] },
			{ day: 17, title: 'Intervals & Running Drills', duration: '90–150 min', blocks: [
				'Warm-up: Easy Run 2 km, drills 4 min, Strides 100 m',
				'Interval Run (42–63 min): Easy Run 1.5 km @5k+10", 1 km @5k, Tempo 500 m @5k-10"; rest 300 s',
				'Easy Run 5 min',
				'Interval Run (10–14 min): Tempo Run 200 m @5k-30"',
				'Cool-down run 9–16 min',
			] },
			{ day: 18, title: 'Run & Bike Conditioning', duration: '70–100 min', blocks: [
				'Warm-up (17 min): Air Bike, Single Unders 60 s, Push Ups',
				'Power Run Circuit (32–42 min): 5 rounds – Run 500 m @5k+20", Deadlift 15 (RPE 5), Burpee Box Jumps (reps not shown), Farmers Carry 100 m (RPE 7)',
				'Bike Finisher (12 min): 20 s max-calorie efforts (rest not shown)',
				'Bike cool-down 5 min',
			] },
			{ day: 19, title: 'Power & Row Conditioning', duration: '90–125 min', blocks: [
				'Cardio warm-up (9 min): Row 60 s, Sled Push 20 m (RPE 3), Sled Drag 20 m',
				'Power warm-up (5 min): Plank Shoulder Taps, Burpee Broad Jump',
				'Power Circuit (19–20 min): Back Squat 8 (RPE 7), Sled Push 20 m (RPE 7)',
				'Row Conditioning (45–59 min): includes 200 m @2k, 100 m @2k-10" (full structure not shown)',
				'Row cool-down 5 min',
			] },
			{ day: 20, title: 'Run & Recovery', blocks: [
				STRETCH_ROLL[0],
				'Long Run 80 min easy @5k+90"',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 5,
		days: [
			{ day: 21, title: 'Strength & Ski Conditioning', duration: '90–125 min', blocks: [
				'Cardio warm-up (7 min): SkiErg 21/15/9 cal, Sled Drag 20/15/10 m (RPE 3)',
				'Strength Set (20 min): includes Sled Pull (arms only) (rest not shown)',
				'Power Circuit (13 min): Pull-Ups 10 (RPE 4), Hanging Leg Raise, Air Bike 12 cal',
				'Power Circuit (13 min) (not shown)',
				'Ski Conditioning (27–43 min): 800 m @2k+15", 600 m @2k+10", 400 m @2k, 200 m @2k-10"',
				'Ski cool-down 5 min',
			] },
			{ day: 22, title: 'Intervals & Running Drills', duration: '65–115 min', blocks: [
				'Warm-up run, drills, speed drill (opt.)',
				'Interval Run 36–54 min (intervals not shown)',
				'Cool-down run 9–16 min',
			] },
			{ day: 23, title: 'Power & Run Conditioning', duration: '75–90 min', blocks: [
				'Cardio warm-up (7–10 min): Prog. Run 200 m, Mountain Climbers 30 s',
				'Power warm-up (6 min): Jump Rope, Barbell Reverse Lunges',
				'Power Run Circuit (38 min): Run 2 min @5k+20" (incline 2%), Box Jumps 20 (RPE 5), Thrusters 20 (RPE 5)',
				'Finisher (10 min): Wall Balls 15 (Pro weight)',
				'Bike cool-down 5 min',
			] },
			{ day: 24, title: 'Strength & Row Conditioning', blocks: [
				'Cardio warm-up (12 min): 20 cal',
				'Power Circuit (opt., 6 min)',
				'Strength Circuit (26–27 min): Back Squat 8 (RPE 7)',
				'Row Conditioning (22–34 min): 800 m @2k+15", 600 m @2k+10", 400 m @2k, 200 m @2k-10"; rest 180 s',
				'Row cool-down 5 min',
			] },
			{ day: 25, title: 'Long Run & Recovery', duration: '110–135 min', blocks: [
				'Interval Long Run 82 min: Easy Run 19 min @5k+90" blocks (structure partly not shown)',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 6,
		days: [
			{ day: 26, title: 'Strength & Ski Conditioning', blocks: [
				'Cardio warm-up (7 min): 4 rounds – SkiErg 30 s max damper, Single Unders 60 s',
				'Strength Set (7 min): 3 rounds – TRX Rows 10, TRX Push Ups, TRX Mountain Climbers 20',
				'Strength Set (7 min): Bench Press 5, 3, 1 reps (RPE 7–9)',
				'Power Circuit (25–26 min): 8 rounds – Sled Pull 20 m (Pro weight), Pull Ups 5',
				'Ski Conditioning (31–45 min): 14 rounds – SkiErg 250 m @2k+5"',
				'Cool-down: Air Bike 5 min',
			] },
			{ day: 27, title: 'Intervals & Running Drills', duration: '60–120 min', blocks: [
				'Warm-up run 5–8 min · Prog. Run 2 rounds × 500 m · Drills 4 min',
				'Tempo Run (37–70 min): 10 km @5k+30"',
				'Cool-down run 5–8 min',
			] },
			{ day: 28, title: 'Strength & Run Conditioning', duration: '65–105 min', blocks: [
				'Cardio warm-up (13–24 min): Row, Treadmill',
				'Power warm-up (5 min): Hollow Hold, Chin Ups',
				'Power Run Circuit (29–46 min): Run 1 km @5k+30", Burpee Broad Jump 100 m, DB Walking Lunges 100 reps (Pro weight), Farmers Carry 200 m (Pro weight), Wall Balls (reps not shown)',
				'Tempo Run 1 km @5k+30"',
				'Cool-down walk 10 min (incline 3%)',
			] },
			{ day: 29, title: 'Strength & Row Conditioning', duration: '95–125 min', blocks: [
				'Cardio warm-up: Jumping Jacks, Row',
				'Power warm-up (9 min): Reverse Lunges, Push Ups, Step Ups 16',
				'Strength Set (5 min): Back Squat 5, 3, 1 reps (RPE 7–9)',
				'Power Circuit (26–27 min): Sled Push, Broad Jumps (reps not shown)',
				'Row Conditioning (29–39 min) (not shown)',
				'Cool-down: Easy Bike 10 min',
			] },
			{ day: 30, title: 'Endurance & Recovery', duration: '115–145 min', blocks: [
				'Bike Endurance 60 min, then Run Endurance 30 min',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 7,
		label: 'Deload',
		days: [
			{ day: 31, title: 'Strength & Ski Conditioning', duration: '75–115 min', blocks: [
				'Bike warm-up 10 min, Ski warm-up 6–9 min, Power warm-up 7 min',
				'Strength Set: Pike Push Ups 8, Back Extensions, Butterfly Sit Ups (reps not shown)',
				'Strength Set: Barbell Bench Press 10 (RPE 5), Sled 20 m (RPE 4)',
				'Ski Conditioning (25–43 min): SkiErg 200 m … 1.5 km @2k+30"',
			] },
			{ day: 32, title: 'Running', duration: '75–90 min', blocks: [
				'Warm-up drills 9 min (A-Skips 30 s etc.)',
				'Run Conditioning 60 min easy',
			] },
			{ day: 33, title: 'Conditioning', duration: '105–170 min', blocks: [
				'Bike warm-up 5 min, Power Circuit (opt., 12 min)',
				'Power Circuit (71–113 min): 6 rounds – Bike 1 km (RPE 4), SkiErg 500 m @2k+30", Row (distance not shown)',
				'Cool-down 10 min',
			] },
			{ day: 34, title: 'Strength & Row Conditioning', duration: '70–105 min', blocks: [
				'Row warm-up 5–8 min, Power Circuit (opt., 9 min)',
				'Power Circuit (11 min): DB Goblet Squats 10 (RPE 3), 45° Back Extension, Incline Sit Ups',
				'Row Conditioning (23–36 min): Back Squat 10 (RPE 5), Sled Push 20 m',
				'Bike cool-down 5 min',
			] },
			{ day: 35, title: 'Endurance & Recovery', duration: '145–180 min', blocks: [
				'Bike Endurance 120 min',
				'Stretch 7 min + calves/hamstring rolling',
			] },
		],
	},
	{
		week: 8,
		days: [
			{ day: 36, title: 'Ski & Run Conditioning', duration: '65–110 min', blocks: [
				'Cardio warm-up (10–17 min): Sled work 10 m, Treadmill',
				'Ski warm-up (6–10 min)',
				'Power Run Circuit (32–47 min): Run 400 m @5k+10", Sled 25 m (RPE 7), SkiErg 250 m @2k+10" (full order not shown)',
				'Run cool-down 9–16 min',
			] },
			{ day: 37, title: 'Intervals & Running Drills', duration: '75–135 min', blocks: [
				'Warm-up run, drills 4 min, Strides 100 m × 3',
				'Run Conditioning (42–73 min): 2 km @5k+30", Easy 1 km @5k+75", 2 km @5k+20", 2 km @5k+10", 2 km @5k+30"',
				'Cool-down run 9–16 min',
			] },
			{ day: 38, title: 'Conditioning Drills', duration: '50–65 min', blocks: [
				'Cardio warm-up (8–15 min): SkiErg 1 km, Prog. Row',
				'Power warm-up (7 min): 2 rounds – Single Unders 60 s, Air Squats 10, Push Ups 10, DB Standing Lunges',
				'Power Circuit (18 min) EMOM: Min 1 Single Unders 60 · Min 2 Wall Balls 18 (Pro weight) · Min 3 Step Ups 12 · Min 4 Burpee Pull Ups 6 · Min 5 Row 12 cal; do the work, rest until the next minute',
				'Cool-down: Easy Bike 10 min',
			] },
			{ day: 39, title: 'Conditioning Drills', duration: '95–125 min', blocks: [
				'Warm-up run 7–14 min; Power warm-up 11–12 min',
				'Power Circuit (52 min): Row 21/15/9 cal + Sled Push 20/15/10 m; then 6 rounds – Run 3 min @5k+15", Row 2 min @2k+10", 60 s (RPE 7)',
				'Ski Conditioning (13 min): 10 rounds – 30 s @2k+5"',
				'Cool-down: Air Bike 5 min',
			] },
			{ day: 40, title: 'Conditioning & Recovery', duration: '135–185 min', blocks: [
				'Cardio warm-up (20–34 min): 4 rounds – SkiErg 500 m, Row 250 m, Run',
				'Run Endurance 92 min with 2 min @5k+60" / 2 min @2k+30" and Farmers Carry blocks',
				'Power Circuit (8 min): Incline Sit Ups 15, 45° Back Extension, Leg Raises',
			] },
		],
	},
	{
		week: 9,
		days: [
			{ day: 41, title: 'Sled & Wall Ball Conditioning', duration: '90–120 min', blocks: [
				'Warm-up run 7–14 min; Sled conditioning 3–4 min',
				'Power Circuit (26 min): 5 rounds, no rest – Sled/SkiErg 60 s @2k+10", Row/Sled 60 s, Run 60 s @5k+15"',
				'Bike Rest 5 min · Wall Balls 4 min · Bike Rest 5 min',
				'Wall Balls 120 reps (RPE 9, Pro weight)',
				'Bike cool-down 10 min',
			] },
			{ day: 42, title: 'Running', duration: '85–145 min', blocks: [
				'Drills 9 min, Speed drills 2–3 min',
				'Run Conditioning (33–50 min): 800 m @5k-5", Tempo 500 m @5k-30"',
				'Speed drills 17–24 min · Cool-down run 9–16 min',
			] },
			{ day: 43, title: 'Descending Power Circuit', duration: '100–130 min', blocks: [
				'Power warm-up 6 min · Bike Rest 10 min',
				'Power Circuit (32 min): 50-40-30-20-10 of Row (cal), DB Walking Lunges (m, Pro weight), Burpee Broad Jump (reps, RPE 6)',
				'Bike cool-down 10 min',
			] },
			{ day: 44, title: 'Run & Wall Ball Ladder', duration: '60–90 min', blocks: [
				'Warm-up circuit (9 min): Med Ball + Air Bike 12/9/6 cal, 12/10/8 reps',
				'Power Run Circuit (21–28 min): Run 600 m @5k+5" + 60 Wall Balls · 500 m @5k+15" + 50 · 400 m @5k+15" + 40 · 300 m @5k+15" + 30 · 200 m all-out + 20',
				'Power Circuit (12 min): Air Bike 12 cal (RPE 7), Kettlebell carry 60 m (RPE 7)',
			] },
			{ day: 45, title: 'Endurance & Recovery', duration: '110–135 min', blocks: [
				'Warm-up stretch + drills 3 min',
				'Long Run 80 min',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 10,
		days: [
			{ day: 46, title: 'Sled & Row Conditioning', blocks: [
				'Cardio warm-up (11–18 min): SkiErg, Row',
				'Power Circuit A (10 min) (not shown)',
				'Power Circuit B (9–10 min): Sled Pull (arms only) 25 m (RPE 6), SkiErg 60 s @2k',
				'Power Circuit (37–38 min): Sled 25 m (Pro weight + 50 kg), Row 30 cal @2k+5", Sled Pull 50 m',
				'Finisher: 10 rounds – Run 30 s (RPE 9, incline 5%), rest 30 s',
			] },
			{ day: 47, title: 'Intervals & Running Drills', blocks: [
				'(contents not shown in the recordings)',
			] },
			{ day: 48, title: 'Strength & Conditioning', duration: '100–135 min', blocks: [
				'Cardio warm-up (7 min): Air Bike 3 min, Row 2 min, Single Unders 60 s',
				'Power warm-up (6 min): 3 rounds – Broad Jumps 10, Jumping Pull Ups, Toes to Bar',
				'Strength Circuit (25 min) EMOM × 8: Min 1 Bench Press 10 (RPE 7) · Min 2 Sled Push 25 m (RPE 7)',
				'Run (4–7 min): 1 km @5k+40", incline 3%',
				'Power Circuit (37–38 min): 5 rounds – Row 30 cal @2k+5", Sled Pull 50 m (Pro weight)',
				'Cool-down walk 10–15 min',
			] },
			{ day: 49, title: 'Power & Run Conditioning', duration: '115–170 min', blocks: [
				'Cardio warm-up (12 min): Air Bike 20 cal, Easy Run',
				'Warm-up circuit (7 min): Push Ups 20, Butterfly Sit Ups',
				'Run A (8–14 min): 2 km @5k+60"',
				'Power Circuit A (23–28 min): 6 rounds – SkiErg 200 m @2k-5", Burpee Box Jumps 12, Wall Balls 20',
				'Run B (8–14 min): 2 km @5k+40"',
				'Power Circuit B (21–25 min): 6 rounds – Row 200 m @2k-5", DB Standing Lunges 20, Burpee Broad Jump 20 m; rest 60 s',
				'Run C (8–14 min)',
				'Cool-down: Easy Bike 10 min',
			] },
			{ day: 50, title: 'Endurance & Recovery', duration: '110–135 min', blocks: [
				'Warm-up stretch 5 min + drills 3 min (A-Skips, High Knees, Butt Kicks, Fast Feet)',
				'Long Run 80 min',
				STRETCH_ROLL[1],
				STRETCH_ROLL[2],
			] },
		],
	},
	{
		week: 11,
		days: [
			{ day: 51, title: 'Power Circuits', duration: '90–165 min', blocks: [
				'Cardio warm-up (10 min): 2 rounds – Single Unders 60 s, Squat Jumps',
				'Power warm-up 12 min',
				'Power Circuit B (26–47 min): Back Squat 8 (RPE 7), Front Squats 8 (RPE 7), Sled Push 13 m (Pro weight + 25 kg), Bike 2 km (RPE 2), SkiErg 500 m @2k+10", Rope Sled Pull 300 m @2k',
				'Power Circuit C (32–63 min) (not shown)',
				'Cool-down stretch 4 min',
			] },
			{ day: 52, title: 'Intervals & Running Drills', duration: '90–140 min', blocks: [
				'Warm-up run 9–16 min, drills 9 min, Strides 100 m',
				'Run Conditioning (49–70 min): 3 km @5k+25", 2 km @5k+15", 1 km @5k, Tempo 500 m all-out; rest 5 min',
				'Bike cool-down 10 min, stretch 5 min',
			] },
			{ day: 53, title: 'Strength & Run Conditioning', duration: '105–160 min', blocks: [
				'Warm-up run 7–14 min; Power Circuit (opt., 11 min)',
				'Power Circuit A (18–22 min): Row 200 m @2k, Farmers Carry, Wall Balls 20 (Pro weight)',
				'Run B (8–14 min): 2 km @5k+20"',
				'Power Circuit B (16 min): Air Bike 15 cal (RPE 6), Reverse Lunges 20 (open weight), Broad Jumps 10 (RPE 6), Butterfly Sit Ups 20; rest 60 s',
				'Finisher (13 min): 4 rounds – Row 15 cal, Burpee Pull Ups 10',
				'Ski cool-down 4–8 min',
			] },
			{ day: 54, title: 'Drills & Race Simulation', duration: '95–155 min', blocks: [
				'Cardio warm-up (25–44 min): Prog. Run 800 m',
				'Power warm-up (8–10 min): Wall Ball, Row, Burpees 6, Box Jumps 8',
				'Run Conditioning (9 min): 90 s @5k-10"',
				'Race Simulation (27–44 min): Run 1 km @5k+20", SkiErg 1 km @2k+10", Run 1 km @5k+30", Sled work, DB Walking Lunges 100 m (Pro weight), Run 1 km @5k+40", Wall Balls 100 (Pro weight)',
				'Bike cool-down 20 min',
			] },
			{ day: 55, title: 'Bike Endurance', blocks: [
				STRETCH_ROLL[0],
				'Bike 120 min (RPE 4)',
				STRETCH_ROLL[1],
			] },
		],
	},
	{
		week: 12,
		label: 'Deload / Race week',
		days: [
			{ day: 56, title: 'Easy Run & Power Set', duration: '60–75 min', blocks: [
				'Run Conditioning 45 min easy',
				'Power Set 7 min (quads, glutes, biceps)',
				'Stretch 5 min',
			] },
			{ day: 57, title: 'Running', duration: '60–95 min', blocks: [
				'Drills 4 min, Speed drills 2–3 min',
				'Run Conditioning (28–41 min): 500 m @5k+10", 500 m @5k+25" … (rest not shown)',
			] },
			{ day: 58, title: 'Conditioning', duration: '85–105 min', blocks: [
				'Cardio warm-up (7 min): SkiErg, Row',
				'Power Circuit (58 min): Bike, Med Ball, SkiErg, Row, Bench Press, Bent Over Rows (reps not shown)',
				'Cool-down walk 10 min',
			] },
			{ day: 59, title: 'Active Rest', duration: '40–60 min', blocks: [
				'Easy walk 20–30 min',
				'Recovery stretch 18 min',
			] },
			{ day: 60, title: 'Pre-Race Stimulation', duration: '35–60 min', blocks: [
				'Run Conditioning (14–24 min) + Speed Drills (11–18 min), 60 s efforts (pacing not shown)',
			] },
		],
	},
];
