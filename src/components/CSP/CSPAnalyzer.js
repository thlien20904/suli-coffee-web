import React, { useState, useEffect, useRef } from "react";
import { useCSP } from "./CSPProvider";

const CSPAnalyzer = () => {
  const { violations, clearViolations } = useCSP();
  const [analysis, setAnalysis] = useState({
    totalViolations: 0,
    violationTypes: {},
    blockedResources: [],
    pageStats: {},
    directiveStats: {},
    timelineData: [],
  });
  const [resourcesPage, setResourcesPage] = useState(1);
  const resourcesPerPage = 10;

  // Chart refs
  const pageChartRef = useRef(null);
  const directiveChartRef = useRef(null);
  const blockedChartRef = useRef(null);
  const timelineChartRef = useRef(null);

  useEffect(() => {
    analyzeViolations();
  }, [violations]);

  const analyzeViolations = () => {
    const violationTypes = {};
    const blockedResources = [];
    const pageStats = {};
    const directiveStats = {};
    const timelineData = [];

    violations.forEach((violation) => {
      const directive =
        violation.violatedDirective ||
        violation["violated-directive"] ||
        "unknown";
      const page = violation["document-uri"] || "unknown";
      const blocked =
        violation.blockedURI || violation["blocked-uri"] || "inline";

      // Count by directive
      if (!directiveStats[directive]) {
        directiveStats[directive] = 0;
      }
      directiveStats[directive]++;

      // Count by page
      if (!pageStats[page]) {
        pageStats[page] = 0;
      }
      pageStats[page]++;

      // Blocked resources
      if (blocked !== "inline") {
        // Parse timestamp properly
        const timestamp =
          violation.timestamp instanceof Date
            ? violation.timestamp
            : new Date(violation.timestamp);

        const time = !isNaN(timestamp.getTime())
          ? timestamp.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : new Date().toLocaleTimeString("vi-VN");

        blockedResources.push({
          uri: blocked,
          directive: directive,
          page: page,
          time: time,
          timestamp: timestamp,
        });
      }

      // Timeline data - parse multiple timestamp formats
      let timestamp;

      if (violation.timestamp instanceof Date) {
        timestamp = violation.timestamp;
      } else if (typeof violation.timestamp === "string") {
        // Try ISO format first
        timestamp = new Date(violation.timestamp);

        // If invalid, try parsing Vietnamese locale formats
        if (isNaN(timestamp.getTime())) {
          const tsStr = violation.timestamp.trim();

          // Format 1: "02:53:52 17/11/2025" (time space date)
          if (tsStr.includes(" ") && tsStr.includes("/")) {
            const parts = tsStr.split(" ");
            if (parts.length >= 2) {
              const time = parts[0]; // "02:53:52"
              const date = parts[1]; // "17/11/2025"
              const [day, month, year] = date.split("/");
              if (day && month && year) {
                timestamp = new Date(`${year}-${month}-${day}T${time}`);
              }
            }
          }

          // Format 2: "17/11/2025, 10:30:45" (date comma time)
          if (isNaN(timestamp.getTime()) && tsStr.includes(",")) {
            const parts = tsStr.split(",");
            if (parts.length === 2) {
              const [date, time] = parts;
              const [day, month, year] = date.trim().split("/");
              if (day && month && year) {
                timestamp = new Date(`${year}-${month}-${day}T${time.trim()}`);
              }
            }
          }
        }
      } else if (typeof violation.timestamp === "number") {
        timestamp = new Date(violation.timestamp);
      } else {
        // Fallback to current time
        timestamp = new Date();
      }

      if (!isNaN(timestamp.getTime())) {
        const hour = timestamp.getHours();
        const existing = timelineData.find((t) => t.hour === hour);
        if (existing) {
          existing.count++;
        } else {
          timelineData.push({ hour, count: 1 });
        }
      }
    });

    setAnalysis({
      totalViolations: violations.length,
      violationTypes: directiveStats,
      blockedResources: [
        ...new Set(blockedResources.map((r) => JSON.stringify(r))),
      ].map((r) => JSON.parse(r)),
      pageStats,
      directiveStats,
      timelineData: timelineData.sort((a, b) => a.hour - b.hour),
    });
  };

  const testInlineScript = () => {
    try {
      eval(`
        console.log('🔴 TEST: Inline script execution attempt');
        alert('❌ This should be BLOCKED by CSP!');
      `);
    } catch (error) {
      console.log("✅ Script blocked by CSP:", error);
    }
  };

  const testExternalScript = () => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js";
    script.onload = () => {
      console.log("✅ External script loaded successfully");
      if (window._) {
        console.log("📦 Lodash version:", window._.VERSION);
      }
    };
    script.onerror = () => console.log("❌ External script blocked by CSP");
    document.head.appendChild(script);
  };

  const testStyleInjection = () => {
    try {
      const style = document.createElement("style");
      style.innerHTML = `
        .csp-test-style {
          color: red !important;
          font-weight: bold;
        }
      `;
      document.head.appendChild(style);
      console.log("📝 Style injection test - check if blocked");
    } catch (error) {
      console.log("✅ Style injection blocked:", error);
    }
  };

  const generateSecurityReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: analysis.totalViolations,
        riskLevel:
          analysis.totalViolations > 50
            ? "HIGH"
            : analysis.totalViolations > 10
            ? "MEDIUM"
            : "LOW",
        mostViolatedDirective:
          Object.keys(analysis.directiveStats)[0] || "None",
        topRiskyPage: Object.keys(analysis.pageStats)[0] || "None",
      },
      recommendations: [
        analysis.totalViolations > 0
          ? "Consider tightening CSP policy"
          : "CSP policy appears effective",
        "Monitor inline script violations closely",
        "Review external resource permissions",
        "Implement nonce or hash for legitimate inline scripts",
      ],
      violations: violations.slice(0, 10), // Latest 10
    };

    console.log("📊 Security Report Generated:", report);

    // Create download link
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csp-security-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = () => {
    if (analysis.totalViolations > 50)
      return { level: "HIGH", color: "#dc3545", emoji: "🚨" };
    if (analysis.totalViolations > 10)
      return { level: "MEDIUM", color: "#ffc107", emoji: "⚠️" };
    return { level: "LOW", color: "#28a745", emoji: "✅" };
  };

  const risk = getRiskLevel();

  return (
    <div className="csp-analyzer">
      <div className="analyzer-header">
        <h1>🔍 CSP Security Analyzer</h1>
        <div className="risk-indicator">
          <span className="risk-badge" style={{ backgroundColor: risk.color }}>
            {risk.emoji} Risk Level: {risk.level}
          </span>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Violations</h3>
            <span className="stat-number">{analysis.totalViolations}</span>
            <p className="stat-trend">Security events detected</p>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Directive Types</h3>
            <span className="stat-number">
              {Object.keys(analysis.directiveStats).length}
            </span>
            <p className="stat-trend">Different policies affected</p>
          </div>
        </div>

        <div className="stat-card tertiary">
          <div className="stat-icon">🌐</div>
          <div className="stat-content">
            <h3>Affected Pages</h3>
            <span className="stat-number">
              {Object.keys(analysis.pageStats).length}
            </span>
            <p className="stat-trend">Pages with violations</p>
          </div>
        </div>

        <div className="stat-card quaternary">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>Blocked Resources</h3>
            <span className="stat-number">
              {analysis.blockedResources.length}
            </span>
            <p className="stat-trend">External resources blocked</p>
          </div>
        </div>
      </div>

      {/* Security Tests */}
      <div className="security-tests">
        <h2>🧪 Live Security Tests</h2>
        <div className="test-grid">
          <button onClick={testInlineScript} className="test-btn danger">
            <span className="btn-icon">⚡</span>
            Test Inline Script
            <span className="btn-desc">Should be blocked</span>
          </button>

          <button onClick={testExternalScript} className="test-btn success">
            <span className="btn-icon">🌐</span>
            Test External CDN
            <span className="btn-desc">Should be allowed</span>
          </button>

          <button onClick={testStyleInjection} className="test-btn warning">
            <span className="btn-icon">🎨</span>
            Test Style Injection
            <span className="btn-desc">Check console</span>
          </button>

          <button onClick={generateSecurityReport} className="test-btn info">
            <span className="btn-icon">📋</span>
            Generate Report
            <span className="btn-desc">Download JSON</span>
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Violations by Directive */}
        {Object.keys(analysis.directiveStats).length > 0 && (
          <div className="chart-container">
            <h3>📊 Violations by Directive</h3>
            <div className="bar-chart">
              {Object.entries(analysis.directiveStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([directive, count]) => (
                  <div key={directive} className="bar-item">
                    <div className="bar-label">{directive}</div>
                    <div className="bar-container">
                      <div
                        className="bar-fill directive"
                        style={{
                          width: `${
                            (count /
                              Math.max(
                                ...Object.values(analysis.directiveStats)
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">{count}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Violations by Page */}
        {Object.keys(analysis.pageStats).length > 0 && (
          <div className="chart-container">
            <h3>🌐 Violations by Page</h3>
            <div className="bar-chart">
              {Object.entries(analysis.pageStats)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([page, count]) => (
                  <div key={page} className="bar-item">
                    <div className="bar-label" title={page}>
                      {page.length > 40 ? `...${page.slice(-37)}` : page}
                    </div>
                    <div className="bar-container">
                      <div
                        className="bar-fill page"
                        style={{
                          width: `${
                            (count /
                              Math.max(...Object.values(analysis.pageStats))) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">{count}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Timeline - Always show */}
        <div className="chart-container timeline">
          <h3>⏰ Violations Timeline (24h)</h3>
          <div className="timeline-chart">
            {Array.from({ length: 24 }, (_, i) => {
              const data = analysis.timelineData.find((t) => t.hour === i);
              const count = data ? data.count : 0;
              const maxCount =
                analysis.timelineData.length > 0
                  ? Math.max(...analysis.timelineData.map((t) => t.count), 1)
                  : 1;
              return (
                <div key={i} className="timeline-bar">
                  <div className="timeline-value">{count}</div>
                  <div
                    className={`timeline-fill ${count > 0 ? "has-data" : ""}`}
                    style={{
                      height: count > 0 ? `${(count / maxCount) * 100}%` : "0%",
                    }}
                  ></div>
                  <div className="timeline-hour">{i}h</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Blocked Resources Table with Pagination */}
      {analysis.blockedResources.length > 0 && (
        <div className="blocked-resources">
          <div className="resources-header">
            <h2>🚫 Blocked External Resources</h2>
            <span className="resources-count">
              {analysis.blockedResources.length} resources blocked
            </span>
          </div>

          <div className="resource-table">
            <div className="table-header">
              <div className="col-uri">Resource URI</div>
              <div className="col-directive">Directive</div>
              <div className="col-page">Page</div>
              <div className="col-time">Time</div>
            </div>
            {analysis.blockedResources
              .slice(
                (resourcesPage - 1) * resourcesPerPage,
                resourcesPage * resourcesPerPage
              )
              .map((resource, index) => (
                <div key={index} className="table-row">
                  <div className="resource-uri" title={resource.uri}>
                    {resource.uri.length > 50
                      ? `...${resource.uri.slice(-47)}`
                      : resource.uri}
                  </div>
                  <div className="resource-directive">
                    <span className="directive-badge">
                      {resource.directive}
                    </span>
                  </div>
                  <div className="resource-page" title={resource.page}>
                    {resource.page.length > 35
                      ? `...${resource.page.slice(-32)}`
                      : resource.page}
                  </div>
                  <div className="resource-time">{resource.time}</div>
                </div>
              ))}
          </div>

          {/* Pagination for Blocked Resources */}
          {Math.ceil(analysis.blockedResources.length / resourcesPerPage) >
            1 && (
            <div className="resources-pagination">
              <button
                className="page-btn-resource"
                onClick={() =>
                  setResourcesPage((prev) => Math.max(1, prev - 1))
                }
                disabled={resourcesPage === 1}
              >
                ← Previous
              </button>

              <div className="page-info-resource">
                Page {resourcesPage} of{" "}
                {Math.ceil(analysis.blockedResources.length / resourcesPerPage)}
                <span className="separator">•</span>
                Showing {(resourcesPage - 1) * resourcesPerPage + 1}-
                {Math.min(
                  resourcesPage * resourcesPerPage,
                  analysis.blockedResources.length
                )}{" "}
                of {analysis.blockedResources.length}
              </div>

              <button
                className="page-btn-resource"
                onClick={() =>
                  setResourcesPage((prev) =>
                    Math.min(
                      Math.ceil(
                        analysis.blockedResources.length / resourcesPerPage
                      ),
                      prev + 1
                    )
                  )
                }
                disabled={
                  resourcesPage ===
                  Math.ceil(analysis.blockedResources.length / resourcesPerPage)
                }
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="analyzer-actions">
        <button onClick={clearViolations} className="clear-btn">
          🗑️ Clear All Violations
        </button>
        <button
          onClick={() => window.location.reload()}
          className="refresh-btn"
        >
          🔄 Refresh Analysis
        </button>
      </div>

      <style>{`
        .csp-analyzer {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          background: #f8f9fa;
          min-height: 100vh;
        }

        .analyzer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .analyzer-header h1 {
          margin: 0;
          font-size: 2.5em;
          font-weight: 700;
        }

        .risk-indicator {
          text-align: right;
        }

        .risk-badge {
          padding: 10px 20px;
          border-radius: 25px;
          color: white;
          font-weight: bold;
          font-size: 1.1em;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        /* Statistics Overview */
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
        }

        .stat-card.primary {
          border-left: 6px solid #007bff;
        }
        .stat-card.secondary {
          border-left: 6px solid #6f42c1;
        }
        .stat-card.tertiary {
          border-left: 6px solid #e83e8c;
        }
        .stat-card.quaternary {
          border-left: 6px solid #fd7e14;
        }

        .stat-icon {
          font-size: 3.5em;
          opacity: 0.8;
        }

        .stat-content h3 {
          margin: 0 0 8px 0;
          color: #6c757d;
          font-size: 1em;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .stat-number {
          font-size: 3em;
          font-weight: 900;
          color: #2c3e50;
          margin: 5px 0;
          line-height: 1;
        }

        .stat-trend {
          margin: 0;
          color: #8e9ba8;
          font-size: 0.9em;
          font-weight: 500;
        }

        /* Security Tests */
        .security-tests {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          margin-bottom: 40px;
        }

        .security-tests h2 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 1.8em;
        }

        .test-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .test-btn {
          padding: 20px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .test-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .test-btn.danger {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
        }

        .test-btn.success {
          background: linear-gradient(135deg, #51cf66, #40c057);
          color: white;
        }

        .test-btn.warning {
          background: linear-gradient(135deg, #ffd43b, #fab005);
          color: #333;
        }

        .test-btn.info {
          background: linear-gradient(135deg, #74c0fc, #339af0);
          color: white;
        }

        .btn-icon {
          font-size: 2em;
        }

        .btn-desc {
          font-size: 0.85em;
          opacity: 0.9;
          font-weight: 400;
        }

        /* Charts Grid */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 30px;
          margin-bottom: 40px;
        }

        .chart-container {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .chart-container.timeline {
          grid-column: 1 / -1;
        }

        .chart-container h3 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 1.4em;
          font-weight: 600;
        }

        /* Bar Chart */
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .bar-item {
          display: grid;
          grid-template-columns: 180px 1fr 50px;
          gap: 15px;
          align-items: center;
        }

        .bar-label {
          font-size: 0.9em;
          font-weight: 600;
          color: #495057;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bar-container {
          height: 25px;
          background: #e9ecef;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .bar-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.8s ease;
          position: relative;
        }

        .bar-fill.directive {
          background: linear-gradient(90deg, #667eea, #764ba2);
        }

        .bar-fill.page {
          background: linear-gradient(90deg, #f093fb, #f5576c);
        }

        .bar-value {
          font-weight: 700;
          color: #2c3e50;
          text-align: right;
          font-size: 0.9em;
        }

        /* Timeline Chart */
        .timeline-chart {
          display: flex;
          justify-content: space-between;
          align-items: end;
          height: 200px;
          padding: 20px 0;
          border-bottom: 2px solid #e9ecef;
        }

        .timeline-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          min-width: 25px;
          gap: 5px;
        }

        .timeline-value {
          font-size: 0.8em;
          font-weight: 600;
          color: #6c757d;
          min-height: 20px;
        }

        .timeline-fill {
          width: 20px;
          background: linear-gradient(to top, #4facfe, #00f2fe);
          border-radius: 3px 3px 0 0;
          min-height: 2px;
          transition: height 0.5s ease;
        }

        .timeline-hour {
          font-size: 0.75em;
          color: #8e9ba8;
          font-weight: 500;
        }

        /* Blocked Resources Table */
        .blocked-resources {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          margin-bottom: 40px;
        }

        .blocked-resources h2 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 1.6em;
        }

        .resource-table {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 80px;
          gap: 15px;
          padding: 15px 20px;
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 80px;
          gap: 15px;
          padding: 15px 20px;
          border-top: 1px solid #f1f3f5;
          font-size: 0.9em;
          transition: background 0.2s ease;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .resource-uri {
          font-family: monospace;
          color: #e83e8c;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-directive {
          background: #e7f3ff;
          color: #0056b3;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: 600;
          text-align: center;
        }

        .resource-page {
          color: #6c757d;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resource-time {
          color: #8e9ba8;
          font-size: 0.85em;
          text-align: center;
        }

        /* Blocked Resources Header */
        .resources-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .resources-count {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.9em;
          font-weight: 700;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        /* Blocked Resources Pagination */
        .resources-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          margin-top: 15px;
          border-top: 1px solid #e9ecef;
          gap: 15px;
        }

        .page-btn-resource {
          padding: 10px 20px;
          border: 2px solid #007bff;
          background: white;
          color: #007bff;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9em;
          transition: all 0.3s ease;
        }

        .page-btn-resource:hover:not(:disabled) {
          background: #007bff;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }

        .page-btn-resource:disabled {
          border-color: #dee2e6;
          color: #adb5bd;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .page-info-resource {
          color: #6c757d;
          font-size: 0.9em;
          font-weight: 500;
        }

        .separator {
          color: #dee2e6;
          margin: 0 8px;
        }

        /* Directive Badge Styling */
        .directive-badge {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 0.8em;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        /* Column Widths */
        .col-uri {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .col-directive {
          display: flex;
          justify-content: center;
        }

        .col-page {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .col-time {
          text-align: center;
        }

        /* Actions */
        .analyzer-actions {
          display: flex;
          gap: 20px;
          justify-content: center;
          padding: 30px;
        }

        .clear-btn,
        .refresh-btn {
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1em;
          transition: all 0.3s ease;
        }

        .clear-btn {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #74c0fc, #339af0);
          color: white;
        }

        .clear-btn:hover,
        .refresh-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .stats-overview {
            grid-template-columns: 1fr;
          }

          .test-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .analyzer-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CSPAnalyzer;
