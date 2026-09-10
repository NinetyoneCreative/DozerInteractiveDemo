/**
 * The walkthrough itself: chapters, steps, and what the rep says on each one.
 *
 * This file is deliberately pure data — no JSX, no imports from /components. The
 * presenter window imports it to render the chapter list, the notes and the
 * next-step preview, and it should not have to pull three.js across just to
 * print a heading. components/slides/registry.tsx is what maps a `kind` onto a
 * component.
 *
 * Editing the script:
 *   • Add or remove entries in CHAPTERS. Step numbers and hashes are derived,
 *     not written down, so nothing else needs renumbering.
 *   • `notes` are what the rep reads. Write them as things to say, not as a
 *     description of the slide — the slide is already on screen.
 *   • `seconds` is a pacing hint. The presenter view totals it and shows whether
 *     the call is running long. It is guidance, never a timer that fires.
 */

import { JOBSITE, PILOT } from './demoData';

export type Slide =
  | { kind: 'cover' }
  | { kind: 'agenda' }
  | { kind: 'statement'; lead: string; sub?: string; stat?: { value: string; label: string } }
  | { kind: 'points'; intro?: string; columns?: 2 | 3; points: Point[] }
  | { kind: 'system'; highlight?: 'machine' | 'cab' | 'cloud' | null }
  | { kind: 'coverage'; machine: 'excavator' | 'wheelLoader'; environment: 'studio' | 'street' | 'dirt' | 'urban'; callout: string }
  | { kind: 'dashboard'; focus: DashboardFocus; callout: string }
  | { kind: 'events' }
  | { kind: 'report' }
  | { kind: 'timeline'; phases: Phase[] }
  | { kind: 'pilot' }
  | { kind: 'close' };

export interface Point {
  title: string;
  body: string;
  /** Optional mono stat shown above the title. */
  stat?: string;
}

export interface Phase {
  when: string;
  title: string;
  body: string;
}

/**
 * Regions of the recreated dashboard the deck can highlight. `null` means the
 * whole screen with nothing dimmed.
 */
export type DashboardFocus = null | 'filters' | 'kpis' | 'utilization' | 'costcodes' | 'map' | 'machines';

export interface Step {
  /** 1-based position within the chapter. The hash is #/<slug>/<n>. */
  n: number;
  /** `${chapterSlug}/${n}` — unique across the deck. */
  id: string;
  /** Global 0-based index, for next/prev. */
  index: number;
  chapterIndex: number;
  chapterSlug: string;
  chapterTitle: string;
  eyebrow: string;
  title: string;
  notes: string[];
  /** Pacing hint in seconds. */
  seconds: number;
  slide: Slide;
  /** True where `I` hands the keyboard to an embedded interactive module. */
  interactive?: boolean;
}

interface StepSpec extends Omit<Step, 'n' | 'id' | 'index' | 'chapterIndex' | 'chapterSlug' | 'chapterTitle'> {}

interface ChapterSpec {
  slug: string;
  title: string;
  /** One line, shown in the overview grid. */
  summary: string;
  steps: StepSpec[];
}

const SPEC: ChapterSpec[] = [
  /* ══ 1 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'open',
    title: 'Where we are',
    summary: 'The problem, and what this call covers.',
    steps: [
      {
        eyebrow: 'Dozer.ai',
        title: `A walkthrough for ${JOBSITE.name}`,
        seconds: 45,
        slide: { kind: 'cover' },
        notes: [
          'Hold here while everyone joins. Do not start talking into a half-full room.',
          'Names and roles round the table before you advance. You want to know whether you are talking to safety, to ops, or to both, because chapters 4 and 5 land differently depending on the answer.',
          'If it is a safety-led room, tell them up front you will also show the productivity side, and that it is the same hardware. That is the thing they will not be expecting.',
        ],
      },
      {
        eyebrow: 'The problem',
        title: 'The operator cannot see the person',
        seconds: 90,
        slide: {
          kind: 'statement',
          lead: 'Every machine on your site has ground around it that the operator physically cannot see from the seat.',
          sub: 'Mirrors help. A spotter helps. Neither is looking at every side of the machine at the same time, and neither is there on the afternoon everyone is tired.',
        },
        notes: [
          'Do not open with a statistic. They have heard the statistics and they have their own incident log, which they trust more than yours.',
          'Open with the mechanism instead: this is a geometry problem before it is a behaviour problem. The operator is not careless, they are sitting in a cab with steel between them and the ground.',
          'Ask: "When you have had a close call on this site, where was the person standing?" Then stop talking. Whatever they say is the thing you point at in chapter 3.',
        ],
      },
      {
        eyebrow: 'This call',
        title: 'What we are going to do',
        seconds: 40,
        slide: { kind: 'agenda' },
        notes: [
          'Set the shape so nobody is waiting for the pricing slide while you are three chapters away from it.',
          'Say the running time out loud and mean it. If you said thirty minutes, chapter 8 needs to arrive at minute twenty-eight.',
          'Flag chapter 3 as the interactive one. Tell them you will hand it over and let them move the machine themselves. People sit forward when they know that is coming.',
        ],
      },
    ],
  },

  /* ══ 2 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'system',
    title: 'How the system works',
    summary: 'Hardware on the machine, alerts in the cab, everything recorded.',
    steps: [
      {
        eyebrow: 'The whole system',
        title: 'Three places it lives',
        seconds: 75,
        slide: { kind: 'system', highlight: null },
        notes: [
          'Give them the whole picture once before you take it apart. Everything that follows hangs off this diagram.',
          'On the machine, in the cab, and in the office. Three places, one install.',
          'The important claim is the arrow direction: the alert happens on the machine, not in the cloud. Nothing waits on a signal. Say that now, because it is the first question an equipment manager asks and you want to have answered it before they ask it.',
        ],
      },
      {
        eyebrow: 'On the machine',
        title: 'Cameras and depth sensors, mounted to the iron',
        seconds: 90,
        slide: {
          kind: 'system',
          highlight: 'machine',
        },
        notes: [
          'Rugged cameras and depth sensors, mounted directly on the machine. Excavators, dozers, loaders, haul trucks.',
          'The depth sensor is the part worth dwelling on. A camera tells you something is there. A depth sensor tells you how far away it is, which is what turns a picture into an alert with a threshold on it.',
          'Expect the durability question here — vibration, wash-downs, winter, a boom swinging past. Answer it plainly and move on. This is a fleet manager’s objection and it is a fair one.',
        ],
      },
      {
        eyebrow: 'In the cab',
        title: 'The operator gets told, in the moment',
        seconds: 80,
        slide: { kind: 'system', highlight: 'cab' },
        notes: [
          'The alert is in the cab, while the machine is moving. That is the entire safety product in one sentence.',
          'Proximity detection means the system knows a person is inside the danger zone, not just that something moved on a screen. That distinction is what keeps operators from tuning it out.',
          'Watch for the alarm-fatigue objection, because it is the good one. The honest answer is that an alert nobody trusts gets ignored, which is why the threshold matters and why chapter 3 exists — the coverage has to be real or the alerting is theatre.',
        ],
      },
      {
        eyebrow: 'The pivot',
        title: 'One install. Two products.',
        seconds: 70,
        slide: {
          kind: 'statement',
          lead: 'The same cameras that keep people away from the machine also tell you what the machine did all day.',
          sub: 'Safety and Productivity are not two installs, two invoices, or two decisions. They are two suites on one set of hardware, and both are live today.',
        },
        notes: [
          'This is the hinge of the entire call. Slow down.',
          'Safety gets you in the door because it is the thing nobody argues with. Productivity is what gets the renewal signed, because it shows up in the job cost.',
          'If you are in front of a safety director and an ops executive at the same time, this is the slide where they stop hearing two different pitches. Let it sit before you advance.',
        ],
      },
    ],
  },

  /* ══ 3 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'coverage',
    title: 'What the cameras actually see',
    summary: 'The interactive 3D coverage module. Hand it over.',
    steps: [
      {
        eyebrow: 'The real question',
        title: 'Ask every vendor this',
        seconds: 60,
        slide: {
          kind: 'statement',
          lead: '“Show me the ground your cameras do not cover.”',
          sub: 'Any vendor can tell you they have cameras. The useful question is where the gaps are, how wide they are, and what happens to them when the machine moves.',
        },
        notes: [
          'Tell them to ask this of everyone they are evaluating, including you. It costs you nothing and it reframes the whole comparison in your favour, because most of the market cannot answer it.',
          'Then say: here is ours, and you can drive it yourself.',
          'Advance and press I straight away. Do not describe the module while it sits there frozen.',
        ],
      },
      {
        eyebrow: 'Coverage',
        title: 'The full package on an excavator',
        seconds: 180,
        interactive: true,
        slide: {
          kind: 'coverage',
          machine: 'excavator',
          environment: 'studio',
          callout: 'Blue is covered ground. Drag to orbit. Swing the house and watch the gaps move with it.',
        },
        notes: [
          'Press I to hand over control, then genuinely hand it over — offer them the mouse if you are in the room, or talk them through it if you are not.',
          'Three things to show, in this order. One: the blue is real, solved from the actual mount positions, not painted on. Two: swing the house and the seams swing with it, because the cameras are bolted to the house. Three: drag a worker into a seam and the panel says, in words, that nobody can see them.',
          'The seams are wider than the nominal spec — around 15 to 22 degrees at eight metres rather than a clean 10 — because the cameras are mounted metres apart rather than stacked at the machine centre. Say that before they find it. Volunteering your own worst number is the most credible thing you will do on this call.',
          'Press I again to give the keyboard back to the deck before you advance.',
        ],
      },
      {
        eyebrow: 'Comparison',
        title: 'One camera is not a camera system',
        seconds: 120,
        interactive: true,
        slide: {
          kind: 'coverage',
          machine: 'excavator',
          environment: 'street',
          callout: 'Turn “All cameras” off. That is what a single rear camera actually gives you.',
        },
        notes: [
          'Most sites already have a reversing camera on something. This is the slide that explains why that is not the same purchase.',
          'Switch to the single-camera comparison in the panel and let the blue collapse. Do not narrate the number, let them read it.',
          'Then turn it back on. The jump is the argument. You do not need to add anything to it.',
        ],
      },
      {
        eyebrow: 'Coverage',
        title: 'The loader’s blind zone is in front',
        seconds: 120,
        interactive: true,
        slide: {
          kind: 'coverage',
          machine: 'wheelLoader',
          environment: 'dirt',
          callout: 'Raise the arms. Coverage in front of the machine gets worse, not better.',
        },
        notes: [
          'Switch to the wheel loader and raise the lift arms. Coverage ahead of the machine drops — roughly 75% down to 61% at full lift.',
          'That is a real, well-known hazard on that machine and the module does not hide it. The arms and the bucket sit directly in front of the only forward-facing camera.',
          'Say plainly: we could have left this out of the demo. We did not, because you will find it in week one of a pilot and it is better that you hear it from me now.',
          'This is usually the moment a sceptical equipment manager starts believing the rest of the numbers.',
        ],
      },
    ],
  },

  /* ══ 4 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'safety',
    title: 'Safety suite',
    summary: 'Alerts, proximity detection, event recording.',
    steps: [
      {
        eyebrow: 'Safety suite',
        title: 'What is switched on',
        seconds: 90,
        slide: {
          kind: 'points',
          columns: 3,
          points: [
            {
              title: 'In-cab operator alerts',
              body: 'The operator is told while the machine is moving, in the seat, not in a report on Friday.',
            },
            {
              title: 'Proximity detection',
              body: 'Depth sensing means the system knows how far away a person is, so the alert has a threshold instead of firing at every shadow.',
            },
            {
              title: 'Event recording',
              body: 'Every alert has video attached to it. Nobody has to reconstruct what happened from memory.',
            },
          ],
        },
        notes: [
          'Three capabilities, all live today. Do not oversell past them.',
          'The one to dwell on depends on the room. Safety directors care about the recording, because it settles arguments. Ops cares about the alert, because it prevents the argument.',
          'If they ask what it does not do, say so. A short honest list beats a long vague one and this room can smell the difference.',
        ],
      },
      {
        eyebrow: 'Proximity',
        title: 'An alert only works if it is believed',
        seconds: 90,
        slide: {
          kind: 'statement',
          lead: 'An operator who has been alerted for nothing three times will ignore the fourth one.',
          sub: 'That is why coverage and depth matter more than alert volume. The number that counts is not how many alerts fired — it is how many of them the operator acted on.',
        },
        notes: [
          'Bring the alarm-fatigue objection up yourself if they have not. It is the single most common reason these systems get ripped out, and pretending it is not real damages you.',
          'Tie it back to chapter 3: this is why we showed you the gaps. Coverage you can verify is what makes a threshold trustworthy.',
          'Good question to ask here: "Has your team ever turned something like this off?" If the answer is yes, you have just found the whole objection you need to beat, and they told you what it is.',
        ],
      },
      {
        eyebrow: 'Event recording',
        title: 'Every alert, with the video attached',
        seconds: 100,
        slide: { kind: 'events' },
        notes: [
          'Point at the row for EX-220 on Sep 4 — blind zone entry, 2.4 metres, swing stopped.',
          'The value is not the list, it is that the argument is over. There is a clip. You are not asking a superintendent to recall a Thursday afternoon.',
          'Then point at the two LD-311 and DZ-402 rows and say: this is where a toolbox talk stops being generic. You are not telling the crew to be careful, you are showing them a machine and a time of day.',
          'Sample data — say so if anyone asks. Never present these as another customer’s numbers.',
        ],
      },
      {
        eyebrow: 'For the safety director',
        title: 'What changes on your desk',
        seconds: 80,
        slide: {
          kind: 'points',
          columns: 3,
          points: [
            {
              title: 'Leading indicators, not lagging',
              body: 'Proximity alerts are near-misses you can count before anyone is hurt. Most sites only have the incidents.',
            },
            {
              title: 'Toolbox talks with evidence',
              body: 'A specific machine, a specific window, a specific clip. Crews argue with generalities and not with footage.',
            },
            {
              title: 'A defensible record',
              body: 'When you are asked what you had in place, the answer has dates on it.',
            },
          ],
        },
        notes: [
          'This is the slide for the safety director specifically. If they are not on the call, move through it briskly.',
          'The leading-indicator point is the strongest one you have with this audience. Most of them are managing a programme on lagging data and know it.',
          'Do not claim a compliance outcome or an insurance outcome you cannot back up. If they ask about insurance, offer to find out rather than guessing on the call.',
        ],
      },
    ],
  },

  /* ══ 5 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'productivity',
    title: 'Productivity & Analytics',
    summary: 'The same hardware, doing a second job.',
    steps: [
      {
        eyebrow: 'Second suite',
        title: 'You already paid for these cameras',
        seconds: 70,
        slide: {
          kind: 'statement',
          lead: 'The hardware that watches for people is watching the machine the rest of the time.',
          sub: 'Utilization, job cost codes and written reports come off the same install. No second box, no second decision.',
        },
        notes: [
          'The transition matters. You have spent four chapters on safety, and safety buyers do not automatically care about utilization.',
          'The bridge is the invoice: whatever safety costs, it costs less per machine when it is also the productivity system.',
          'If there is an ops or project executive on the call, this is where they wake up. Watch for it and slow down when it happens.',
        ],
      },
      {
        eyebrow: 'What it measures',
        title: 'Hours, and where they went',
        seconds: 100,
        slide: {
          kind: 'points',
          columns: 3,
          points: [
            {
              stat: 'Metered',
              title: 'Utilization',
              body: 'Engine hours against working hours, per machine and per fleet. Measured off the machine, not off a timesheet filled in at the end of the week.',
            },
            {
              stat: 'Coded',
              title: 'Job cost codes',
              body: 'Hours land against the code the work was booked to, so the job cost report and the machine agree with each other.',
            },
            {
              stat: 'Written',
              title: 'AI reports',
              body: 'A weekly summary in prose that names what moved, what it cost, and what is worth looking at on Monday.',
            },
          ],
        },
        notes: [
          'Utilization is the number every equipment manager already tracks badly. They will tell you what their current method is if you ask, and it is usually a spreadsheet.',
          'Cost codes are the one that gets finance interested. Hours against a code is the language the job cost report is already written in.',
          'Do not promise an integration with their ERP unless you know. Ask what they use, write it down, and follow up.',
        ],
      },
      {
        eyebrow: 'AI reports',
        title: 'Monday morning, already written',
        seconds: 110,
        slide: { kind: 'report' },
        notes: [
          'Read the second paragraph out loud. It names two specific machines and a specific day, which is what separates this from a chart with a trend line on it.',
          'Then point at the actions. This is the part that gets forwarded. A superintendent does not read a dashboard, but they will read three lines that name their own equipment.',
          'Ask who on their side would get this. The answer tells you who your internal champion is going to be.',
        ],
      },
    ],
  },

  /* ══ 6 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'dashboard',
    title: 'The dashboard',
    summary: 'A guided pass over the screen their team would actually use.',
    steps: [
      {
        eyebrow: 'The dashboard',
        title: `${JOBSITE.name}, last two weeks`,
        seconds: 60,
        interactive: true,
        slide: {
          kind: 'dashboard',
          focus: null,
          callout: 'The whole screen. We will take it apart one piece at a time.',
        },
        notes: [
          'Let them look at the whole thing for a few seconds without narrating it. People need to orient before they can listen.',
          'Say once, clearly, that this is sample data for a demo site. Say it here and you never have to hedge again for the rest of the chapter.',
          'Then tell them you are going to walk five areas, and start advancing. Each of the next steps dims everything except one region.',
        ],
      },
      {
        eyebrow: 'Filters',
        title: 'Period and fleet, at the top',
        seconds: 55,
        slide: {
          kind: 'dashboard',
          focus: 'filters',
          callout: 'Everything below reacts to these two controls.',
        },
        notes: [
          'Small point, made quickly: every number underneath is scoped by what is selected here. Period, and which machines.',
          'The reason it matters is comparison. The deltas you are about to show are against the previous window of the same length, which is why the period control is not decoration.',
          'Do not linger. This is orientation, not a feature.',
        ],
      },
      {
        eyebrow: 'The numbers',
        title: 'Five figures, and what moved them',
        seconds: 110,
        slide: {
          kind: 'dashboard',
          focus: 'kpis',
          callout: 'Utilization up 5.3 points. Idle down 13.3%. Proximity alerts down a third.',
        },
        notes: [
          'Take idle hours first, not utilization. Idle is the number with money attached to it and it is down 13.3%.',
          'Then proximity alerts down 34%. Point out that this is the safety suite and the productivity suite on the same screen, from the same install, which is the argument from chapter 2 arriving as evidence.',
          'The badge colours follow the meaning, not the sign — idle falling is green. If someone notices, that is a good sign they are actually reading it.',
        ],
      },
      {
        eyebrow: 'Utilization',
        title: 'Two weeks, day by day',
        seconds: 100,
        slide: {
          kind: 'dashboard',
          focus: 'utilization',
          callout: 'Week two runs 70.2% against 64.9% in week one, on roughly the same engine hours.',
        },
        notes: [
          'Point at the weekend gaps first. It is the fastest way to establish that this is metered from the machine rather than modelled — the shape has their actual schedule in it.',
          'Then the week-on-week lift. Same engine hours, more working hours. That is the whole definition of utilization improving and it is visible without you explaining the axis.',
          'Good question to ask: "What are you using to track this today?" You will almost always get a spreadsheet, and often a person’s name.',
        ],
      },
      {
        eyebrow: 'Cost codes',
        title: 'Hours against the code they were booked to',
        seconds: 110,
        slide: {
          kind: 'dashboard',
          focus: 'costcodes',
          callout: 'Excavation 214.8 hrs. Backfill 121.5. Conduit 96.3, and climbing.',
        },
        notes: [
          'This is the slide finance cares about. Hours by cost code is the language the job cost report is already written in.',
          'Point at conduit climbing while box falls. That is a schedule visible in machine hours, and it is the kind of thing that usually surfaces two weeks late in a progress meeting.',
          'Ask which codes they run. If they name them, write them down — a pilot that comes back with their real codes on it is a different conversation from one with ours.',
        ],
      },
      {
        eyebrow: 'Map',
        title: 'Where the machines were',
        seconds: 80,
        slide: {
          kind: 'dashboard',
          focus: 'map',
          callout: 'Dashed boundary is the geofence. Diamonds are machines reporting inside it.',
        },
        notes: [
          'Geofence first: the site boundary, and the system knows what is inside it.',
          'The use everyone reaches for is the machine that left and did not come back, or the one sitting on a site it was not scheduled to. Both show up here without anyone filing a report.',
          'Keep this one short unless they push on it. Maps demo well and sell less than the hours do.',
        ],
      },
      {
        eyebrow: 'By machine',
        title: 'Where the fleet average is hiding',
        seconds: 100,
        slide: {
          kind: 'dashboard',
          focus: 'machines',
          callout: 'EX-220 at 72.9%. EX-105 at 62.7%. The fleet average is 67.6% and tells you neither.',
        },
        notes: [
          'This is the strongest slide in the chapter. The fleet number is 67.6% and it describes no machine on the site.',
          'Ten points between the best and worst excavator on comparable work is a conversation with a superintendent, not a capital request. That framing matters — you are not selling them more iron.',
          'Land the chapter here: the reason any of this exists is the install from chapter 2. One set of cameras. Then advance to rollout.',
        ],
      },
    ],
  },

  /* ══ 7 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'rollout',
    title: 'What it takes to run it',
    summary: 'Install, timeline, and how it fits what you already do.',
    steps: [
      {
        eyebrow: 'Install',
        title: 'What we need from you',
        seconds: 90,
        slide: {
          kind: 'points',
          columns: 3,
          points: [
            {
              title: 'The machines, for a window',
              body: 'Fitting happens on your yard. We work to the schedule you give us, not the other way round.',
            },
            {
              title: 'One person who knows the fleet',
              body: 'Someone who can tell us which machines matter and what they actually do. Usually an equipment manager, and usually for an hour.',
            },
            {
              title: 'Your cost codes',
              body: 'So the productivity side reports in your language from the first week instead of ours.',
            },
          ],
        },
        notes: [
          'Downtime is the objection here and it is the real one. Answer it directly and do not inflate the answer to be safe — an equipment manager will know if you have.',
          'The cost codes ask does double duty: it is genuinely needed, and it quietly commits them to thinking about their own data in your system.',
          'If they push on scheduling, offer to work around a shutdown or a wet week. Flexibility costs you nothing here and removes the last easy no.',
        ],
      },
      {
        eyebrow: 'Timeline',
        title: 'From yes to a report on your desk',
        seconds: 100,
        slide: {
          kind: 'timeline',
          phases: [
            {
              when: 'Week 0',
              title: 'Scope',
              body: 'Which machines, which cost codes, who gets the reports. An hour with your equipment manager.',
            },
            {
              when: 'Week 1',
              title: 'Install',
              body: 'Cameras and depth sensors fitted on your yard, to your schedule.',
            },
            {
              when: 'Week 1',
              title: 'Alerts live',
              body: 'The safety suite works from the moment the machine leaves the yard. Nothing waits on a data history.',
            },
            {
              when: 'Week 3',
              title: 'First real report',
              body: 'Enough hours banked for the comparison to mean something. Before this it is a chart of not very much.',
            },
            {
              when: 'Day 45',
              title: 'Read-out',
              body: 'We sit down with your numbers, not our demo ones.',
            },
          ],
        },
        notes: [
          'The important beat is week one: safety is live immediately. It does not need a baseline, because an alert does not need history to be right.',
          'Be honest that productivity needs about three weeks before the comparisons are worth reading. Saying so makes the week-one claim believable.',
          'The day-45 read-out is the one to sell hardest. It is the moment the pilot stops being a trial and starts being a renewal conversation.',
        ],
      },
      {
        eyebrow: 'Fit',
        title: 'It has to survive contact with the site',
        seconds: 80,
        slide: {
          kind: 'points',
          columns: 3,
          points: [
            {
              title: 'Nothing for the operator to do',
              body: 'No app to open, no button to remember. The alert finds them in the seat.',
            },
            {
              title: 'Nothing for the foreman to file',
              body: 'The hours and the events are captured without anyone writing them down.',
            },
            {
              title: 'One person owns the dashboard',
              body: 'Someone has to read the weekly report for it to be worth anything. Pick them before we start, not after.',
            },
          ],
        },
        notes: [
          'The third point is the one that decides whether a pilot renews, and most vendors will not say it out loud. Say it.',
          'If nobody owns the report, the pilot ends with a shrug regardless of how good the data was. Get a name on the call.',
          'Ask directly: "Who would that be?" A named person here is worth more than any objection you handle in the next five minutes.',
        ],
      },
    ],
  },

  /* ══ 8 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'pilot',
    title: 'The pilot',
    summary: 'The offer, and the next step.',
    steps: [
      {
        eyebrow: 'The offer',
        title: 'Put it on four machines',
        seconds: 120,
        slide: { kind: 'pilot' },
        notes: [
          `⚠ CHECK THE TERMS ON THIS SLIDE BEFORE THE CALL. They live in lib/demoData.ts under PILOT and the price currently reads "${PILOT.price}".`,
          'Pick the four machines with them, on the call if you can. The ones that worry them, not the ones that demo well.',
          'The exit clause is the part to say slowly. Removing the risk of being stuck is usually worth more to this audience than anything you could discount.',
          'Then stop talking. The next person to speak should be them.',
        ],
      },
      {
        eyebrow: 'Next',
        title: 'What happens after this call',
        seconds: 90,
        slide: { kind: 'close' },
        notes: [
          'Do not end on a thank-you slide. End on a date.',
          'Two things to leave with: which machines, and who owns the report. If you have both, the pilot is real. If you have neither, you have had a nice conversation.',
          'Offer to send the coverage module as a link. It is the part they will show someone else, and it is the only part of this deck that survives being forwarded.',
        ],
      },
    ],
  },
];

/* ── Derived structure ───────────────────────────────────────────────────────
 * Numbering, ids and global indices are computed so that adding a step never
 * means renumbering anything by hand.
 */

export interface Chapter {
  index: number;
  slug: string;
  title: string;
  summary: string;
  steps: Step[];
  /** Global index of this chapter's first step. */
  firstStepIndex: number;
  seconds: number;
}

export const CHAPTERS: Chapter[] = (() => {
  let index = 0;
  return SPEC.map((c, ci) => {
    const firstStepIndex = index;
    const steps = c.steps.map((s, si) => {
      const step: Step = {
        ...s,
        n: si + 1,
        id: `${c.slug}/${si + 1}`,
        index: index++,
        chapterIndex: ci,
        chapterSlug: c.slug,
        chapterTitle: c.title,
      };
      return step;
    });
    return {
      index: ci,
      slug: c.slug,
      title: c.title,
      summary: c.summary,
      steps,
      firstStepIndex,
      seconds: steps.reduce((a, s) => a + s.seconds, 0),
    };
  });
})();

export const STEPS: Step[] = CHAPTERS.flatMap((c) => c.steps);

export const TOTAL_STEPS = STEPS.length;

/** Total pacing budget for the whole deck, in seconds. */
export const TOTAL_SECONDS = STEPS.reduce((a, s) => a + s.seconds, 0);

/** `#/coverage/2` → global step index. Returns null for anything unparseable. */
export function indexFromHash(hash: string): number | null {
  const m = /^#\/([a-z-]+)\/(\d+)$/.exec(hash.trim());
  if (!m) return null;
  const [, slug, nRaw] = m;
  const chapter = CHAPTERS.find((c) => c.slug === slug);
  if (!chapter) return null;
  const step = chapter.steps.find((s) => s.n === Number(nRaw));
  return step ? step.index : null;
}

export function hashFromIndex(index: number): string {
  const step = STEPS[clampIndex(index)];
  return `#/${step.id}`;
}

export function clampIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(TOTAL_STEPS - 1, Math.round(index)));
}

/** Seconds of pacing budget up to and including a step — drives the presenter pacing read. */
export function elapsedBudget(index: number): number {
  return STEPS.slice(0, clampIndex(index) + 1).reduce((a, s) => a + s.seconds, 0);
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
