import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RiskGauge, { getRiskSeverity } from '../components/RiskGauge';
import StatusDot from '../components/StatusDot';
import HudPanel from '../components/HudPanel';

describe('HUD Design System Components', () => {
  describe('getRiskSeverity utility', () => {
    it('categorizes scores correctly across all severity tiers', () => {
      // Low: 0 - 29
      expect(getRiskSeverity(0).label).toBe('Low');
      expect(getRiskSeverity(0).color).toBe('#22c55e');
      expect(getRiskSeverity(29).label).toBe('Low');

      // Medium: 30 - 59
      expect(getRiskSeverity(30).label).toBe('Medium');
      expect(getRiskSeverity(30).color).toBe('#fbbf24');
      expect(getRiskSeverity(59).label).toBe('Medium');

      // High: 60 - 79
      expect(getRiskSeverity(60).label).toBe('High');
      expect(getRiskSeverity(60).color).toBe('#fb7185');
      expect(getRiskSeverity(79).label).toBe('High');

      // Critical: 80 - 100
      expect(getRiskSeverity(80).label).toBe('Critical');
      expect(getRiskSeverity(80).color).toBe('#ef4444');
      expect(getRiskSeverity(100).label).toBe('Critical');
    });

    it('clamps out-of-range values and handles non-numeric inputs', () => {
      expect(getRiskSeverity(-15).label).toBe('Low');
      expect(getRiskSeverity(150).label).toBe('Critical');
      expect(getRiskSeverity(NaN).label).toBe('Low');
    });
  });

  describe('RiskGauge Component', () => {
    it('renders with role="img" and formatted aria-label', () => {
      const html = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 72 })
      );

      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Risk score 72 out of 100, High"');
      expect(html).toContain('HIGH');
      expect(html).toContain('72');
      expect(html).toContain('#fb7185'); // Alert color for High
    });

    it('renders Low, Medium, and Critical labels and colors accurately', () => {
      const lowHtml = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 15 })
      );
      expect(lowHtml).toContain('aria-label="Risk score 15 out of 100, Low"');
      expect(lowHtml).toContain('#22c55e');

      const medHtml = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 45 })
      );
      expect(medHtml).toContain('aria-label="Risk score 45 out of 100, Medium"');
      expect(medHtml).toContain('#fbbf24');

      const critHtml = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 95 })
      );
      expect(critHtml).toContain('aria-label="Risk score 95 out of 100, Critical"');
      expect(critHtml).toContain('#ef4444');
    });

    it('supports custom label override and showLabel=false', () => {
      const customHtml = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 50, label: 'Elevated' })
      );
      expect(customHtml).toContain('aria-label="Risk score 50 out of 100, Elevated"');
      expect(customHtml).toContain('ELEVATED');

      const noLabelHtml = renderToStaticMarkup(
        React.createElement(RiskGauge, { score: 50, showLabel: false })
      );
      expect(noLabelHtml).not.toContain('MEDIUM');
    });
  });

  describe('StatusDot Component', () => {
    it('renders status dot with role="status" and text label', () => {
      const html = renderToStaticMarkup(
        React.createElement(StatusDot, { status: 'ok', label: 'Systems Nominal' })
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('Systems Nominal');
      expect(html).toContain('#22c55e');
    });

    it('supports pulse animation class and sr-only mode', () => {
      const pulseHtml = renderToStaticMarkup(
        React.createElement(StatusDot, { status: 'alert', pulse: true })
      );
      expect(pulseHtml).toContain('hud-pulse');
      expect(pulseHtml).toContain('#fb7185');

      const srOnlyHtml = renderToStaticMarkup(
        React.createElement(StatusDot, { status: 'critical', showText: false, label: 'Breach' })
      );
      expect(srOnlyHtml).toContain('sr-only');
      expect(srOnlyHtml).toContain('Breach');
    });
  });

  describe('HudPanel Component', () => {
    it('renders with .hud-panel and .has-brackets classes', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          HudPanel,
          { title: 'Telemetry Feed', tag: 'SYS_01', brackets: true },
          React.createElement('p', null, 'Active telemetry data')
        )
      );

      expect(html).toContain('hud-panel');
      expect(html).toContain('has-brackets');
      expect(html).toContain('SYS_01');
      expect(html).toContain('Telemetry Feed');
      expect(html).toContain('Active telemetry data');
    });

    it('omits brackets and header when not requested', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          HudPanel,
          { brackets: false },
          React.createElement('div', null, 'Plain Content')
        )
      );

      expect(html).toContain('hud-panel');
      expect(html).not.toContain('has-brackets');
      expect(html).toContain('Plain Content');
    });

    it('integrates StatusDot in header when status prop is provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          HudPanel,
          { title: 'Ingress Guard', status: 'critical', statusLabel: 'Throttled' },
          'Content'
        )
      );

      expect(html).toContain('Throttled');
      expect(html).toContain('#ef4444');
    });
  });
});
