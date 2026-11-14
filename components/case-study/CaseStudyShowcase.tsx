'use client';

import React from 'react';
import Eyebrow from './Eyebrow';
import TagBar from './TagBar';
import IntroDivider from './IntroDivider';
import ChallengeApproach from './ChallengeApproach';
import HeroDashboard from './HeroDashboard';
import AnimationSequence from './AnimationSequence';
import { caseStudyContent } from '../../lib/caseStudyContent';

export default function CaseStudyShowcase() {
  return (
    <section className="relative min-h-screen bg-gradient-to-b from-[#1c1c1e] via-[#141d22] to-[#0e1a1f] text-white selection:bg-[#ff2d4a]/25 selection:text-white py-16 sm:py-24 overflow-hidden">
      {/* Background Ambient Cyber Atmosphere */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b3b44]/25 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#ff2d4a]/8 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1100px] mx-auto space-y-12 sm:space-y-16">
        {/* 1. Eyebrow */}
        <Eyebrow text={caseStudyContent.eyebrow} />

        {/* 2. Tag Bar */}
        <TagBar items={caseStudyContent.tagBar.items} />

        {/* 3. Short Red Divider Line & Intro Paragraph */}
        <IntroDivider
          text={caseStudyContent.intro.text}
          dividerWidth={caseStudyContent.intro.dividerWidth}
        />

        {/* 4. Challenge & Approach Two-Column Block */}
        <ChallengeApproach
          challenge={caseStudyContent.challengeApproach.challenge}
          approach={caseStudyContent.challengeApproach.approach}
        />

        {/* 5. Large Hero Visual: Rotated Isometric Glassy Dashboard */}
        <HeroDashboard />

        {/* 6. Animation Sequence: Horizontal Timeline & Filmstrip */}
        <AnimationSequence />
      </div>
    </section>
  );
}
