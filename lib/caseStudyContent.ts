/**
 * Central Content Configuration for Cybersecurity Desktop App Showcase
 * All copy, headings, labels, metrics, and animation sequence data live here.
 */

export interface KeyframeScreen {
  id: string;
  step: string;
  timecode: string;
  title: string;
  subtitle: string;
  description: string;
  status: 'operational' | 'alert' | 'scanning' | 'resolved';
  metric: string;
  badgeColor: string;
  details: string[];
}

export interface CaseStudyContent {
  metadata: {
    title: string;
    description: string;
  };
  eyebrow: string;
  tagBar: {
    items: string[];
  };
  intro: {
    dividerWidth: string;
    text: string;
  };
  challengeApproach: {
    challenge: {
      tag: string;
      title: string;
      paragraph: string;
      stats: { label: string; value: string }[];
    };
    approach: {
      tag: string;
      title: string;
      paragraph: string;
      stats: { label: string; value: string }[];
    };
  };
  hero: {
    badge: string;
    systemStatus: string;
    activeIncidents: number;
    threatsBlocked: string;
    memoryLoad: string;
    networkLatency: string;
    telemetryLines: string[];
    gauge: {
      label: string;
      sublabel: string;
      score: number;
      status: string;
    };
  };
  animationSequence: {
    label: string;
    title: string;
    description: string;
    screens: KeyframeScreen[];
  };
}

export const caseStudyContent: CaseStudyContent = {
  metadata: {
    title: 'Cybersecurity Desktop App Showcase | Case Study',
    description:
      'High-performance Windows desktop UI/UX case study featuring animated isometric dashboards, real-time threat telemetry, and precision motion design.',
  },
  eyebrow: 'CYBERSECURITY UI/UX DESIGN • ANIMATED WINDOWS DESKTOP APPLICATION',
  tagBar: {
    items: [
      'Managed Security App UI/UX',
      'Animated Desktop Interface',
      'Motion Design + Static Screen States',
    ],
  },
  intro: {
    dividerWidth: '48px',
    text: 'A mission-critical enterprise desktop console engineered for tier-3 security operation centers. Fusing military-grade threat telemetry with fluid 60fps micro-interactions, the interface reduces incident cognitive load while accelerating containment velocity across distributed endpoint perimeters.',
  },
  challengeApproach: {
    challenge: {
      tag: 'THE CHALLENGE',
      title: 'Taming High-Density Telemetry Noise',
      paragraph:
        'Enterprise cybersecurity analysts face overwhelming alert fatigue, juggling up to 10,000 asynchronous telemetry packets per minute across fragmented monitors. Legacy consoles sacrifice spatial hierarchy for raw density, producing severe visual friction during active ransomware intrusions and perimeter breaches.',
      stats: [
        { label: 'Daily Alert Influx', value: '14.2k' },
        { label: 'Initial Triage Latency', value: '4.8 min' },
      ],
    },
    approach: {
      tag: 'OUR APPROACH',
      title: 'Layered Spatial Hierarchy & Motion Cues',
      paragraph:
        'We designed an isometric multi-surface workspace that dynamically elevates active containment vectors while submerging baseline telemetry. Kinetic feedback loops, directional light shafts, and tactile radial gauges guide operator focus with micro-second clarity without cognitive distraction.',
      stats: [
        { label: 'Triage Velocity Gain', value: '+62%' },
        { label: 'Operator Fatigue Drop', value: '-48%' },
      ],
    },
  },
  hero: {
    badge: 'LIVE TELEMETRY WORKSPACE • 60FPS ISOMETRIC CORE',
    systemStatus: 'SHIELD PERIMETER ARMED',
    activeIncidents: 14,
    threatsBlocked: '99.98%',
    memoryLoad: '3.4 GB / 32 GB',
    networkLatency: '1.2 ms',
    telemetryLines: [
      '0x00A1 [KERNEL_MONITOR] Ingress packet filter active',
      '0x00A2 [INSPECT_HEURISTIC] Polymorphic entropy delta: 0.04 (SAFE)',
      '0x00A3 [GATEWAY_TLS] Handshake verified via SHA-256 cert-chain',
      '0x00A4 [VAULT_AES] Ephemeral token rehydration cycle completed',
      '0x00A5 [RADAR_SWEEP] 14 threat vectors isolated in sandbox enclosure',
      '0x00A6 [SOC_BROADCAST] Peer consensus: Quorum verified (5/5 nodes)',
    ],
    gauge: {
      label: 'DEFENSE INTEGRITY',
      sublabel: 'Perimeter Armor Index',
      score: 98.4,
      status: 'HIGH RESILIENCE',
    },
  },
  animationSequence: {
    label: 'ANIMATION SEQUENCE',
    title: 'Kinetic State Transitions & Triage Progression',
    description:
      'Explore keyframe choreography across the security response lifecycle, from passive perimeter surveillance to exploded diagnostic inspection.',
    screens: [
      {
        id: 'kf-01',
        step: 'STAGE 01',
        timecode: '00:00:08',
        title: 'Initial Boot & Isometric Node Discovery',
        subtitle: 'System Initialization',
        description:
          'Staggered diagonal entrance of glassy telemetry panes with ambient teal edge glow and coordinate wireframe reveal.',
        status: 'operational',
        metric: '99.9% Uptime',
        badgeColor: '#11b5c4',
        details: [
          'GPU-accelerated hardware layer initialization',
          'Coordinate grid projection at -30° inclination',
          'Mesh handshake across 128 SOC endpoint nodes',
        ],
      },
      {
        id: 'kf-02',
        step: 'STAGE 02',
        timecode: '00:00:24',
        title: 'Real-Time Threat Radar & Ingress Scan',
        subtitle: 'Continuous Heuristics',
        description:
          'Dual-ring radial gauge sweeps incoming encrypted traffic, calculating signature anomalies and Verhoeff integrity scores in micro-seconds.',
        status: 'scanning',
        metric: '1.2ms Sweep',
        badgeColor: '#10b981',
        details: [
          'Dual-ring stroke dashoffset kinetic sweep',
          'Live needle micro-jitter simulating sensor telemetry',
          'Dynamic threshold adjustment based on incident severity',
        ],
      },
      {
        id: 'kf-03',
        step: 'STAGE 03',
        timecode: '00:00:46',
        title: 'Exploded 3D Cube Layer Diagnostic',
        subtitle: 'Tactile Isolation',
        description:
          'Data entities lift and separate into floating isometric layers (yellow, green, red) allowing rapid deep-packet inspection.',
        status: 'alert',
        metric: '14 Flagged',
        badgeColor: '#f59e0b',
        details: [
          'Exploded-view vertical axis separation (+24px offset)',
          'Color-coded risk segmentation (Warning, Safe, Breach)',
          'Independent floating sine-wave translation loop',
        ],
      },
      {
        id: 'kf-04',
        step: 'STAGE 04',
        timecode: '00:01:15',
        title: 'Critical Incident Containment & Lockdown',
        subtitle: 'Perimeter Quarantine',
        description:
          'Pulsing ruby warning rings lock down compromised memory segments and isolate rogue processes in an ephemeral sandbox.',
        status: 'alert',
        metric: 'Zero Leak',
        badgeColor: '#ff2d4a',
        details: [
          'Automated host network egress severance',
          'Pulsing #ff2d4a ambient beacon alerting SOC lead',
          'One-click operator rollback with audited justification',
        ],
      },
      {
        id: 'kf-05',
        step: 'STAGE 05',
        timecode: '00:01:42',
        title: 'Policy Enforcement & Hash Chain Re-Anchor',
        subtitle: 'Verification & Recovery',
        description:
          'Sanitized tokens rehydrate into verified outputs while SHA-256 cryptographic chain anchors the mitigation record into immutable audit storage.',
        status: 'resolved',
        metric: 'Verified SHA-256',
        badgeColor: '#11b5c4',
        details: [
          'Cryptographic ledger linkage to GENESIS block',
          'Zero plaintext credential exposure to external LLMs',
          'Telemetry state transition back to ambient arm mode',
        ],
      },
    ],
  },
};
