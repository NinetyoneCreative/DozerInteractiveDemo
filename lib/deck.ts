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
  | {
      kind: 'statement';
      lead: string;
      sub?: string;
      stat?: { value: string; label: string };
      /** A real frame from site footage. See ProductShot in components/slides/Frame.tsx. */
      image?: { src: string; alt: string; caption: string };
    }
  | { kind: 'points'; intro?: string; columns?: 2 | 3; points: Point[] }
  | { kind: 'system'; highlight?: 'machine' | 'cab' | 'cloud' | null }
  | {
      kind: 'coverage';
      machine: 'excavator' | 'wheelLoader';
      environment: 'studio' | 'street' | 'dirt' | 'urban';
      /**
       * Which way the module's all/single comparison is set when the step
       * arrives. Stated on EVERY coverage step, not just the one that wants
       * 'single' — otherwise stepping back from the comparison leaves the
       * module on one camera while the slide is talking about three.
       */
      cameras: 'all' | 'single';
      callout: string;
    }
  | { kind: 'dashboard'; focus: DashboardFocus; callout: string }
  | { kind: 'incab'; focus: Sector; callout: string }
  | {
      kind: 'events';
      /** The claim the log is evidence for. */
      intro: string;
      image?: { src: string; alt: string; caption: string };
    }
  | { kind: 'report' }
  | { kind: 'timeline'; phases: Phase[] }
  | { kind: 'pilot' }
  | { kind: 'close' };

/**
 * Icons the script can call for. The union lives here rather than in the icon
 * component for the same reason as DashboardFocus and Sector: this file imports
 * nothing from components/, and choosing which icon a point carries is a
 * content decision, not a rendering one. components/slides/Icons.tsx draws them.
 */
export type IconName =
  | 'camera' | 'depth' | 'alert' | 'clip'
  | 'leading' | 'evidence' | 'record'
  | 'gauge' | 'costcode' | 'report'
  | 'machine' | 'person'
  | 'operator' | 'clipboard' | 'owner'
  | 'scope' | 'install' | 'live' | 'chart' | 'readout' | 'flag'
  | 'calendar';

export interface Point {
  title: string;
  body: string;
  /** Optional mono stat shown above the title. */
  stat?: string;
  icon?: IconName;
}

export interface Phase {
  when: string;
  title: string;
  body: string;
  icon?: IconName;
}

/**
 * Regions of the recreated dashboard the deck can highlight. `null` means the
 * whole screen with nothing dimmed.
 */
export type DashboardFocus = null | 'filters' | 'kpis' | 'utilization' | 'costcodes' | 'map' | 'machines';

/**
 * Panels of the in-cab display the deck can highlight. Defined here rather than
 * in the component for the same reason as DashboardFocus: this file imports
 * nothing from components/, so the presenter window can load the script without
 * dragging a video player and three.js across to print a heading.
 */
export type Sector = null | 'plan' | 'front' | 'right' | 'rear';

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
          'Open on the mechanism, not a statistic — they have their own incident log and they trust it more than yours. Every machine on site has ground the operator physically cannot see from the seat. Mirrors help, a spotter helps; neither watches every side at once, and neither is there on the afternoon everyone is tired.',
          'Then ask: "when you have had a close call on this site, where was the person standing?" Stop talking. Whatever they say is the thing you point at in the 3D slide later.',
          'Names and roles round the table before you advance. You want to know whether you are talking to safety, to ops, or to both, because the safety and productivity halves land differently depending on the answer.',
          'If it is a safety-led room, tell them up front you will also show the productivity side, and that it is the same hardware. That is the thing they will not be expecting.',
        ],
      },
      {
        eyebrow: 'This call',
        title: 'What we are going to do',
        seconds: 40,
        slide: { kind: 'agenda' },
        notes: [
          'Set the shape so nobody is waiting for the pricing slide while you are three chapters away from it.',
          'Say the running time out loud and mean it. If you said thirty minutes, the pilot slide needs to arrive at minute twenty-eight.',
          'Flag the 3D slide as the one they drive. It comes after the product tour, and telling them it is coming makes them sit forward for the rest.',
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
          'Watch for the alarm-fatigue objection, because it is the good one. The honest answer is that an alert nobody trusts gets ignored, which is why the threshold matters and why the 3D slide exists — the coverage has to be real or the alerting is theatre.',
        ],
      },
      {
        eyebrow: 'The pivot',
        title: 'One install. Two products.',
        seconds: 70,
        slide: {
          kind: 'statement',
          lead: 'The same cameras that keep people away from the machine also tell you what the machine did all day.',
          sub: 'Two suites. One set of hardware. Both live today.',
          image: {
            src: '/product/machine-plan.jpg',
            alt: 'Top-down view of the excavator with its proximity zones drawn around it',
            caption: 'One machine, one install',
          },
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
              icon: 'alert',
              body: 'In the seat, while the machine is moving.',
            },
            {
              title: 'Proximity detection',
              icon: 'depth',
              body: 'Depth sensing, so the alert has a distance behind it.',
            },
            {
              title: 'Event recording',
              icon: 'clip',
              body: 'Every alert keeps its clip.',
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
        eyebrow: 'Alerts',
        title: 'An alert only works if it is believed',
        seconds: 150,
        slide: {
          kind: 'events',
          intro:
            'An operator alerted for nothing three times will ignore the fourth one. Coverage and depth are what make a threshold worth trusting — and every alert that does fire keeps its clip, so the argument afterwards is already over.',
          image: {
            src: '/product/rear-detection.jpg',
            alt: 'Rear camera feed with a truck and a car boxed and classified, each carrying a distance and bearing',
            caption: 'Classified, with a distance on each',
          },
        },
        notes: [
          'Bring the alarm-fatigue objection up yourself if they have not. It is the single most common reason these systems get ripped out, and pretending it is not real damages you.',
          'Promise them the proof rather than asserting it: the 3D slide later lets them check the geometry themselves. Coverage you can verify is what makes a threshold trustworthy.',
          'Then drop to the log. Point at the row for EX-220 on Sep 4 — blind zone entry, 2.4 metres, swing stopped. The value is not the list, it is that there is a clip: you are not asking a superintendent to recall a Thursday afternoon.',
          'Point at the LD-311 and DZ-402 rows and say: this is where a toolbox talk stops being generic. You are not telling the crew to be careful, you are showing them a machine and a time of day.',
          'Good question to ask here: "Has your team ever turned something like this off?" If the answer is yes, you have just found the whole objection you need to beat, and they told you what it is.',
          'Sample data — say so if anyone asks. Never present these as another customer’s numbers.',
          'If a safety director is in the room, land the three things this changes on their desk: near-misses they can count before anyone is hurt, toolbox talks with a specific machine and clip instead of a generic warning, and a record with dates on it when someone asks what they had in place.',
        ],
      },
    ],
  },

  /* ══ 4 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'in-cab',
    title: 'In the cab',
    summary: 'The operator display, running. Real footage from site.',
    steps: [
      {
        eyebrow: 'The display',
        title: 'What the operator actually sees',
        seconds: 90,
        slide: {
          kind: 'incab',
          focus: null,
          callout: 'Real footage from a Smith Denison machine. Three feeds, a plan view, and a distance on every object.',
        },
        notes: [
          'Let it run for a few seconds before you say anything. It is the first time on this call they are seeing the actual product rather than a diagram, and they need a moment to take the screen in.',
          'Then orient them: plan view of the machine down the left, camera feeds on the right — front, right side, and rear across the bottom.',
          'Say that this is real footage off a real machine, not a mock-up. It is the single most credible thing on the screen, and if you do not say it some of the room will assume it is animated.',
          'One honest caveat if anyone asks: the deck plays a 16-second loop cut from a longer recording. Nothing in it is staged or sped up.',
        ],
      },
      {
        eyebrow: 'Plan view',
        title: 'The machine, and what is near it',
        seconds: 80,
        slide: {
          kind: 'incab',
          focus: 'plan',
          callout: 'The arcs are proximity zones. They light by side, so the operator knows WHERE before they know what.',
        },
        notes: [
          'The arcs around the machine are the part to dwell on. They are not decoration — each one is a side, and it lights when something enters that zone.',
          'Watch the rear arc go amber while the front stays white. That is the whole idea in one image: the operator learns which side to worry about before they have read a single number.',
          'This matters because an operator mid-swing has about a second of attention to spare. Colour on the correct side of a machine diagram is something you take in without reading.',
          'Point out that the plan view is the machine they are actually in — tracks, cab, boom — not a generic icon.',
        ],
      },
      {
        eyebrow: 'Front',
        title: 'Clear ahead',
        seconds: 60,
        slide: {
          kind: 'incab',
          focus: 'front',
          callout: 'Nothing detected forward. No boxes, no border, no alert — the screen stays quiet when there is nothing to say.',
        },
        notes: [
          'Use this one to make the point about quiet. The front feed sits there with no boxes and no border for most of the clip, because there is nothing in front of the machine.',
          'A system that decorates every frame with boxes trains the operator to ignore it. This one says nothing until it has something to say.',
          'If they asked the alarm-fatigue question in the safety chapter, this is where you close that loop — point at the empty feed and say: that is what restraint looks like.',
        ],
      },
      {
        eyebrow: 'Right',
        title: 'Red is a person-sized problem',
        seconds: 100,
        slide: {
          kind: 'incab',
          focus: 'right',
          callout: 'Border goes red as the car closes to 2.6m. The severity is on the panel edge, readable without focusing on it.',
        },
        notes: [
          'Wait for the border to go red — it does, twice in the loop. Do not talk over it.',
          'The escalation is three states, and they are worth naming out loud: nothing, amber, red. It is on the panel edge rather than in the middle of the picture, so the operator picks it up peripherally without taking their eyes off the work.',
          'The distance readout next to each box is the honest part. It is not "something is close" — it is 2.6 metres, at 132 degrees. That number comes from the depth sensor, which is what you were describing in the system diagram.',
          'Good question to ask here: "Where would you want that threshold set on your sites?" It gets them designing the deployment in their own head.',
        ],
      },
      {
        eyebrow: 'Rear',
        title: 'It names what it sees',
        seconds: 100,
        slide: {
          kind: 'incab',
          focus: 'rear',
          callout: 'TRUCK. CAR. REAR BODY. Each one boxed, classified, and carrying its own distance.',
        },
        notes: [
          'The rear feed is the busiest and the most convincing. Two vehicles, both boxed, both labelled, both carrying a distance — and the machine\u2019s own rear body labelled as well, so the operator can see what the system is measuring from.',
          'Classification matters more than it sounds. "Something at 3 metres" and "a truck at 3 metres" are different instructions to an operator.',
          'This is also the honest place to talk about what it does NOT do. It is not steering the machine and it is not stopping it. It is telling the person who is.',
          'The sign on the wall behind says Smith Denison — this is their yard. Worth a beat if the room has not clocked it.',
        ],
      },
      {
        eyebrow: 'The ladder',
        title: 'Quiet, amber, red',
        seconds: 90,
        slide: {
          kind: 'incab',
          focus: null,
          callout: 'One pass, start to finish: nothing, then amber as they close, then red. Then back down as they clear.',
        },
        notes: [
          'Back to the whole screen and let one full pass play. This is the summary step — you are showing the ladder rather than any single panel.',
          'Narrate it once, lightly: quiet, amber as they close, red at the worst of it, then back down as they clear. Then stop and let it run.',
          'The de-escalation is the half people forget to look at. A system that goes red and stays red is one the operator switches off by Thursday.',
          'Close the chapter here and go to productivity. The line back to the system diagram is: this is the alert path, and it never left the machine.',
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
              icon: 'gauge',
              body: 'Engine hours against working hours, off the machine.',
            },
            {
              stat: 'Coded',
              title: 'Job cost codes',
              icon: 'costcode',
              body: 'Hours against the code the work was booked to.',
            },
            {
              stat: 'Written',
              title: 'AI reports',
              icon: 'report',
              body: 'A weekly summary that names what to look at.',
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
          'Then proximity alerts down 34%. Point out that this is the safety suite and the productivity suite on the same screen, from the same install, which is the one-install argument arriving as evidence.',
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
          'Land the chapter here: the reason any of this exists is one install. One set of cameras. Then advance to the 3D slide, which is where they get to check the geometry for themselves.',
        ],
      },
    ],
  },

  /* ══ 7 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'coverage',
    title: 'What the cameras actually see',
    summary: 'One interactive slide. Hand it over and let them drive it.',
    steps: [
      {
        eyebrow: 'Coverage',
        title: 'The full package on an excavator',
        seconds: 240,
        interactive: true,
        slide: {
          kind: 'coverage',
          machine: 'excavator',
          environment: 'studio',
          cameras: 'all',
          callout:
            'Green is what the operator can already see. Blue is only what the cameras add — 46 points on top of it.',
        },
        notes: [
          'This is one slide because it is one tool. Everything that used to be three slides is a control on this screen: you drive the comparison and the second machine from here, in whatever order the room wants them.',
          'Open with the question: "ask every vendor you are evaluating to show you the ground their cameras do NOT cover." It costs you nothing and most of the market cannot answer it. Then: here is ours, and you can drive it yourself. Press I and genuinely hand it over.',
          'Read the three colours out loud before anything else. Green is ground the operator can already see from the seat. Blue is ground ONLY the cameras reach. Orange is ground neither reaches. The split here is 37% green, 46% blue, 17% orange — say the 46, that is what the package is worth, and say the 17 before they find it.',
          'Where green and blue overlap the module gives it to the operator, so blue can never be ground they could already see. That is the difference between a coverage claim and an honest one.',
          'Swing the house and the seams swing with it, because the cameras are bolted to the house. Drag a worker into a seam and the panel says in words that nobody can see them.',
          'THE COMPARISON, when you want it: switch “All cameras” to “Single front”. Green does not move — 37% either way — but blue falls from 46 points to 12, and orange goes from 17% to 51%. Half the working radius, seen by nobody. That is the argument against the reversing camera they already own. Switch it back.',
          'THE SECOND MACHINE, if they run loaders: switch to the wheel loader. The operator sees just 26% from that cab against 37% on the excavator, because it sits behind the arms — then raise the lift arms and what the cameras add falls from 62 points to 48. It is the machine where the package is worth the most.',
          'One caveat to volunteer if anyone leans on the green figure: direct sight is a modelled seated arc, not a measured ISO 5006 study, and it does not model twisting round to look behind, so it understates rearward sight. The blue number is the conservative side of that, which is the right way round.',
          'Press I again to give the keyboard back to the deck before you advance.',
        ],
      },
    ],
  },

  /* ══ 8 ══════════════════════════════════════════════════════════════════ */
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
              title: 'The machine, for a window',
              icon: 'machine',
              body: 'One machine, one visit, on your yard.',
            },
            {
              title: 'One person who knows the fleet',
              icon: 'person',
              body: 'An equipment manager, for about an hour.',
            },
            {
              title: 'Your cost codes',
              icon: 'costcode',
              body: 'So week one reports in your language, not ours.',
            },
          ],
        },
        notes: [
          'Downtime is the objection here and it is the real one. Answer it directly and do not inflate the answer to be safe — an equipment manager will know if you have.',
          'The cost codes ask does double duty: it is genuinely needed, and it quietly commits them to thinking about their own data in your system.',
          'If they push on scheduling, offer to work around a shutdown or a wet week. Flexibility costs you nothing here and removes the last easy no.',
          'Say what it costs them to run, because it is almost nothing: no app for the operator to open, nothing for the foreman to file. The one real ask is that somebody owns the weekly report — without a name, a pilot ends in a shrug. Ask who that would be and write it down.',
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
              icon: 'scope',
              body: 'Which machine, which cost codes, who gets the reports. An hour with your equipment manager.',
            },
            {
              when: 'Week 1',
              title: 'Install',
              icon: 'install',
              body: 'Cameras and depth sensors fitted on your yard, to your schedule.',
            },
            {
              when: 'Week 1',
              title: 'Alerts live',
              icon: 'live',
              body: 'The safety suite works from the moment the machine leaves the yard. Nothing waits on a data history.',
            },
            {
              when: 'Week 3',
              title: 'First real report',
              icon: 'chart',
              body: 'Enough hours banked for the comparison to mean something. Before this it is a chart of not very much.',
            },
            {
              when: 'Day 21',
              title: 'Mid-point read-out',
              icon: 'readout',
              body: 'Half way. Enough banked to see the shape, early enough to change something.',
            },
            {
              when: 'Day 45',
              title: 'End of pilot',
              icon: 'flag',
              body: 'We sit down with your numbers, not our demo ones, and you decide.',
            },
          ],
        },
        notes: [
          'The important beat is week one: safety is live immediately. It does not need a baseline, because an alert does not need history to be right.',
          'Be honest that productivity needs about three weeks before the comparisons are worth reading. Saying so makes the week-one claim believable.',
          'Day 45 is the whole pilot, so sell that date hardest — it is not a checkpoint, it is the decision. The day-21 read-out is what stops it arriving as a surprise.',
        ],
      },
    ],
  },

  /* ══ 9 ══════════════════════════════════════════════════════════════════ */
  {
    slug: 'pilot',
    title: 'The pilot',
    summary: 'The offer, and the next step.',
    steps: [
      {
        eyebrow: 'The offer',
        title: `Put it on ${PILOT.machines.toLowerCase()}`,
        seconds: 120,
        slide: { kind: 'pilot' },
        notes: [
          ...(/tbc|confirm/i.test(PILOT.price)
            ? [
                `⚠ THE FEE ON THIS SLIDE IS NOT SET. It reads "${PILOT.price}" — fix PILOT.price in lib/demoData.ts before you present.`,
              ]
            : [
                `${PILOT.machines}, ${PILOT.duration}, ${PILOT.price}. Say the number plainly and do not soften it — it is small on purpose, and hedging makes it sound like an opening position.`,
              ]),
          `${PILOT.machines}, ${PILOT.duration}, one fee. Say all three in one breath — the offer is small on purpose, and stringing it out makes it sound bigger than it is.`,
          'Pick the machine with them, on the call if you can. The one that worries them, not the one that demos well. A single machine makes that an easy question to answer rather than a scheduling exercise.',
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
